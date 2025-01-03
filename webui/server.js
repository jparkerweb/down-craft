// -----------------------------------------------------------------
// -- Polyfills
// -----------------------------------------------------------------
import './node-polyfills.js';

// -----------------------------------------------------------------
// -- Express server setup for document processing
// -----------------------------------------------------------------
import express from 'express';
import fileUpload from 'express-fileupload';
import path from 'path';
import { fileURLToPath } from 'url';
import { downCraft } from 'down-craft';
import dotenv from 'dotenv';
import * as fs from 'node:fs/promises';

// Load environment variables
dotenv.config({ path: '../.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3131;

// Increase timeouts
app.use((req, res, next) => {
    // Set timeout to 10 minutes
    req.setTimeout(600000);
    res.setTimeout(600000);
    next();
});

// Middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.static('public'));
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
    abortOnLimit: true,
    responseOnLimit: 'File size limit exceeded. Maximum file size is 50MB.',
    useTempFiles: true,
    tempFileDir: '/tmp/',
    debug: true
}));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', async (req, res) => {
    try {
        if (!req.files || !req.files.document) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.files.document;
        const fileType = file.name.split('.').pop().toLowerCase();
        const converterType = req.body.converterType;
        
        // Read file buffer from temp file
        const fileBuffer = await fs.readFile(file.tempFilePath);

        // Validate file size
        if (fileBuffer.length === 0) {
            throw new Error('The uploaded file is empty');
        }

        // Validate file type
        if (!['pdf', 'docx', 'pptx', 'xlsx'].includes(fileType)) {
            throw new Error(`Unsupported file type: ${fileType}`);
        }

        console.log('Processing file:', {
            fileName: file.name,
            fileType,
            converterType,
            fileSize: fileBuffer.length
        });

        // For LLM conversion, ensure we have the required environment variables
        if (converterType === 'llm') {
            const requiredEnvVars = ['LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL'];
            const missingVars = requiredEnvVars.filter(v => !process.env[v]);
            
            if (missingVars.length > 0) {
                throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
            }
        }

        const options = {
            pdfConverterType: fileType === 'pdf' ? converterType : undefined,
            llmParams: converterType === 'llm' ? {
                baseURL: process.env.LLM_BASE_URL,
                apiKey: process.env.LLM_API_KEY,
                model: process.env.LLM_MODEL
            } : undefined
        };

        console.log('Using options:', {
            ...options,
            llmParams: options.llmParams ? {
                baseURL: options.llmParams.baseURL,
                model: options.llmParams.model,
                apiKey: '***' // Don't log the API key
            } : undefined
        });

        try {
            const markdown = await downCraft(fileBuffer, fileType, options);
            
            // Validate markdown output
            if (typeof markdown !== 'string') {
                throw new Error('Invalid markdown output format');
            }

            res.json({ 
                message: 'File processed successfully',
                markdown
            });
        } catch (conversionError) {
            // Log the full error for debugging
            console.error('Conversion error details:', conversionError);
            
            // Send a cleaner error message to the client
            throw new Error(`Document conversion failed: ${conversionError.message}`);
        }
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Server error', 
        details: err.message 
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
