import { PPTXInHTMLOut } from 'pptx-in-html-out';
import TurndownService from "turndown";

export async function convertPptxToMarkdown(fileBuffer) {
  if (!fileBuffer) {
    throw new Error("File buffer is required.");
  }

  try {
    // Create converter instance with buffer
    const converter = new PPTXInHTMLOut(fileBuffer);

    // Convert to HTML
    const htmlContent = await converter.toHTML({includeStyles: false});

    // Initialize Turndown service
    const turndownService = new TurndownService();

    // Convert HTML to Markdown
    const markdownContent = turndownService.turndown(htmlContent);

    return markdownContent;
  } catch (error) {
    throw new Error(`Error converting PPTX to Markdown: ${error.message}`);
  }
}
