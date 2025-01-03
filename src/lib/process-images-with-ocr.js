// -----------------------------------------------------------------
// -- Process images with OCR and cache results --
// -----------------------------------------------------------------

import { createWorker } from 'tesseract.js';
import fs from "fs/promises";
import path from "path";
import crypto from 'crypto';

// Cache directory for OCR results
const CACHE_DIR = path.join(process.cwd(), '.ocr-cache');

// -----------------------------------------------------------------
// -- Generate cache key for an image --
// -----------------------------------------------------------------
async function generateCacheKey(imagePath) {
  const imageData = await fs.readFile(imagePath);
  const hash = crypto.createHash('md5').update(imageData).digest('hex');
  return hash;
}

// -----------------------------------------------------------------
// -- Get cached OCR result --
// -----------------------------------------------------------------
async function getCachedResult(cacheKey) {
  try {
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    const cacheData = await fs.readFile(cachePath, 'utf8');
    return JSON.parse(cacheData);
  } catch (error) {
    return null;
  }
}

// -----------------------------------------------------------------
// -- Save OCR result to cache --
// -----------------------------------------------------------------
async function saveToCache(cacheKey, result) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    await fs.writeFile(cachePath, JSON.stringify(result, null, 2));
  } catch (error) {
    console.warn('Failed to save to cache:', error);
  }
}

// -----------------------------------------------------------------
// -- Clean OCR text --
// -----------------------------------------------------------------
function cleanOcrText(text) {
  if (!text) return '';
  
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove isolated special characters
    .replace(/\s[^a-zA-Z0-9\s]{1,2}\s/g, ' ')
    // Remove lines with only special characters
    .split('\n')
    .filter(line => /[a-zA-Z0-9]/.test(line))
    .join('\n')
    .trim();
}

// -----------------------------------------------------------------
// -- Process single image with OCR --
// -----------------------------------------------------------------
async function processImage(imagePath, options = {}) {
  const { useCache = true } = options;
  
  try {
    // Check cache first
    if (useCache) {
      const cacheKey = await generateCacheKey(imagePath);
      console.log('Cache key for', path.basename(imagePath), ':', cacheKey);
      const cached = await getCachedResult(cacheKey);
      if (cached) {
        console.log(`Using cached OCR result for ${path.basename(imagePath)}:`, cached);
        return cached;
      }
    }

    // Process with OCR
    console.log(`Processing ${path.basename(imagePath)} with OCR...`);
    
    // Create worker for this image
    const worker = await createWorker('eng');
    
    try {
      // Process image with tesseract
      const result = await worker.recognize(imagePath);
      console.log('Raw OCR result for', path.basename(imagePath), ':', result);
      const cleanedText = cleanOcrText(result.data.text);
      console.log('Cleaned OCR text for', path.basename(imagePath), ':', cleanedText);

      // Cache result
      if (useCache && cleanedText) {
        const cacheKey = await generateCacheKey(imagePath);
        const cacheResult = { text: cleanedText };
        await saveToCache(cacheKey, cacheResult);
        console.log('Cached result for', path.basename(imagePath), ':', cacheResult);
        return cacheResult;
      }

      return { text: cleanedText };
    } finally {
      // Always terminate worker
      await worker.terminate();
    }
  } catch (error) {
    console.warn(`OCR failed for ${path.basename(imagePath)}:`, error);
    return { text: '', error: error.message };
  }
}

// -----------------------------------------------------------------
// -- Process multiple images with OCR --
// -----------------------------------------------------------------
export async function processImagesWithOCR(images, options = {}) {
  const { batchSize = 1, useCache = true } = options; // Process one at a time by default
  const results = [];
  
  // Process images sequentially to avoid any potential batching issues
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    console.log(`Processing image ${i + 1}/${images.length}:`, path.basename(img.path));
    
    const result = await processImage(img.path, { useCache });
    console.log('OCR result for', path.basename(img.path), ':', result);
    
    results.push({
      ...img,
      ocrText: result.text,
      ocrError: result.error
    });
  }
  
  console.log('Final OCR results:', JSON.stringify(results, null, 2));
  return results;
}

export default processImagesWithOCR;
