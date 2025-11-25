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

function rgbToHex(r,g,b) {
  return '#' + r.toString(16).padStart(2,'0') 
    + g.toString(16).padStart(2,'0')
    + b.toString(16).padStart(2,'0');
}

function isApparel(obj) {
  const object = obj.toLowerCase();

  return APPAREL_WHITE_LIST.some(apparelTerm =>
    object.includes(apparelTerm)
  );
}

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

async function getDetailedLabel(croppedBuffer) {
  const [{ labelAnnotations }] = await client.labelDetection({
    image: { content: croppedBuffer }
  });


  //debugging
  // console.log('All labels for this item:');
  // labelAnnotations.forEach((l, i) => {
  //   console.log(`${i}: ${l.description} (${l.score})`);
  // });

  //skipping useless or broad labels
  const skipWords = [
    //colors
    'blue', 'red', 'green', 'yellow', 'black', 'white', 'pink', 'purple', 'orange', 'brown', 'gray', 'grey',
    //generic terms
    'sleeve', 'collar', 'button', 'fabric', 'textile', 'material', 'clothing', 'garment', 'wear',
    //body parts
    'shoulder', 'neck', 'arm', 'hand', 'elbow', 'muscle', 'chest', 'torso',
    //actions/poses
    'standing', 'sitting', 'walking', 'running'
  ];
  const label = labelAnnotations.find(l => 
    !skipWords.includes(l.description.toLowerCase())
  );

  return label?.description || 'unknown';
}

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
