import { describe, it, expect } from 'vitest';

describe('core/state', () => {
    it('exports a state object with documented defaults', async () => {
        const { st } = await import('../../js/core/state.js');
        expect(st.currentQRSize).toBe(300);
        expect(st.currentPattern).toBe('square');
        expect(st.currentOuterCorner).toBe('square');
        expect(st.currentInnerCorner).toBe('square');
        expect(st.useGradient).toBe(false);
        expect(st.gradientColor2).toBe('#3b82f6');
        expect(st.selectedFrame).toBe('none');
        expect(st.currentLogoPreset).toBe('none');
        expect(st.logoColor).toBe('#000000');
        expect(st.qrCode).toBe(null);
        expect(st.logoDataUrl).toBe(null);
    });
});
