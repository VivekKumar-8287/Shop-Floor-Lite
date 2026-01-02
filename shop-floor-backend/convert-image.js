// convert-image.js
import fs from 'fs';
import path from 'path';

const imagePath = './images/PackingMachine.jpg';

const imageBuffer = fs.readFileSync(imagePath);
const base64Image = imageBuffer.toString('base64');

const ext = path.extname(imagePath).slice(1); // jpg, png, etc.

const dataUrl = `data:image/${ext};base64,${base64Image}`;

console.log('Copy this to Postman:');
console.log(dataUrl);

fs.writeFileSync('base64-output.txt', dataUrl);
console.log('\n✅ Also saved to base64-output.txt');