import { fileURLToPath } from 'url';
import { dirname } from 'path';
import punycode from 'punycode/';

// Polyfill punycode
globalThis.punycode = punycode;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export { __dirname, __filename };
