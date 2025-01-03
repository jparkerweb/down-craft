// -----------------------------------------------------------------
// -- Convert PDF to Markdown using OCR --
// -----------------------------------------------------------------

import { createCanvas, DOMMatrix, DOMPoint } from "canvas";
import { savePDFAsImages } from "../lib/save-pdf-as-image.js";
import { performOCRWithMarkdown } from "../lib/image-ocr.js";
import fs from "fs/promises";
import path from "path";
import dotenv from 'dotenv';

dotenv.config();

// savePDFAsImages options
const ocrPageScale = parseInt(process.env.OCR_PAGE_SCALE) || 2;
const ocrPagesPerBatch = parseInt(process.env.OCR_PAGES_PER_BATCH) || 15;  // Optimized for Tesseract memory/speed tradeoff

// Add polyfills for canvas
globalThis.DOMMatrix = DOMMatrix;
globalThis.DOMPoint = DOMPoint;
globalThis.createCanvas = createCanvas;
globalThis.Path2D = global.Path2D;

// -----------------------------------------------------------------
// -- Convert PDF to images and process with OCR --
// -----------------------------------------------------------------
async function processPdfWithOcr(pdfBuffer) {
  try {
    // Create base output directory
    const tempOutputBaseDir = "temp-images";
    await fs.mkdir(tempOutputBaseDir, { recursive: true });

    const pdfData = new Uint8Array(pdfBuffer);
    const currentTime = Date.now();
    const outputDir = path.join(tempOutputBaseDir, currentTime.toString());
    await fs.mkdir(outputDir, { recursive: true });

    // Convert PDF pages to images
    const pagesDir = path.join(outputDir, "pages");
    await savePDFAsImages(pdfData, pagesDir, ocrPageScale, ocrPagesPerBatch);

    // Process images with OCR
    const imagePaths = await fs.readdir(pagesDir);
    const sortedPaths = imagePaths.sort((a, b) => {
      const pageA = parseInt(a.match(/batch-(\d+)/)?.[1] || "0");
      const pageB = parseInt(b.match(/batch-(\d+)/)?.[1] || "0");
      return pageA - pageB;
    });

    let markdown = "";
    for (const imagePath of sortedPaths) {
      try {
        const imageBuffer = await fs.readFile(path.join(pagesDir, imagePath));
        let ocrResult = await performOCRWithMarkdown(imageBuffer, 'jpeg');

        // Retry once on error
        if (ocrResult.startsWith("Error")) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          ocrResult = await performOCRWithMarkdown(imageBuffer, 'jpeg');
          
          if (ocrResult.startsWith("Error")) {
            continue;
          }
        }

        markdown += ocrResult + "\n\n";
      } catch (error) {
        // console.error(`Failed to process batch ${imagePath}:`, error);
      }
    }

    // Cleanup
    await fs.rm(outputDir, { recursive: true, force: true });

    // Cleanup old directories (older than 10 minutes)
    try {
      const subdirs = await fs.readdir(tempOutputBaseDir, { withFileTypes: true });
      const tenMinutesAgo = currentTime - 10 * 60 * 1000;

      for (const dirent of subdirs) {
        if (dirent.isDirectory()) {
          const dirTime = parseInt(dirent.name, 10);
          if (!isNaN(dirTime) && dirTime < tenMinutesAgo) {
            await fs.rm(path.join(tempOutputBaseDir, dirent.name), { 
              recursive: true, 
              force: true 
            });
          }
        }
      }
    } catch (error) {
      // Ignore directory cleanup errors
    }

    return markdown.trim();
  } catch (error) {
    throw new Error(`OCR PDF conversion failed: ${error.message}`);
  }
}

/**
 * Convert PDF buffer to Markdown using OCR
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Markdown content
 */
export async function ocrConverter(pdfBuffer) {
  if (!Buffer.isBuffer(pdfBuffer)) {
    throw new Error('Input must be a Buffer');
  }

  return processPdfWithOcr(pdfBuffer);
}

export default ocrConverter;
