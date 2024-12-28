// -----------------------------------------------------------------
// -- Convert PDF buffer to Markdown --
// -----------------------------------------------------------------

import { convertPdfToMarkdown } from '../lib/pdf-to-markdown.js';

/**
 * Convert PDF buffer to Markdown
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Markdown content
 */
export async function pdfToMarkdown(pdfBuffer) {
  if (!Buffer.isBuffer(pdfBuffer)) {
    throw new Error('Input must be a Buffer');
  }

  try {
    return await convertPdfToMarkdown(pdfBuffer);
  } catch (error) {
    throw new Error(`PDF conversion failed: ${error.message}`);
  }
}

export default pdfToMarkdown;
