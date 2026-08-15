import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const outDir = path.join(ROOT, 'tests/unit/fixtures');

const mainSrc = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8').split('\n');
// SVG region: lines 268-506 (1-indexed) = indexes 267-505 (0-indexed)
const svgRegion = mainSrc.slice(267, 506).join('\n');

// Guard: this script is a one-shot pre-move snapshot tool. After Task 7 moves
// the SVG region out of js/main.js, the hard-coded slice no longer points at
// the helpers — refuse to run rather than silently writing garbage fixtures.
if (!svgRegion.includes('function generateStyledSVG')) {
    console.error('gen-golden: SVG region (lines 268-506) not found in js/main.js. ' +
        'This is a one-shot pre-refactor tool; restore the pre-move js/main.js first.');
    process.exit(1);
}

const bundleSrc = fs.readFileSync(path.join(ROOT, 'qr-bundle.js'), 'utf8');

// Note: strict-mode eval does not leak function declarations, and Node has no
// `window` global. Build a factory instead: the bundle's UMD wrapper assigns to
// `window` when it is defined, and the SVG helpers reference `window.QRCodeLib`,
// so we pass globalThis as the `window` parameter. `new Function` bodies are
// non-strict, so the hoisted helpers are reachable at the `return` statement.
const factory = new Function('window', bundleSrc + '\n' + svgRegion + '\nreturn { generateStyledSVG };');
const { generateStyledSVG } = factory(globalThis);

function svgFor(opts) {
    return generateStyledSVG('https://example.com', opts);
}

const DEFAULT_OPTS = {
    width: 300,
    dotsOptions: { color: '#000000', type: 'square' },
    backgroundOptions: { color: '#ffffff' },
    cornersSquareOptions: { type: 'square' },
    cornersDotOptions: { type: 'square' },
    errorCorrectionLevel: 'M',
    frameStyle: 'none', frameColor: '#000000', frameText: '',
    logoDataUrl: null, logoSize: 20, logoMargin: 10, logoColor: null
};

const COMPLEX_OPTS = {
    width: 300,
    dotsOptions: { color: '#1a56db', gradient: '#5cd9c0', type: 'rounded' },
    backgroundOptions: { color: '#f0f9ff' },
    cornersSquareOptions: { type: 'circle' },
    cornersDotOptions: { type: 'star' },
    errorCorrectionLevel: 'H',
    frameStyle: 'rounded-rect', frameColor: '#1a56db', frameText: 'SCAN ME',
    logoDataUrl: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%2210%22%2F%3E%3C%2Fsvg%3E',
    logoSize: 20, logoMargin: 10, logoColor: '#000000'
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'svg-default.txt'), svgFor(DEFAULT_OPTS) + '\n');
fs.writeFileSync(path.join(outDir, 'svg-complex.txt'), svgFor(COMPLEX_OPTS) + '\n');
console.log('Golden fixtures written to', outDir);
