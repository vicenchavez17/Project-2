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
} from './authService.js';

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
 * @returns {Promise<string>} Specific apparel label or 'unknown'
 */
async function getDetailedLabel(croppedBuffer) {
  const [{ labelAnnotations }] = await client.labelDetection({
    image: { content: croppedBuffer },
    maxResults: 50
  });


  //debugging
  console.log('All labels for this item:');
  labelAnnotations.forEach((l, i) => {
    console.log(`${i}: ${l.description} (${l.score})`);
  });

  const label = labelAnnotations.find(l => {
    const desc = l.description.toLowerCase();
    return APPAREL_WHITE_LIST.some(term => desc.includes(term));
  });

  return label?.description || 'unknown';
}

/**
 * Extracts the dominant color name, rgb, and hex code from an image and returns its common name
 * @param {Buffer} imageBuffer - Image buffer to analyze
 * @returns {Promise<Object>} Object containing:
 *   - colorName {string} - Common color name (e.g., 'Navy Blue', 'Forest Green')
 *   - rgb {Object} - RGB color values {r, g, b}
 *   - hex {string} - Hexadecimal color string (e.g., '#ff5733') */
async function getColorData(imageBuffer) {

  const [{ imagePropertiesAnnotation }] = await client.imageProperties({
    image: { content: imageBuffer }
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
  const request = createVisionRequest(imageBuffer);
  const [result] = await client.objectLocalization(request);
  const objects = result.localizedObjectAnnotations;

  // console.log('All detected objects:');
  // objects.forEach(obj => {
  //   console.log(`  ${obj.name} (${obj.score})`);
  // });

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
  
  console.log(`Filtered to ${uniqueApparel.length} unique apparel items`);
  const { width, height } = await sharp(imageBuffer).metadata();

  const apparelData = [];

  for (const object of uniqueApparel) {
    const croppedBuffer = await cropObject(imageBuffer, object.boundingPoly, width, height);
    const label = await getDetailedLabel(croppedBuffer);
    const colorData = await getColorData(croppedBuffer);

    console.log(`${colorData.colorName} ${label}`);

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
 */function findClosestApparel(apparelData, userQuery) {
  if (!userQuery || userQuery.trim() === '') {
    return apparelData.length > 0 ? apparelData[0] : null;
  }

  const query = userQuery.toLowerCase();
  
  let targetCategory = null;
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(keyword => query.includes(keyword))) {
      targetCategory = category;
      break;
    }
  }
  
  //if no label found, return first object
  if (!targetCategory) {
    return apparelData.length > 0 ? apparelData[0] : null;
  }
  
  const matches = apparelData.filter(item => {
    const itemLabel = item.label.toLowerCase();
    return CATEGORIES[targetCategory].some(keyword => itemLabel.includes(keyword));
  });
  
  return matches.length > 0 ? matches[0] : apparelData[0];
}

/**
 * Generates a product image using Vertex AI Imagen based on apparel data
 * @param {Array<Object>} apparelData - Array of detected apparel objects
 * @param {string} userQuery - User's search query to find matching apparel
 * @returns {Promise<string>} Base64 encoded image string
 */
async function generateImage(apparelData, userQuery) {
  const apparel = findClosestApparel(apparelData, userQuery);
  
  if (!apparel) {
    throw new Error('No apparel found');
  }

  const imagePrompt = `A ${apparel.colorName} ${apparel.label} with the hex color ${apparel.hex} laid flat on a pure white background, product photography style.`;
  console.log('Image prompt:', imagePrompt);

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
  
  console.log('Full response:', JSON.stringify(response, null, 2));
  console.log('Predictions:', response.predictions);
  
  if (response.predictions && response.predictions.length > 0) {
    const prediction = response.predictions[0];
    console.log('First prediction:', JSON.stringify(prediction, null, 2));
    
    if (prediction.structValue) {
      return prediction.structValue.fields.bytesBase64Encoded.stringValue;
    } else if (prediction.bytesBase64Encoded) {
      return prediction.bytesBase64Encoded;
    } else {
      const decoded = helpers.fromValue(prediction);
      console.log('Decoded prediction:', decoded);
      return decoded.bytesBase64Encoded;
    }
  }

  throw new Error('No predictions returned');
}

// Health check to see server responds for uptime probes.
app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Auth + image routes ---
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const token = await authService.registerUser(email, password);
    res.json({ token });
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
    const token = await authService.loginUser(email, password);
    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Only authenticated users can generate + store their images.
app.post('/recommend', authenticateToken(jwtSecret), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).send('No image uploaded.');

  try {
    let apparelData = await getObjects(req.file.buffer);
    for (const object of apparelData) {
      console.log(`label: ${object.label}`);
      console.log(`colorName: ${object.colorName}`);
      console.log(`rgb: ${object.rgb.r}, ${object.rgb.g}, ${object.rgb.b}`);
      console.log(`hex: ${object.hex}`);
    }

    const userQuery = req.body.query || '';
    const generatedImage = await generateImage(apparelData, userQuery);

    const imageId = `${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // Save base64 image to Google Cloud Storage and metadata to Datastore
    await imageService.addImageForUser(req.user.email, {
      id: imageId,
      timestamp: timestamp,
      base64: generatedImage
    });

    res.json({ image: generatedImage, id: imageId, timestamp: timestamp });
  } catch (error) {
    console.log(error);
    console.log('ERROR CAUGHT /generate');
    res.status(500).send('Error generating image');
  }
});

app.get('/images', authenticateToken(jwtSecret), async (req, res) => {
  try {
    const images = await imageService.getImagesForUser(req.user.email);
    res.json({ images });
  } catch (err) {
    console.error('Failed to fetch images for user:', err);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
