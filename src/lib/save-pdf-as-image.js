import { getDocument, OPS, PDFWorker } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { promises as fs } from 'fs';
import path from 'path';
import canvas from 'canvas';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add Promise.withResolvers polyfill
if (!Promise.withResolvers) {
  Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Initialize PDF.js worker
function createWorker() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  
  const worker = {
    _worker: new PDFWorker(),
    promise,
    resolve,
    reject
  };
  return worker;
}

const worker = createWorker();

// Create CanvasFactory class
class NodeCanvasFactory {
  create(width, height) {
    const canvasInstance = canvas.createCanvas(width, height);
    return {
      canvas: canvasInstance,
      context: canvasInstance.getContext('2d'),
    };
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    // no need to destroy anything
  }
}

// -----------------------------------------------------------------
// -- Convert canvas to grayscale --
// -----------------------------------------------------------------
function convertToGrayscale(context, width, height) {
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Convert to grayscale using luminosity method
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  
  context.putImageData(imageData, 0, 0);
}

async function savePDFAsImages(pdfBuffer, outputDir, scale, pagesPerBatch, jpegQuality = 0.85) {
  // Create a fresh Uint8Array by copying the data
  const pdfData = new Uint8Array(pdfBuffer);
  
  const canvasFactory = new NodeCanvasFactory();
  
  const doc = await getDocument({
    data: pdfData,
    useSystemFonts: true,
    standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/generic/'),
    worker: worker._worker,
    cMapUrl: path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/generic/'),
    cMapPacked: true,
    CanvasFactory: NodeCanvasFactory
  }).promise;

  const imagePaths = [];
  await fs.mkdir(outputDir, { recursive: true });

  // Process pages in batches
  for (let startPage = 1; startPage <= doc.numPages; startPage += pagesPerBatch) {
    const endPage = Math.min(startPage + pagesPerBatch - 1, doc.numPages);
    let totalHeight = 0;
    let maxWidth = 0;
    const pageCanvases = [];

    // First pass: render pages and calculate dimensions
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvasInstance = canvas.createCanvas(viewport.width, viewport.height);
      const context = canvasInstance.getContext('2d');

      await page.render({
        canvasContext: context,
        viewport: viewport,
        CanvasFactory: NodeCanvasFactory
      }).promise;

      // Convert to grayscale after rendering
      convertToGrayscale(context, viewport.width, viewport.height);

      pageCanvases.push(canvasInstance);
      totalHeight += viewport.height;
      maxWidth = Math.max(maxWidth, viewport.width);
    }

    // Create combined canvas
    const combinedCanvas = canvas.createCanvas(maxWidth, totalHeight);
    const combinedContext = combinedCanvas.getContext('2d');

    // Second pass: draw pages onto combined canvas
    let yOffset = 0;
    for (const pageCanvas of pageCanvases) {
      combinedContext.drawImage(pageCanvas, 0, yOffset);
      yOffset += pageCanvas.height;
    }

    // Convert final combined image to grayscale
    convertToGrayscale(combinedContext, maxWidth, totalHeight);

    // Save combined image as JPEG
    const batchNum = Math.floor((startPage - 1) / pagesPerBatch) + 1;
    const imagePath = path.join(outputDir, `batch-${batchNum}.jpg`);
    const buffer = combinedCanvas.toBuffer('image/jpeg', { quality: jpegQuality });
    await fs.writeFile(imagePath, buffer);
    imagePaths.push(imagePath);
  }

  return imagePaths;
}

export { savePDFAsImages };
