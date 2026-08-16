import { st } from './core/state.js';
import { qrType, fgColorInput, fgColorText, bgColorInput, bgColorText, frameColorInput, frameColorTextInput, frameTextInput, qrSize, qrSizeValue, contrastWarning, contrastWarningText, scannabilityInfo, qrSizeLabel, qrSizeLabel2, qrCodeContainer, logoInput, logoPreview, logoImg, logoRemove, logoControls, customLogoBtn, logoSize, logoSizeValue, logoMargin, logoMarginValue, logoColorInput, logoColorText, frameBtns, downloadPng, downloadSvg } from './core/dom.js';
import { getLuminance, getContrastRatio } from './core/color.js';
import { showToast } from './core/toast.js';
import { encodeConfigHash, decodeConfigHash } from './core/hash.js';
import { getConfig, applyConfig } from './core/config.js';
import { createHistory } from './core/undo-redo.js';
import { qrTypeConfig } from './input/types.js';
import { renderInputFields, getInputValues } from './input/fields.js';
import { updateShapeSelection, updateCornerSelection, updateFrameSelection, updateLogoSelection } from './ui/controls.js';
import { generateStyledSVG } from './design/render-svg.js';
import './design/renderer.js';

const deps = {
    render: () => updateQRCode(),
    renderDebounced: () => _debouncedUpdateQRCode(),
    capture: () => captureState(),
    captureDebounced: () => _debounceCapture(),
    constrainPreview: () => constrainPreviewCanvas(),
    filename: () => generateQRFilename(),
    svgOptions: () => getSvgDownloadOptions(),
    reset: () => doReset()
};

const history = createHistory({
    getState: getConfig,
    applyState: (s) => applyConfig(s, deps),
    onChange: updateUndoRedoButtons
});
const captureState = history.capture;
const _debounceCapture = history.debouncedCapture;
const undo = history.undo;
const redo = history.redo;

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = !history.canUndo();
    if (redoBtn) redoBtn.disabled = !history.canRedo();
}

const LOGO_PRESETS = {
    'globe': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
    'scan-brackets': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>`,
    'scan-text': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="46" font-size="22" text-anchor="middle" font-weight="900" font-family="Arial,sans-serif" fill="currentColor">SCAN</text><text x="50" y="74" font-size="22" text-anchor="middle" font-weight="900" font-family="Arial,sans-serif" fill="currentColor">ME</text></svg>`,
    'facebook': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>`,
    'instagram': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
    'x-twitter': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>`,
    'youtube': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.12-2.12C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.53A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.12 2.12c1.88.53 9.38.53 9.38.53s7.5 0 9.38-.53a3 3 0 0 0 2.12-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg>`,
    'whatsapp': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.1 4.49.71.31 1.27.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35zM12 2.05C6.84 2.05 2.68 6.2 2.68 11.37c0 1.6.42 3.16 1.23 4.54L2.05 22l6.25-1.64a9.27 9.27 0 0 0 3.7.75c5.16 0 9.32-4.15 9.32-9.32 0-2.49-1-4.82-2.83-6.64A9.22 9.22 0 0 0 12 2.05z"/></svg>`,
    'linkedin': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.74v20.52C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.22 0z"/></svg>`,
    'tiktok': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.53 2.98c.35 2.04 1.49 3.53 3.61 3.82v2.99c-1.23.09-2.34-.22-3.46-1.02v6.42c0 3.71-2.78 6.27-6.18 6.27-3.4 0-5.96-2.2-5.96-5.41 0-3.24 2.62-5.45 5.77-5.45.52 0 1 .08 1.46.21v3.07c-.46-.14-.94-.22-1.42-.22-1.56 0-2.62 1.05-2.62 2.48 0 1.46.99 2.49 2.62 2.49 1.62 0 2.7-1.05 2.7-2.82V2.98h3.48z"/></svg>`,
    'spotify': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 14.43a.62.62 0 0 1-.86.21c-2.35-1.44-5.3-1.76-8.79-.96a.62.62 0 1 1-.28-1.21c3.81-.87 7.09-.5 9.72 1.11.3.18.39.57.21.85zm1.22-2.72a.78.78 0 0 1-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 1 1-.45-1.49c3.64-1.1 8.16-.56 11.24 1.34.37.23.49.71.25 1.06zm.11-2.85C14.81 8.98 9.3 8.8 6.18 9.74a.93.93 0 1 1-.54-1.78c3.6-1.09 9.71-.88 13.54 1.31a.93.93 0 0 1-.94 1.6z"/></svg>`,
    'discord': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.32 4.57A19.8 19.8 0 0 0 15.4 3c-.2.36-.43.85-.59 1.23a18.27 18.27 0 0 0-5.48 0A12.6 12.6 0 0 0 8.74 3 19.74 19.74 0 0 0 3.79 4.6C.78 9.14-.13 13.56.35 17.9a19.94 19.94 0 0 0 6.05 3.06c.49-.67.92-1.38 1.29-2.13-.7-.27-1.38-.6-2.02-.99.17-.12.34-.25.5-.39a14.2 14.2 0 0 0 12.16 0c.16.14.33.27.5.39-.64.39-1.33.72-2.03.99.37.75.8 1.46 1.29 2.13a19.9 19.9 0 0 0 6.06-3.06c.55-4.94-.94-9.32-3.96-13.33zM8.52 15.36c-1.18 0-2.16-1.09-2.16-2.42 0-1.34.95-2.43 2.16-2.43 1.21 0 2.18 1.1 2.16 2.43 0 1.33-.95 2.42-2.16 2.42zm7.12 0c-1.18 0-2.16-1.09-2.16-2.42 0-1.34.95-2.43 2.16-2.43 1.21 0 2.18 1.1 2.16 2.43 0 1.33-.94 2.42-2.16 2.42z"/></svg>`,
};

function getLogoPresetDataUrl(preset, color) {
    const svg = LOGO_PRESETS[preset];
    if (!svg) return null;
    const colored = svg.replace(/currentColor/g, color || '#000000');
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(colored);
}

// ── Design Templates ──────────────────────────────────────────────────
const TEMPLATES = [
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

function renderTemplates() {
    const grid = document.getElementById('templateGrid');
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
            if (t) applyTemplate(t);
        };
        grid.addEventListener('click', grid.__qrtistTemplateClickHandler);
    }
    requestAnimationFrame(() => renderTemplatePreviews());
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

function applyTemplate(t) {
    if (!t) return;
    fgColorInput.value = t.fg;
    fgColorText.value = t.fg;
    bgColorInput.value = t.bg;
    bgColorText.value = t.bg;
    st.currentPattern = t.dots;
    updateShapeSelection();
    st.currentOuterCorner = t.outer;
    st.currentInnerCorner = t.inner;
    updateCornerSelection();
    st.selectedFrame = t.frame || 'none';
    frameColorInput.value = t.frameColor || '#000000';
    frameColorTextInput.value = t.frameColor || '#000000';
    updateFrameSelection();
    if (t.logo) {
        st.currentLogoPreset = t.logo;
        logoControls.classList.remove('hidden');
        st.logoColor = t.fg;
        if (logoColorInput) logoColorInput.value = t.fg;
        if (logoColorText) logoColorText.value = t.fg;
    } else {
        st.currentLogoPreset = 'none';
        logoControls.classList.add('hidden');
    }
    updateLogoSelection();
    updateQRCode();
    captureState();
}

let qrAnimFrame;
let _renderDebounceTimer = null;
const _RENDER_DEBOUNCE_MS = 30;

function _debouncedUpdateQRCode() {
    clearTimeout(_renderDebounceTimer);
    _renderDebounceTimer = setTimeout(() => updateQRCode(), _RENDER_DEBOUNCE_MS);
}

function checkContrast() {
    const ratio = getContrastRatio(fgColorInput.value, bgColorInput.value);
    if (ratio < 4.5) {
        contrastWarning.classList.remove('hidden');
    } else {
        contrastWarning.classList.add('hidden');
    }
}

function checkScannability() {
    if (st.currentLogoPreset !== 'none') {
        scannabilityInfo.classList.remove('hidden');
    } else {
        scannabilityInfo.classList.add('hidden');
    }
}

function handleLogoUpload(file) {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        st.logoDataUrl = e.target.result;
        logoImg.src = st.logoDataUrl;
        customLogoBtn.style.display = 'flex';
        customLogoBtn.classList.remove('hidden');
        logoPreview.classList.remove('hidden');
        logoControls.classList.remove('hidden');
        st.currentLogoPreset = 'custom';
        updateLogoSelection();
        updateQRCode();
        checkScannability();
    };
    reader.readAsDataURL(file);
}

document.getElementById('logoGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.logo-btn');
    if (!btn) return;
    const preset = btn.getAttribute('data-logo');
    if (preset === null) return;
    st.currentLogoPreset = preset;
    updateLogoSelection();
    logoControls.classList.toggle('hidden', preset === 'none');
    updateQRCode();
    captureState();
});

logoInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleLogoUpload(e.target.files[0]);
    }
});

logoRemove.addEventListener('click', () => {
    st.logoDataUrl = null;
    customLogoBtn.style.display = '';
    customLogoBtn.classList.add('hidden');
    logoPreview.classList.add('hidden');
    logoInput.value = '';
    if (st.currentLogoPreset === 'custom') {
        st.currentLogoPreset = 'none';
        updateLogoSelection();
        logoControls.classList.add('hidden');
    }
    updateQRCode();
    captureState();
});

frameBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        st.selectedFrame = btn.getAttribute('data-frame');
        updateFrameSelection();
        updateQRCode();
        captureState();
    });
});

function drawFrame(ctx, size, frame, frameColor, frameText, textBarHeight) {
    const color = frameColor || '#000000';
    const padding = 10;
    const x = padding;
    const y = padding;
    const w = size - padding * 2;
    const h = size - padding * 2;
    ctx.strokeStyle = color;

    if (frame !== 'text-only') {
        switch (frame) {
            case 'rounded-rect':
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); ctx.stroke();
                break;
            case 'simple':
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);
                break;
            case 'thick-border':
                ctx.lineWidth = 8;
                ctx.strokeRect(x, y, w, h);
                break;
            case 'double':
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);
                ctx.strokeRect(x + 7, y + 7, w - 14, h - 14);
                break;
        }
    }

    if (frameText && textBarHeight > 0) {
        const barY = size;
        const barH = textBarHeight;
        const barPad = 8;
        const barR = 8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(barPad, barY + 4, size - barPad * 2, barH - 8, barR);
        ctx.fill();
        const fontSize = Math.min(16, Math.floor(barH * 0.5));
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(frameText, size / 2, barY + barH / 2 + 2, size - barPad * 4);
    }
}

function updateQRCode() {
    const renderToken = ++st.renderGeneration;
    st.activeRenderGeneration = renderToken;
    const type = qrType.value;
    const config = qrTypeConfig[type];
    const values = getInputValues();
    const data = config.encode(values);

    if (!data) return;

    if (data.length > 2953) {
        contrastWarning.classList.remove('hidden');
        if (contrastWarningText) contrastWarningText.textContent = 'Data too long — QR may not scan. Max ~2953 chars.';
        return;
    } else if (data.length < 1) {
        contrastWarning.classList.remove('hidden');
        if (contrastWarningText) contrastWarningText.textContent = 'Please enter some data.';
        return;
    } else {
        if (contrastWarningText && contrastWarningText.textContent.includes('too long')) {
            contrastWarning.classList.add('hidden');
        }
    }

    const fgColor = fgColorInput.value;
    const bgColor = bgColorInput.value;
    const activeLogoUrl = st.currentLogoPreset === 'custom' ? st.logoDataUrl
        : st.currentLogoPreset !== 'none' ? getLogoPresetDataUrl(st.currentLogoPreset, st.logoColor)
            : null;
    const logoPercent = activeLogoUrl ? parseInt(logoSize.value) : undefined;
    const frameText = frameTextInput.value.trim();
    const TEXT_BAR_H = 44;

    const dotsOpts = { color: fgColor, type: st.currentPattern };
    if (st.useGradient) dotsOpts.gradient = st.gradientColor2;

    const qrOptions = {
        width: st.currentQRSize,
        height: st.currentQRSize,
        data: data,
        dotsOptions: dotsOpts,
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: { type: st.currentOuterCorner },
        cornersDotOptions: { type: st.currentInnerCorner },
        margin: 10,
        errorCorrectionLevel: logoPercent && logoPercent > 20 ? 'H' : 'M'
    };

    try {
        if (!st.qrCode) {
            st.qrCode = new QRCodeStyling(qrOptions);
        } else {
            st.qrCode.options = qrOptions;
        }
        st.qrCode.append(qrCodeContainer);
        const baseCanvas = st.qrCode.canvas;

        requestAnimationFrame(() => {
            if (renderToken !== st.activeRenderGeneration) return;
            if (!baseCanvas || baseCanvas.width === 0) return;

            const ctx = baseCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            const originalCanvas = document.createElement('canvas');
            originalCanvas.width = baseCanvas.width;
            originalCanvas.height = baseCanvas.height;
            const originalCtx = originalCanvas.getContext('2d');
            originalCtx.drawImage(baseCanvas, 0, 0);

            processFrameAndLogo(baseCanvas, originalCanvas, bgColor, renderToken);
        });

        constrainPreviewCanvas();
    } catch (err) {
        console.error('Failed to create QRCodeStyling instance:', err);
    }

    checkContrast();
    checkScannability();
    if (window.__isMobilePreviewTab && !window.__isMobilePreviewTab()) {
        const previewTabBtn = document.querySelector('.mobile-tab-btn[data-tab="1"]');
        if (previewTabBtn) {
            previewTabBtn.classList.add('tab-badge');
            clearTimeout(previewTabBtn._badgeTimer);
            previewTabBtn._badgeTimer = setTimeout(
                () => previewTabBtn.classList.remove('tab-badge'), 3000
            );
        }
    }

    // QR preview subtle entry animation
    if (qrAnimFrame) cancelAnimationFrame(qrAnimFrame);
    const qrContainer = document.getElementById('qrCodeContainer');
    if (qrContainer) {
        qrContainer.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        qrContainer.style.opacity = '0.7';
        qrContainer.style.transform = 'scale(0.98)';
        qrAnimFrame = requestAnimationFrame(() => {
            qrContainer.style.opacity = '1';
            qrContainer.style.transform = 'scale(1)';
        });
    }
}

function processFrameAndLogo(canvas, originalCanvas, bgColor, renderToken) {
    if (renderToken !== st.activeRenderGeneration) return;
    if (st.selectedFrame === undefined || st.selectedFrame === null) {
        st.selectedFrame = 'none';
    }

    const hasFrame = st.selectedFrame !== 'none';
    const hasText = frameTextInput && frameTextInput.value.trim().length > 0;
    const hasLogo = st.currentLogoPreset !== 'none';

    if (!hasFrame && !hasText && !hasLogo) {
        constrainPreviewCanvas();
        return;
    }

    const FRAME_PAD = 20;
    const TEXT_BAR_H = 44;

    let finalWidth = canvas.width;
    let finalHeight = canvas.height;

    if (hasFrame) {
        finalWidth = st.currentQRSize + FRAME_PAD * 2;
        finalHeight = st.currentQRSize + FRAME_PAD * 2;
    }
    if (hasText) {
        finalHeight = (hasFrame ? finalHeight : canvas.height) + TEXT_BAR_H;
    }

    let finalCanvas = canvas;
    if (hasFrame || hasText) {
        finalCanvas = document.createElement('canvas');
        finalCanvas.width = finalWidth;
        finalCanvas.height = finalHeight;
        const fc = finalCanvas.getContext('2d');

        fc.fillStyle = bgColor;
        fc.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

        const qrX = hasFrame ? FRAME_PAD : 0;
        const qrY = hasFrame ? FRAME_PAD : 0;
        fc.drawImage(canvas, qrX, qrY);

        qrCodeContainer.innerHTML = '';
        qrCodeContainer.appendChild(finalCanvas);
        if (st.qrCode) st.qrCode.canvas = finalCanvas;
    }

    if (hasFrame || hasText) {
        const frameCtx = finalCanvas.getContext('2d');
        frameCtx.imageSmoothingEnabled = true;
        frameCtx.imageSmoothingQuality = 'high';

        if (hasFrame) {
            drawFrame(frameCtx, finalWidth, st.selectedFrame, frameColorInput.value, hasText ? frameTextInput.value.trim() : '', TEXT_BAR_H);
        } else if (hasText) {
            drawFrame(frameCtx, finalWidth, 'text-only', frameColorInput.value, frameTextInput.value.trim(), TEXT_BAR_H);
        }
    }

    if (hasLogo) {
        const logoUrl = st.currentLogoPreset === 'custom' ? st.logoDataUrl
            : getLogoPresetDataUrl(st.currentLogoPreset, st.logoColor);

        if (logoUrl) {
            const logoImg = new Image();
            logoImg.onload = () => {
                if (renderToken !== st.activeRenderGeneration) return;

                let logoPercent = parseInt(logoSize.value) || 20;
                if (logoPercent > 30) {
                    contrastWarning.classList.remove('hidden');
                    if (contrastWarningText) contrastWarningText.textContent = 'Logo too large — reduced to 30%. QR may not be scannable!';
                    logoPercent = 30;
                }

                const logoMarginVal = parseInt(logoMargin.value) || 10;
                const logoSize_px = (st.currentQRSize * logoPercent) / 100;

                const ctx = finalCanvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                const logoX = (st.currentQRSize - logoSize_px) / 2 + (hasFrame ? FRAME_PAD : 0);
                const logoY = (st.currentQRSize - logoSize_px) / 2 + (hasFrame ? FRAME_PAD : 0);

                ctx.fillStyle = bgColor;
                ctx.fillRect(logoX - logoMarginVal, logoY - logoMarginVal,
                    logoSize_px + logoMarginVal * 2, logoSize_px + logoMarginVal * 2);

                ctx.drawImage(logoImg, logoX, logoY, logoSize_px, logoSize_px);

                if (st.currentLogoPreset === 'custom' && st.logoColor && st.logoColor !== '#000000') {
                    ctx.save();
                    ctx.globalCompositeOperation = 'source-atop';
                    ctx.fillStyle = st.logoColor;
                    ctx.fillRect(logoX, logoY, logoSize_px, logoSize_px);
                    ctx.restore();
                }

                constrainPreviewCanvas();
            };
            logoImg.onerror = () => {
                if (renderToken !== st.activeRenderGeneration) return;
                showToast('Failed to load logo image', 'error');
                constrainPreviewCanvas();
            };
            logoImg.src = logoUrl;
        }
    } else {
        constrainPreviewCanvas();
    }
}

function constrainPreviewCanvas(retries) {
    const canvas = qrCodeContainer.querySelector('canvas');
    if (!canvas || canvas.width === 0) {
        if ((retries || 0) < 20) setTimeout(() => constrainPreviewCanvas((retries || 0) + 1), 25);
        return;
    }
    const MAX = 280;
    const w = canvas.width;
    const h = canvas.height;
    if (w > MAX || h > MAX) {
        const scale = Math.min(MAX / w, MAX / h);
        canvas.style.width = Math.round(w * scale) + 'px';
        canvas.style.height = Math.round(h * scale) + 'px';
    } else {
        canvas.style.width = '';
        canvas.style.height = '';
    }
}

function generateQRFilename() {
    const type = qrType.value;
    const timestamp = new Date().toISOString().slice(0, 10);
    const typeLabel = { url: 'url', text: 'text', email: 'email', phone: 'phone', wifi: 'wifi', vcard: 'contact' }[type] || 'qr';
    return `qr-${typeLabel}-${timestamp}`;
}

function getSvgDownloadOptions() {
    return {
        frameStyle: st.selectedFrame,
        frameColor: frameColorInput.value,
        frameText: frameTextInput.value.trim(),
        logoDataUrl: st.currentLogoPreset === 'custom' ? st.logoDataUrl
            : st.currentLogoPreset !== 'none' ? getLogoPresetDataUrl(st.currentLogoPreset, st.logoColor)
            : null,
        logoSize: parseInt(logoSize.value) || 20,
        logoMargin: parseInt(logoMargin.value) || 10,
        logoColor: st.currentLogoPreset === 'custom' ? st.logoColor : null
    };
}

downloadPng.addEventListener('click', () => {
    if (st.qrCode) st.qrCode.download({ name: generateQRFilename(), extension: 'png' });
});

downloadSvg.addEventListener('click', () => {
    if (st.qrCode) st.qrCode.download(Object.assign({ name: generateQRFilename(), extension: 'svg' }, getSvgDownloadOptions()));
});

qrType.addEventListener('change', () => {
    renderInputFields(deps);
    updateQRCode();
    captureState();
});

qrSize.addEventListener('input', (e) => {
    st.currentQRSize = parseInt(e.target.value);
    qrSizeValue.textContent = st.currentQRSize;
    if (qrSizeLabel) qrSizeLabel.textContent = st.currentQRSize;
    if (qrSizeLabel2) qrSizeLabel2.textContent = st.currentQRSize;
    _debouncedUpdateQRCode();
    _debounceCapture();
});

fgColorInput.addEventListener('input', (e) => {
    fgColorText.value = e.target.value;
    _debouncedUpdateQRCode();
    _debounceCapture();
});

fgColorText.addEventListener('change', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        fgColorInput.value = e.target.value;
        updateQRCode();
        captureState();
    }
});

bgColorInput.addEventListener('input', (e) => {
    bgColorText.value = e.target.value;
    _debouncedUpdateQRCode();
    _debounceCapture();
});

bgColorText.addEventListener('change', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        bgColorInput.value = e.target.value;
        updateQRCode();
        captureState();
    }
});

document.getElementById('shapeGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.shape-btn');
    if (!btn) return;
    st.currentPattern = btn.getAttribute('data-pattern');
    updateShapeSelection();
    updateQRCode();
    captureState();
});

document.getElementById('outerCornerGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.corner-btn[data-outer]');
    if (!btn) return;
    st.currentOuterCorner = btn.getAttribute('data-outer');
    updateCornerSelection();
    updateQRCode();
    captureState();
});

document.getElementById('innerCornerGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.corner-btn[data-inner]');
    if (!btn) return;
    st.currentInnerCorner = btn.getAttribute('data-inner');
    updateCornerSelection();
    updateQRCode();
    captureState();
});

const gradientToggleBtn = document.getElementById('gradientToggle');
const gradColor2Input = document.getElementById('gradColor2');
const gradColor2Text = document.getElementById('gradColor2Text');
const gradColor2Row = document.getElementById('gradColor2Row');
if (gradientToggleBtn) {
    gradientToggleBtn.addEventListener('click', () => {
        st.useGradient = !st.useGradient;
        gradientToggleBtn.setAttribute('aria-pressed', st.useGradient);
        gradientToggleBtn.classList.toggle('active', st.useGradient);
        if (gradColor2Row) gradColor2Row.classList.toggle('hidden', !st.useGradient);
        _debouncedUpdateQRCode();
        captureState();
    });
}
if (gradColor2Input) {
    gradColor2Input.addEventListener('input', (e) => {
        st.gradientColor2 = e.target.value;
        if (gradColor2Text) gradColor2Text.value = e.target.value;
        if (st.useGradient) _debouncedUpdateQRCode();
        _debounceCapture();
    });
}
if (gradColor2Text) {
    gradColor2Text.addEventListener('change', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            st.gradientColor2 = e.target.value;
            if (gradColor2Input) gradColor2Input.value = e.target.value;
            if (st.useGradient) updateQRCode();
            captureState();
        }
    });
}

frameColorInput.addEventListener('input', (e) => {
    frameColorTextInput.value = e.target.value;
    _debouncedUpdateQRCode();
    _debounceCapture();
});
frameColorTextInput.addEventListener('change', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        frameColorInput.value = e.target.value;
        updateQRCode();
        captureState();
    }
});

frameTextInput.addEventListener('input', (e) => {
    const count = e.target.value.length;
    const countDisplay = document.getElementById('frameTextCount');
    if (countDisplay) countDisplay.textContent = count;
    const preview = document.getElementById('frameLabelPreview');
    const previewText = document.getElementById('frameLabelText');
    if (previewText && preview) {
        if (e.target.value.trim()) {
            previewText.textContent = e.target.value;
            preview.classList.remove('hidden');
        } else {
            preview.classList.add('hidden');
        }
    }
    _debouncedUpdateQRCode();
    _debounceCapture();
});

logoSize.addEventListener('input', (e) => {
    logoSizeValue.textContent = e.target.value;
    _debouncedUpdateQRCode();
    checkScannability();
    _debounceCapture();
});

logoMargin.addEventListener('input', (e) => {
    logoMarginValue.textContent = e.target.value;
    _debouncedUpdateQRCode();
    _debounceCapture();
});

if (logoColorInput) {
    logoColorInput.addEventListener('input', (e) => {
        st.logoColor = e.target.value;
        if (logoColorText) logoColorText.value = e.target.value;
        _debouncedUpdateQRCode();
        _debounceCapture();
    });
}
if (logoColorText) {
    logoColorText.addEventListener('change', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            st.logoColor = e.target.value;
            if (logoColorInput) logoColorInput.value = e.target.value;
            updateQRCode();
            captureState();
        }
    });
}

function copyShareLink() {
    const hash = encodeConfigHash({
        type: qrType.value,
        values: getInputValues(),
        fg: fgColorInput.value,
        bg: bgColorInput.value,
        pattern: st.currentPattern,
        outerCorner: st.currentOuterCorner,
        innerCorner: st.currentInnerCorner,
        useGradient: st.useGradient,
        gradientColor2: st.gradientColor2,
        size: st.currentQRSize,
        logoSize: logoSize.value,
        logoMargin: logoMargin.value,
        logoPreset: st.currentLogoPreset,
        logoColor: st.logoColor,
        frame: st.selectedFrame,
        frameColor: frameColorInput.value,
        frameText: frameTextInput.value
    });
    const url = window.location.href.split('#')[0] + '#' + hash;
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copyShareLink');
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => { btn.textContent = originalText; }, 2000);
    });
}

function exportConfig() {
    const type = qrType.value;
    const values = getInputValues();
    const configObj = {
        type: type,
        values: values,
        fg: fgColorInput.value,
        bg: bgColorInput.value,
        pattern: st.currentPattern,
        outerCorner: st.currentOuterCorner,
        innerCorner: st.currentInnerCorner,
        useGradient: st.useGradient,
        gradientColor2: st.gradientColor2,
        size: st.currentQRSize,
        logoSize: logoSize.value,
        logoMargin: logoMargin.value,
        logoPreset: st.currentLogoPreset,
        logoColor: st.logoColor,
        frame: st.selectedFrame,
        frameColor: frameColorInput.value,
        frameText: frameTextInput.value,
        logo: st.logoDataUrl
    };
    const json = JSON.stringify(configObj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importConfig() {
    document.getElementById('importConfigInput').click();
}

document.getElementById('importConfigInput').addEventListener('change', (e) => {
    if (!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const configObj = JSON.parse(event.target.result);
            applyConfig(configObj, deps);
            // Handle custom logo from import
            if (configObj.logo) {
                st.logoDataUrl = configObj.logo;
                logoImg.src = st.logoDataUrl;
                customLogoBtn.style.display = 'flex';
                customLogoBtn.classList.remove('hidden');
                logoPreview.classList.remove('hidden');
                st.currentLogoPreset = 'custom';
                updateLogoSelection();
                logoControls.classList.remove('hidden');
                updateQRCode();
            }
            captureState();
        } catch (e) {
            showToast('Import failed: ' + e.message, 'error');
        }
    };
    reader.readAsText(e.target.files[0]);
});

document.getElementById('copyShareLink').addEventListener('click', copyShareLink);
document.getElementById('exportConfig').addEventListener('click', exportConfig);
document.getElementById('importConfig').addEventListener('click', importConfig);

if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const cfg = decodeConfigHash(hash);
    if (cfg) applyConfig(cfg, deps);
} else {
    renderInputFields(deps);
    updateQRCode();
}
renderTemplates();

// ── Reset Design ─────────────────────────────────────────────────────
function doReset() {
    qrType.value = 'url';
    renderInputFields(deps);
    fgColorInput.value = '#000000';
    fgColorText.value = '#000000';
    bgColorInput.value = '#ffffff';
    bgColorText.value = '#ffffff';
    st.currentPattern = 'square';
    st.currentOuterCorner = 'square';
    st.currentInnerCorner = 'square';
    st.useGradient = false;
    st.gradientColor2 = '#3b82f6';
    if (gradColor2Input) gradColor2Input.value = st.gradientColor2;
    if (gradColor2Text) gradColor2Text.value = st.gradientColor2;
    if (gradientToggleBtn) { gradientToggleBtn.setAttribute('aria-pressed', false); gradientToggleBtn.classList.remove('active'); }
    if (gradColor2Row) gradColor2Row.classList.add('hidden');
    st.currentQRSize = 300;
    qrSize.value = 300;
    qrSizeValue.textContent = '300';
    logoSize.value = 20;
    logoSizeValue.textContent = '20';
    logoMargin.value = 10;
    logoMarginValue.textContent = '10';
    st.logoColor = '#000000';
    if (logoColorInput) logoColorInput.value = '#000000';
    if (logoColorText) logoColorText.value = '#000000';
    st.selectedFrame = 'none';
    frameColorInput.value = '#000000';
    frameColorTextInput.value = '#000000';
    frameTextInput.value = '';
    st.currentLogoPreset = 'none';
    st.logoDataUrl = null;
    logoImg.src = '';
    customLogoBtn.style.display = '';
    customLogoBtn.classList.add('hidden');
    logoPreview.classList.add('hidden');
    logoInput.value = '';
    logoControls.classList.add('hidden');
    updateShapeSelection();
    updateCornerSelection();
    updateFrameSelection();
    updateLogoSelection();
    updateQRCode();
    captureState();
    showToast('Design reset to defaults', 'info');
}
(function initResetDesign() {
    const btn = document.getElementById('resetDesign');
    if (btn) btn.addEventListener('click', doReset);
})();

// ── Mobile Tab Navigation ───────────────────────────────────────────────
(function () {
    const panels = [
        document.getElementById('panelData'),
        document.getElementById('panelPreview'),
        document.getElementById('panelDesign')
    ];
    const tabBtns = document.querySelectorAll('.mobile-tab-btn');
    let currentMobileTab = 0;

    function switchMobileTab(index) {
        currentMobileTab = index;
        panels.forEach((p, i) => {
            if (!p) return;
            p.classList.toggle('mobile-active-panel', i === index);
        });
        tabBtns.forEach((btn, i) => {
            btn.classList.toggle('tab-active', i === index);
        });
        if (index === 1) {
            const previewBtn = document.querySelector('.mobile-tab-btn[data-tab="1"]');
            if (previewBtn) previewBtn.classList.remove('tab-badge');
            constrainPreviewCanvas();
        }
    }

    function applyMobileLayout() {
        if (window.innerWidth < 768) {
            switchMobileTab(currentMobileTab);
        } else {
            panels.forEach(p => { if (p) p.classList.remove('mobile-active-panel'); });
        }
    }

    window.__isMobilePreviewTab = () => currentMobileTab === 1 && window.innerWidth < 768;

    tabBtns.forEach((btn, i) => {
        btn.addEventListener('click', () => switchMobileTab(i));
    });

    window.addEventListener('resize', applyMobileLayout);
    applyMobileLayout();

    const dlPngM = document.getElementById('downloadPngMobile');
    const dlSvgM = document.getElementById('downloadSvgMobile');
    if (dlPngM) dlPngM.addEventListener('click', () => {
        if (st.qrCode) st.qrCode.download({ name: generateQRFilename(), extension: 'png' });
    });
    if (dlSvgM) dlSvgM.addEventListener('click', () => {
        if (st.qrCode) st.qrCode.download(Object.assign({ name: generateQRFilename(), extension: 'svg' }, getSvgDownloadOptions()));
    });
})();

// ── Onboarding banner ──────────────────────────────────────────────────
(function initOnboarding() {
    const banner = document.getElementById('onboardingBanner');
    const dismissBtn = document.getElementById('dismissOnboarding');
    if (!banner) return;
    if (!localStorage.getItem('qrtist_v1_welcomed')) {
        banner.style.display = 'block';
    }
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            banner.classList.add('banner-hiding');
            setTimeout(() => {
                banner.style.display = 'none';
            }, 300);
            localStorage.setItem('qrtist_v1_welcomed', '1');
        });
    }

    // Header menu (replaces help & about)
    const headerMenuBtn = document.getElementById('headerMenuBtn');
    const headerMenu = document.getElementById('headerMenu');
    const resetFromMenu = document.getElementById('resetDesignFromMenu');

    if (headerMenuBtn && headerMenu) {
        headerMenu.classList.add('menu-hidden');
        headerMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = headerMenu.classList.contains('menu-visible');
            if (isOpen) {
                headerMenu.classList.remove('menu-visible');
                headerMenu.classList.add('menu-hidden');
            } else {
                headerMenu.classList.remove('menu-hidden');
                headerMenu.classList.add('menu-visible');
            }
            headerMenuBtn.setAttribute('aria-expanded', !isOpen);
            if (!isOpen) {
                const close = (ev) => {
                    if (!headerMenu.contains(ev.target) && ev.target !== headerMenuBtn) {
                        headerMenu.classList.remove('menu-visible');
                        headerMenu.classList.add('menu-hidden');
                        headerMenuBtn.setAttribute('aria-expanded', 'false');
                        document.removeEventListener('click', close);
                    }
                };
                setTimeout(() => document.addEventListener('click', close), 0);
            }
        });
    }

    if (resetFromMenu) {
        resetFromMenu.addEventListener('click', () => {
            doReset();
            headerMenu?.classList.remove('menu-visible');
            headerMenu?.classList.add('menu-hidden');
            headerMenuBtn?.setAttribute('aria-expanded', 'false');
        });
    }
})();

// ── Mobile "Preview my QR" CTA ─────────────────────────────────────────
(function initMobileNextBtn() {
    const btn = document.getElementById('mobileNextBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const previewTab = document.querySelector('.mobile-tab-btn[data-tab="1"]');
        if (previewTab) previewTab.click();
    });
})();

// ── Keyboard Shortcuts (Undo/Redo) ───────────────────────────────────
document.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (!mod) return;
    if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
            e.preventDefault();
            redo();
        } else {
            e.preventDefault();
            undo();
        }
    } else if (e.key === 'y') {
        e.preventDefault();
        redo();
    }
});

// ── Undo/Redo Button Init ────────────────────────────────────────────
(function initUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (redoBtn) redoBtn.addEventListener('click', redo);
    // Capture initial state after first render
    setTimeout(() => captureState(), 100);
})();

// ── QR Scanner ────────────────────────────────────────────────────────
(function initScanner() {
    const modeGenerate = document.getElementById('modeGenerate');
    const modeScan = document.getElementById('modeScan');
    const scanPanel = document.getElementById('scanPanel');
    const panelData = document.getElementById('panelData');
    const panelPreview = document.getElementById('panelPreview');
    const panelDesign = document.getElementById('panelDesign');
    const scanDropZone = document.getElementById('scanDropZone');
    const scanFileInput = document.getElementById('scanFileInput');
    const scanResult = document.getElementById('scanResult');
    const scanResultType = document.getElementById('scanResultType');
    const scanResultContent = document.getElementById('scanResultContent');
    const scanOpenBtn = document.getElementById('scanOpenBtn');
    const scanCopyBtn = document.getElementById('scanCopyBtn');
    const scanGenerateBtn = document.getElementById('scanGenerateBtn');
    const qrTypeSelect = document.getElementById('qrType');
    const qrTypeSection = document.getElementById('qrTypeSection');
    const batchModeBtn = document.getElementById('batchModeBtn');
    const sizeSection = document.getElementById('sizeSection');
    const qrCodeContainer = panelPreview.querySelector('#qrCodeContainer');

    if (!modeGenerate || !modeScan) return;

    function showGenerateMode() {
        modeGenerate.style.background = 'var(--md-primary)';
        modeGenerate.style.color = 'var(--md-on-primary)';
        modeScan.style.background = 'transparent';
        modeScan.style.color = 'var(--md-on-surface-variant)';
        scanPanel.classList.remove('panel-visible');
        scanPanel.classList.add('panel-hidden');
        scanPanel.classList.add('hidden');
        if (qrTypeSection) qrTypeSection.style.display = '';
        document.getElementById('inputFields').style.display = '';
        if (batchModeBtn) batchModeBtn.style.display = '';
        if (sizeSection) sizeSection.style.display = '';
        document.querySelector('.mobile-hidden').style.display = '';
        qrCodeContainer.classList.remove('hidden');
        qrCodeContainer.innerHTML = '';
        if (panelDesign) panelDesign.style.display = '';
        scanResult.classList.remove('result-visible');
        scanResult.classList.add('result-hidden');
        scanResult.classList.add('hidden');
    }

    function showScanMode() {
        modeScan.style.background = 'var(--md-primary)';
        modeScan.style.color = 'var(--md-on-primary)';
        modeGenerate.style.background = 'transparent';
        modeGenerate.style.color = 'var(--md-on-surface-variant)';
        scanPanel.classList.remove('hidden');
        scanPanel.classList.remove('panel-hidden');
        scanPanel.classList.add('panel-visible');
        if (qrTypeSection) qrTypeSection.style.display = 'none';
        document.getElementById('inputFields').style.display = 'none';
        if (batchModeBtn) batchModeBtn.style.display = 'none';
        if (sizeSection) sizeSection.style.display = 'none';
        document.querySelector('.mobile-hidden').style.display = 'none';
        qrCodeContainer.classList.add('hidden');
        if (panelDesign) panelDesign.style.display = 'none';
        scanResult.classList.remove('result-visible');
        scanResult.classList.add('result-hidden');
        scanResult.classList.add('hidden');
    }

    modeGenerate.addEventListener('click', showGenerateMode);
    modeScan.addEventListener('click', showScanMode);

    function detectContentType(text) {
        if (!text) return { type: 'Text', action: null };
        if (/^https?:\/\//i.test(text)) return { type: 'URL', action: 'url', value: text };
        if (/^WIFI:/i.test(text)) return { type: 'WiFi', action: null };
        if (/^BEGIN:VCARD/i.test(text)) return { type: 'vCard', action: null };
        if (/^BEGIN:VCALENDAR/i.test(text)) return { type: 'Calendar', action: null };
        if (/^smsto:/i.test(text)) return { type: 'SMS', action: null };
        if (/^(bitcoin|ethereum):/i.test(text)) return { type: 'Crypto', action: null };
        if (/^tel:/i.test(text)) return { type: 'Phone', action: null };
        if (/^mailto:/i.test(text)) return { type: 'Email', action: null };
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return { type: 'Email', action: 'email', value: text };
        return { type: 'Text', action: null };
    }

    function showResult(decodedText) {
        const content = detectContentType(decodedText);
        scanResultType.textContent = content.type;
        scanResultContent.textContent = decodedText;
        scanResult.classList.remove('hidden');
        scanResult.classList.remove('result-hidden');
        scanResult.classList.add('result-visible');
        if (content.action === 'url') {
            scanOpenBtn.classList.remove('hidden');
            scanOpenBtn.textContent = 'Open';
            scanOpenBtn.onclick = () => window.open(content.value, '_blank');
        } else if (content.action === 'email') {
            scanOpenBtn.classList.remove('hidden');
            scanOpenBtn.textContent = 'Email';
            scanOpenBtn.onclick = () => window.location.href = `mailto:${content.value}`;
        } else {
            scanOpenBtn.classList.add('hidden');
        }
    }

    scanCopyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(scanResultContent.textContent).catch(() => {});
    });

    scanGenerateBtn.addEventListener('click', () => {
        showGenerateMode();
        const text = scanResultContent.textContent;
        const content = detectContentType(text);
        if (content.action === 'url') {
            qrTypeSelect.value = 'url';
        } else {
            qrTypeSelect.value = 'text';
        }
        qrTypeSelect.dispatchEvent(new Event('change'));
        setTimeout(() => {
            const inputField = document.querySelector('#inputFields input');
            if (inputField) {
                inputField.value = text;
                inputField.dispatchEvent(new Event('input'));
            }
        }, 100);
    });

    scanDropZone.addEventListener('click', () => scanFileInput.click());
    scanDropZone.addEventListener('dragover', (e) => { e.preventDefault(); scanDropZone.classList.add('drag-over'); });
    scanDropZone.addEventListener('dragleave', () => scanDropZone.classList.remove('drag-over'));
    scanDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        scanDropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) scanFile(e.dataTransfer.files[0]);
    });
    scanFileInput.addEventListener('change', (e) => {
        if (e.target.files.length) scanFile(e.target.files[0]);
    });

    function scanFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, canvas.width, canvas.height);
                    if (code) {
                        showResult(code.data);
                        showScanPreview(img, code.location);
                    } else {
                        showScanPreview(img, null);
                        scanResultType.textContent = 'Not Found';
                        scanResultContent.textContent = 'No QR code detected in this image.';
                        scanResult.classList.remove('hidden');
                        scanResult.classList.remove('result-hidden');
                        scanResult.classList.add('result-visible');
                    }
                } catch (e) {
                    scanResultType.textContent = 'Error';
                    scanResultContent.textContent = 'Could not decode image. Try a different file.';
                    scanResult.classList.remove('hidden');
                    scanResult.classList.remove('result-hidden');
                    scanResult.classList.add('result-visible');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function showScanPreview(img, location) {
        const container = qrCodeContainer;
        container.innerHTML = '';
        container.classList.remove('hidden');

        const maxDim = Math.min(container.clientWidth || 320, 480);
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = w;
        previewCanvas.height = h;
        previewCanvas.style.width = w + 'px';
        previewCanvas.style.height = h + 'px';
        previewCanvas.style.borderRadius = '0.5rem';
        container.appendChild(previewCanvas);

        const pctx = previewCanvas.getContext('2d');
        pctx.drawImage(img, 0, 0, w, h);

        if (location) {
            const pts = ['topLeftCorner', 'topRightCorner', 'bottomRightCorner', 'bottomLeftCorner'];
            pctx.strokeStyle = '#4ade80';
            pctx.lineWidth = Math.max(2, Math.round(3 * scale));
            pctx.beginPath();
            pts.forEach((key, i) => {
                const x = location[key].x * scale;
                const y = location[key].y * scale;
                i === 0 ? pctx.moveTo(x, y) : pctx.lineTo(x, y);
            });
            pctx.closePath();
            pctx.stroke();
            pctx.fillStyle = 'rgba(74, 222, 128, 0.1)';
            pctx.fill();
        }
    }
})();

// ── Batch Generation ──────────────────────────────────────────────────
(function initBatch() {
    const batchBtn = document.getElementById('batchModeBtn');
    const overlay = document.getElementById('batchOverlay');
    const closeBtn = document.getElementById('batchCloseBtn');
    const backBtn = document.getElementById('batchBackBtn');
    const pasteTab = document.getElementById('batchPasteTab');
    const csvTab = document.getElementById('batchCsvTab');
    const pastePanel = document.getElementById('batchPastePanel');
    const csvPanel = document.getElementById('batchCsvPanel');
    const pasteInput = document.getElementById('batchPasteInput');
    const dropZone = document.getElementById('batchDropZone');
    const csvInput = document.getElementById('batchCsvInput');
    const preview = document.getElementById('batchPreview');
    const grid = document.getElementById('batchGrid');
    const countEl = document.getElementById('batchCount');
    const downloadZip = document.getElementById('batchDownloadZip');
    const downloadSheet = document.getElementById('batchDownloadSheet');

    if (!batchBtn || !overlay) return;

    let batchItems = [];

    function openOverlay() { overlay.classList.remove('hidden'); }
    function closeOverlay() { overlay.classList.add('hidden'); }

    batchBtn.addEventListener('click', openOverlay);
    closeBtn.addEventListener('click', closeOverlay);
    backBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });

    pasteTab.addEventListener('click', () => {
        pasteTab.style.background = 'var(--md-primary)';
        pasteTab.style.color = 'var(--md-on-primary)';
        csvTab.style.background = 'transparent';
        csvTab.style.color = 'var(--md-on-surface-variant)';
        pastePanel.classList.remove('hidden');
        csvPanel.classList.add('hidden');
    });
    csvTab.addEventListener('click', () => {
        csvTab.style.background = 'var(--md-primary)';
        csvTab.style.color = 'var(--md-on-primary)';
        pasteTab.style.background = 'transparent';
        pasteTab.style.color = 'var(--md-on-surface-variant)';
        csvPanel.classList.remove('hidden');
        pastePanel.classList.add('hidden');
    });

    pasteInput.addEventListener('input', () => {
        const lines = pasteInput.value.split('\n').map(l => l.trim()).filter(l => l.length > 0).slice(0, 100);
        batchItems = lines.map((line, i) => ({ data: line, label: `qr-${String(i + 1).padStart(3, '0')}`, color: null }));
        renderPreview();
    });

    dropZone.addEventListener('click', () => csvInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) parseCsv(e.dataTransfer.files[0]);
    });
    csvInput.addEventListener('change', (e) => {
        if (e.target.files.length) parseCsv(e.target.files[0]);
    });

    function parseCsv(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const rows = text.split('\n').map(r => r.trim()).filter(r => r.length > 0);
            if (rows.length < 2) return;
            const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
            const dataIdx = headers.indexOf('data');
            const labelIdx = headers.indexOf('label');
            const colorIdx = headers.indexOf('color');
            batchItems = [];
            for (let i = 1; i < Math.min(rows.length, 101); i++) {
                const cols = rows[i].split(',').map(c => c.trim());
                batchItems.push({
                    data: dataIdx >= 0 ? cols[dataIdx] : cols[0],
                    label: labelIdx >= 0 ? cols[labelIdx] : `qr-${String(i).padStart(3, '0')}`,
                    color: colorIdx >= 0 ? cols[colorIdx] : null
                });
            }
            renderPreview();
        };
        reader.readAsText(file);
    }

    function renderPreview() {
        grid.innerHTML = '';
        countEl.textContent = batchItems.length;
        if (batchItems.length === 0) {
            preview.classList.add('hidden');
            downloadZip.classList.add('hidden');
            downloadSheet.classList.add('hidden');
            return;
        }
        preview.classList.remove('hidden');
        downloadZip.classList.remove('hidden');
        downloadSheet.classList.remove('hidden');

        const fgColor = document.getElementById('fgColor').value;
        const bgColor = document.getElementById('bgColor').value;
        const currentPattern = document.querySelector('.shape-btn.selected')?.dataset.pattern || 'square';
        const currentOuterCorner = document.querySelector('#outerCornerGrid .corner-btn.selected')?.dataset.outer || 'square';
        const currentInnerCorner = document.querySelector('#innerCornerGrid .corner-btn.selected')?.dataset.inner || 'square';

        batchItems.forEach((item, idx) => {
            const thumb = document.createElement('div');
            thumb.className = 'flex flex-col items-center gap-1';
            const canvasWrap = document.createElement('div');
            canvasWrap.className = 'batch-thumb';
            canvasWrap.style.width = '80px';
            canvasWrap.style.height = '80px';
            canvasWrap.style.borderRadius = '0.5rem';
            canvasWrap.style.background = 'var(--md-surface-container-highest)';
            canvasWrap.style.border = '1px solid var(--md-outline-variant)';
            canvasWrap.style.overflow = 'hidden';
            const label = document.createElement('span');
            label.className = 'text-[10px] truncate w-full text-center';
            label.style.color = 'var(--md-on-surface-variant)';
            label.textContent = item.label;
            thumb.appendChild(canvasWrap);
            thumb.appendChild(label);
            grid.appendChild(thumb);

            const miniQr = new QRCodeStyling({
                width: 80,
                height: 80,
                data: item.data.substring(0, 200),
                dotsOptions: { color: item.color || fgColor, type: currentPattern },
                backgroundOptions: { color: bgColor },
                cornersSquareOptions: { type: currentOuterCorner },
                cornersDotOptions: { type: currentInnerCorner },
                margin: 2,
                errorCorrectionLevel: 'M'
            });
            miniQr.append(canvasWrap);
        });
    }

    downloadZip.addEventListener('click', async () => {
        if (!batchItems.length || typeof JSZip === 'undefined') return;
        const zip = new JSZip();
        const fgColor = document.getElementById('fgColor').value;
        const bgColor = document.getElementById('bgColor').value;
        const currentPattern = document.querySelector('.shape-btn.selected')?.dataset.pattern || 'square';
        const currentOuterCorner = document.querySelector('#outerCornerGrid .corner-btn.selected')?.dataset.outer || 'square';
        const currentInnerCorner = document.querySelector('#innerCornerGrid .corner-btn.selected')?.dataset.inner || 'square';
        const size = parseInt(document.getElementById('qrSize').value) || 300;

        downloadZip.textContent = 'Generating...';
        downloadZip.disabled = true;

        let skipped = 0;
        for (const item of batchItems) {
            try {
                const qr = new QRCodeStyling({
                    width: size,
                    height: size,
                    data: item.data.substring(0, 200),
                    dotsOptions: { color: item.color || fgColor, type: currentPattern },
                    backgroundOptions: { color: bgColor },
                    cornersSquareOptions: { type: currentOuterCorner },
                    cornersDotOptions: { type: currentInnerCorner },
                    margin: 10,
                    errorCorrectionLevel: 'M'
                });
                const wrap = document.createElement('div');
                wrap.style.width = size + 'px';
                wrap.style.height = size + 'px';
                qr.append(wrap);
                const canvas = qr.canvas;
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                zip.file(`${item.label}.png`, blob);
            } catch (e) {
                skipped++;
                console.warn('Skipping batch item ' + item.label + ': ' + e.message);
            }
        }

        if (skipped > 0) showToast(skipped + ' item(s) skipped due to invalid data', 'warn');

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qrtist-batch.zip';
        a.click();
        URL.revokeObjectURL(url);

        downloadZip.textContent = 'Download ZIP';
        downloadZip.disabled = false;
    });

    downloadSheet.addEventListener('click', () => {
        if (!batchItems.length) return;
        const fgColor = document.getElementById('fgColor').value;
        const bgColor = document.getElementById('bgColor').value;
        const cols = 4;
        const cellSize = 200;
        const padding = 20;
        const rows = Math.ceil(batchItems.length / cols);
        const svgW = cols * (cellSize + padding) + padding;
        const svgH = rows * (cellSize + padding + 30) + padding;

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
        svgContent += `<rect width="${svgW}" height="${svgH}" fill="${bgColor}"/>`;

        batchItems.forEach((item, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = padding + col * (cellSize + padding);
            const y = padding + row * (cellSize + padding + 30);
            svgContent += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="white" stroke="#ccc" stroke-width="2" rx="8"/>`;
            svgContent += `<text x="${x + cellSize / 2}" y="${y + cellSize / 2}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#666">QR: ${item.label}</text>`;
            svgContent += `<text x="${x + cellSize / 2}" y="${y + cellSize + 16}" text-anchor="middle" font-size="11" fill="#333" font-weight="600">${item.label}</text>`;
        });

        svgContent += '</svg>';

        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qrtist-sheet.svg';
        a.click();
        URL.revokeObjectURL(url);
    });
})();

// ── Staggered Entry Animation ───────────────────────────────────────────
function initStaggerAnimation() {
    const panels = document.querySelectorAll('.grid-layout > .panel-card');
    if (panels.length) {
        panels.forEach((panel, i) => {
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(12px)';
            panel.style.transition = `opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)`;
            panel.style.transitionDelay = `${i * 80}ms`;
            requestAnimationFrame(() => {
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
            });
        });
    }
}
if (document.readyState === 'complete') {
    initStaggerAnimation();
} else {
    window.addEventListener('load', initStaggerAnimation);
}

// ── Accordion Slide Animation ──────────────────────────────────────────
// Animates both expand and collapse with smooth slide + center scroll
(function initAccordionAnimations() {
    const panels = document.querySelectorAll('#panelDesign, #panelData');
    if (!panels.length) return;

    const DURATION = 300;

    function initOpenState(details, body) {
        if (details.open) {
            details.classList.add('acc-open');
            body.style.maxHeight = body.scrollHeight + 'px';
        }
    }

    panels.forEach(panel => panel.querySelectorAll('details').forEach((details) => {
        const body = details.querySelector('.acc-body');
        const summary = details.querySelector('summary');
        if (!body || !summary) return;

        initOpenState(details, body);

        summary.addEventListener('click', (e) => {
            e.preventDefault();
            if (details.classList.contains('acc-open')) {
                body.style.maxHeight = body.scrollHeight + 'px';
                requestAnimationFrame(() => {
                    body.style.maxHeight = '0';
                });
                details.classList.remove('acc-open');
                setTimeout(() => {
                    details.removeAttribute('open');
                }, DURATION);
            } else {
                details.setAttribute('open', '');
                details.classList.add('acc-open');
                body.style.maxHeight = body.scrollHeight + 'px';
                summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }));
})();
