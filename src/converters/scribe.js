// ----------------------------------------------
// -- Convert PDF to Markdown using Scribe OCR --
// ----------------------------------------------
import scribe from 'scribe.js-ocr';
import fs from "fs/promises";
import path from "path";
import dotenv from 'dotenv';

dotenv.config();

async function processPdfWithScribe(pdfBuffer) {
  try {
    const tempPath = path.join(process.cwd(), 'temp.pdf');
    await fs.writeFile(tempPath, pdfBuffer);
    
    const markdown = await scribe.extractText([tempPath]);
    await fs.unlink(tempPath);
    
    return markdown.trim();
  } catch (error) {
    throw new Error(`Scribe PDF conversion failed: ${error.message}`);
  }
}


export async function scribeConverter(pdfBuffer) {
  if (!Buffer.isBuffer(pdfBuffer)) {
    throw new Error('Input must be a Buffer');
  }

  return processPdfWithScribe(pdfBuffer);
}

export default scribeConverter;
