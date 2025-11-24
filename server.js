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

async function getObjects(imageBuffer) {
  // TODO
  const request = createVisionRequest(imageBuffer);
  const [result] = await client.objectLocalization(request);
  const objects = result.localizedObjectAnnotations; 
  const apparel = objects.filter((obj) => isApparel(obj.name));

  const metadata = await sharp(imageBuffer).metadata();
  const { width, height } = metadata;

  console.log('---------');
  console.log('apparel:');
  for (const item of apparel) {
    console.log(item.name);
  }

  for (const object of objects) {
    //getting bounding box coords 
    const vertices = object.boundingPoly.normalizedVertices;

    const left = Math.floor(vertices[0].x * width);
    const top = Math.floor(vertices[0].y * height);
    const right = Math.floor(vertices[2].x * width);
    const bottom = Math.floor(vertices[2].y * height);

    const cropWidth = right - left;
    const croptHeight = bottom - top;

    //cropping occurs here.
    const croppedBuffer = await sharp(imageBuffer).extract({ left, top, width: cropWidth, height: croptHeight}).toBuffer();

    //getting colors 
    const [colorsResult] = await client.imageProperties({
      image: { content: croppedBuffer}
    });

    console.log(`object name: ${object.name}`);


    const colors = colorsResult.imagePropertiesAnnotation.dominantColors.colors;
    const color = colors[0];


    console.log('Dominant colors:');
    const r = color.color.red || 0;
    const g = color.color.green || 0;
    const b = color.color.blue || 0;
  
    const hex = rgbToHex(r, g, b);
    const name1 = ntc.name(hex);
    console.log(name1[1]);
  };

  return objects;
}

function getApparel(objects) {
  // TODO
}
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/generate', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).send('No image uploaded.');
  
  // TODO
  try {
    let objects = await getObjects(req.file.buffer);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    console.log('ERROR CAUGHT /generate');
  }
});
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
