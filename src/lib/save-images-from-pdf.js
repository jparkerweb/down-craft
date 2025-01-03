import { getDocument, OPS } from 'pdfjs-dist';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, Image } from 'canvas';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------------------------------------------
// -- Initialize PDF.js worker --
// -----------------------------------------------------------------
import { PDFWorker } from 'pdfjs-dist';

function createWorker() {
  const worker = {
    _worker: new PDFWorker(),
  };
  return worker;
}

const worker = createWorker();

// -----------------------------------------------------------------
// -- Convert RGB to RGBA --
// -----------------------------------------------------------------
function rgbToRgba(imgData) {
  const rgbaData = new Uint8ClampedArray((imgData.length / 3) * 4);
  for (let i = 0; i < imgData.length; i += 3) {
    rgbaData[(i * 4) / 3] = imgData[i];
    rgbaData[(i * 4) / 3 + 1] = imgData[i + 1];
    rgbaData[(i * 4) / 3 + 2] = imgData[i + 2];
    rgbaData[(i * 4) / 3 + 3] = 255;
  }
  return rgbaData;
}

// -----------------------------------------------------------------
// -- Create PNG from image data --
// -----------------------------------------------------------------
function createPNG(imageData, width, height) {
  const png = new PNG({ width, height });
  
  // If data is RGB, convert to RGBA
  const data = imageData.length === width * height * 3 
    ? rgbToRgba(imageData) 
    : imageData;
  
  // Copy data to PNG buffer
  for (let i = 0; i < data.length; i++) {
    png.data[i] = data[i];
  }
  
  return PNG.sync.write(png);
}

// -----------------------------------------------------------------
// -- Extract embedded images from PDF page --
// -----------------------------------------------------------------
async function extractPageImages(page) {
  const images = [];
  
  try {
    // Get operator list which contains all drawing commands
    const ops = await page.getOperatorList();
    
    // Track processed image names to avoid duplicates
    const processedImages = new Set();
    
    // Process each operator
    for (let j = 0; j < ops.fnArray.length; j++) {
      if (ops.fnArray[j] === OPS.paintImageXObject) {
        const imgName = ops.argsArray[j][0];
        
        // Skip if we've already processed this image
        if (processedImages.has(imgName)) continue;
        processedImages.add(imgName);
        
        console.log('Found image:', imgName);
        
        try {
          // Try to get the image object
          const imgObj = await new Promise((resolve, reject) => {
            setTimeout(async () => {
              try {
                const obj = await page.objs.get(imgName);
                resolve(obj);
              } catch (err) {
                reject(err);
              }
            }, 100); // Small delay to ensure object is loaded
          });
          
          if (imgObj && imgObj.data && imgObj.width && imgObj.height) {
            console.log('Processing image:', {
              width: imgObj.width,
              height: imgObj.height,
              dataLength: imgObj.data.length,
              bitsPerComponent: imgObj.bitsPerComponent,
              colorSpace: imgObj.colorSpace
            });
            
            // Create PNG data
            const pngData = createPNG(imgObj.data, imgObj.width, imgObj.height);
            
            images.push({
              name: imgName,
              data: pngData,
              width: imgObj.width,
              height: imgObj.height,
              kind: 'PNG'
            });
          }
        } catch (error) {
          console.warn(`Failed to process image ${imgName}:`, error);
        }
      } else if (ops.fnArray[j] === OPS.paintInlineImageXObject) {
        // Handle inline image
        try {
          const imgData = ops.argsArray[j][0];
          if (imgData && imgData.data && imgData.width && imgData.height) {
            console.log('Found inline image:', {
              width: imgData.width,
              height: imgData.height,
              dataLength: imgData.data.length,
              bitsPerComponent: imgData.bitsPerComponent,
              colorSpace: imgData.colorSpace
            });
            
            // Create PNG data
            const pngData = createPNG(imgData.data, imgData.width, imgData.height);
            
            images.push({
              name: `inline_${images.length}`,
              data: pngData,
              width: imgData.width,
              height: imgData.height,
              kind: 'PNG'
            });
          }
        } catch (error) {
          console.warn('Failed to process inline image:', error);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to extract images:', error);
  }
  
  return images;
}

// -----------------------------------------------------------------
// -- Save image data as file --
// -----------------------------------------------------------------
async function saveImageData(imageData, outputPath) {
  console.log('Saving image data to:', outputPath);
  console.log('Image data size:', imageData.length);
  
  await fs.writeFile(outputPath, imageData);
  
  // Verify file was written
  const stats = await fs.stat(outputPath);
  console.log('Written file size:', stats.size);
}

// -----------------------------------------------------------------
// -- Main function to extract and save PDF images --
// -----------------------------------------------------------------
async function saveImagesFromPDF(pdfBuffer, outputDir, options = {}) {
  const pdfData = new Uint8Array(pdfBuffer);
  const savedImages = [];
  const { nameFormat = (pageNum, imageNum) => `page_${pageNum}_image_${imageNum}.png` } = options;
  
  // Create output directory if it doesn't exist
  await fs.mkdir(outputDir, { recursive: true });
  
  // Load PDF document
  const doc = await getDocument({
    data: pdfData,
    useSystemFonts: true,
    standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/'),
    worker: worker._worker,
    cMapUrl: path.join(__dirname, '../node_modules/pdfjs-dist/cmaps/'),
    cMapPacked: true,
  }).promise;

  try {
    // Process each page
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      
      try {
        // Extract images from page
        const images = await extractPageImages(page);
        console.log(`Found ${images.length} images on page ${pageNum}`);
        
        // Save each image
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const imageName = nameFormat(pageNum, i + 1);
          const imagePath = path.join(outputDir, imageName);
          
          console.log(`Saving image to ${imagePath}`);
          await saveImageData(img.data, imagePath);
          savedImages.push({
            path: imagePath,
            pageNum,
            imageNum: i + 1,
            width: img.width,
            height: img.height,
            colorSpace: img.colorSpace,
            bitsPerComponent: img.bitsPerComponent
          });
        }
      } catch (error) {
        console.warn(`Failed to process page ${pageNum}:`, error);
      } finally {
        await page.cleanup();
      }
    }

    return savedImages;
  } finally {
    await worker._worker.destroy();
  }
}

export { saveImagesFromPDF };