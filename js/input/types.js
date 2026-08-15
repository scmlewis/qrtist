export const qrTypeConfig = {
    url: { fields: [{ id: 'urlInput', label: 'URL', type: 'text', placeholder: 'https://example.com', value: 'https://google.com' }], encode: (values) => values.urlInput || 'https://google.com' },
    text: { fields: [{ id: 'textInput', label: 'Text', type: 'text', placeholder: 'Enter text', value: 'Hello World' }], encode: (values) => values.textInput || 'Hello World' },
    email: { fields: [{ id: 'emailInput', label: 'Email', type: 'email', placeholder: 'test@example.com', value: 'test@example.com' }, { id: 'subjectInput', label: 'Subject (optional)', type: 'text', placeholder: 'Subject' }], encode: (values) => `mailto:${values.emailInput || 'test@example.com'}${values.subjectInput ? '?subject=' + encodeURIComponent(values.subjectInput) : ''}` },
    phone: { fields: [{ id: 'phoneInput', label: 'Phone Number', type: 'tel', placeholder: '+1234567890', value: '+14155552671' }], encode: (values) => `tel:${values.phoneInput || '+14155552671'}` },
    wifi: { fields: [{ id: 'wifiSsid', label: 'Network Name (SSID)', type: 'text', placeholder: 'MyWiFi', value: 'MyNetwork', help: 'The WiFi network name users will see' }, { id: 'wifiPassword', label: 'Password', type: 'password', placeholder: 'password', value: 'password123', help: 'Leave blank for open networks' }, { id: 'wifiSecurity', label: 'Security Type', type: 'select', options: [{ value: 'WPA', label: 'WPA/WPA2' }, { value: 'WEP', label: 'WEP' }, { value: 'nopass', label: 'Open' }], value: 'WPA', help: 'Select your network security type' }], encode: (values) => `WIFI:S:${values.wifiSsid || 'MyNetwork'};T:${values.wifiSecurity || 'WPA'};P:${values.wifiPassword || 'password123'};;` },
    vcard: { fields: [
        { id: 'vcardName', label: 'Full Name', type: 'text', placeholder: 'John Doe', value: 'John Doe', help: 'Person or business name' },
        { id: 'vcardOrg', label: 'Organization', type: 'text', placeholder: 'Acme Inc.', value: '', help: 'Company or organization name' },
        { id: 'vcardTitle', label: 'Job Title', type: 'text', placeholder: 'Software Engineer', value: '', help: 'Role or position' },
        { id: 'vcardEmail', label: 'Email', type: 'email', placeholder: 'john@example.com', value: 'john@example.com', help: 'Contact email address' },
        { id: 'vcardPhone', label: 'Phone', type: 'tel', placeholder: '+1234567890', value: '+14155552671', help: 'Phone number with country code' },
        { id: 'vcardUrl', label: 'Website', type: 'url', placeholder: 'https://example.com', value: '', help: 'Personal or business website' },
        { id: 'vcardAddress', label: 'Address', type: 'text', placeholder: '123 Main St, City, Country', value: '', help: 'Physical address' },
        { id: 'vcardNote', label: 'Notes', type: 'text', placeholder: 'Additional info', value: '', help: 'Free-text notes (keep short for QR scanning)' }
    ], encode: (values) => {
        const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
        lines.push(`FN:${values.vcardName || 'John Doe'}`);
        if (values.vcardOrg) lines.push(`ORG:${values.vcardOrg}`);
        if (values.vcardTitle) lines.push(`TITLE:${values.vcardTitle}`);
        lines.push(`EMAIL:${values.vcardEmail || 'john@example.com'}`);
        lines.push(`TEL:${values.vcardPhone || '+14155552671'}`);
        if (values.vcardUrl) lines.push(`URL:${values.vcardUrl}`);
        if (values.vcardAddress) lines.push(`ADR:;;${values.vcardAddress};;;;`);
        if (values.vcardNote) lines.push(`NOTE:${values.vcardNote}`);
        lines.push('END:VCARD');
        return lines.join('\n');
    } },
    maps: {
        fields: [
            { id: 'mapsAddress', label: 'Address or Place', type: 'text', placeholder: 'Enter address or paste Google Maps URL', value: 'Times Square, New York', help: 'Paste a Google Maps URL or enter an address' }
        ],
        encode: (values) => {
            const addr = values.mapsAddress || 'Times Square, New York';
            if (addr.startsWith('http')) return addr;
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
        }
    },
    calendar: {
        fields: [
            { id: 'calTitle', label: 'Event Title', type: 'text', placeholder: 'Team Meeting', value: 'Event', help: 'Required' },
            { id: 'calLocation', label: 'Location', type: 'text', placeholder: 'Conference Room A', value: '' },
            { id: 'calStart', label: 'Start', type: 'datetime-local', value: '' },
            { id: 'calEnd', label: 'End', type: 'datetime-local', value: '' },
            { id: 'calDescription', label: 'Description', type: 'text', placeholder: 'Meeting agenda', value: '' },
            { id: 'calUrl', label: 'More Info URL', type: 'text', placeholder: 'https://example.com', value: '' }
        ],
        encode: (values) => {
            const fmt = (dt) => {
                if (!dt) return '';
                return dt.replace(/[-:]/g, '').replace('T', 'T') + '00Z';
            };
            const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//QRtist//EN', 'BEGIN:VEVENT'];
            lines.push(`SUMMARY:${values.calTitle || 'Event'}`);
            if (values.calStart) lines.push(`DTSTART:${fmt(values.calStart)}`);
            if (values.calEnd) lines.push(`DTEND:${fmt(values.calEnd)}`);
            if (values.calLocation) lines.push(`LOCATION:${values.calLocation}`);
            if (values.calDescription) lines.push(`DESCRIPTION:${values.calDescription}`);
            if (values.calUrl) lines.push(`URL:${values.calUrl}`);
            lines.push('END:VEVENT', 'END:VCALENDAR');
            return lines.join('\r\n');
        }
    },
    sms: {
        fields: [
            { id: 'smsNumber', label: 'Phone Number', type: 'tel', placeholder: '+1234567890', value: '+14155552671' },
            { id: 'smsBody', label: 'Message (optional)', type: 'text', placeholder: 'Hello!', value: '' }
        ],
        encode: (values) => {
            const num = values.smsNumber || '+14155552671';
            const body = values.smsBody;
            return body ? `smsto:${num}?body=${encodeURIComponent(body)}` : `smsto:${num}`;
        }
    },
    crypto: {
        fields: [
            { id: 'cryptoCoin', label: 'Coin', type: 'select', options: [{ value: 'bitcoin', label: 'Bitcoin (BTC)' }, { value: 'ethereum', label: 'Ethereum (ETH)' }], value: 'bitcoin' },
            { id: 'cryptoAddress', label: 'Address', type: 'text', placeholder: 'Wallet address', value: '', help: 'Your wallet receiving address' },
            { id: 'cryptoAmount', label: 'Amount (optional)', type: 'text', placeholder: '0.001', value: '', help: 'Amount in BTC or ETH' }
        ],
        encode: (values) => {
            const coin = values.cryptoCoin || 'bitcoin';
            const addr = values.cryptoAddress;
            const amt = values.cryptoAmount;
            if (!addr) return '';
            if (!amt) return addr;
            if (coin === 'bitcoin') return `bitcoin:${addr}?amount=${amt}`;
            if (coin === 'ethereum') return `ethereum:${addr}?value=${amt}`;
            return addr;
        }
    },
    social: {
        fields: [
            { id: 'socialPlatform', label: 'Platform', type: 'select', options: [
                { value: 'instagram', label: 'Instagram' },
                { value: 'twitter', label: 'Twitter / X' },
                { value: 'tiktok', label: 'TikTok' },
                { value: 'linkedin', label: 'LinkedIn' },
                { value: 'youtube', label: 'YouTube' },
                { value: 'github', label: 'GitHub' }
            ], value: 'instagram' },
            { id: 'socialUsername', label: 'Username', type: 'text', placeholder: 'username', value: '', help: 'Without @ symbol' }
        ],
        encode: (values) => {
            const platform = values.socialPlatform || 'instagram';
            const username = values.socialUsername;
            if (!username) return '';
            const urls = {
                instagram: `https://instagram.com/${username}`,
                twitter: `https://x.com/${username}`,
                tiktok: `https://tiktok.com/@${username}`,
                linkedin: `https://linkedin.com/in/${username}`,
                youtube: `https://youtube.com/@${username}`,
                github: `https://github.com/${username}`
            };
            return urls[platform] || `https://${platform}.com/${username}`;
        }
    }
};
