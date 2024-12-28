import pkg from 'pdfjs-dist';
const { getDocument } = pkg;
import { promises as fs } from 'fs';
import path from 'path';
import canvas from 'canvas';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import worker separately
import * as PdfWorker from 'pdfjs-dist/build/pdf.worker.entry.js';
if (typeof globalThis.window === 'undefined') {
  const { Worker } = await import('worker_threads');
  globalThis.Worker = Worker;
}

/**
 * Converts a PDF buffer to a series of PNG images
 * @param {Buffer} pdfBuffer - Buffer containing the PDF data
 * @param {string} outputDir - Directory to save the images
 * @param {number} scale - Scale factor for the output images (default: 2.0)
 * @returns {Promise<string[]>} Array of paths to the generated images
 */
async function savePDFAsImages(pdfBuffer, outputDir, scale = 2.0) {
  // Create a fresh Uint8Array by copying the data
  const pdfData = new Uint8Array(pdfBuffer);
  
  const doc = await getDocument({
    data: pdfData,
    useSystemFonts: true,
    standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/'),
    canvasFactory: {
      create: function(width, height) {
        const canvasInstance = canvas.createCanvas(width, height);
        return {
          canvas: canvasInstance,
          context: canvasInstance.getContext('2d'),
        };
      },
      reset: function(canvasAndContext, width, height) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
      },
      destroy: function(canvasAndContext) {
        // no need to destroy anything
      }
    }
  }).promise;

  const imagePaths = [];
  await fs.mkdir(outputDir, { recursive: true });

  // Convert each page to an image
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvasInstance = canvas.createCanvas(viewport.width, viewport.height);
    const context = canvasInstance.getContext('2d');

    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvasFactory: {
        create: function(width, height) {
          const canvas = canvasInstance;
          return {
            canvas,
            context: context,
          };
        },
        reset: function(canvasAndContext, width, height) {
          canvasAndContext.canvas.width = width;
          canvasAndContext.canvas.height = height;
        },
        destroy: function(canvasAndContext) {
          // no need to destroy anything
        }
      }
    }).promise;

    const imagePath = path.join(outputDir, `page-${pageNum}.png`);
    const buffer = canvasInstance.toBuffer('image/png');
    await fs.writeFile(imagePath, buffer);
    imagePaths.push(imagePath);
  }

  return imagePaths;
}


export { savePDFAsImages };
