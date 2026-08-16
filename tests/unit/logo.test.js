import { describe, it, expect } from 'vitest';

describe('design/logo', () => {
    it('builds a data URI from a preset and color', async () => {
        const { getLogoPresetDataUrl } = await import('../../js/design/logo.js');
        const uri = getLogoPresetDataUrl('facebook', '#ff0000');
        expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
        expect(uri.includes('%23ff0000')).toBe(true);
    });

    it('returns null for unknown presets', async () => {
        const { getLogoPresetDataUrl } = await import('../../js/design/logo.js');
        expect(getLogoPresetDataUrl('nope', '#000000')).toBe(null);
    });
});
