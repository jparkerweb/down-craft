// ----------------------------------------------------------
// -- Main entry point for document-to-markdown conversion --
// ----------------------------------------------------------

import docxToMarkdown from './converters/docx.js';
import pdfToMarkdown from './converters/pdf.js';
import pptxToMarkdown from './converters/pptx.js';
import xlsxToMarkdown from './converters/xlsx.js';
import llmConverter from './converters/llm.js';
import ocrConverter from './converters/ocr.js';

const SUPPORTED_TYPES = ['pdf', 'docx', 'pptx', 'xlsx'];
const CONVERTER_TYPES = ['standard', 'llm', 'ocr'];

// ------------------------------------------------
// -- Detect file type from buffer magic numbers --
// ------------------------------------------------
function detectFileType(buffer) {
  // PDF: %PDF
  if (buffer.slice(0, 4).toString() === '%PDF') return 'pdf';
  
  // Office files: PKZip signature
  if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
    // Check for Office XML signatures
    const content = buffer.toString('utf8', 0, 200);
    if (content.includes('word/')) return 'docx';
    if (content.includes('ppt/')) return 'pptx';
    if (content.includes('xl/')) return 'xlsx';
  }
  
  return null;
}

// ------------------------------
// -- Main conversion function --
// ------------------------------
export async function downCraft(fileBuffer, fileType = null, options = {}) {
  if (!Buffer.isBuffer(fileBuffer)) {
    throw new Error('First argument must be a Buffer');
  }

  const { 
    pdfConverterType = 'standard',
    llmParams = null
  } = options;

  if (!CONVERTER_TYPES.includes(pdfConverterType)) {
    throw new Error(`Invalid converter type. Supported types: ${CONVERTER_TYPES.join(', ')}`);
  }

  // Determine file type
  const detectedType = fileType || detectFileType(fileBuffer);
  if (!detectedType || !SUPPORTED_TYPES.includes(detectedType)) {
    throw new Error(`Unsupported or undetected file type. Supported types: ${SUPPORTED_TYPES.join(', ')}`);
  }

  // For LLM converter, validate params
  if (pdfConverterType === 'llm') {
    if (!llmParams || !llmParams.baseURL || !llmParams.apiKey || !llmParams.model) {
      throw new Error('LLM converter requires llmParams object with `baseURL`, `apiKey`, and `model`');
    }
  }

  // Route to appropriate converter
  switch (detectedType) {
    case 'pdf':
      // For PDF files, check converter type
      switch (pdfConverterType) {
        case 'llm':
          return llmConverter(fileBuffer, llmParams);
        case 'ocr':
          return ocrConverter(fileBuffer);
        case 'standard':
        default:
          return pdfToMarkdown(fileBuffer);
      }
    case 'docx':
      return docxToMarkdown(fileBuffer);
    case 'pptx':
      return pptxToMarkdown(fileBuffer);
    case 'xlsx':
      return xlsxToMarkdown(fileBuffer);
    default:
      throw new Error(`Unsupported file type: ${detectedType}`);
  }
}

export default downCraft;
