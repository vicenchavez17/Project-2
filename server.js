import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import vision from '@google-cloud/vision';
import multer from 'multer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024}, 
});

const createVisionRequest = (imageBuffer, maxResults = 30) => ({
  image: {content: imageBuffer},
  maxResults
});

const client = new vision.ImageAnnotatorClient();

async function getObjects(imageBuffer) {
  // TODO
  const request = createVisionRequest(imageBuffer);
  const [result] = await client.objectLocalization(request);
  const objects = result.localizedObjectAnnotations; 

  objects.forEach(object => {
    console.log(`Object: ${object.name}`);
    console.log(`Confidence: ${object.score}`);
    console.log('Bounding box vertices:');
    
    object.boundingPoly.normalizedVertices.forEach((vertex, i) => {
      console.log(`  Vertex ${i}: (${vertex.x}, ${vertex.y})`);
    });
  });

  return objects;
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
  } catch (error) {
    console.log('error');
  }
});
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
