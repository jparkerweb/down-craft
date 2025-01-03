// -----------------------------------------------------------------
// -- Convert PDF to Markdown using LLM-based OCR --
// -----------------------------------------------------------------

import pkg from 'canvas';
const { createCanvas, DOMMatrix, DOMPoint, ImageData } = pkg;
import { savePDFAsImages } from "../lib/save-pdf-as-image.js";
import scribe from 'scribe.js-ocr';
import fs from "fs/promises";
import path from "path";
import dotenv from 'dotenv';

dotenv.config();

// savePDFAsImages options
// const llmPageScale = parseInt(process.env.LLM_PAGE_SCALE) || 2;
const llmPageScale = 4;
const llmPagesPerBatch = parseInt(process.env.LLM_PAGES_PER_BATCH) || 8;  // Optimized for LLM API limits and context window

// Minimal Path2D polyfill
class Path2DPolyfill {
  constructor(path) {
    this.path = path;
  }
  
  addPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
  arc() {}
  arcTo() {}
  ellipse() {}
  rect() {}
}

// Add polyfills for canvas
globalThis.DOMMatrix = DOMMatrix;
globalThis.DOMPoint = DOMPoint;
globalThis.createCanvas = createCanvas;
globalThis.Path2D = Path2DPolyfill;
globalThis.ImageData = ImageData;

// -----------------------------------------------------------------
// -- Convert PDF to images and process with LLM OCR --
// -----------------------------------------------------------------
async function processImagesWithScribe(pdfBuffer) {
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
    await savePDFAsImages(pdfData, pagesDir, llmPageScale, llmPagesPerBatch);

    // Process images with LLM OCR
    const imagePaths = await fs.readdir(pagesDir);
    const sortedPaths = imagePaths.sort((a, b) => {
      const pageA = parseInt(a.match(/batch-(\d+)/)?.[1] || "0");
      const pageB = parseInt(b.match(/batch-(\d+)/)?.[1] || "0");
      return pageA - pageB;
    });

    let markdown = "";
    for (const imagePath of sortedPaths) {
      try {
        // const imageBuffer = await fs.readFile(path.join(pagesDir, imagePath));
        const fullPath = path.join(pagesDir, imagePath);
        // let ocrResult = await llmToMarkdown(imageBuffer, 'jpeg', llmParams);


        // const tempPath = path.join(process.cwd(), 'temp.pdf');
        // await fs.writeFile(tempPath, pdfBuffer);
        
        // const ocrResult = await scribe.extractText([imagePath]);
        const ocrResult = await scribe.extractText([fullPath]);
        // await fs.unlink(tempPath);
        
        if (ocrResult.startsWith("Error")) {
          continue;
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
    throw new Error(`Scribe-Image PDF conversion failed: ${error.message}`);
  }
}

/**
 * Convert PDF buffer to Markdown using LLM-based OCR
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Markdown content
 */
export async function scribeImageConverter(pdfBuffer) {
  return processImagesWithScribe(pdfBuffer);
}

export default scribeImageConverter;
