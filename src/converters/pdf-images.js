// ------------------------
// -- Extract PDF images --
// ------------------------

import { saveImagesFromPDF } from '../lib/save-images-from-pdf.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------------------------------------------
// -- Convert PDF to extracted images --
// -----------------------------------------------------------------
async function pdfImagesConverter(pdfBuffer) {
  const timestamp = Date.now();
  const outputDir = path.join(__dirname, '../../temp-images', `pdf-images-${timestamp}`);
  const imagePaths = await saveImagesFromPDF(pdfBuffer, outputDir);
  
  // Format output as markdown with image links
  const markdown = imagePaths
    .map(imagePath => `![Extracted PDF Image](${imagePath})`)
    .join('\n\n');
    
  return markdown;
}

export default pdfImagesConverter;
