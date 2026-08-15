import { describe, it, expect } from 'vitest';

describe('core/color', () => {
    it('computes luminance', async () => {
        const { getLuminance } = await import('../../js/core/color.js');
        expect(getLuminance('#000000')).toBe(0);
        expect(getLuminance('#ffffff')).toBe(1);
        expect(getLuminance('#808080')).toBeCloseTo(0.5, 1);
    });

    it('computes contrast ratio', async () => {
        const { getContrastRatio } = await import('../../js/core/color.js');
        expect(getContrastRatio('#ffffff', '#000000')).toBe(21);
        expect(getContrastRatio('#000000', '#ffffff')).toBe(21);
        expect(getContrastRatio('#000000', '#000000')).toBe(1);
    });
});
