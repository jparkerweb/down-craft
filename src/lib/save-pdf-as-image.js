import { getDocument, OPS } from 'pdfjs-dist';
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
import { PDFWorker } from 'pdfjs-dist';

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

async function savePDFAsImages(pdfBuffer, outputDir, scale = 2.0) {
  // Create a fresh Uint8Array by copying the data
  const pdfData = new Uint8Array(pdfBuffer);
  
  const canvasFactory = new NodeCanvasFactory();
  
  const doc = await getDocument({
    data: pdfData,
    useSystemFonts: true,
    standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/'),
    worker: worker._worker,
    CanvasFactory: NodeCanvasFactory
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
      CanvasFactory: NodeCanvasFactory
    }).promise;

    const imagePath = path.join(outputDir, `page-${pageNum}.png`);
    const buffer = canvasInstance.toBuffer('image/png');
    await fs.writeFile(imagePath, buffer);
    imagePaths.push(imagePath);
  }

  return imagePaths;
}

export { savePDFAsImages };
