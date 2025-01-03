// -----------------------------------------------------------------
// -- Interactive example for Down Craft document conversion --
// -----------------------------------------------------------------

import { downCraft } from './src/index.js';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// -----------------------------------------------------------------
// -- Promisify readline question --
// -----------------------------------------------------------------
function question(query, defaultValue = '') {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer || defaultValue);
    });
  });
}

// -----------------------------------------------------------------
// -- List files and get user selection --
// -----------------------------------------------------------------
async function listFiles() {
  try {
    const files = await fs.readdir('./example-docs');
    console.log('\nAvailable documents:');
    console.log('------------------');
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    return files;
  } catch (error) {
    console.error('Error reading directory:', error.message);
    process.exit(1);
  }
}

// -----------------------------------------------------------------
// -- Get file extension without dot --
// -----------------------------------------------------------------
function getFileType(filename) {
  return path.extname(filename).slice(1).toLowerCase();
}

// -----------------------------------------------------------------
// -- Get LLM parameters with defaults from env --
// -----------------------------------------------------------------
async function getLlmParams() {
  console.log('\nEnter LLM parameters (press Enter to use default from .env):');
  
  const baseURL = await question(
    `baseURL [${process.env.LLM_BASE_URL || ''}]: `, 
    process.env.LLM_BASE_URL
  );
  
  const apiKey = await question(
    `apiKey [${process.env.LLM_API_KEY ? '*'.repeat(10) : ''}]: `,
    process.env.LLM_API_KEY
  );
  
  const model = await question(
    `model [${process.env.LLM_MODEL || ''}]: `,
    process.env.LLM_MODEL
  );

  return { baseURL, apiKey, model };
}

// -----------------------------------------------------------------
// -- Main interactive function --
// -----------------------------------------------------------------
async function main() {
  try {
    const files = await listFiles();
    
    if (files.length === 0) {
      console.log('No files found in example-docs directory');
      process.exit(1);
    }

    const answer = await question('\nEnter the number of the file to convert (or q to quit): ');
    
    if (answer.toLowerCase() === 'q') {
      rl.close();
      return;
    }

    const fileIndex = parseInt(answer) - 1;
    if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= files.length) {
      console.log('Invalid selection. Please try again.');
      rl.close();
      return;
    }

    const selectedFile = files[fileIndex];
    const filePath = path.join('./example-docs', selectedFile);
    const fileType = getFileType(selectedFile);
    
    // Only show converter options for PDF files
    let options = {};
    if (fileType === 'pdf') {
      console.log('\nSelect converter type:');
      console.log('1. standard');
      console.log('2. llm');
      console.log('3. ocr');
      console.log('4. onnx');
      console.log('5. scribe');
      console.log('6. scribe-image');
      console.log('7. pdf-images');
      console.log('8. scribe-with-image-placeholder');
      console.log('9. hybrid');
      
      const converterAnswer = await question('\nEnter converter type (1-9): ');
      let pdfConverterType = 'standard';
      if (converterAnswer === '2') pdfConverterType = 'llm';
      if (converterAnswer === '3') pdfConverterType = 'ocr';
      if (converterAnswer === '4') pdfConverterType = 'onnx';
      if (converterAnswer === '5') pdfConverterType = 'scribe';
      if (converterAnswer === '6') pdfConverterType = 'scribe-image';
      if (converterAnswer === '7') pdfConverterType = 'pdf-images';
      if (converterAnswer === '8') pdfConverterType = 'scribe-with-image-placeholder';
      if (converterAnswer === '9') pdfConverterType = 'hybrid';
      
      if (pdfConverterType === 'llm') {
        const llmParams = await getLlmParams();
        options = { pdfConverterType, llmParams };
      } else if (pdfConverterType === 'scribe-with-image-placeholder') {
        options = {
          pdfConverterType,
          useOcr: true,
          batchSize: 5,
          useCache: true,
          keepPlaceholders: false
        };
      } else {
        options = { pdfConverterType };
      }
    }
    
    try {
      // Read the file into a buffer
      const fileBuffer = await fs.readFile(filePath);
      
      console.log(`\nConverting ${selectedFile}...`);
      
      // start timer
      console.time('Conversion time');
      
      // Convert to markdown
      const result = await downCraft(fileBuffer, fileType, options);
      
      // Handle both string and object returns
      const markdown = typeof result === 'string' ? result : result.text;
      
      // Write to example.md
      await fs.writeFile('example.md', markdown, 'utf8');
      console.log('\nMarkdown written to example.md');
      
      // If we have image info, log it
      if (result.images && result.imageDir) {
        console.log(`\nImages saved to: ${result.imageDir}`);
        console.log('\nExtracted images:');
        result.images.forEach(img => {
          console.log(`- ${img.path}`);
        });
      }
      
      console.log('\nConverted Markdown:');
      console.log('==================');
      console.log(markdown);

      // end timer
      console.timeEnd('Conversion time');
      
    } catch (error) {
      console.error('Conversion error:', error.message);
    }
    
    rl.close();
  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
  }
}

// Handle cleanup
rl.on('close', () => {
  console.log('\nGoodbye!');
  process.exit(0);
});

main();