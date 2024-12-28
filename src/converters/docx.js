// -----------------------------------------------------------------
// -- Convert DOCX buffer to Markdown --
// -----------------------------------------------------------------

import { convertWordToMarkdown } from '../lib/docx-to-markdown.js';

/**
 * Convert DOCX buffer to Markdown
 * @param {Buffer} docxBuffer - DOCX file buffer
 * @returns {Promise<string>} Markdown content
 */
export async function docxToMarkdown(docxBuffer) {
  if (!Buffer.isBuffer(docxBuffer)) {
    throw new Error('Input must be a Buffer');
  }

  try {
    return await convertWordToMarkdown(docxBuffer);
  } catch (error) {
    throw new Error(`DOCX conversion failed: ${error.message}`);
  }
}

export default docxToMarkdown;
