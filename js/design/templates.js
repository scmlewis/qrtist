import { drawModule } from './renderer.js';
import { drawFinderOuter, drawFinderInner } from './finder.js';

export const TEMPLATES = [
    { id: 'classic-black', name: 'Classic', fg: '#000000', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'none', frameColor: '#000000' },
    { id: 'corporate-blue', name: 'Corporate', fg: '#1a56db', bg: '#ffffff', dots: 'rounded', outer: 'rounded', inner: 'dot', frame: 'none', frameColor: '#1a56db' },
    { id: 'facebook-blue', name: 'Facebook', fg: '#1877f2', bg: '#ffffff', dots: 'rounded', outer: 'rounded', inner: 'dot', frame: 'none', frameColor: '#1877f2', logo: 'facebook' },
    { id: 'x-black', name: 'X (Twitter)', fg: '#000000', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'simple', frameColor: '#000000', logo: 'x-twitter' },
    { id: 'instagram-pink', name: 'Instagram', fg: '#c13584', bg: '#fdf2f8', dots: 'dots', outer: 'circle', inner: 'dot', frame: 'none', frameColor: '#c13584', logo: 'instagram' },
    { id: 'youtube-red', name: 'YouTube', fg: '#ff0000', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'simple', frameColor: '#ff0000', logo: 'youtube' },
    { id: 'spotify-green', name: 'Spotify', fg: '#1db954', bg: '#ffffff', dots: 'dots', outer: 'circle', inner: 'dot', frame: 'none', frameColor: '#1db954', logo: 'spotify' },
    { id: 'tiktok-cyan', name: 'TikTok', fg: '#010101', bg: '#ffffff', dots: 'extra-rounded', outer: 'rounded', inner: 'dot', frame: 'none', frameColor: '#010101', logo: 'tiktok' },
    { id: 'whatsapp-green', name: 'WhatsApp', fg: '#25d366', bg: '#ffffff', dots: 'rounded', outer: 'rounded', inner: 'dot', frame: 'none', frameColor: '#25d366', logo: 'whatsapp' },
    { id: 'discord-purple', name: 'Discord', fg: '#5865f2', bg: '#ffffff', dots: 'rounded', outer: 'rounded', inner: 'dot', frame: 'none', frameColor: '#5865f2', logo: 'discord' },
    { id: 'linkedin-navy', name: 'LinkedIn', fg: '#0a66c2', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'simple', frameColor: '#0a66c2', logo: 'linkedin' },
    { id: 'ocean-breeze', name: 'Ocean', fg: '#0ea5e9', bg: '#f0f9ff', dots: 'dots', outer: 'circle', inner: 'dot', frame: 'rounded-rect', frameColor: '#0ea5e9' },
    { id: 'minimal-gray', name: 'Minimal', fg: '#374151', bg: '#f9fafb', dots: 'rounded', outer: 'rounded', inner: 'rounded', frame: 'none', frameColor: '#374151' },
];

export function renderTemplates(deps) {
    const grid = (deps && deps.grid) ? deps.grid : document.getElementById('templateGrid');
    if (!grid) return;
    grid.innerHTML = TEMPLATES.map(t => `
    <button class="template-btn flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-400 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 transition-all" data-template="${t.id}" title="Preview: ${t.name}">
        <canvas class="template-preview-canvas" width="56" height="56" data-template-id="${t.id}"></canvas>
        <span class="font-medium truncate w-full text-center">${t.name}</span>
    </button>`).join('');
    if (!grid.__qrtistTemplateClickHandler) {
        grid.__qrtistTemplateClickHandler = (e) => {
            const btn = e.target.closest('.template-btn');
            if (!btn) return;
            const t = TEMPLATES.find(x => x.id === btn.getAttribute('data-template'));
            if (t && deps && deps.onApply) deps.onApply(t);
        };
        grid.addEventListener('click', grid.__qrtistTemplateClickHandler);
    }
    if ((!deps || !deps.grid) && !deps.disablePreviews) {
        requestAnimationFrame(() => renderTemplatePreviews());
    }
}

function renderTemplatePreviews() {
    TEMPLATES.forEach(t => {
        const canvas = document.querySelector(`canvas[data-template-id="${t.id}"]`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const sz = 56;
        const qrSize = 52;
        const qrData = 'https://example.com';
        let qr;
        try {
            qr = window.QRCodeLib.create(qrData, { errorCorrectionLevel: 'L' });
        } catch (e) { return; }

        const numModules = qr.modules.size;
        const m = 2;
        const mSize = qrSize / (numModules + m * 2);

        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, sz, sz);
        ctx.fillStyle = t.fg;

        for (let row = 0; row < numModules; row++) {
            for (let col = 0; col < numModules; col++) {
                if (row < 7 && col < 7) continue;
                if (row < 7 && col >= numModules - 7) continue;
                if (row >= numModules - 7 && col < 7) continue;
                if (qr.modules.data[row * numModules + col]) {
                    const x = (col + m) * mSize + 2;
                    const y = (row + m) * mSize + 2;
                    drawModule(ctx, t.dots, x, y, mSize);
                }
            }
        }

        const finderSz = mSize * 7;
        const offsets = [[0, 0], [numModules - 7, 0], [0, numModules - 7]];
        offsets.forEach(([r, c]) => {
            const px = (c + m) * mSize + 2;
            const py = (r + m) * mSize + 2;
            const cx = px + finderSz / 2;
            const cy = py + finderSz / 2;
            ctx.fillStyle = t.fg;
            drawFinderOuter(ctx, 0, t.outer, finderSz);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0,0,0,1)';
            drawFinderOuter(ctx, mSize, t.outer, finderSz);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = t.fg;
            drawFinderInner(ctx, t.inner, cx, cy, mSize * 3);
        });
    });
}
