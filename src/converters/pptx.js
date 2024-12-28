// -----------------------------------------------------------------
// -- Convert PPTX buffer to Markdown --
// -----------------------------------------------------------------

import { convertPptxToMarkdown } from '../lib/pptx-to-markdown.js';

/**
 * Convert PPTX buffer to Markdown
 * @param {Buffer} pptxBuffer - PPTX file buffer
 * @returns {Promise<string>} Markdown content
 */
export async function pptxToMarkdown(pptxBuffer) {
  if (!Buffer.isBuffer(pptxBuffer)) {
    throw new Error('Input must be a Buffer');
  }

  try {
    return await convertPptxToMarkdown(pptxBuffer);
  } catch (error) {
    throw new Error(`PPTX conversion failed: ${error.message}`);
  }
}

export default pptxToMarkdown;
