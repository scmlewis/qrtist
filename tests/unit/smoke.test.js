import { describe, it, expect } from 'vitest';

describe('test harness', () => {
    it('exposes QRCodeLib on window', () => {
        const qr = window.QRCodeLib.create('https://example.com', { errorCorrectionLevel: 'M' });
        expect(qr.modules.size).toBeGreaterThanOrEqual(21);
    });

    it('has a jsdom document', () => {
        expect(document).toBeDefined();
        const el = document.createElement('div');
        expect(el.tagName).toBe('DIV');
    });
});
