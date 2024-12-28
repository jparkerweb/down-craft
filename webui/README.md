# Down Craft Web UI

A modern web interface for converting various document types to Markdown using the [down-craft](https://www.npmjs.com/package/down-craft) package.

## Features

- 🌐 Modern, responsive web interface
- 📄 Support for multiple file formats:
  - PDF (with standard, LLM, and OCR processing)
  - Word Documents (.docx)
  - PowerPoint Presentations (.pptx)
  - Excel Spreadsheets (.xlsx)
- 🎨 Dark theme with animated background
- 💫 Loading animations and visual feedback
- 🚀 Real-time document processing

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in the required LLM API credentials if using LLM processing

3. Start the server:
```bash
npm start
```

4. Open `http://localhost:3000` in your browser

## Environment Variables

For LLM-based PDF processing, configure these variables in your `.env` file:

```env
LLM_BASE_URL=your_llm_api_url
LLM_API_KEY=your_api_key
LLM_MODEL=your_preferred_model
```

## Project Structure

```
webui/
├── public/              # Static files
│   ├── index.html      # Main HTML file
│   ├── styles.css      # Styles
│   └── app.js          # Frontend JavaScript
├── server.js           # Express server
├── package.json        # Dependencies and scripts
└── .env               # Environment variables
```

## Development

The web UI is built with:
- Express.js for the backend server
- Vanilla JavaScript for frontend functionality
- CSS3 for styling and animations
- Font Awesome for icons

## License

Apache-2.0 - see the [LICENSE](../LICENSE) file for details.
