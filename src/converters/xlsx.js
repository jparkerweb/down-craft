// -----------------------------------------------------------------
// -- Convert XLSX buffer to Markdown --
// -----------------------------------------------------------------

import { convertExcelToMarkdown } from '../lib/xlsx-to-markdown.js';

const DEFAULT_OPTIONS = {
  firstRowAsHeader: true,
  tableClass: 'excel-table',
  includeStyles: false
};

/**
 * Convert XLSX buffer to Markdown
 * @param {Buffer} xlsxBuffer - XLSX file buffer
 * @param {Object} [options] - Conversion options
 * @returns {Promise<string>} Markdown content
 */
export async function xlsxToMarkdown(xlsxBuffer, options = DEFAULT_OPTIONS) {
  if (!Buffer.isBuffer(xlsxBuffer)) {
    throw new Error('Input must be a Buffer');
  }

  try {
    return await convertExcelToMarkdown(xlsxBuffer, options);
  } catch (error) {
    throw new Error(`XLSX conversion failed: ${error.message}`);
  }
}

export default xlsxToMarkdown;
