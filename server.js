import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import vision from '@google-cloud/vision';
import multer from 'multer';
import sharp from 'sharp';
import ntc from 'ntc';
import { APPAREL_WHITE_LIST, CATEGORIES, CONFIG_PORT } from './config.js';
import aiplatform from '@google-cloud/aiplatform';
import {
  AuthService,
  ImageService,
  authenticateToken,
  createDefaultStore
} from './public/services/authService.js';
import { requestLogger, errorLogger } from './public/middleware/loggingMiddleware.js';
import { logImageGeneration, logExternalApiCall, logError } from './public/services/logger.js';

const { PredictionServiceClient } = aiplatform.v1;
const { helpers } = aiplatform;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || CONFIG_PORT || 3000;

const aiClient = new PredictionServiceClient({
  apiEndpoint: 'us-central1-aiplatform.googleapis.com'
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024},
});

// Basic file-backed services so authentication works without extra infra.
const store = createDefaultStore();
const jwtSecret = process.env.JWT_SECRET || 'development-secret';
const authService = new AuthService({ store, jwtSecret });
const storageBucket = process.env.GCS_BUCKET || 'apparel-images'; // Configure via env var
const imageService = new ImageService({ store, storageBucket });

const createVisionRequest = (imageBuffer, maxResults = 30) => ({
  image: {content: imageBuffer},
  maxResults
});

const client = new vision.ImageAnnotatorClient();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Add request logging middleware
app.use(requestLogger);

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend', 'build')));
}


/**
 * Converts RGB color values to hexadecimal format
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {string} Hexadecimal color string (e.g., '#ff5733')
 */
function rgbToHex(r,g,b) {
  return '#' + r.toString(16).padStart(2,'0') 
    + g.toString(16).padStart(2,'0')
    + b.toString(16).padStart(2,'0');
}

/**
 * Checks if an object name contains any apparel-related keywords
 * @param {string} obj - Object name to check
 * @returns {boolean} True if object is apparel-related, false otherwise
 */
function isApparel(obj) {
  const object = obj.toLowerCase();

  return APPAREL_WHITE_LIST.some(apparelTerm =>
    object.includes(apparelTerm)
  );
}

/**
 * Crops a specific object region from an image using bounding box coordinates
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} boundingPoly - Bounding polygon with normalized vertices
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @returns {Promise<Buffer>} Cropped image buffer
 */
async function cropObject(imageBuffer, boundingPoly, width, height) {
  const vertices = boundingPoly.normalizedVertices;
  const left = Math.floor(vertices[0].x * width);
  const top = Math.floor(vertices[0].y * height);
  const right = Math.floor(vertices[2].x * width);
  const bottom = Math.floor(vertices[2].y * height);

  return sharp(imageBuffer)
    .extract({ left, top, width: right - left, height: bottom - top })
    .toBuffer();
}


/**
 * Gets a detailed label for a cropped apparel item, filtering out generic/irrelevant labels
 * @param {Buffer} croppedBuffer - Cropped image buffer of the apparel item
 * @param {string} originalObjectName - Original object name from object localization
 * @returns {Promise<string>} Specific apparel label or original object name
 */
async function getDetailedLabel(croppedBuffer, originalObjectName) {
  const startTime = Date.now();
  const [{ labelAnnotations }] = await client.labelDetection({
    image: { content: croppedBuffer },
    maxResults: 50
  });

  logExternalApiCall('Vision API', 'labelDetection', {
    duration: Date.now() - startTime,
    originalObject: originalObjectName,
  });

  //debuging 
  console.log(`\nLabels for ${originalObjectName}:`, labelAnnotations.slice(0, 10).map(l => l.description));

  const label = labelAnnotations.find(l => {
    const desc = l.description.toLowerCase();
    return APPAREL_WHITE_LIST.some(term => desc.includes(term));
  });

  //chose original label if unkown
  const finalLabel = label?.description || originalObjectName || 'unknown';
  console.log(`Final label: ${finalLabel}\n`);
  
  return finalLabel;
}

/**
 * Extracts the dominant color name, rgb, and hex code from an image and returns its common name
 * @param {Buffer} imageBuffer - Image buffer to analyze
 * @returns {Promise<Object>} Object containing:
 *   - colorName {string} - Common color name (e.g., 'Navy Blue', 'Forest Green')
 *   - rgb {Object} - RGB color values {r, g, b}
 *   - hex {string} - Hexadecimal color string (e.g., '#ff5733') */
async function getColorData(imageBuffer) {
  const startTime = Date.now();
  const [{ imagePropertiesAnnotation }] = await client.imageProperties({
    image: { content: imageBuffer }
  });

  logExternalApiCall('Vision API', 'imageProperties', {
    duration: Date.now() - startTime,
  });


  const color = imagePropertiesAnnotation.dominantColors.colors[0].color;
  const r = color.red || 0;
  const g = color.green || 0;
  const b = color.blue || 0;

  const hex = rgbToHex(r, g, b);
  const colorName = ntc.name(hex)[1];

  return {
    colorName: colorName,
    rgb: {r, g, b},
    hex: hex
  };
}
 /**
 * Detects apparel objects in an image and extracts their labels and color data
 * @param {Buffer} imageBuffer - Image buffer to analyze
 * @returns {Promise<Array<Object>>} Array of apparel objects with label, colorName, rgb, and hex properties
 */

async function getObjects(imageBuffer) {
  const startTime = Date.now();
  const request = createVisionRequest(imageBuffer);
  const [result] = await client.objectLocalization(request);
  const objects = result.localizedObjectAnnotations;

  logExternalApiCall('Vision API', 'objectLocalization', {
    duration: Date.now() - startTime,
    objectsDetected: objects?.length || 0,
  });

  console.log('\n=== All detected objects ===');
  objects.forEach(obj => {
    console.log(`  ${obj.name} (confidence: ${obj.score.toFixed(2)})`);
  });
  console.log('===========================\n');

  const apparelItems = objects.filter(obj => isApparel(obj.name));

  //get unique apparel to avoid duplicate objects being detected by vision api
  const uniqueApparel = [];
  const seenTypes = new Set();
  
  for (const item of apparelItems) {
    if (!seenTypes.has(item.name)) {
      uniqueApparel.push(item);
      seenTypes.add(item.name);
    }
  }
  
  const { width, height } = await sharp(imageBuffer).metadata();

  const apparelData = [];

  for (const object of uniqueApparel) {
    const croppedBuffer = await cropObject(imageBuffer, object.boundingPoly, width, height);
    const label = await getDetailedLabel(croppedBuffer, object.name);
    const colorData = await getColorData(croppedBuffer);

    apparelData.push({
      label: label,
      colorName: colorData.colorName,
      rgb: colorData.rgb,
      hex: colorData.hex
    });

  }

  return apparelData;
}

/**
 * Finds the most similar apparel object based on user query
 * @param {Array<Object>} apparelData - Array of detected apparel objects
 * @param {string} userQuery - User's search query
 * @returns {Object|null} Matching apparel object or first item if no match, null if empty
*/
function findClosestApparel(apparelData, userQuery) {
  
  if (!apparelData || apparelData.length === 0) {
    return null;
  }
  
  // If no query, return first item
  if (!userQuery || userQuery.trim() === '') {
    console.log('No query provided, returning first item:', apparelData[0].label);
    return apparelData[0];
  }

  const query = userQuery.toLowerCase().trim();
  console.log('\n=== Finding closest apparel for query:', query, '===');
  
  // score each apparel item based on querry
  const scoredItems = apparelData.map(item => {
    const label = item.label.toLowerCase();
    let score = 0;
    
    if (label === query) {
      score = 1000;
      return { item, score };
    }
    
    if (label.includes(query)) {
      score = 500;
      return { item, score };
    }
    
    if (query.includes(label)) {
      score = 400;
      return { item, score };
    }
    
    let categoryMatched = false;
    if (typeof CATEGORIES !== 'undefined') {
      for (const [category, keywords] of Object.entries(CATEGORIES)) {
        const queryMatchesCategory = keywords.some(keyword => query.includes(keyword));
        const labelMatchesCategory = keywords.some(keyword => label.includes(keyword));
        
        if (queryMatchesCategory && labelMatchesCategory) {
          score = 300;
          categoryMatched = true;
          break;
        }
      }
    }
    
    // does the word matching
    if (!categoryMatched) {
      const queryWords = query.split(/\s+/);
      const labelWords = label.split(/\s+/);
      
      let wordMatches = 0;
      for (const queryWord of queryWords) {
        for (const labelWord of labelWords) {
          if (queryWord === labelWord) {
            wordMatches += 50;
          } else if (queryWord.includes(labelWord) || labelWord.includes(queryWord)) {
            wordMatches += 25;
          }
        }
      }
      
      score += wordMatches;
      // if (wordMatches > 0) {
      //   console.log(`"${item.label}": Word matches, score: ${score}`);
      // } else {
      //   console.log(`"${item.label}": No match`);
      // }
    }
    
    return { item, score };
  });
  
  scoredItems.sort((a, b) => b.score - a.score);
  const selected = scoredItems[0];
  
  // if score 0 return null, do not generate image.
  if (selected.score === 0) {
    console.log(`no ${query} object found`);
    return null;
  }
  return selected.item;
}

/**
 * Recolors a generated image to match the target color
 * I need this in order to get the proper color of the apparel the user wants.
 * @param {Buffer} imageBuffer - Generated image buffer
 * @param {Object} targetRgb - Target RGB color {r, g, b}
 * @returns {Promise<Buffer>} Recolored image buffer
 */
async function recolorImage(imageBuffer, targetRgb) {
  const image = sharp(imageBuffer);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  
  // rgb math to recolor image 
  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  const WHITE_THRESHOLD = 240;
  
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const isBackground = r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
    
    if (!isBackground) {
      sumR += r;
      sumG += g;
      sumB += b;
      count++;
    }
  }
  
  if (count === 0) return imageBuffer;
  
  const avgR = sumR / count;
  const avgG = sumG / count;
  const avgB = sumB / count;
  
  //calculates shift needed for new color
  const shiftR = targetRgb.r - avgR;
  const shiftG = targetRgb.g - avgG;
  const shiftB = targetRgb.b - avgB;
  
  console.log(`Recoloring: RGB(${Math.round(avgR)}, ${Math.round(avgG)}, ${Math.round(avgB)}) -> RGB(${targetRgb.r}, ${targetRgb.g}, ${targetRgb.b})`);
  
  // some code i needed to stop the the whole image from being black if apparel is black
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const isBackground = r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
    
    if (!isBackground) {
      data[i] = Math.max(0, Math.min(255, Math.round(r + shiftR)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g + shiftG)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b + shiftB)));
    }
  }
  
  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  }).png().toBuffer();
}

/**
 * Generates a product image using Vertex AI Imagen based on apparel data
 * Uses neutral color then recolors to match detected color
 * @param {Array<Object>} apparelData - Array of detected apparel objects
 * @param {string} userQuery - User's search query to find matching apparel
 * @returns {Promise<string>} Base64 encoded image string
 */
async function generateImage(apparelData, userQuery) {
  const apparel = findClosestApparel(apparelData, userQuery);
  
  if (!apparel) {
    const detectedItems = apparelData.map(item => item.label).join(', ');
    throw new Error(`Could not find "${userQuery}" in the image. Here is wat is found in image: ${detectedItems}`);
  }

  // using beige as neutral color because gemini image generation isn't handling white backgrounds well when recoloring
  const NEUTRAL_COLOR = 'beige';
  const NEUTRAL_HEX = '#c8b299';
  
  // Need to generate object in nuetral color first. The image generation returns orange if specific hex code or rbg value was part of the prompt.
  // Work around I found that applies accurate color beside generic ('green', 'yellow', etc.)is to to make a blank apparel image and then to apply
  // color to it later.
  const imagePrompt = `A ${NEUTRAL_COLOR} ${apparel.label} with the hex color ${NEUTRAL_HEX} laid flat on a pure white background, product photography style.`;
  console.log(`Generating ${apparel.label}, will recolor to ${apparel.colorName} ${apparel.hex}`);

  const projectID = process.env.GOOGLE_CLOUD_PROJECT;
  const location = 'us-central1';
  
  const endpoint = `projects/${projectID}/locations/${location}/publishers/google/models/imagegeneration@006`;
  
  const instanceValue = helpers.toValue({ prompt: imagePrompt });
  const parametersValue = helpers.toValue({ sampleCount: 1 });

  const request = {
    endpoint,
    instances: [instanceValue],
    parameters: parametersValue,
  };

  
  const [response] = await aiClient.predict(request);
  
  
  if (response.predictions && response.predictions.length > 0) {
    const prediction = response.predictions[0];
    
    let base64Image;
    if (prediction.structValue) {
      base64Image = prediction.structValue.fields.bytesBase64Encoded.stringValue;
    } else if (prediction.bytesBase64Encoded) {
      base64Image = prediction.bytesBase64Encoded;
    } else {
      const decoded = helpers.fromValue(prediction);
      base64Image = decoded.bytesBase64Encoded;
    }
    
    if (!base64Image) {
      throw new Error('No base64 image in prediction');
    }
    
    // recolor the generated image to match target color
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const recoloredBuffer = await recolorImage(imageBuffer, apparel.rgb);
    return recoloredBuffer.toString('base64');
  }
  
  console.error('No predictions in response:', response);
  throw new Error('No predictions returned');
}

/**
 * Converts RGB to basic color name for shopping queries
 * Uses RGB values to determine the closest basic color
 * @param {Object} rgb - RGB values {r, g, b}
 * @returns {string} Basic color name (red, blue, green, etc.)
 */
function getBasicColorFromRGB(rgb) {
  const {r, g, b} = rgb;
  
  // needed this function because searching for better shopping links. 
  // Basic colors yeild better results the over 1k colors that ntc 
  // has. Red Active Shirt yeilds better results.

  //catulate brightness and saturation
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const brightness = (r + g + b) / 3;
  const saturation = max - min;
  
  // grayscale colors (low saturation)
  if (saturation < 30) {
    if (brightness < 50) return 'black';
    if (brightness < 130) return 'gray';
    if (brightness < 200) return 'light gray';
    return 'white';
  }
  
  //determine dominant color
  if (r === max) {
    
    // Red is dominant
    if (g > 150 && b < 100) return 'orange';
    if (g > 80 && b < 80 && r > 120) return 'brown';
    if (b > 130) return 'pink';
    return 'red';
  } else if (g === max) {
    // Green is dominant
    if (r > 150 && b < 100) return 'yellow';
    if (r > 80 && b > 80) return 'olive';
    return 'green';
  } else {
    // Blue is dominant
    if (r > 130 && g < 100) return 'purple';
    if (g > 130) return 'teal';
    if (brightness < 100) return 'navy';
    return 'blue';
  }
}

/**
 * Generates a Google Shopping search link for the apparel
 * @param {string} apparelLabel - The apparel label (e.g., "baseball cap")
 * @param {Object} rgb - The RGB color values {r, g, b}
 * @returns {Array<Object>} Array with single Google Shopping link
 */
function getShoppingLinks(apparelLabel, rgb) {
  const basicColor = getBasicColorFromRGB(rgb);
  const query = `${basicColor} ${apparelLabel}`;
  const encodedQuery = encodeURIComponent(query);
  const googleShoppingUrl = `https://www.google.com/search?tbm=shop&q=${encodedQuery}`;
  
  return [{
    url: googleShoppingUrl,
    title: `Search Google Shopping for "${query}"`
  }];
}



// Health check to see server responds for uptime probes.
app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Auth + image routes ---
app.post('/auth/register', async (req, res) => {
  const { fullName, username, email, password } = req.body;

  if (!fullName || !username || !email || !password) {
    return res.status(400).json({ error: 'Full name, username, email, and password are required' });
  }

  try {
    const token = await authService.registerUser(fullName, username, email, password);
    res.json({ token, user: { username, email } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await authService.loginUser(email, password);
    res.json({ token: result.token, user: { username: result.username, email } });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Only authenticated users can generate + store their images.
app.post('/recommend', authenticateToken(jwtSecret), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).send('No image uploaded.');

  const requestStartTime = Date.now();
  try {
    let apparelData = await getObjects(req.file.buffer);

    const userQuery = req.body.query || '';
    console.log(`User query received: "${userQuery}"`);
    
    // Find the matching apparel first
    const selectedApparel = findClosestApparel(apparelData, userQuery);
    
    const generatedImage = await generateImage(apparelData, userQuery);

    // Generate shopping links using the selected apparel
    let shoppingLinks = [];
    if (selectedApparel) {
      shoppingLinks = getShoppingLinks(selectedApparel.label, selectedApparel.rgb);
    }

    const imageId = `${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // Save base64 image to Google Cloud Storage and metadata to Datastore
    await imageService.addImageForUser(req.user.email, {
      id: imageId,
      timestamp: timestamp,
      base64: generatedImage
    });

    // Log successful image generation
    logImageGeneration(req.user.email, {
      query: userQuery,
      apparelDetected: apparelData.map(a => a.label),
      selectedApparel: selectedApparel?.label,
      imageId,
      duration: Date.now() - requestStartTime,
    });

    res.json({ 
      image: generatedImage, 
      id: imageId, 
      timestamp: timestamp,
      shoppingLinks: shoppingLinks});
  } catch (error) {
    logError(error, {
      userId: req.user.email,
      endpoint: '/recommend',
      query: req.body.query,
    });
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Error generating image',
      message: error.message,
      details: error.toString()
    });
  }
});

app.get('/images', authenticateToken(jwtSecret), async (req, res) => {
  try {
    console.log(`Fetching images for user: ${req.user.email}`);
    const images = await imageService.getImagesForUser(req.user.email);
    console.log(`Found ${images.length} images for user ${req.user.email}`);
    res.json({ images });
  } catch (err) {
    console.error('Failed to fetch images for user:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to fetch images', details: err.message });
  }
});

// Serve React app for all other routes in production
app.get('/*splat', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Cloud Logging: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'Enabled' : 'Console only'}`);
});

