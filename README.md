# 📑 Down Craft

Node.js package to simplify the process of converting documents (PDF, DOCX, PPTX, and XLSX) into Markdown format. 
It uses `tesseract.js`, `mammoth`, `pdf.js`, and `turndown` to convert documents to Markdown format. For PDFs, it also provides an option to use vLLMs (Vision Large Language Models) for advanced OCR capabilities (using the OpenAI API).

## Installation

```bash
npm install down-craft
```

## Usage

```javascript
import { downCraft } from 'down-craft';
import fs from 'fs/promises';

async function example() {
  // Read file buffer
  const fileBuffer = await fs.readFile('document.docx');
  
  // Convert to markdown (pass file buffer and file type)
  const markdown = await downCraft(fileBuffer, 'docx');
  
  console.log(markdown);
}
```

## Supported File Types

- PDF (.pdf)
- Microsoft Word (.docx)
- Microsoft PowerPoint (.pptx)
- Microsoft Excel (.xlsx)

## API

### downCraft(fileBuffer, fileType?, options?)

Converts a document buffer to markdown format.

- `fileBuffer` (Buffer): The document buffer to convert
- `fileType` (string, optional): File type ('pdf', 'docx', 'pptx', 'xlsx'). If not provided the file type will be attempted to be auto-detected.
- `options` (Object, optional): Conversion options
  - `pdfConverterType` (string, optional): Converter to use for PDF files ('standard' | 'llm' | 'ocr'). Default: 'standard'
  - `llmParams` (Object, required for 'llm' converter): LLM configuration
    - `baseURL` (string): Base URL for the LLM API
    - `apiKey` (string): API key for the LLM service
    - `model` (string): Model to use for OCR

Returns: Promise<string> - The markdown content


#### PDF Conversions

- **Standard**: Extracts text using standard techniques (images are ignored).
- **vLLM**: Uses a vLLM-based OCR model to extract text from PDFs (high fidelity, but much slower and requires an LLM API endpoint).
- **OCR**: Uses Tesseract.js for OCR (results are less accurate, but faster than using vLLM).

## Special Features

### vLLM-based PDF Conversion

For PDFs that require advanced OCR capabilities, you can use the vLLM converter:

```javascript
const markdown = await downCraft(pdfBuffer, 'pdf', {
  pdfConverterType: 'llm',
  llmParams: {
    baseURL: 'https://api.llm-service.com',
    apiKey: 'your-api-key',
    model: 'your-model-name'
  }
});
```

This converter:
- Extracts embedded images from the PDF
- Converts PDF pages to high-quality images
- Uses vLLM-based OCR for accurate text extraction
- Automatically cleans up temporary files

The llmParams object will attempt to read environment variables for baseURL, apiKey, and model if you have them defined.
See the `.env.example` file for an example (it also shows an example of how you can define your own user/system prompts), as well as various LLM providers / models.

## License

This package is licensed under the Apache 2.0 license.  
See LICENSE for details.
