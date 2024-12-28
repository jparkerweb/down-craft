import XLSX from 'xlsx';
import { convertToMarkdown } from './markdown.js';

/**
 * Convert Excel file buffer to Markdown
 * @param {Buffer} fileBuffer - The Excel file buffer
 * @param {Object} options - Conversion options
 * @param {boolean} options.firstRowAsHeader - Treat first row as header (default: true)
 * @param {string} options.tableClass - CSS class for table element (default: 'xlsx-table')
 * @param {boolean} options.includeStyles - Include cell styles (default: false) 
 * @returns {string} Markdown string
 */
export function convertExcelToMarkdown(fileBuffer, options = {}) {
  const {
    firstRowAsHeader = true,
    tableClass = 'xlsx-table',
    includeStyles = false
  } = options;

  // Read workbook from buffer
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  let htmlContent = '';

  // Process each sheet
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    
    // Get sheet range
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    htmlContent += `<div class="sheet" data-sheet="${sheetName}">`;
    htmlContent += `<table class="${tableClass}">`;

    // Iterate through rows
    for (let row = range.s.r; row <= range.e.r; row++) {
      htmlContent += '<tr>';

      // Iterate through columns
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellRef];
        
        // Get cell value and style
        const value = cell ? getCellValue(cell) : '';
        const style = includeStyles && cell ? getCellStyle(cell) : '';
        
        // Create cell element
        if (firstRowAsHeader && row === 0) {
          htmlContent += `<th${style}>${value}</th>`;
        } else {
          htmlContent += `<td${style}>${value}</td>`;
        }
      }

      htmlContent += '</tr>';
    }

    htmlContent += '</table></div>';
  });

  return convertToMarkdown(htmlContent, { gfm: true });
}

/**
 * Get formatted cell value
 */
function getCellValue(cell) {
  if (!cell) return '';
  
  // Use formatted value if available
  if (cell.w !== undefined) return escapeHtml(cell.w);
  
  // Format value based on type
  switch (cell.t) {
    case 'b': // boolean
      return cell.v ? 'TRUE' : 'FALSE';
    case 'n': // number
      return cell.v;
    case 'd': // date
      return cell.v.toLocaleDateString();
    case 's': // string
      return escapeHtml(cell.v);
    case 'e': // error
      return '#ERROR!';
    default:
      return cell.v ? escapeHtml(cell.v) : '';
  }
}

/**
 * Get cell style attributes
 */
function getCellStyle(cell) {
  if (!cell.s) return '';

  const styles = [];
  
  // Font styles
  if (cell.s.font) {
    if (cell.s.font.bold) styles.push('font-weight: bold');
    if (cell.s.font.italic) styles.push('font-style: italic');
    if (cell.s.font.underline) styles.push('text-decoration: underline');
    if (cell.s.font.color) styles.push(`color: #${cell.s.font.color.rgb}`);
  }

  // Fill/background
  if (cell.s.fill && cell.s.fill.fgColor) {
    styles.push(`background-color: #${cell.s.fill.fgColor.rgb}`);
  }

  // Alignment
  if (cell.s.alignment) {
    if (cell.s.alignment.horizontal) {
      styles.push(`text-align: ${cell.s.alignment.horizontal}`);
    }
    if (cell.s.alignment.vertical) {
      styles.push(`vertical-align: ${cell.s.alignment.vertical}`);
    }
  }

  return styles.length ? ` style="${styles.join(';')}"` : '';
}

/**
 * Escape HTML special characters
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
