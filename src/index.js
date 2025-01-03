// ----------------------------------------------------------
// -- Main entry point for document-to-markdown conversion --
// ----------------------------------------------------------

import docxToMarkdown from './converters/docx.js';
import pdfToMarkdown from './converters/pdf.js';
import pptxToMarkdown from './converters/pptx.js';
import xlsxToMarkdown from './converters/xlsx.js';
import llmConverter from './converters/llm.js';
import ocrConverter from './converters/ocr.js';
import onnxConverter from './converters/onnx.js';
import scribeConverter from './converters/scribe.js';
import scribeImageConverter from './converters/scribe-image.js';
import pdfImagesConverter from './converters/pdf-images.js';
import scribeWithImagePlaceholder from './converters/scribe-with-image-placeholder.js';
import hybridPdfToMarkdown from './converters/hybrid-pdf.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { rmSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPPORTED_TYPES = ['pdf', 'docx', 'pptx', 'xlsx'];
const CONVERTER_TYPES = ['standard', 'llm', 'ocr', 'onnx', 'scribe', 'scribe-image', 'pdf-images', 'scribe-with-image-placeholder', 'hybrid'];

// ------------------------------------------------
// -- Detect file type from buffer magic numbers --
// ------------------------------------------------
function detectFileType(buffer) {
  // PDF: %PDF
  if (buffer.slice(0, 4).toString() === '%PDF') return 'pdf';
  
  // Office files: PKZip signature
  if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
    // Check for Office XML signatures
    const content = buffer.toString('utf8', 0, 200);
    if (content.includes('word/')) return 'docx';
    if (content.includes('ppt/')) return 'pptx';
    if (content.includes('xl/')) return 'xlsx';
  }
  
  return null;
}

function getSessionCacheDir() {
  const sessionId = crypto.randomBytes(16).toString('hex');
  const cacheDir = join(dirname(__dirname), '.ocr-cache');
  const sessionDir = join(cacheDir, sessionId);
  
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  fs.mkdirSync(sessionDir);
  
  return sessionDir;
}

// Clean up old cache directories
function cleanupOldCaches() {
  /*
  const cacheDir = join(dirname(__dirname), '.ocr-cache');
  if (!fs.existsSync(cacheDir)) return;

  const now = Date.now();
  const oneHourAgo = now - (1 * 60 * 1000);

  fs.readdirSync(cacheDir).forEach(sessionId => {
    const sessionDir = join(cacheDir, sessionId);
    const stats = fs.statSync(sessionDir);

    if (stats.mtimeMs < oneHourAgo) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  });
  */
}

// ------------------------------
// -- Main conversion function --
// ------------------------------
export async function downCraft(fileBuffer, fileType = null, options = {}) {
  // Create a new session-specific cache directory
  const sessionCacheDir = getSessionCacheDir();
  options.cacheDir = sessionCacheDir;

  try {
    if (!Buffer.isBuffer(fileBuffer)) {
      throw new Error('First argument must be a Buffer');
    }

    const { 
      pdfConverterType = 'standard',
      llmParams = null
    } = options;

    if (!CONVERTER_TYPES.includes(pdfConverterType)) {
      throw new Error(`Invalid converter type. Supported types: ${CONVERTER_TYPES.join(', ')}`);
    }

    // Determine file type
    const detectedType = fileType || detectFileType(fileBuffer);
    if (!detectedType || !SUPPORTED_TYPES.includes(detectedType)) {
      throw new Error(`Unsupported or undetected file type. Supported types: ${SUPPORTED_TYPES.join(', ')}`);
    }

    // For LLM converter, validate params
    if (pdfConverterType === 'llm') {
      if (!llmParams || !llmParams.baseURL || !llmParams.apiKey || !llmParams.model) {
        throw new Error('LLM converter requires llmParams object with `baseURL`, `apiKey`, and `model`');
      }
    }

    // Route to appropriate converter
    switch (detectedType) {
      case 'pdf':
        // For PDF files, check converter type
        switch (pdfConverterType) {
          case 'llm':
            return llmConverter(fileBuffer, llmParams);
          case 'ocr':
            return ocrConverter(fileBuffer);
          case 'onnx':
            return onnxConverter(fileBuffer);
          case 'scribe':
            return scribeConverter(fileBuffer);
          case 'scribe-image':
            return scribeImageConverter(fileBuffer);
          case 'pdf-images':
            return pdfImagesConverter(fileBuffer);
          case 'scribe-with-image-placeholder': {
            const result = await scribeWithImagePlaceholder(fileBuffer);
            const markdown = result.text;
            // Don't clean up images yet
            /*
            try {
              const imageDir = join(process.cwd(), result.imageDir);
              if (existsSync(imageDir)) {
                rmSync(imageDir, { recursive: true, force: true });
              }
            } catch (cleanupError) {
              console.error('Error cleaning up image directory:', cleanupError);
            }
            */
            return markdown;
          }
          case 'hybrid':
            return hybridPdfToMarkdown(fileBuffer);
          case 'standard':
          default:
            return pdfToMarkdown(fileBuffer);
        }
      case 'docx':
        return docxToMarkdown(fileBuffer);
      case 'pptx':
        return pptxToMarkdown(fileBuffer);
      case 'xlsx':
        return xlsxToMarkdown(fileBuffer);
      default:
        throw new Error(`Unsupported file type: ${detectedType}`);
    }
  } finally {
    // Clean up this session's cache
    if (fs.existsSync(sessionCacheDir)) {
      fs.rmSync(sessionCacheDir, { recursive: true, force: true });
    }
  }
}

export default downCraft;
