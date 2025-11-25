import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import vision from '@google-cloud/vision';
import multer from 'multer';
import sharp from 'sharp';
import ntc from 'ntc';
import { APPAREL_WHITE_LIST, CONFIG_PORT } from './config.js';

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || CONFIG_PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024}, 
});

const createVisionRequest = (imageBuffer, maxResults = 30) => ({
  image: {content: imageBuffer},
  maxResults
});

const client = new vision.ImageAnnotatorClient();


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

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/recommend', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).send('No image uploaded.');
  
  try {
    let apparelData = await getObjects(req.file.buffer);
    for (const object of apparelData) {
      console.log(`label: ${object.label}`);
      console.log(`colorName: ${object.colorName}`);
      console.log(`rgb: ${object.rgb.r}, ${object.rgb.g}, ${object.rgb.b}`);
      console.log(`hex: ${object.hex}`);
    }
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    console.log('ERROR CAUGHT /generate');
  }
});


app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
