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

function _miniFinderMod(ctx, pattern, x, y, mSize) {
    window.drawModule(ctx, pattern, x, y, mSize);
}

function _miniFinderPattern(ctx, px, py, mSize, outerType, innerType, fgColor) {
    const sz = mSize * 7;
    const cx = sz / 2, cy = sz / 2;
    const in3s = mSize * 3;
    ctx.fillStyle = fgColor;

    function drawOuter(c, inset, type) {
        const s = sz - inset * 2;
        const x0 = inset, y0 = inset;
        const lx = x0 + s / 2, ly = y0 + s / 2;
        switch (type) {
            case 'circle': c.beginPath(); c.arc(lx, ly, s / 2, 0, Math.PI * 2); c.fill(); break;
            case 'rounded': c.beginPath(); c.roundRect(x0, y0, s, s, s * 0.22); c.fill(); break;
            case 'diamond': c.beginPath(); c.moveTo(lx, y0); c.lineTo(x0 + s, ly); c.lineTo(lx, y0 + s); c.lineTo(x0, ly); c.closePath(); c.fill(); break;
            case 'octagon': {
                const cut = s * 0.22; c.beginPath();
                c.moveTo(x0 + cut, y0); c.lineTo(x0 + s - cut, y0); c.lineTo(x0 + s, y0 + cut);
                c.lineTo(x0 + s, y0 + s - cut); c.lineTo(x0 + s - cut, y0 + s); c.lineTo(x0 + cut, y0 + s);
                c.lineTo(x0, y0 + s - cut); c.lineTo(x0, y0 + cut); c.closePath(); c.fill(); break;
            }
            case 'squircle': c.beginPath(); c.roundRect(x0, y0, s, s, s * 0.38); c.fill(); break;
            default: c.fillRect(x0, y0, s, s);
        }
    }

    drawOuter(ctx, 0, outerType);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    drawOuter(ctx, mSize, outerType);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = fgColor;

    switch (innerType) {
        case 'dot': ctx.beginPath(); ctx.arc(cx, cy, in3s / 2, 0, Math.PI * 2); ctx.fill(); break;
        case 'rounded': ctx.beginPath(); ctx.roundRect(cx - in3s / 2, cy - in3s / 2, in3s, in3s, in3s * 0.28); ctx.fill(); break;
        case 'star': {
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const angle = (i * Math.PI / 5) - Math.PI / 2;
                const rad = i % 2 === 0 ? in3s * 0.56 : in3s * 0.22;
                if (i === 0) ctx.moveTo(cx + rad * Math.cos(angle), cy + rad * Math.sin(angle));
                else ctx.lineTo(cx + rad * Math.cos(angle), cy + rad * Math.sin(angle));
            }
            ctx.closePath(); ctx.fill(); break;
        }
        case 'diamond': ctx.beginPath(); ctx.moveTo(cx, cy - in3s / 2); ctx.lineTo(cx + in3s / 2, cy); ctx.lineTo(cx, cy + in3s / 2); ctx.lineTo(cx - in3s / 2, cy); ctx.closePath(); ctx.fill(); break;
        case 'cross': ctx.fillRect(cx - in3s / 6, cy - in3s / 2, in3s / 3, in3s); ctx.fillRect(cx - in3s / 2, cy - in3s / 6, in3s, in3s / 3); break;
        default: ctx.fillRect(cx - in3s / 2, cy - in3s / 2, in3s, in3s);
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
                    _miniFinderMod(ctx, t.dots, x, y, mSize);
                }
            }
        }

        const finderSz = mSize * 7;
        const offsets = [[0, 0], [numModules - 7, 0], [0, numModules - 7]];
        offsets.forEach(([r, c]) => {
            _miniFinderPattern(ctx, (c + m) * mSize + 2, (r + m) * mSize + 2, mSize, t.outer, t.inner, t.fg);
        });
    });
}
