import { describe, it, expect } from 'vitest';

describe('input/fields', () => {
    it('renders the URL field and reads it back', async () => {
        document.body.innerHTML = '<select id="qrType"><option value="url">URL</option></select><div id="inputFields"></div>';
        const { renderInputFields, getInputValues } = await import('../../js/input/fields.js');
        const elements = { qrType: document.getElementById('qrType'), inputFields: document.getElementById('inputFields') };
        renderInputFields({ render() {}, renderDebounced() {}, capture() {}, captureDebounced() {} }, elements);
        const input = document.getElementById('urlInput');
        expect(input).toBeTruthy();
        expect(input.placeholder).toBe('https://example.com');
        input.value = 'https://foo.bar';
        expect(getInputValues(elements)).toEqual({ urlInput: 'https://foo.bar' });
    });
});
