import { describe, it, expect } from 'vitest';

describe('design/templates', () => {
    it('exposes a non-empty template list with stable ids', async () => {
        const { TEMPLATES } = await import('../../js/design/templates.js');
        expect(TEMPLATES.length).toBeGreaterThan(10);
        for (const t of TEMPLATES) {
            expect(t.id).toBeTruthy();
            expect(t.name).toBeTruthy();
            expect(t.fg).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(t.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
    });

    it('renders template buttons into an injected grid', async () => {
        document.body.innerHTML = '<div id="templateGrid"></div>';
        const { renderTemplates } = await import('../../js/design/templates.js');
        renderTemplates({ grid: document.getElementById('templateGrid'), qrCode: () => null });
        expect(document.querySelectorAll('.template-btn').length).toBeGreaterThan(10);
    });
});
