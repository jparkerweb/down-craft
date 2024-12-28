import pkg from 'pdfjs-dist';
const { getDocument, OPS } = pkg;
import { fileURLToPath } from 'url';
import path from 'path';

// Set up PDF.js worker
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import worker separately
import * as PdfWorker from 'pdfjs-dist/build/pdf.worker.entry.js';
if (typeof globalThis.window === 'undefined') {
  const { Worker } = await import('worker_threads');
  globalThis.Worker = Worker;
}

/**
 * Extract images from a PDF buffer
 * @param {Buffer|ArrayBuffer} pdfBuffer - PDF file contents as buffer
 * @param {Object} options - Optional configuration
 * @param {string[]} options.imageTypes - Array of image types to extract (e.g. ['jpeg', 'png'])
 * @param {number} options.minSize - Minimum image size in bytes to extract
 * @returns {AsyncGenerator<{data: Uint8Array, type: string, width: number, height: number}>}
 */
export async function* extractPdfImages(pdfBuffer, options = {}) {
  const {
    imageTypes = ['jpeg', 'png'], 
    minSize = 100,
    timeout = 10000
  } = options;

  // Create a fresh Uint8Array by copying the data
  const pdfData = new Uint8Array(pdfBuffer);

  const loadingTask = getDocument({
    data: pdfData,
    useSystemFonts: true,
    standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/')
  });

  try {
    // console.log('Loading PDF document...');
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    // console.log(`PDF loaded. Processing ${numPages} pages...`);

    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    //   console.log(`Processing page ${pageNum}...`);
      const page = await pdfDocument.getPage(pageNum);
      const operatorList = await page.getOperatorList();
      const commonObjs = page.commonObjs;
      
    //   console.log(`Found ${operatorList.fnArray.length} operators on page ${pageNum}`);
      
      // Find and process image objects
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        if (operatorList.fnArray[i] === OPS.paintImageXObject) {
          const imgName = operatorList.argsArray[i][0];
        //   console.log(`Found image ${imgName} on page ${pageNum}`);
          
          // Wait for the image object to be fully loaded with timeout
          try {
            const img = await Promise.race([
              new Promise((resolve, reject) => {
                const interval = setInterval(() => {
                  try {
                    const img = commonObjs.get(imgName);
                    if (img) {
                      clearInterval(interval);
                      resolve(img);
                    }
                  } catch (e) {
                    // Object not resolved yet, continue waiting
                  }
                }, 50);
                
                // Make sure to clear the interval on timeout
                setTimeout(() => {
                  clearInterval(interval);
                }, timeout);
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Timeout waiting for image ${imgName}`)), timeout)
              )
            ]);

            if (img && img.data && img.data.length > minSize) {
              const imageType = determineImageType(img.data);
              if (imageTypes.includes(imageType)) {
                // console.log(`Successfully extracted image ${imgName} (${imageType}, ${img.width}x${img.height})`);
                yield {
                  data: img.data,
                  type: imageType,
                  width: img.width,
                  height: img.height,
                  pageNumber: pageNum
                };
              }
            }
          } catch (e) {
            // console.warn(`Failed to process image ${imgName} on page ${pageNum}:`, e.message);
          }
        }
      }
    //   console.log(`Finished processing page ${pageNum}`);
    }
  } finally {
    loadingTask.destroy();
  }
}

/**
 * Determine image type from image data
 * @param {Uint8Array} data - Image data
 * @returns {string} Image type ('jpeg', 'png', etc)
 */
function determineImageType(data) {
  // Check magic numbers in file header
  if (data[0] === 0xFF && data[1] === 0xD8) {
    return 'jpeg';
  }
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
    return 'png';
  }
  return 'unknown';
}

/**
 * Helper to convert image data to base64
 * @param {Uint8Array} data - Image data
 * @param {string} type - Image type
 * @returns {string} Base64 encoded image data
 */
export function imageToBase64(data, type) {
  const base64 = Buffer.from(data).toString('base64');
  return `data:image/${type};base64,${base64}`;
}

/**
 * Helper to save image data to file
 * @param {Uint8Array} data - Image data
 * @param {string} filePath - Path to save image
 * @returns {Promise<void>}
 */
export async function saveImage(data, filePath) {
  const fs = require('fs').promises;
  await fs.writeFile(filePath, Buffer.from(data));
} 