// -----------------------------------------------------------------
// -- Convert PDF to Markdown using LLM-based OCR --
// -----------------------------------------------------------------

import { createCanvas, DOMMatrix, DOMPoint, ImageData } from "canvas";
import { savePDFAsImages } from "../lib/save-pdf-as-image.js";
import { llmToMarkdown } from "../lib/llm-to-markdown.js";
import fs from "fs/promises";
import path from "path";
import dotenv from 'dotenv';

dotenv.config();

// Add polyfills for canvas
globalThis.DOMMatrix = DOMMatrix;
globalThis.DOMPoint = DOMPoint;
globalThis.createCanvas = createCanvas;
globalThis.Path2D = global.Path2D;
globalThis.ImageData = ImageData;

// -----------------------------------------------------------------
// -- Convert PDF to images and process with LLM OCR --
// -----------------------------------------------------------------
async function processPdfWithLlm(pdfBuffer, llmParams) {
  llmParams = {
    baseURL: llmParams?.baseURL || process.env.LLM_BASE_URL,
    apiKey: llmParams?.apiKey || process.env.LLM_API_KEY,
    model: llmParams?.model || process.env.LLM_MODEL,
    systemPrompt: llmParams?.systemPrompt || process.env.LLM_OCR_SYSTEM_PROMPT,
    userPrompt: llmParams?.userPrompt || process.env.LLM_OCR_USER_PROMPT,
    temperature: llmParams?.temperature || parseFloat(process.env.LLM_TEMPERATURE) || 0
  };
  if (!llmParams.baseURL || !llmParams.apiKey || !llmParams.model) {
    throw new Error('LLM parameters must include baseURL, apiKey, and model');
  }
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
    const pageImagePaths = await savePDFAsImages(pdfData, pagesDir, 2.0);

    // Process images with LLM OCR
    const imagePaths = await fs.readdir(pagesDir);
    const sortedPaths = imagePaths.sort((a, b) => {
      const pageA = parseInt(a.match(/page-(\d+)/)?.[1] || "0");
      const pageB = parseInt(b.match(/page-(\d+)/)?.[1] || "0");
      return pageA - pageB;
    });

    let markdown = "";
    for (const imagePath of sortedPaths) {
      try {
        const imageBuffer = await fs.readFile(path.join(pagesDir, imagePath));
        const imageType = imagePath.split(".").pop();
        let ocrResult = await llmToMarkdown(imageBuffer, imageType, llmParams);

        // Retry once on error
        if (ocrResult.startsWith("Error")) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          ocrResult = await llmToMarkdown(imageBuffer, imageType, llmParams);
          
          if (ocrResult.startsWith("Error")) {
            // console.error(`Failed to process ${imagePath} after retry:`, ocrResult);
            continue;
          }
        }

        markdown += ocrResult + "\n\n";
      } catch (error) {
        // console.error(`Failed to process ${imagePath}:`, error);
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
    throw new Error(`LLM PDF conversion failed: ${error.message}`);
  }
}

/**
 * Convert PDF buffer to Markdown using LLM-based OCR
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {Object} llmParams - LLM configuration parameters
 * @param {string} llmParams.baseURL - Base URL for the LLM API
 * @param {string} llmParams.apiKey - API key for the LLM service
 * @param {string} llmParams.model - Model to use for OCR
 * @returns {Promise<string>} Markdown content
 */
export async function llmConverter(pdfBuffer, llmParams) {
  if (!Buffer.isBuffer(pdfBuffer)) {
    throw new Error('Input must be a Buffer');
  }

  if (!llmParams?.baseURL || !llmParams?.apiKey || !llmParams?.model) {
    throw new Error('LLM parameters must include baseURL, apiKey, and model');
  }

  return processPdfWithLlm(pdfBuffer, llmParams);
}

export default llmConverter;
