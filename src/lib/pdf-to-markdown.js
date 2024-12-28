import pdf2md from '@opendocsg/pdf2md';

/**
 * Convert PDF buffer to Markdown
 * @param {Buffer} pdfBuffer - PDF file contents as buffer
 * @returns {Promise<string>} Markdown content
 */
export async function convertPdfToMarkdown(pdfBuffer) {
  try {
    const markdownContent = await pdf2md(pdfBuffer);
    return markdownContent;
  } catch (error) {
    throw new Error(`Failed to convert PDF to Markdown: ${error.message}`);
  }
}

/**
 * Convert PDF file to Markdown and save to file
 * @param {string} pdfPath - Path to the PDF file 
 * @param {string} outputPath - Path to save the markdown file
 * @returns {Promise<void>}
 */
export async function convertPdfToMarkdownFile(pdfPath, outputPath) {
  try {
    const markdownContent = await convertPdfToMarkdown(pdfPath);
    await fs.writeFile(outputPath, markdownContent, 'utf8');
  } catch (error) {
    throw new Error(`Failed to save Markdown file: ${error.message}`);
  }
}
