// -----------------------------------------------------------------
// -- Convert PDF to Markdown with image placeholders and OCR integration --
// -----------------------------------------------------------------

import { getDocument, OPS } from 'pdfjs-dist';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, rmSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { saveImagesFromPDF } from '../lib/save-images-from-pdf.js';
import { PDFWorker } from 'pdfjs-dist';
import { processImagesWithOCR } from '../lib/process-images-with-ocr.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------------------------------------------
// -- Create timestamped directory for images --
// -----------------------------------------------------------------
async function createImageDirectory() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseDir = path.join(process.cwd(), 'temp-images');
  const imageDir = path.join(baseDir, timestamp);
  
  await fs.mkdir(imageDir, { recursive: true });
  return imageDir;
}

// -----------------------------------------------------------------
// -- Extract text and image positions from PDF page --
// -----------------------------------------------------------------
async function extractPageContent(page, pageNum, imageOcrMap = {}, imageDir) {
  const content = await page.getTextContent();
  const ops = await page.getOperatorList();
  
  // Get page dimensions
  const viewport = page.getViewport({ scale: 1.0 });
  const { width, height } = viewport;

  // Process image items first
  let imageIndex = 0;
  const imageItems = [];
  
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === OPS.paintImageXObject) {
      const imageArgs = ops.argsArray[i];
      imageIndex++;
      const imageName = `page_${pageNum}_image_${imageIndex}.png`;
      const ocrText = imageOcrMap[imageName]?.trim() || '';
      
      // Get image position from transform matrix
      let y;
      if (Array.isArray(imageArgs[2])) {
        // If we have a transform matrix, use it
        const transform = imageArgs[2];
        y = height - transform[5];
      } else {
        // If no transform matrix, try to use position from other arguments
        const [, , imgHeight] = imageArgs;
        // Position image at a reasonable default position
        y = height / 2;
      }

      // Skip empty OCR results
      if (!ocrText) {
        continue;
      }

      // Create image item with OCR text
      const imageItem = {
        type: 'text',  // Treat as text instead of image
        str: ocrText,
        y,
        hasOcr: true,
        isImageText: true // Mark as coming from image
      };

      imageItems.push(imageItem);
    }
  }

  // Process text items
  const items = [];
  let firstItemY = null;
  let fontSizes = new Map();
  let maxCount = 0;
  let defaultFontSize = null;
  let allItems = [];

  // First pass - analyze font sizes and collect header-like text
  const headerPatterns = /^(title|heading|chapter|\d+\.)/i;
  const headerTexts = new Set();
  
  content.items.forEach(textItem => {
    const fontSize = Math.abs(textItem.transform[0]);
    const count = fontSizes.get(fontSize) || 0;
    fontSizes.set(fontSize, count + 1);
    if (count + 1 > maxCount) {
      maxCount = count + 1;
      defaultFontSize = fontSize;
    }
    
    // Collect potential header text
    const str = textItem.str.trim().toLowerCase();
    if (headerPatterns.test(str) || str.includes('heading')) {
      headerTexts.add(fontSize);
    }
  });

  // Sort font sizes from largest to smallest
  const sortedFontSizes = Array.from(fontSizes.entries())
    .sort((a, b) => b[0] - a[0])
    .filter(([size, count]) => {
      // Include sizes that appear in header-like text or are larger than default
      return size > defaultFontSize * 1.1; // Must be at least 10% larger
    })
    .slice(0, 4) // Take top 4 sizes for headers
    .map(([size]) => size);

  // Create header level mapping
  const headerLevelMap = new Map();
  sortedFontSizes.forEach((size, index) => {
    headerLevelMap.set(size, Math.min(index + 1, 3)); // Map to levels 1, 2, 3 (cap at 3)
  });

  // Second pass - create text items
  let lastX = null;
  let currentY = null;
  for (const textItem of content.items) {
    const fontSize = Math.abs(textItem.transform[0]);
    const str = textItem.str.trim();
    if (!str) continue;

    const y = textItem.transform[5];
    if (firstItemY === null) firstItemY = y;

    // Check if this is a bullet point
    const isBullet = /^[•\-\*\u2022\u2023\u25E6\u2043\u2219]/.test(str);

    // Determine if this is a header based on:
    // 1. Font size significantly larger than default
    // 2. Not in the middle of a paragraph (check y position relative to previous text)
    // 3. Not a bullet point
    const isNewSection = currentY === null || Math.abs(y - currentY) > fontSize * 1.5;
    const isHeader = !isBullet && 
                    headerLevelMap.has(fontSize) && 
                    isNewSection;

    let headerLevel = 0;
    if (isHeader) {
      headerLevel = headerLevelMap.get(fontSize);
    }

    const isItalic = textItem.fontName?.toLowerCase().includes('italic');

    items.push({
      type: 'text',
      str,
      x: textItem.transform[4],
      y,
      fontSize,
      isHeader,
      headerLevel,
      isItalic,
      isBullet
    });

    currentY = y;
  }

  // Sort items by y position, then x position
  allItems = [...items, ...imageItems].sort((a, b) => {
    const yDiff = Math.abs(a.y - b.y);
    const lineThreshold = 10; // Increased threshold for line grouping
    
    if (yDiff < lineThreshold) {
      // Items are on the same line
      return a.x - b.x;
    }
    
    // Different lines, sort by y position (top to bottom)
    return b.y - a.y;
  });

  // Process items into markdown
  let text = '';
  let currentLine = '';
  let lastLineWasEmpty = true;
  let currentItem = null;
  let lastY = null;
  let lineItems = [];

  function flushCurrentLine() {
    if (currentLine === '') return;

    // Handle headers and text styling
    let line = currentLine;
    
    // Check if line is from OCR text
    const isOcrLine = lineItems.some(item => item.isImageText);
    
    if (isOcrLine) {
      // Format OCR text as blockquote
      if (!lastLineWasEmpty) {
        text += '\n';
      }
      text += '> ' + line.trim() + '\n\n';
      lastLineWasEmpty = true;
    } else {
      // Apply italic styling first to the content
      if (currentItem?.isItalic) {
        line = '*' + line + '*';
      }

      // Then add header prefix if needed
      if (currentItem?.isHeader) {
        line = '#'.repeat(currentItem.headerLevel) + ' ' + line;
      } else if (currentItem?.isBullet) {
        // Ensure bullet points are formatted consistently
        line = '- ' + line.replace(/^[•\-\*\u2022\u2023\u25E6\u2043\u2219]\s*/, '');
      }

      // Add the line to output
      text += line + '\n';
      lastLineWasEmpty = false;
    }

    currentLine = '';
    lineItems = [];
  }

  let lastItemWasOcr = false;
  for (const item of allItems) {
    if (item.type === 'text') {
      // Force line break between OCR and non-OCR content
      if (lastItemWasOcr !== Boolean(item.isImageText)) {
        flushCurrentLine();
        if (!item.isImageText && lastItemWasOcr) {
          text += '\n';
        }
      }

      // Force line break if significant y-position change
      if (lastY !== null && Math.abs(item.y - lastY) > 10) {
        flushCurrentLine();
      }

      if (currentLine === '') {
        currentItem = item;
      } else if (!item.isImageText || (item.isImageText && lineItems[0]?.isImageText)) {
        currentLine += ' ';
      }

      currentLine += item.str;
      lastY = item.y;
      lineItems.push(item);
      lastItemWasOcr = Boolean(item.isImageText);
    }
  }

  // Flush any remaining content
  flushCurrentLine();

  return text.trim();
}

// -----------------------------------------------------------------
// -- Convert PDF to Markdown with placeholders --
// -----------------------------------------------------------------
async function convertPdfWithPlaceholders(pdfBuffer, outputDir, imageOcrMap = {}) {
  const pdfData = new Uint8Array(pdfBuffer);
  let markdownContent = '';
  let worker = null;
  
  try {
    // Create new worker for this conversion
    worker = new PDFWorker();
    
    // Load PDF document
    const doc = await getDocument({
      data: pdfData,
      useSystemFonts: true,
      standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/'),
      worker,
      cMapUrl: path.join(__dirname, '../node_modules/pdfjs-dist/cmaps/'),
      cMapPacked: true,
    }).promise;

    // Process each page
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      try {
        // Don't create per-page directories
        const pageContent = await extractPageContent(page, pageNum, imageOcrMap, outputDir);
        markdownContent += pageContent;
        
        // Add page separator if not last page
        if (pageNum < doc.numPages) {
          markdownContent += '\n---\n';
        }
      } catch (error) {
        console.warn(`Failed to process page ${pageNum}:`, error);
      } finally {
        await page.cleanup();
      }
    }

    return markdownContent.trim();
  } finally {
    // Clean up worker
    if (worker) {
      await worker.destroy();
    }
  }
}

// -----------------------------------------------------------------
// -- Main converter function --
// -----------------------------------------------------------------
export async function scribeWithImagePlaceholder(pdfBuffer, options = {}) {
  if (!Buffer.isBuffer(pdfBuffer)) {
    throw new Error('Input must be a Buffer');
  }

  const { useOcr = true, batchSize = 5, useCache = true } = options;
  let imageDir;

  try {
    // Create timestamped directory for images
    imageDir = await createImageDirectory();

    // Extract and save images first
    const imageMetadata = await saveImagesFromPDF(pdfBuffer, imageDir, {
      nameFormat: (pageNum, imageNum) => `page_${pageNum}_image_${imageNum}.png`
    });

    console.log('Image metadata:', JSON.stringify(imageMetadata, null, 2));

    // Process images with OCR if enabled
    const processedImages = useOcr 
      ? await processImagesWithOCR(imageMetadata.map(img => ({
          path: img.path,
          page: img.pageNum,
          index: img.imageNum,
          name: path.basename(img.path)
        })), { batchSize, useCache })
      : imageMetadata.map(img => ({ ...img, ocrText: '', ocrError: null }));

    console.log('Processed images:', JSON.stringify(processedImages, null, 2));

    // Create OCR text map for placeholders
    const imageOcrMap = {};
    for (const img of processedImages) {
      const imageName = `page_${img.page}_image_${img.index}.png`;
      // Only add OCR text if it's not empty and there's no error
      imageOcrMap[imageName] = !img.ocrError && img.ocrText ? img.ocrText : '';
    }

    console.log('OCR Map:', JSON.stringify(imageOcrMap, null, 2));

    // Extract text with OCR-enhanced placeholders
    const markdownContent = await convertPdfWithPlaceholders(pdfBuffer, imageDir, imageOcrMap);

    // Return both markdown content and image metadata
    const result = {
      text: markdownContent,
      images: processedImages.map(img => ({
        ...img,
        path: path.relative(process.cwd(), img.path)
      })),
      imageDir: path.relative(process.cwd(), imageDir)
    };

    return result;
  } catch (error) {
    throw new Error(`PDF conversion failed: ${error.message}`);
  }
}

// -----------------------------------------------------------------
// -- Clean up old temp folders --
// -----------------------------------------------------------------
async function cleanupTempFolders() {
  try {
    const tempRoot = path.join(process.cwd(), 'temp-images');
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    // Create temp dir if it doesn't exist
    await fs.mkdir(tempRoot, { recursive: true });

    // Get all folders in temp directory
    const folders = readdirSync(tempRoot);

    // Delete folders older than 10 minutes
    for (const folder of folders) {
      const folderPath = path.join(tempRoot, folder);
      const stats = statSync(folderPath);

      if (stats.mtimeMs < tenMinutesAgo) {
        rmSync(folderPath, { recursive: true, force: true });
      }
    }
  } catch (error) {
    console.error('Error cleaning up temp folders:', error);
  }
}

export default scribeWithImagePlaceholder;
