# PDF to Text with Image OCR Integration

## Project Overview
This project aims to enhance the PDF text extraction process by combining direct text extraction with OCR processing of embedded images, maintaining the document's logical flow and context. The solution will extract both textual content and images from PDFs, process images through OCR, and integrate the results into a single cohesive markdown document.

## Technical Approach

### Architecture
1. Text Extraction: Use pdf.js for direct text extraction
2. Image Handling: Extract embedded images using pdf.js and pngjs
3. OCR Processing: Use scribe.js-ocr for image text extraction
4. Integration: Combine extracted text with OCR results, maintaining document flow

### Key Components
- `src/converters/scribe-with-image-placeholder.js`: Main converter that orchestrates the process
- `src/lib/save-images-from-pdf.js`: Image extraction utility
- `src/converters/scribe.js`: OCR processing of images
- Supporting utilities from existing codebase

## Implementation Plan

### Phase 1: Image-Aware Text Extraction 
- [x] Create `scribe-with-image-placeholder.js`
  - [x] Implemented text extraction
  - [x] Added image placeholder insertion
  - [x] Added page number tracking
  - [x] Test basic text extraction with placeholders
  - [x] Added error handling and logging
  - [x] Fixed text spacing and formatting issues

### Phase 2: Image Processing Integration 
- [x] Integrate image extraction functionality from `save-images-from-pdf.js`
- [x] Implement image saving with proper naming convention
  - [x] Added timestamped directories for organization
  - [x] Implemented consistent naming format
  - [x] Added cleanup on error
- [x] Add image metadata tracking
  - [x] Added page and image numbers
  - [x] Added image dimensions
  - [x] Added color space info
  - [x] Added placeholder text
- [x] Test image extraction and saving
  - [x] Verified image extraction
  - [x] Verified placeholder text matches
  - [x] Verified directory structure

### Phase 3: OCR Integration 🔄
- [x] Add OCR processing for extracted images
  - [x] Integrate with existing scribe.js OCR
  - [x] Add batch processing support
  - [x] Add progress tracking
- [x] Add OCR text to output
  - [x] Replace image placeholders with OCR text
  - [x] Add OCR caching for performance
  - [x] Add text cleanup utilities
- [ ] Test and refine OCR output
  - [ ] Verify OCR text accuracy
  - [ ] Improve text cleanup
  - [ ] Handle edge cases

### Phase 4: Refinements
- [ ] Add progress indicators
- [ ] Improve error handling
- [ ] Add configuration options
- [ ] Update documentation

## Technical Details

### Text Extraction Process
1. Extract raw text from PDF while identifying image locations
2. Insert placeholders in format: `[page ${pageNum}_image${imageNum}.png]`
3. Save extracted images with corresponding names
4. Process each image through OCR
5. Replace placeholders with OCR text or remove if no text found

### Image Processing
1. Use enhanced pdf.js image extraction
2. Convert images to PNG format
3. Save with standardized naming convention
4. Track image metadata for post-processing

### OCR Integration
1. Process images sequentially through scribe.js-ocr
2. Cache OCR results to avoid reprocessing
3. Clean and format OCR text
4. Integrate with main text while maintaining context

## Success Criteria
- Accurate text extraction with proper formatting
- Correct image extraction and conversion
- Successful OCR processing of images
- Proper integration of OCR text into document flow
- Maintenance of document structure and context
- Efficient processing of large documents
- Robust error handling and recovery

## Dependencies
- pdf.js: PDF processing
- pngjs: Image handling
- scribe.js-ocr: OCR processing
- node-canvas: Image manipulation
- fs/promises: File operations
