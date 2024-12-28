import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

/**
 * Configure TurndownService with custom options
 * @returns {TurndownService} Configured TurndownService instance
 */
function createTurndownService() {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '_',
    bulletListMarker: '-',
    strongDelimiter: '**'
  });

  // Add custom rules if needed
  service.addRule('preserveLineBreaks', {
    filter: 'br',
    replacement: () => '\n'
  });

  return service;
}

/**
 * Converts HTML or plain text to Markdown
 * @param {string} content - HTML or text content to convert
 * @param {Object} options - Optional conversion options
 * @param {boolean} [options.preserveLineBreaks=true] - Whether to preserve line breaks
 * @returns {string} Markdown formatted text
 */
function convertToMarkdown(content, options = { preserveLineBreaks: true }) {
  try {
    const turndownService = createTurndownService();
    
    // Handle plain text by wrapping in paragraphs
    const htmlContent = content.trim().includes('<') 
      ? content 
      : content.split('\n').map(line => `<p>${line}</p>`).join('\n');

    // Use the GFM plugin for tables
    turndownService.use(gfm);

    return turndownService.turndown(htmlContent);
  } catch (error) {
    throw new Error(`Markdown conversion failed: ${error.message}`);
  }
}

/**
 * Formats text with specific Markdown elements
 * @param {string} text - Text to format
 * @param {Object} formatting - Formatting options
 * @param {boolean} [formatting.addHeading=false] - Add heading to text
 * @param {number} [formatting.headingLevel=1] - Heading level (1-6)
 * @param {boolean} [formatting.addCodeBlock=false] - Wrap in code block
 * @param {string} [formatting.language=''] - Code block language
 * @returns {string} Formatted markdown text
 */
function formatMarkdown(text, formatting = {}) {
  try {
    let result = text;

    if (formatting.addHeading) {
      const level = Math.min(Math.max(formatting.headingLevel || 1, 1), 6);
      const hashes = '#'.repeat(level);
      result = `${hashes} ${result}`;
    }

    if (formatting.addCodeBlock) {
      const lang = formatting.language ? formatting.language : '';
      result = `\`\`\`${lang}\n${result}\n\`\`\``;
    }

    return result;
  } catch (error) {
    throw new Error(`Markdown formatting failed: ${error.message}`);
  }
}

export {
  convertToMarkdown,
  formatMarkdown
};
