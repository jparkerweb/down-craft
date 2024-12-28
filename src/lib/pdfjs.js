import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as PdfWorker from 'pdfjs-dist/build/pdf.worker.entry.js';

// Set up worker for Node.js environment
if (typeof globalThis.window === 'undefined') {
  const { Worker } = await import('worker_threads');
  globalThis.Worker = Worker;
}

// Configure pdf.js worker
GlobalWorkerOptions.workerSrc = PdfWorker;

/**
 * Loads a PDF document from various sources
 * @param {string|Uint8Array|ArrayBuffer} source - URL, binary data or buffer
 * @param {Object} options - Additional options for loading PDF
 * @returns {Promise<PDFDocumentProxy>} PDF document instance
 */
export async function loadPDF(source, options = {}) {
  try {
    const loadingTask = getDocument({ ...options, url: source });
    const pdf = await loadingTask.promise;
    return pdf;
  } catch (error) {
    throw new Error(`Failed to load PDF: ${error.message}`);
  }
}

/**
 * Extracts text content from a specific page
 * @param {PDFPageProxy} page - PDF page instance
 * @returns {Promise<string>} Extracted text content
 */
export async function extractPageText(page) {
  try {
    const textContent = await page.getTextContent();
    return textContent.items.map(item => item.str).join(' ');
  } catch (error) {
    throw new Error(`Failed to extract text: ${error.message}`);
  }
}

/**
 * Renders a PDF page to a canvas
 * @param {PDFPageProxy} page - PDF page instance
 * @param {HTMLCanvasElement} canvas - Canvas element to render to
 * @param {number} scale - Scale factor for rendering
 */
export async function renderPage(page, canvas, scale = 1.0) {
  try {
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;
  } catch (error) {
    throw new Error(`Failed to render page: ${error.message}`);
  }
}

/**
 * Gets metadata from a PDF document
 * @param {PDFDocumentProxy} pdf - PDF document instance
 * @returns {Promise<Object>} PDF metadata
 */
export async function getPDFMetadata(pdf) {
  try {
    const metadata = await pdf.getMetadata();
    return {
      info: metadata.info,
      metadata: metadata.metadata,
      numberOfPages: pdf.numPages,
      fingerprint: pdf.fingerprints[0],
    };
  } catch (error) {
    throw new Error(`Failed to get metadata: ${error.message}`);
  }
}

/**
 * Extracts all text content from a PDF
 * @param {PDFDocumentProxy} pdf - PDF document instance
 * @returns {Promise<string[]>} Array of text content per page
 */
export async function extractAllText(pdf) {
  try {
    const pageTexts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const text = await extractPageText(page);
      pageTexts.push(text);
    }
    return pageTexts;
  } catch (error) {
    throw new Error(`Failed to extract all text: ${error.message}`);
  }
}

/**
 * Gets outline/bookmarks from a PDF
 * @param {PDFDocumentProxy} pdf - PDF document instance
 * @returns {Promise<Array>} PDF outline/bookmarks
 */
export async function getPDFOutline(pdf) {
  try {
    return await pdf.getOutline();
  } catch (error) {
    throw new Error(`Failed to get outline: ${error.message}`);
  }
}

/**
 * Gets attachment data from a PDF
 * @param {PDFDocumentProxy} pdf - PDF document instance
 * @returns {Promise<Object>} PDF attachments
 */
export async function getPDFAttachments(pdf) {
  try {
    return await pdf.getAttachments();
  } catch (error) {
    throw new Error(`Failed to get attachments: ${error.message}`);
  }
}

/**
 * Gets page dimensions at a specific scale
 * @param {PDFPageProxy} page - PDF page instance
 * @param {number} scale - Scale factor
 * @returns {Object} Page dimensions
 */
export function getPageDimensions(page, scale = 1.0) {
  const viewport = page.getViewport({ scale });
  return {
    width: viewport.width,
    height: viewport.height,
    rotation: viewport.rotation,
    scale: viewport.scale,
  };
}

/**
 * Checks if a PDF is password protected
 * @param {string|Uint8Array|ArrayBuffer} source - PDF source
 * @returns {Promise<boolean>} Whether PDF is password protected
 */
export async function isPasswordProtected(source) {
  try {
    await loadPDF(source);
    return false;
  } catch (error) {
    return error.name === 'PasswordException';
  }
}

/**
 * Loads a password-protected PDF
 * @param {string|Uint8Array|ArrayBuffer} source - PDF source
 * @param {string} password - PDF password
 * @returns {Promise<PDFDocumentProxy>} PDF document instance
 */
export async function loadProtectedPDF(source, password) {
  try {
    return await loadPDF(source, { password });
  } catch (error) {
    throw new Error(`Failed to load protected PDF: ${error.message}`);
  }
}

/**
 * Gets destinations (named links) from a PDF
 * @param {PDFDocumentProxy} pdf - PDF document instance
 * @returns {Promise<Object>} PDF destinations
 */
export async function getPDFDestinations(pdf) {
  try {
    return await pdf.getDestinations();
  } catch (error) {
    throw new Error(`Failed to get destinations: ${error.message}`);
  }
}

/**
 * Gets JavaScript actions from a PDF
 * @param {PDFDocumentProxy} pdf - PDF document instance
 * @returns {Promise<Object>} PDF JavaScript actions
 */
export async function getJavaScriptActions(pdf) {
  try {
    return await pdf.getJSActions();
  } catch (error) {
    throw new Error(`Failed to get JavaScript actions: ${error.message}`);
  }
}

/**
 * Cleans up PDF document resources
 * @param {PDFDocumentProxy} pdf - PDF document instance
 * @returns {Promise<void>}
 */
export async function cleanup(pdf) {
  try {
    await pdf.cleanup();
    await pdf.destroy();
  } catch (error) {
    throw new Error(`Failed to cleanup PDF: ${error.message}`);
  }
}
