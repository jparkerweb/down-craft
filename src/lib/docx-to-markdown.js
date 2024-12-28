import mammoth from 'mammoth';
import { convertToMarkdown } from './markdown.js';

/**
 * Converts a Word document buffer to HTML
 * @param {Buffer} buffer - The Word document as a buffer
 * @param {Object} options - Optional mammoth conversion options
 * @returns {Promise<{html: string, messages: Array}>} The HTML content and any conversion messages
 */

async function convertWordToMarkdown(buffer, options = {}) {
  try {
    // Set default options while allowing overrides
    const defaultOptions = {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Code'] => pre:fresh"
      ],
      includeDefaultStyleMap: true,
      ignoreEmptyParagraphs: true
    };

    const convertOptions = {
      ...defaultOptions,
      ...options
    };

    // Convert the document
    const result = await mammoth.convertToHtml(
      { buffer },
      convertOptions
    );

    const markdown = convertToMarkdown(result.value, { gfm: true });

    return markdown;

  } catch (error) {
    throw new Error(`Failed to convert Word document to HTML: ${error.message}`);
  }
}

/**
 * Extracts raw text from a Word document buffer
 * @param {Buffer} buffer - The Word document as a buffer
 * @returns {Promise<{text: string, messages: Array}>} The raw text content and any messages
 */
async function extractWordText(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    
    return {
      text: result.value,
      messages: result.messages
    };

  } catch (error) {
    throw new Error(`Failed to extract text from Word document: ${error.message}`);
  }
}

export { convertWordToMarkdown, extractWordText };
