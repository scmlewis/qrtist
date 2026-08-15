import { describe, it, expect } from 'vitest';

describe('core/hash', () => {
    it('round-trips a config object', async () => {
        const { encodeConfigHash, decodeConfigHash } = await import('../../js/core/hash.js');
        const config = {
            type: 'url',
            values: { urlInput: 'https://example.com' },
            fg: '#000000', bg: '#ffffff', pattern: 'square',
            outerCorner: 'square', innerCorner: 'square',
            useGradient: false, gradientColor2: '#3b82f6',
            size: 300, logoSize: '20', logoMargin: '10',
            logoPreset: 'none', logoColor: '#000000',
            frame: 'none', frameColor: '#000000', frameText: ''
        };
        const hash = encodeConfigHash(config);
        expect(typeof hash).toBe('string');
        expect(hash.length).toBeGreaterThan(0);
        expect(decodeConfigHash(hash)).toEqual(config);
    });

    it('strips an optional settings= prefix on decode', async () => {
        const { encodeConfigHash, decodeConfigHash } = await import('../../js/core/hash.js');
        const config = { type: 'text', values: { textInput: 'hi' }, fg: '#000000', bg: '#ffffff' };
        const hash = encodeConfigHash(config);
        expect(decodeConfigHash('settings=' + hash)).toEqual(config);
    });

    it('returns null for invalid input', async () => {
        const { decodeConfigHash } = await import('../../js/core/hash.js');
        expect(decodeConfigHash('!!!not-base64!!!')).toBe(null);
    });
});
