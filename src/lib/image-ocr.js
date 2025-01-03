import Tesseract from 'tesseract.js';

// -----------------------------------------------------------------
// -- Perform OCR on a single image
// -----------------------------------------------------------------
export async function performOCR(fileBuffer, imageType) {
  const worker = await Tesseract.createWorker();
  try {
    const base64Image = `data:image/${imageType};base64,${fileBuffer.toString('base64')}`;
    // await worker.loadLanguage('eng');
    // await worker.initialize('eng');
    
    const result = await worker.recognize(base64Image, {
      tessedit_pageseg_mode: 1, // Automatic page segmentation with OSD
      preserve_interword_spaces: '1',
    });
    
    return result.data.text;
  } catch (error) {
    throw new Error(`OCR failed: ${error.message}`);
  } finally {
    await worker.terminate();
  }
}

// -----------------------------------------------------------------
// -- Perform OCR on multiple images efficiently
// -----------------------------------------------------------------
export async function batchOCR(images) {
  const worker = await Tesseract.createWorker();
  try {
    // await worker.loadLanguage('eng');
    // await worker.initialize('eng');
    
    const results = await Promise.all(
      images.map(async ({ buffer, type }) => {
        const base64Image = `data:image/${type};base64,${buffer.toString('base64')}`;
        const result = await worker.recognize(base64Image, {
          tessedit_pageseg_mode: 1,
          preserve_interword_spaces: '1',
        });
        return result.data.text;
      })
    );
    
    return results;
  } catch (error) {
    throw new Error(`Batch OCR failed: ${error.message}`);
  } finally {
    await worker.terminate();
  }
}

// -----------------------------------------------------------------
// -- Perform OCR with markdown formatting
// -----------------------------------------------------------------
export async function performOCRWithMarkdown(fileBuffer, imageType) {
  const worker = await Tesseract.createWorker();
  try {
    const base64Image = `data:image/${imageType};base64,${fileBuffer.toString('base64')}`;
    // await worker.loadLanguage('eng');
    // await worker.initialize('eng');

    const result = await worker.recognize(base64Image, {
      tessedit_pageseg_mode: 1,
      preserve_interword_spaces: '1',
    });

    // Convert text to markdown format
    const lines = result.data.text.split('\n');
    const markdown = lines.map(line => {
      // Detect and format lists
      if (line.match(/^\s*[\d-]+\.\s/)) {
        return line.trim();
      }
      // Detect and format headers
      if (line.match(/^[A-Z\s]{5,}$/)) {
        return `## ${line.trim()}`;
      }
      // Regular paragraphs
      return line.trim();
    }).join('\n\n');

    return markdown;
  } catch (error) {
    throw new Error(`OCR with markdown failed: ${error.message}`);
  } finally {
    await worker.terminate();
  }
}
