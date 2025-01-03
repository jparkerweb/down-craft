// -----------------------------------------------------------------
// -- Hybrid PDF to Markdown converter combining pdf2md with image OCR --
// -----------------------------------------------------------------

import pdf2md from '@opendocsg/pdf2md';
import { saveImagesFromPDF } from '../lib/save-images-from-pdf.js';
import processImagesWithOCR from '../lib/process-images-with-ocr.js';
import path from 'path';
import fs from 'fs/promises';
import { rm } from 'fs/promises';
import { glob } from 'glob';

/**
 * Clean up temp-images folders older than 10 minutes
 */
async function cleanupTempImages() {
  try {
    const tempRoot = path.join(process.cwd(), 'temp-images');
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    // Create temp dir if it doesn't exist
    await fs.mkdir(tempRoot, { recursive: true });

    // Use glob.sync to get folders synchronously
    const folders = glob.sync('*', { cwd: tempRoot });
    
    for (const folder of folders) {
      const folderPath = path.join(tempRoot, folder);
      const stats = await fs.stat(folderPath);
      
      if (stats.mtimeMs < tenMinutesAgo) {
        await rm(folderPath, { recursive: true, force: true });
      }
    }
  } catch (error) {
    console.error('Error cleaning up temp images:', error);
  }
}

/**
 * Convert PDF to Markdown while preserving images and adding OCR text
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Markdown content with image placeholders and OCR text
 */
export async function hybridPdfToMarkdown(pdfBuffer) {
  if (!Buffer.isBuffer(pdfBuffer)) {
    throw new Error('Input must be a Buffer');
  }

  try {
    // Extract markdown using pdf2md
    const baseMarkdown = await pdf2md(pdfBuffer);

    // Extract and process images
    const sessionId = Date.now().toString();
    const tempDir = path.join(process.cwd(), 'temp-images', sessionId);
    const imageInfo = await saveImagesFromPDF(pdfBuffer, tempDir);

    // Process images with OCR
    const imagePaths = [];
    for (const image of imageInfo) {
      // Check if image has a path property
      if (image.path) {
        imagePaths.push({
          path: image.path,
          name: path.basename(image.path),
          page: image.page,
          index: image.index
        });
      } else if (image.name) {
        // If no path but has name, construct the path
        const imagePath = path.join(tempDir, `page_${image.page || 1}_image_${image.index || 1}.png`);
        if (await fs.access(imagePath).then(() => true).catch(() => false)) {
          imagePaths.push({
            path: imagePath,
            name: path.basename(imagePath),
            page: image.page,
            index: image.index
          });
        }
      }
    }

    console.log('Found images:', JSON.stringify(imagePaths, null, 2));

    if (imagePaths.length > 0) {
      // Add image placeholders to markdown
      let finalMarkdown = baseMarkdown;
      for (const image of imagePaths) {
        // Find a good spot to insert the image - after a newline
        const lines = finalMarkdown.split('\n');
        const imageIndex = lines.findIndex(line => line.includes('image:') || line.includes('Image:'));
        if (imageIndex !== -1) {
          lines.splice(imageIndex + 1, 0, `\n![Image_${image.page}_${image.index}](${image.name})\n`);
          finalMarkdown = lines.join('\n');
        } else {
          // If no good spot found, append to end
          finalMarkdown += `\n\n![Image_${image.page}_${image.index}](${image.name})\n`;
        }
      }

      // Process images with OCR
      const ocrResults = await processImagesWithOCR(imagePaths);
      console.log('OCR Results:', JSON.stringify(ocrResults, null, 2));

      // Create OCR map
      const imageOcrMap = {};
      for (const result of ocrResults) {
        if (result?.ocrText) {
          const key = `page_${result.page || 1}_image_${result.index || 1}.png`;
          console.log('Mapping OCR result for:', key);
          imageOcrMap[key] = result.ocrText;
        }
      }

      console.log('Image OCR Map:', JSON.stringify(imageOcrMap, null, 2));

      // Insert OCR text after images
      for (const image of imagePaths) {
        const ocrText = imageOcrMap[image.name];
        console.log('Looking up OCR text for:', image.name, 'Found:', ocrText ? 'yes' : 'no');
        
        if (ocrText) {
          // Find position to insert OCR text (after the image)
          const imgPattern = new RegExp(`!\\[Image_${image.page}_${image.index}\\]\\(${image.name}\\)`);
          finalMarkdown = finalMarkdown.replace(imgPattern, (match) => {
            const cleanedText = ocrText.trim()
              .replace(/^\s+|\s+$/gm, '') // Remove leading/trailing whitespace from each line
              .split('\n')
              .filter(line => line.length > 0) // Remove empty lines
              .join('\n');
            return `\n> ${cleanedText.split('\n').join('\n> ')}\n`;
          });
        }
      }

      // Do not clean up temp images
      // await cleanupTempImages();

      return finalMarkdown;
    }

    return baseMarkdown;
  } catch (error) {
    throw new Error(`PDF conversion failed: ${error.message}`);
  }
}

export default hybridPdfToMarkdown;
