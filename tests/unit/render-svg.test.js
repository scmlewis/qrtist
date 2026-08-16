import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

describe('design/render-svg', () => {
    it('matches the pre-refactor golden output (default)', async () => {
        const { generateStyledSVG } = await import('../../js/design/render-svg.js');
        const golden = fs.readFileSync(path.join(__dirname, 'fixtures/svg-default.txt'), 'utf8').trimEnd();
        expect(generateStyledSVG('https://example.com', DEFAULT_OPTS)).toBe(golden);
    });

    it('matches the pre-refactor golden output (complex)', async () => {
        const { generateStyledSVG } = await import('../../js/design/render-svg.js');
        const golden = fs.readFileSync(path.join(__dirname, 'fixtures/svg-complex.txt'), 'utf8').trimEnd();
        expect(generateStyledSVG('https://example.com', COMPLEX_OPTS)).toBe(golden);
    });

    it('returns null when QRCodeLib fails', async () => {
        const { generateStyledSVG } = await import('../../js/design/render-svg.js');
        const original = window.QRCodeLib.create;
        window.QRCodeLib.create = () => { throw new Error('boom'); };
        try {
            expect(generateStyledSVG('x', DEFAULT_OPTS)).toBe(null);
        } finally {
            window.QRCodeLib.create = original;
        }
    });
});
