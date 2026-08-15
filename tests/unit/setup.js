import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundleSrc = fs.readFileSync(path.resolve(__dirname, '../../qr-bundle.js'), 'utf8');
new Function(bundleSrc)();
