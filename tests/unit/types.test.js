import { describe, it, expect } from 'vitest';

describe('input/types encoders', () => {
    it('encodes all configured types', async () => {
        const { qrTypeConfig } = await import('../../js/input/types.js');
        const cases = [
            ['url', { urlInput: 'https://example.com' }, 'https://example.com'],
            ['text', { textInput: 'Hello World' }, 'Hello World'],
            ['email', { emailInput: 'a@b.com', subjectInput: 'Hi' }, 'mailto:a@b.com?subject=Hi'],
            ['phone', { phoneInput: '+14155552671' }, 'tel:+14155552671'],
            ['wifi', { wifiSsid: 'MyNetwork', wifiPassword: 'pw', wifiSecurity: 'WPA' }, 'WIFI:S:MyNetwork;T:WPA;P:pw;;'],
            ['sms', { smsNumber: '+14155552671', smsBody: 'Hi' }, 'smsto:+14155552671?body=Hi'],
            ['crypto', { cryptoCoin: 'bitcoin', cryptoAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', cryptoAmount: '0.001' }, 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.001']
        ];
        for (const [type, values, expected] of cases) {
            expect(qrTypeConfig[type].encode(values)).toBe(expected);
        }
    });

    it('emits valid vCard for vcard type', async () => {
        const { qrTypeConfig } = await import('../../js/input/types.js');
        const vc = qrTypeConfig.vcard.encode({ vcardName: 'Jane Doe', vcardEmail: 'jane@example.com', vcardPhone: '+1' });
        expect(vc).toContain('BEGIN:VCARD');
        expect(vc).toContain('FN:Jane Doe');
        expect(vc).toContain('END:VCARD');
    });

    it('emits iCalendar for calendar type', async () => {
        const { qrTypeConfig } = await import('../../js/input/types.js');
        const cal = qrTypeConfig.calendar.encode({ calTitle: 'Team Meeting', calStart: '2026-08-20T14:00' });
        expect(cal).toContain('BEGIN:VCALENDAR');
        expect(cal).toContain('SUMMARY:Team Meeting');
        expect(cal).toContain('DTSTART:20260820T140000Z');
    });
});
