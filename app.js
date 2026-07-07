// roundRect polyfill for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}

window.QRCodeStyling = (function () {
    function QRCodeStyling(options) {
        this.options = options || {};
        this.canvas = null;
    }

    function drawModule(ctx, patternType, x, y, mSize) {
        const r = mSize / 2;
        switch (patternType) {
            case 'dots':
                ctx.beginPath();
                ctx.arc(x + r, y + r, r * 0.65, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'rounded':
                ctx.roundRect(x, y, mSize, mSize, r * 0.35);
                ctx.fill();
                break;
            case 'extra-rounded':
                ctx.beginPath();
                ctx.arc(x + r, y + r, r * 0.92, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'classy':
                ctx.fillRect(x + 1, y + 1, mSize - 2, mSize - 2);
                break;
            case 'classy-rounded':
                ctx.roundRect(x + 1, y + 1, mSize - 2, mSize - 2, r * 0.45);
                ctx.fill();
                break;
            case 'classy-dots':
                ctx.beginPath();
                ctx.arc(x + r, y + r, r * 0.5, 0, Math.PI * 2);
                ctx.fill();
                break;
            default:
                ctx.fillRect(x, y, mSize, mSize);
        }
    }

    function isFinderModule(row, col, n) {
        if (row < 7 && col < 7) return true;
        if (row < 7 && col >= n - 7) return true;
        if (row >= n - 7 && col < 7) return true;
        return false;
    }

    function drawStarPath(ctx, cx, cy, outerR, innerR, points) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI / points) - Math.PI / 2;
            const r = i % 2 === 0 ? outerR : innerR;
            if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
            else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
        }
        ctx.closePath();
    }

    function drawFinderPattern(ctx, px, py, mSize, outerType, innerType, fgColor, bgColor) {
        const sz = mSize * 7;
        const cx = sz / 2;
        const cy = sz / 2;
        const in3s = mSize * 3;

        function outerShape(c, inset, type) {
            const s = sz - inset * 2;
            const x0 = inset, y0 = inset;
            const lx = x0 + s / 2, ly = y0 + s / 2;
            switch (type) {
                case 'circle':
                    c.beginPath(); c.arc(lx, ly, s / 2, 0, Math.PI * 2); c.fill(); break;
                case 'rounded':
                    c.beginPath(); c.roundRect(x0, y0, s, s, s * 0.22); c.fill(); break;
                case 'diamond':
                    c.beginPath();
                    c.moveTo(lx, y0); c.lineTo(x0 + s, ly); c.lineTo(lx, y0 + s); c.lineTo(x0, ly);
                    c.closePath(); c.fill(); break;
                case 'octagon': {
                    const cut = s * 0.22;
                    c.beginPath();
                    c.moveTo(x0 + cut, y0); c.lineTo(x0 + s - cut, y0);
                    c.lineTo(x0 + s, y0 + cut); c.lineTo(x0 + s, y0 + s - cut);
                    c.lineTo(x0 + s - cut, y0 + s); c.lineTo(x0 + cut, y0 + s);
                    c.lineTo(x0, y0 + s - cut); c.lineTo(x0, y0 + cut);
                    c.closePath(); c.fill(); break;
                }
                case 'squircle':
                    c.beginPath(); c.roundRect(x0, y0, s, s, s * 0.38); c.fill(); break;
                default:
                    c.fillRect(x0, y0, s, s);
            }
        }

        const tc = document.createElement('canvas');
        tc.width = Math.ceil(sz);
        tc.height = Math.ceil(sz);
        const tc_ctx = tc.getContext('2d');

        tc_ctx.fillStyle = fgColor;
        outerShape(tc_ctx, 0, outerType);

        tc_ctx.globalCompositeOperation = 'destination-out';
        tc_ctx.fillStyle = 'rgba(0,0,0,1)';
        outerShape(tc_ctx, mSize, outerType);

        tc_ctx.globalCompositeOperation = 'source-over';
        tc_ctx.fillStyle = fgColor;
        switch (innerType) {
            case 'dot':
                tc_ctx.beginPath(); tc_ctx.arc(cx, cy, in3s / 2, 0, Math.PI * 2); tc_ctx.fill(); break;
            case 'rounded':
                tc_ctx.beginPath(); tc_ctx.roundRect(cx - in3s / 2, cy - in3s / 2, in3s, in3s, in3s * 0.28); tc_ctx.fill(); break;
            case 'star':
                drawStarPath(tc_ctx, cx, cy, in3s * 0.56, in3s * 0.22, 5); tc_ctx.fill(); break;
            case 'diamond':
                tc_ctx.beginPath();
                tc_ctx.moveTo(cx, cy - in3s / 2); tc_ctx.lineTo(cx + in3s / 2, cy);
                tc_ctx.lineTo(cx, cy + in3s / 2); tc_ctx.lineTo(cx - in3s / 2, cy);
                tc_ctx.closePath(); tc_ctx.fill(); break;
            case 'cross':
                tc_ctx.fillRect(cx - in3s / 6, cy - in3s / 2, in3s / 3, in3s);
                tc_ctx.fillRect(cx - in3s / 2, cy - in3s / 6, in3s, in3s / 3); break;
            default:
                tc_ctx.fillRect(cx - in3s / 2, cy - in3s / 2, in3s, in3s);
        }

        ctx.drawImage(tc, px, py);
    }

    QRCodeStyling.prototype.append = function (container) {
        container.innerHTML = '';
        const opts = this.options;
        const size = opts.width || 300;
        const fgColor = opts.dotsOptions?.color || '#000000';
        const fgColor2 = opts.dotsOptions?.gradient || null;
        const bgColor = opts.backgroundOptions?.color || '#ffffff';
        const pattern = opts.dotsOptions?.type || 'square';
        const outerType = opts.cornersSquareOptions?.type || 'square';
        const innerType = opts.cornersDotOptions?.type || 'square';
        const ecLevel = opts.errorCorrectionLevel || 'M';
        const data = opts.data || 'https://google.com/';
        let qr;
        try {
            qr = window.QRCodeLib.create(data, { errorCorrectionLevel: ecLevel });
        } catch (e) { console.error('QRCodeLib.create failed:', e); return; }
        const numModules = qr.modules.size;
        const margin = 2;
        const mSize = size / (numModules + margin * 2);
        this.canvas = document.createElement('canvas');
        this.canvas.width = size;
        this.canvas.height = size;
        const ctx = this.canvas.getContext('2d');
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);
        if (fgColor2) {
            const grad = ctx.createLinearGradient(0, 0, size, size);
            grad.addColorStop(0, fgColor);
            grad.addColorStop(1, fgColor2);
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = fgColor;
        }

        if (pattern === 'square' && !fgColor2) {
            const modCanvas = document.createElement('canvas');
            modCanvas.width = size;
            modCanvas.height = size;
            const mctx = modCanvas.getContext('2d');
            mctx.fillStyle = fgColor;
            for (let row = 0; row < numModules; row++) {
                for (let col = 0; col < numModules; col++) {
                    if (isFinderModule(row, col, numModules)) continue;
                    if (qr.modules.data[row * numModules + col]) {
                        const x = (col + margin) * mSize;
                        const y = (row + margin) * mSize;
                        mctx.fillRect(x, y, mSize, mSize);
                    }
                }
            }
            ctx.drawImage(modCanvas, 0, 0);
        } else {
            for (let row = 0; row < numModules; row++) {
                for (let col = 0; col < numModules; col++) {
                    if (isFinderModule(row, col, numModules)) continue;
                    if (qr.modules.data[row * numModules + col]) {
                        const x = (col + margin) * mSize;
                        const y = (row + margin) * mSize;
                        drawModule(ctx, pattern, x, y, mSize);
                    }
                }
            }
        }
        [[0, 0], [0, numModules - 7], [numModules - 7, 0]].forEach(([r, c]) => {
            drawFinderPattern(ctx, (c + margin) * mSize, (r + margin) * mSize, mSize, outerType, innerType, fgColor, bgColor);
        });

        container.appendChild(this.canvas);
    };

    QRCodeStyling.prototype.download = function (options) {
        if (!this.canvas) return;
        const link = document.createElement('a');
        const extension = options?.extension || 'png';
        const name = options?.name || 'qr-code';

        if (extension === 'svg') {
            try {
                const svgOpts = Object.assign({}, this.options, {
                    frameStyle: options?.frameStyle || 'none',
                    frameColor: options?.frameColor || '#000000',
                    frameText: options?.frameText || '',
                    logoDataUrl: options?.logoDataUrl || null,
                    logoSize: options?.logoSize || 20,
                    logoMargin: options?.logoMargin || 10
                });
                const svgString = generateStyledSVG(this.options.data, svgOpts);
                if (svgString) {
                    const blob = new Blob([svgString], { type: 'image/svg+xml' });
                    link.href = URL.createObjectURL(blob);
                    link.download = name + '.svg';
                } else {
                    link.href = this.canvas.toDataURL('image/png');
                    link.download = name + '.png';
                }
            } catch (e) {
                console.error('SVG export failed:', e);
                link.href = this.canvas.toDataURL('image/png');
                link.download = name + '.png';
            }
        } else {
            link.href = this.canvas.toDataURL('image/png');
            link.download = name + '.png';
        }

        link.click();
        if (extension === 'svg') {
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
        }
    };

    return QRCodeStyling;
})();

// ── SVG Export Helpers ────────────────────────────────────────────────
function _svgEscape(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _svgRoundRect(x, y, w, h, r) {
    return `M${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x + r},${y + h} Q${x},${y + h} ${x},${y + h - r} L${x},${y + r} Q${x},${y} ${x + r},${y} Z`;
}

function _svgOctagon(x, y, s) {
    const cut = s * 0.22;
    return `M${x + cut},${y} L${x + s - cut},${y} L${x + s},${y + cut} L${x + s},${y + s - cut} L${x + s - cut},${y + s} L${x + cut},${y + s} L${x},${y + s - cut} L${x},${y + cut} Z`;
}

function _svgSquircle(x, y, s) {
    return _svgRoundRect(x, y, s, s, s * 0.38);
}

function _svgStarPoints(cx, cy, outerR, innerR, points) {
    let pts = [];
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI / points) - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push((cx + r * Math.cos(angle)).toFixed(2) + ',' + (cy + r * Math.sin(angle)).toFixed(2));
    }
    return pts.join(' ');
}

function _svgModuleShape(pattern, x, y, mSize) {
    const r = mSize / 2;
    switch (pattern) {
        case 'dots':
            return `<circle cx="${x + r}" cy="${y + r}" r="${(r * 0.65).toFixed(2)}"/>`;
        case 'rounded':
            return `<path d="${_svgRoundRect(x, y, mSize, mSize, r * 0.35)}"/>`;
        case 'extra-rounded':
            return `<circle cx="${x + r}" cy="${y + r}" r="${(r * 0.92).toFixed(2)}"/>`;
        case 'classy':
            return `<rect x="${(x + 1).toFixed(2)}" y="${(y + 1).toFixed(2)}" width="${(mSize - 2).toFixed(2)}" height="${(mSize - 2).toFixed(2)}"/>`;
        case 'classy-rounded':
            return `<path d="${_svgRoundRect(x + 1, y + 1, mSize - 2, mSize - 2, r * 0.45)}"/>`;
        case 'classy-dots':
            return `<circle cx="${x + r}" cy="${y + r}" r="${(r * 0.5).toFixed(2)}"/>`;
        default:
            return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${mSize.toFixed(2)}" height="${mSize.toFixed(2)}"/>`;
    }
}

function _svgOuterFinder(type, x, y, s) {
    const cx = x + s / 2, cy = y + s / 2;
    switch (type) {
        case 'circle':
            return `<circle cx="${cx}" cy="${cy}" r="${s / 2}"/>`;
        case 'rounded':
            return `<path d="${_svgRoundRect(x, y, s, s, s * 0.22)}"/>`;
        case 'diamond':
            return `<polygon points="${cx},${y} ${x + s},${cy} ${cx},${y + s} ${x},${cy}"/>`;
        case 'octagon':
            return `<path d="${_svgOctagon(x, y, s)}"/>`;
        case 'squircle':
            return `<path d="${_svgSquircle(x, y, s)}"/>`;
        default:
            return `<rect x="${x}" y="${y}" width="${s}" height="${s}"/>`;
    }
}

function _svgInnerFinder(type, cx, cy, s) {
    const hs = s / 2;
    switch (type) {
        case 'dot':
            return `<circle cx="${cx}" cy="${cy}" r="${hs}"/>`;
        case 'rounded':
            return `<path d="${_svgRoundRect(cx - hs, cy - hs, s, s, s * 0.28)}"/>`;
        case 'star':
            return `<polygon points="${_svgStarPoints(cx, cy, s * 0.56, s * 0.22, 5)}"/>`;
        case 'diamond':
            return `<polygon points="${cx},${cy - hs} ${cx + hs},${cy} ${cx},${cy + hs} ${cx - hs},${cy}"/>`;
        case 'cross': {
            const tw = s / 3;
            return `<rect x="${cx - tw / 2}" y="${cy - hs}" width="${tw}" height="${s}"/><rect x="${cx - hs}" y="${cy - tw / 2}" width="${s}" height="${tw}"/>`;
        }
        default:
            return `<rect x="${cx - hs}" y="${cy - hs}" width="${s}" height="${s}"/>`;
    }
}

function generateStyledSVG(data, opts) {
    const size = opts.width || 300;
    const fgColor = opts.dotsOptions?.color || '#000000';
    const fgColor2 = opts.dotsOptions?.gradient || null;
    const bgColor = opts.backgroundOptions?.color || '#ffffff';
    const pattern = opts.dotsOptions?.type || 'square';
    const outerType = opts.cornersSquareOptions?.type || 'square';
    const innerType = opts.cornersDotOptions?.type || 'square';
    const ecLevel = opts.errorCorrectionLevel || 'M';
    const frameStyle = opts.frameStyle || 'none';
    const frameColor = opts.frameColor || '#000000';
    const frameText = opts.frameText || '';
    const logoDataUrl = opts.logoDataUrl || null;
    const logoSizePercent = opts.logoSize || 20;
    const logoMargin = opts.logoMargin || 10;

    let qr;
    try {
        qr = window.QRCodeLib.create(data, { errorCorrectionLevel: ecLevel });
    } catch (e) {
        console.error('SVG export: QRCodeLib.create failed:', e);
        return null;
    }

    const numModules = qr.modules.size;
    const margin = 2;
    const mSize = size / (numModules + margin * 2);
    const FRAME_PAD = 20;
    const TEXT_BAR_H = 44;
    const hasFrame = frameStyle && frameStyle !== 'none' && frameStyle !== 'text-only';
    const hasText = frameText && frameText.length > 0;
    const hasLogo = logoDataUrl && logoDataUrl.length > 0;

    let finalW = size;
    let finalH = size;
    if (hasFrame) { finalW = size + FRAME_PAD * 2; finalH = size + FRAME_PAD * 2; }
    if (hasText) finalH += TEXT_BAR_H;

    const qrX = hasFrame ? FRAME_PAD : 0;
    const qrY = hasFrame ? FRAME_PAD : 0;

    let svgParts = [];

    // Root SVG
    svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" shape-rendering="crispEdges" width="${finalW}" height="${finalH}" viewBox="0 0 ${finalW} ${finalH}">`);

    // Defs: gradient
    if (fgColor2) {
        svgParts.push(`<defs><linearGradient id="qrGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${_svgEscape(fgColor)}"/><stop offset="100%" stop-color="${_svgEscape(fgColor2)}"/></linearGradient></defs>`);
    }

    // Background
    svgParts.push(`<rect width="${finalW}" height="${finalH}" fill="${_svgEscape(bgColor)}"/>`);

    const fill = fgColor2 ? 'url(#qrGrad)' : _svgEscape(fgColor);

    // Data modules (skip finder regions)
    let modulesSvg = '';
    for (let row = 0; row < numModules; row++) {
        for (let col = 0; col < numModules; col++) {
            if (row < 7 && col < 7) continue;
            if (row < 7 && col >= numModules - 7) continue;
            if (row >= numModules - 7 && col < 7) continue;
            if (qr.modules.data[row * numModules + col]) {
                const x = (col + margin) * mSize + qrX;
                const y = (row + margin) * mSize + qrY;
                modulesSvg += _svgModuleShape(pattern, x, y, mSize);
            }
        }
    }
    svgParts.push(`<g fill="${fill}">${modulesSvg}</g>`);

    // Finder patterns (3 corners)
    const finderSize = mSize * 7;
    const finderPositions = [
        [(0 + margin) * mSize + qrX, (0 + margin) * mSize + qrY],
        [(numModules - 7 + margin) * mSize + qrX, (0 + margin) * mSize + qrY],
        [(0 + margin) * mSize + qrX, (numModules - 7 + margin) * mSize + qrY]
    ];

    for (const [fx, fy] of finderPositions) {
        const outerS = finderSize;
        const innerS = mSize * 3;
        const cx = fx + outerS / 2;
        const cy = fy + outerS / 2;

        // Outer frame: draw outer shape, cut out inner+1, draw inner separately
        // Use clip-path approach: outer shape clipped to frame ring
        svgParts.push(`<g fill="${fill}">`);
        svgParts.push(_svgOuterFinder(outerType, fx, fy, outerS));

        // Cut out inner region using bgColor
        svgParts.push(`<g fill="${_svgEscape(bgColor)}">`);
        svgParts.push(_svgOuterFinder(outerType, fx + mSize, fy + mSize, outerS - mSize * 2));
        svgParts.push(`</g>`);

        // Inner center dot
        svgParts.push(_svgInnerFinder(innerType, cx, cy, innerS));
        svgParts.push(`</g>`);
    }

    // Frame
    if (hasFrame) {
        const fp = FRAME_PAD;
        const fw = size;
        const fh = size;
        svgParts.push(`<g fill="none" stroke="${_svgEscape(frameColor)}" shape-rendering="auto">`);
        switch (frameStyle) {
            case 'simple':
                svgParts.push(`<rect x="${fp}" y="${fp}" width="${fw}" height="${fh}" stroke-width="2"/>`);
                break;
            case 'rounded-rect':
                svgParts.push(`<path d="${_svgRoundRect(fp, fp, fw, fh, 20)}" stroke-width="3"/>`);
                break;
            case 'thick-border':
                svgParts.push(`<rect x="${fp}" y="${fp}" width="${fw}" height="${fh}" stroke-width="8"/>`);
                break;
            case 'double':
                svgParts.push(`<rect x="${fp}" y="${fp}" width="${fw}" height="${fh}" stroke-width="2"/>`);
                svgParts.push(`<rect x="${fp + 7}" y="${fp + 7}" width="${fw - 14}" height="${fh - 14}" stroke-width="2"/>`);
                break;
        }
        svgParts.push(`</g>`);
    }

    // Text bar
    if (hasText) {
        const barY = finalH - TEXT_BAR_H;
        const barPad = 8;
        const barR = 8;
        const fontSize = Math.min(16, Math.floor(TEXT_BAR_H * 0.5));
        svgParts.push(`<path d="${_svgRoundRect(barPad, barY + 4, finalW - barPad * 2, TEXT_BAR_H - 8, barR)}" fill="${_svgEscape(frameColor)}" shape-rendering="auto"/>`);
        svgParts.push(`<text x="${finalW / 2}" y="${barY + TEXT_BAR_H / 2 + 2}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" shape-rendering="auto">${_svgEscape(frameText)}</text>`);
    }

    // Logo
    if (hasLogo) {
        const logoPct = Math.min(logoSizePercent, 30);
        const logoPx = (size * logoPct) / 100;
        const lx = (size - logoPx) / 2 + qrX;
        const ly = (size - logoPx) / 2 + qrY;
        // White backing rect
        svgParts.push(`<rect x="${lx - logoMargin}" y="${ly - logoMargin}" width="${logoPx + logoMargin * 2}" height="${logoPx + logoMargin * 2}" fill="${_svgEscape(bgColor)}" shape-rendering="auto"/>`);
        svgParts.push(`<image x="${lx}" y="${ly}" width="${logoPx}" height="${logoPx}" href="${_svgEscape(logoDataUrl)}" shape-rendering="auto"/>`);
    }

    svgParts.push(`</svg>`);
    return svgParts.join('\n');
}

let qrCode = null;
let logoDataUrl = null;
let currentLogoPreset = 'none';
let selectedFrame = 'none';
let currentQRSize = 300;
let currentPattern = 'square';
let currentOuterCorner = 'square';
let currentInnerCorner = 'square';
let useGradient = false;
let gradientColor2 = '#3b82f6';

// ── Undo/Redo History ────────────────────────────────────────────────
let _historyStack = [];
let _historyIndex = -1;
const _MAX_HISTORY = 50;
let _historyCaptureTimer = null;

function getConfig() {
    const type = qrType.value;
    const values = getInputValues();
    return {
        type: type,
        values: JSON.parse(JSON.stringify(values)),
        fg: fgColorInput.value,
        bg: bgColorInput.value,
        pattern: currentPattern,
        outerCorner: currentOuterCorner,
        innerCorner: currentInnerCorner,
        useGradient: useGradient,
        gradientColor2: gradientColor2,
        size: currentQRSize,
        logoSize: logoSize.value,
        logoMargin: logoMargin.value,
        logoPreset: currentLogoPreset,
        frame: selectedFrame,
        frameColor: frameColorInput.value,
        frameText: frameTextInput.value
    };
}

function applyConfig(cfg) {
    if (!cfg) return;
    qrType.value = cfg.type || 'url';
    renderInputFields();
    if (cfg.values) {
        Object.keys(cfg.values).forEach(key => {
            const el = document.getElementById(key);
            if (el) el.value = cfg.values[key];
        });
    }
    fgColorInput.value = cfg.fg || '#000000';
    fgColorText.value = cfg.fg || '#000000';
    bgColorInput.value = cfg.bg || '#ffffff';
    bgColorText.value = cfg.bg || '#ffffff';
    currentPattern = cfg.pattern || 'square';
    currentOuterCorner = cfg.outerCorner || 'square';
    currentInnerCorner = cfg.innerCorner || 'square';
    useGradient = cfg.useGradient || false;
    gradientColor2 = cfg.gradientColor2 || '#3b82f6';
    if (gradColor2Input) gradColor2Input.value = gradientColor2;
    if (gradColor2Text) gradColor2Text.value = gradientColor2;
    if (gradientToggleBtn) { gradientToggleBtn.setAttribute('aria-pressed', useGradient); gradientToggleBtn.classList.toggle('active', useGradient); }
    if (gradColor2Row) gradColor2Row.classList.toggle('hidden', !useGradient);
    currentQRSize = cfg.size || 300;
    qrSize.value = currentQRSize;
    qrSizeValue.textContent = currentQRSize;
    logoSize.value = cfg.logoSize || 20;
    logoSizeValue.textContent = cfg.logoSize || 20;
    logoMargin.value = cfg.logoMargin || 10;
    logoMarginValue.textContent = cfg.logoMargin || 10;
    selectedFrame = cfg.frame || 'none';
    frameColorInput.value = cfg.frameColor || '#000000';
    frameColorTextInput.value = cfg.frameColor || '#000000';
    frameTextInput.value = cfg.frameText || '';
    currentLogoPreset = cfg.logoPreset || 'none';
    logoDataUrl = null;
    if (currentLogoPreset !== 'none' && currentLogoPreset !== 'custom') {
        // preset logos are loaded from SVG data URLs, no need to store
    }
    updateShapeSelection();
    updateCornerSelection();
    updateFrameSelection();
    updateLogoSelection();
    logoControls.classList.toggle('hidden', currentLogoPreset === 'none');
    if (currentLogoPreset === 'custom') {
        customLogoBtn.style.display = 'flex';
        customLogoBtn.classList.remove('hidden');
        logoPreview.classList.remove('hidden');
    } else {
        customLogoBtn.style.display = '';
        customLogoBtn.classList.add('hidden');
        logoPreview.classList.add('hidden');
    }
    updateQRCode();
}

function _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function captureState() {
    const state = getConfig();
    // Truncate any future states if we're in the middle of the stack
    if (_historyIndex < _historyStack.length - 1) {
        _historyStack = _historyStack.slice(0, _historyIndex + 1);
    }
    // Avoid duplicate consecutive states
    if (_historyStack.length > 0) {
        const last = _historyStack[_historyStack.length - 1];
        if (JSON.stringify(last) === JSON.stringify(state)) return;
    }
    _historyStack.push(_deepClone(state));
    if (_historyStack.length > _MAX_HISTORY) {
        _historyStack.shift();
    }
    _historyIndex = _historyStack.length - 1;
    _updateUndoRedoButtons();
}

function _debounceCapture() {
    clearTimeout(_historyCaptureTimer);
    _historyCaptureTimer = setTimeout(() => captureState(), 600);
}

function undo() {
    if (_historyIndex <= 0) return;
    _historyIndex--;
    applyConfig(_deepClone(_historyStack[_historyIndex]));
    _updateUndoRedoButtons();
}

function redo() {
    if (_historyIndex >= _historyStack.length - 1) return;
    _historyIndex++;
    applyConfig(_deepClone(_historyStack[_historyIndex]));
    _updateUndoRedoButtons();
}

function _updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = _historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = _historyIndex >= _historyStack.length - 1;
}

// ── Toast notifications ──────────────────────────────────────────────────
function _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function showToast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: '&#10003;', error: '&#10007;', warn: '&#9888;', info: '&#8505;' };
    const icon = icons[type] || icons.info;
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<span aria-hidden="true">' + icon + '</span><span>' + _esc(message) + '</span>';
    container.appendChild(toast);
    const fadeOut = () => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 290);
    };
    setTimeout(fadeOut, duration);
}

const LOGO_PRESETS = {
    'globe': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
    'scan-brackets': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>`,
    'scan-text': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="46" font-size="22" text-anchor="middle" font-weight="900" font-family="Arial,sans-serif" fill="currentColor">SCAN</text><text x="50" y="74" font-size="22" text-anchor="middle" font-weight="900" font-family="Arial,sans-serif" fill="currentColor">ME</text></svg>`,
};

function getLogoPresetDataUrl(preset) {
    const svg = LOGO_PRESETS[preset];
    if (!svg) return null;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ── Design Templates ──────────────────────────────────────────────────
const TEMPLATES = [
    { id: 'classic-black', name: 'Classic', fg: '#000000', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'none', frameColor: '#000000' },
    { id: 'corporate-blue', name: 'Corporate', fg: '#1a56db', bg: '#ffffff', dots: 'rounded', outer: 'rounded', inner: 'dot', frame: 'none', frameColor: '#1a56db' },
    { id: 'instagram-pink', name: 'Instagram', fg: '#c13584', bg: '#fdf2f8', dots: 'dots', outer: 'circle', inner: 'dot', frame: 'none', frameColor: '#c13584' },
    { id: 'discord-purple', name: 'Discord', fg: '#5865f2', bg: '#ffffff', dots: 'rounded', outer: 'rounded', inner: 'dot', frame: 'none', frameColor: '#5865f2' },
    { id: 'youtube-red', name: 'YouTube', fg: '#ff0000', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'simple', frameColor: '#ff0000' },
    { id: 'ocean-breeze', name: 'Ocean', fg: '#0ea5e9', bg: '#f0f9ff', dots: 'dots', outer: 'circle', inner: 'dot', frame: 'rounded-rect', frameColor: '#0ea5e9' },
    { id: 'minimal-gray', name: 'Minimal', fg: '#374151', bg: '#f9fafb', dots: 'rounded', outer: 'rounded', inner: 'rounded', frame: 'none', frameColor: '#374151' },
    { id: 'linkedin-navy', name: 'LinkedIn', fg: '#0a66c2', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'simple', frameColor: '#0a66c2' },
];

// ── Quick Presets ──────────────────────────────────────────────────────
const PRESETS = [
    { id: 'minimal', name: 'Minimal', icon: '○', fg: '#1f2937', bg: '#ffffff', dots: 'rounded', outer: 'rounded', inner: 'rounded', frame: 'none', frameColor: '#1f2937', gradient: false },
    { id: 'bold', name: 'Bold', icon: '■', fg: '#000000', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'thick-border', frameColor: '#000000', gradient: false },
    { id: 'neon', name: 'Neon', icon: '◈', fg: '#00ff88', bg: '#0a0a0a', dots: 'dots', outer: 'circle', inner: 'dot', frame: 'none', frameColor: '#00ff88', gradient: false },
    { id: 'corporate', name: 'Corporate', icon: '◆', fg: '#1e40af', bg: '#ffffff', dots: 'rounded', outer: 'rounded', inner: 'dot', frame: 'simple', frameColor: '#1e40af', gradient: false },
    { id: 'sunset', name: 'Sunset', icon: '◐', fg: '#f97316', bg: '#fff7ed', dots: 'classy-rounded', outer: 'squircle', inner: 'rounded', frame: 'rounded-rect', frameColor: '#f97316', gradient: true, gradientTo: '#ef4444' },
    { id: 'ocean', name: 'Ocean', icon: '◑', fg: '#0ea5e9', bg: '#f0f9ff', dots: 'dots', outer: 'circle', inner: 'dot', frame: 'rounded-rect', frameColor: '#0ea5e9', gradient: true, gradientTo: '#6366f1' },
    { id: 'mono', name: 'Mono', icon: '◎', fg: '#6b7280', bg: '#f3f4f6', dots: 'square', outer: 'octagon', inner: 'diamond', frame: 'double', frameColor: '#6b7280', gradient: false },
    { id: 'playful', name: 'Playful', icon: '●', fg: '#8b5cf6', bg: '#faf5ff', dots: 'extra-rounded', outer: 'circle', inner: 'star', frame: 'rounded-rect', frameColor: '#8b5cf6', gradient: false },
];

function renderPresets() {
    const strip = document.getElementById('presetStrip');
    if (!strip) return;
    strip.innerHTML = PRESETS.map(p => `
        <button class="preset-btn flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border border-gray-600 hover:border-blue-400 transition-all" data-preset="${p.id}" title="${p.name}">
            <span class="text-base leading-none" style="color:${p.fg}">${p.icon}</span>
            <span class="text-[10px] font-medium text-gray-300">${p.name}</span>
        </button>`).join('');
    strip.addEventListener('click', (e) => {
        const btn = e.target.closest('.preset-btn');
        if (!btn) return;
        const p = PRESETS.find(x => x.id === btn.getAttribute('data-preset'));
        if (p) applyPreset(p);
    });
}

function applyPreset(p) {
    fgColorInput.value = p.fg;
    fgColorText.value = p.fg;
    bgColorInput.value = p.bg;
    bgColorText.value = p.bg;
    currentPattern = p.dots;
    currentOuterCorner = p.outer;
    currentInnerCorner = p.inner;
    selectedFrame = p.frame || 'none';
    frameColorInput.value = p.frameColor || '#000000';
    frameColorTextInput.value = p.frameColor || '#000000';
    if (p.gradient) {
        useGradient = true;
        gradientColor2 = p.gradientTo || '#3b82f6';
        gradientToggleBtn.setAttribute('aria-pressed', 'true');
        gradientToggleBtn.classList.add('active');
        gradColor2Row.classList.remove('hidden');
        document.getElementById('gradColor2').value = p.gradientTo;
        document.getElementById('gradColor2Text').value = p.gradientTo;
    } else {
        useGradient = false;
        gradientToggleBtn.setAttribute('aria-pressed', 'false');
        gradientToggleBtn.classList.remove('active');
        gradColor2Row.classList.add('hidden');
    }
    updateShapeSelection();
    updateCornerSelection();
    updateFrameSelection();
    updateQRCode();
    captureState();
}

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
    const r = mSize / 2;
    switch (pattern) {
        case 'dots':
            ctx.beginPath(); ctx.arc(x + r, y + r, r * 0.65, 0, Math.PI * 2); ctx.fill(); break;
        case 'rounded':
            ctx.beginPath(); ctx.roundRect(x, y, mSize, mSize, r * 0.35); ctx.fill(); break;
        case 'extra-rounded':
            ctx.beginPath(); ctx.arc(x + r, y + r, r * 0.92, 0, Math.PI * 2); ctx.fill(); break;
        case 'classy':
            ctx.fillRect(x + 1, y + 1, mSize - 2, mSize - 2); break;
        case 'classy-rounded':
            ctx.beginPath(); ctx.roundRect(x + 1, y + 1, mSize - 2, mSize - 2, r * 0.45); ctx.fill(); break;
        case 'classy-dots':
            ctx.beginPath(); ctx.arc(x + r, y + r, r * 0.5, 0, Math.PI * 2); ctx.fill(); break;
        default:
            ctx.fillRect(x, y, mSize, mSize);
    }
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
    currentPattern = t.dots;
    updateShapeSelection();
    currentOuterCorner = t.outer;
    currentInnerCorner = t.inner;
    updateCornerSelection();
    selectedFrame = t.frame || 'none';
    frameColorInput.value = t.frameColor || '#000000';
    frameColorTextInput.value = t.frameColor || '#000000';
    updateFrameSelection();
    updateQRCode();
    captureState();
}

// Dark mode removed - dark mode only
const qrTypeConfig = {
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
    'wifi-direct': { fields: [
        { id: 'wdSsid', label: 'Network Name (SSID)', type: 'text', placeholder: 'DirectHotspot', value: 'MyHotspot', help: 'The hotspot name devices will see' },
        { id: 'wdPassword', label: 'Password', type: 'password', placeholder: 'password', value: 'password123', help: 'Minimum 8 characters for WPA' },
        { id: 'wdSecurity', label: 'Security Type', type: 'select', options: [{ value: 'WPA', label: 'WPA/WPA2' }, { value: 'nopass', label: 'Open' }], value: 'WPA' }
    ], encode: (values) => `WIFI:S:${values.wdSsid || 'MyHotspot'};T:${values.wdSecurity || 'WPA'};P:${values.wdPassword || 'password123'};H:true;;` },
    calendar: { fields: [
        { id: 'calSummary', label: 'Event Title', type: 'text', placeholder: 'Team Meeting', value: 'Meeting', help: 'What the event is about' },
        { id: 'calLocation', label: 'Location', type: 'text', placeholder: 'Room 42, Building A', value: '', help: 'Physical or virtual location' },
        { id: 'calStart', label: 'Start', type: 'text', placeholder: '2026-07-15T10:00:00', value: '', help: 'Format: YYYY-MM-DDTHH:MM:SS' },
        { id: 'calEnd', label: 'End', type: 'text', placeholder: '2026-07-15T11:00:00', value: '', help: 'Format: YYYY-MM-DDTHH:MM:SS' },
        { id: 'calDescription', label: 'Description', type: 'text', placeholder: 'Agenda, notes...', value: '', help: 'Optional event details' }
    ], encode: (values) => {
        const pad = (s) => (s || '').replace(/[-:]/g, '');
        const lines = ['BEGIN:VEVENT'];
        if (values.calSummary) lines.push(`SUMMARY:${values.calSummary}`);
        if (values.calLocation) lines.push(`LOCATION:${values.calLocation}`);
        if (values.calStart) lines.push(`DTSTART:${pad(values.calStart)}`);
        if (values.calEnd) lines.push(`DTEND:${pad(values.calEnd)}`);
        if (values.calDescription) lines.push(`DESCRIPTION:${values.calDescription}`);
        lines.push('END:VEVENT');
        return lines.join('\n');
    } },
    geo: { fields: [
        { id: 'geoLat', label: 'Latitude', type: 'text', placeholder: '37.7749', value: '37.7749', help: 'Decimal degrees (-90 to 90)' },
        { id: 'geoLng', label: 'Longitude', type: 'text', placeholder: '-122.4194', value: '-122.4194', help: 'Decimal degrees (-180 to 180)' },
        { id: 'geoZoom', label: 'Zoom Level', type: 'select', options: [{ value: '18', label: 'Street' }, { value: '15', label: 'Neighborhood' }, { value: '12', label: 'City' }, { value: '8', label: 'Region' }], value: '15', help: 'Map zoom when opened' }
    ], encode: (values) => `geo:${values.geoLat || '37.7749'},${values.geoLng || '-122.4194'}?z=${values.geoZoom || '15'}` },
    deeplink: { fields: [
        { id: 'dlUri', label: 'Link URI', type: 'text', placeholder: 'myapp://item/123 or https://example.com/path', value: 'https://example.com', help: 'Universal link (https://) or custom scheme (myapp://)' },
        { id: 'dlFallback', label: 'Fallback URL (optional)', type: 'text', placeholder: 'https://example.com/fallback', value: '', help: 'Web fallback if app is not installed' }
    ], encode: (values) => values.dlUri || 'https://example.com' },
    social: { fields: [
        { id: 'socialPlatform', label: 'Platform', type: 'select', options: [
            { value: 'twitter', label: 'Twitter / X' },
            { value: 'linkedin', label: 'LinkedIn' },
            { value: 'facebook', label: 'Facebook' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'telegram', label: 'Telegram' },
            { value: 'reddit', label: 'Reddit' },
            { value: 'email', label: 'Email Share' }
        ], value: 'twitter' },
        { id: 'socialText', label: 'Message / URL', type: 'text', placeholder: 'Check this out!', value: 'Check out QRtist!', help: 'Text to share or a URL' },
        { id: 'socialUrl', label: 'URL (optional)', type: 'text', placeholder: 'https://example.com', value: '', help: 'Link to include with the message' }
    ], encode: (values) => {
        const text = encodeURIComponent(values.socialText || '');
        const url = values.socialUrl ? encodeURIComponent(values.socialUrl) : '';
        switch (values.socialPlatform) {
            case 'twitter': return `https://twitter.com/intent/tweet?text=${text}${url ? '&url=' + url : ''}`;
            case 'linkedin': return `https://www.linkedin.com/sharing/share-offsite/?url=${url || text}`;
            case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${url || text}`;
            case 'whatsapp': return `https://wa.me/?text=${text}${url ? '%20' + url : ''}`;
            case 'telegram': return `https://t.me/share/url?url=${url || ''}&text=${text}`;
            case 'reddit': return `https://reddit.com/submit?url=${url || text}&title=${text}`;
            case 'email': return `mailto:?subject=${text}&body=${url || text}`;
            default: return text;
        }
    } }
};

const qrType = document.getElementById('qrType');
const inputFields = document.getElementById('inputFields');
const fgColorInput = document.getElementById('fgColor');
const fgColorText = document.getElementById('fgColorText');
const bgColorInput = document.getElementById('bgColor');
const bgColorText = document.getElementById('bgColorText');
const frameColorInput = document.getElementById('frameColor');
const frameColorTextInput = document.getElementById('frameColorText');
const frameTextInput = document.getElementById('frameText');
const qrSize = document.getElementById('qrSize');
const qrSizeValue = document.getElementById('qrSizeValue');
const contrastWarning = document.getElementById('contrastWarning');
const contrastWarningText = document.getElementById('contrastWarningText');
const scannabilityInfo = document.getElementById('scannabilityInfo');
const qrSizeLabel = document.getElementById('qrSizeLabel');
const qrSizeLabel2 = document.getElementById('qrSizeLabel2');
const qrCodeContainer = document.getElementById('qrCodeContainer');
const downloadPng = document.getElementById('downloadPng');
const downloadSvg = document.getElementById('downloadSvg');

const logoInput = document.getElementById('logoInput');
const logoPreview = document.getElementById('logoPreview');
const logoImg = document.getElementById('logoImg');
const logoRemove = document.getElementById('logoRemove');
const logoControls = document.getElementById('logoControls');
const customLogoBtn = document.getElementById('customLogoBtn');
const logoSize = document.getElementById('logoSize');
const logoSizeValue = document.getElementById('logoSizeValue');
const logoMargin = document.getElementById('logoMargin');
const logoMarginValue = document.getElementById('logoMarginValue');

const frameBtns = document.querySelectorAll('.frame-btn');
let renderGeneration = 0;
let activeRenderGeneration = 0;

function renderInputFields() {
    const type = qrType.value;
    const config = qrTypeConfig[type];
    inputFields.innerHTML = '';

    config.fields.forEach(field => {
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-4';

        const label = document.createElement('label');
        label.htmlFor = field.id;
        label.className = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide';
        label.textContent = field.label;
        wrapper.appendChild(label);

        if (field.type === 'select') {
            const select = document.createElement('select');
            select.id = field.id;
            select.className = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition';
            if (field.help) select.title = field.help;
            select.value = field.value;
            field.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                select.appendChild(option);
            });
            select.addEventListener('change', () => { updateQRCode(); captureState(); });
            wrapper.appendChild(select);
        } else {
            const input = document.createElement('input');
            input.id = field.id;
            input.type = field.type;
            input.placeholder = field.placeholder;
            input.value = field.value;
            if (field.help) input.title = field.help;
            input.className = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition';
            input.addEventListener('input', () => { updateQRCode(); _debounceCapture(); });
            input.addEventListener('change', () => { updateQRCode(); captureState(); });
            wrapper.appendChild(input);
            if (field.type === 'url' || field.id === 'urlInput' || field.id === 'emailInput') {
                const errEl = document.createElement('p');
                errEl.className = 'field-error-msg';
                errEl.setAttribute('aria-live', 'polite');
                errEl.textContent = (field.id === 'emailInput')
                    ? '\u26a0 Enter a valid email, e.g. name@example.com'
                    : '\u26a0 Include a protocol, e.g. https://example.com';
                wrapper.appendChild(errEl);
                const valPattern = (field.id === 'emailInput')
                    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    : /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\/.+/;
                const validate = () => {
                    const invalid = input.value.trim().length > 0 && !valPattern.test(input.value.trim());
                    input.classList.toggle('field-input-error', invalid);
                    errEl.style.display = invalid ? 'flex' : 'none';
                };
                input.addEventListener('blur', validate);
                input.addEventListener('input', () => { if (input.classList.contains('field-input-error')) validate(); });
            }
        }
        if (field.help) {
            const helpText = document.createElement('p');
            helpText.className = 'text-xs text-gray-400 dark:text-gray-500 mt-1';
            helpText.textContent = field.help;
            wrapper.appendChild(helpText);
        }

        inputFields.appendChild(wrapper);
    });
}

function getInputValues() {
    const type = qrType.value;
    const config = qrTypeConfig[type];
    const values = {};
    config.fields.forEach(field => {
        const element = document.getElementById(field.id);
        values[field.id] = element ? element.value : '';
    });
    return values;
}

function getLuminance(color) {
    const rgb = parseInt(color.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getContrastRatio(color1, color2) {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
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
    const size = parseInt(logoSize.value);
    if (currentLogoPreset !== 'none' && size <= 20) {
        scannabilityInfo.classList.remove('hidden');
    } else {
        scannabilityInfo.classList.add('hidden');
    }
}

function updateLogoSelection() {
    document.querySelectorAll('.logo-btn').forEach(btn => {
        const active = btn.getAttribute('data-logo') === currentLogoPreset;
        btn.classList.toggle('selected', active);
        btn.classList.toggle('border-2', active);
        btn.classList.toggle('border-blue-500', active);
        btn.classList.toggle('bg-blue-50', active);
        btn.classList.toggle('dark:bg-gray-700', active);
        btn.classList.toggle('dark:border-blue-400', active);
        btn.classList.toggle('border', !active);
        btn.classList.toggle('border-gray-200', !active);
        btn.classList.toggle('dark:border-gray-600', !active);
    });
}

function handleLogoUpload(file) {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        logoDataUrl = e.target.result;
        logoImg.src = logoDataUrl;
        customLogoBtn.style.display = 'flex';
        customLogoBtn.classList.remove('hidden');
        logoPreview.classList.remove('hidden');
        logoControls.classList.remove('hidden');
        currentLogoPreset = 'custom';
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
    currentLogoPreset = preset;
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
    logoDataUrl = null;
    customLogoBtn.style.display = '';
    customLogoBtn.classList.add('hidden');
    logoPreview.classList.add('hidden');
    logoInput.value = '';
    if (currentLogoPreset === 'custom') {
        currentLogoPreset = 'none';
        updateLogoSelection();
        logoControls.classList.add('hidden');
    }
    updateQRCode();
    captureState();
});

frameBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        selectedFrame = btn.getAttribute('data-frame');
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
    const renderToken = ++renderGeneration;
    activeRenderGeneration = renderToken;
    qrCodeContainer.classList.add('updating');
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

    qrCodeContainer.innerHTML = '';

    const fgColor = fgColorInput.value;
    const bgColor = bgColorInput.value;
    const activeLogoUrl = currentLogoPreset === 'custom' ? logoDataUrl
        : currentLogoPreset !== 'none' ? getLogoPresetDataUrl(currentLogoPreset)
            : null;
    const logoPercent = activeLogoUrl ? parseInt(logoSize.value) : undefined;
    const frameText = frameTextInput.value.trim();
    const TEXT_BAR_H = 44;

    const dotsOpts = { color: fgColor, type: currentPattern };
    if (useGradient) dotsOpts.gradient = gradientColor2;

    const qrOptions = {
        width: currentQRSize,
        height: currentQRSize,
        data: data,
        dotsOptions: dotsOpts,
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: { type: currentOuterCorner },
        cornersDotOptions: { type: currentInnerCorner },
        margin: 10,
        errorCorrectionLevel: logoPercent && logoPercent > 20 ? 'H' : 'M'
    };

    try {
        qrCode = new QRCodeStyling(qrOptions);
        qrCode.append(qrCodeContainer);
        const baseCanvas = qrCode.canvas;

        requestAnimationFrame(() => {
            if (renderToken !== activeRenderGeneration) return;
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
    requestAnimationFrame(() => qrCodeContainer.classList.remove('updating'));
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
}

function processFrameAndLogo(canvas, originalCanvas, bgColor, renderToken) {
    if (renderToken !== activeRenderGeneration) return;
    if (selectedFrame === undefined || selectedFrame === null) {
        selectedFrame = 'none';
    }

    const hasFrame = selectedFrame !== 'none';
    const hasText = frameTextInput && frameTextInput.value.trim().length > 0;
    const hasLogo = currentLogoPreset !== 'none';

    if (!hasFrame && !hasText && !hasLogo) {
        constrainPreviewCanvas();
        return;
    }

    const FRAME_PAD = 20;
    const TEXT_BAR_H = 44;

    let finalWidth = canvas.width;
    let finalHeight = canvas.height;

    if (hasFrame) {
        finalWidth = currentQRSize + FRAME_PAD * 2;
        finalHeight = currentQRSize + FRAME_PAD * 2;
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
        if (qrCode) qrCode.canvas = finalCanvas;
    }

    if (hasFrame || hasText) {
        const frameCtx = finalCanvas.getContext('2d');
        frameCtx.imageSmoothingEnabled = true;
        frameCtx.imageSmoothingQuality = 'high';

        if (hasFrame) {
            drawFrame(frameCtx, finalWidth, selectedFrame, frameColorInput.value, hasText ? frameTextInput.value.trim() : '', TEXT_BAR_H);
        } else if (hasText) {
            drawFrame(frameCtx, finalWidth, 'text-only', frameColorInput.value, frameTextInput.value.trim(), TEXT_BAR_H);
        }
    }

    if (hasLogo) {
        const logoUrl = currentLogoPreset === 'custom' ? logoDataUrl
            : getLogoPresetDataUrl(currentLogoPreset);

        if (logoUrl) {
            const logoImg = new Image();
            logoImg.onload = () => {
                if (renderToken !== activeRenderGeneration) return;

                let logoPercent = parseInt(logoSize.value) || 20;
                if (logoPercent > 30) {
                    contrastWarning.classList.remove('hidden');
                    if (contrastWarningText) contrastWarningText.textContent = 'Logo too large — reduced to 30%. QR may not be scannable!';
                    logoPercent = 30;
                }

                const logoMarginVal = parseInt(logoMargin.value) || 10;
                const logoSize_px = (currentQRSize * logoPercent) / 100;

                const ctx = finalCanvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                const logoX = (currentQRSize - logoSize_px) / 2 + (hasFrame ? FRAME_PAD : 0);
                const logoY = (currentQRSize - logoSize_px) / 2 + (hasFrame ? FRAME_PAD : 0);

                ctx.fillStyle = bgColor;
                ctx.fillRect(logoX - logoMarginVal, logoY - logoMarginVal,
                    logoSize_px + logoMarginVal * 2, logoSize_px + logoMarginVal * 2);

                ctx.drawImage(logoImg, logoX, logoY, logoSize_px, logoSize_px);

                constrainPreviewCanvas();
            };
            logoImg.onerror = () => {
                if (renderToken !== activeRenderGeneration) return;
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
    const typeLabel = { url: 'url', text: 'text', email: 'email', phone: 'phone', wifi: 'wifi', 'wifi-direct': 'wifi-direct', calendar: 'event', geo: 'location', deeplink: 'deeplink', social: 'social', vcard: 'contact' }[type] || 'qr';
    return `qr-${typeLabel}-${timestamp}`;
}

function getSvgDownloadOptions() {
    return {
        frameStyle: selectedFrame,
        frameColor: frameColorInput.value,
        frameText: frameTextInput.value.trim(),
        logoDataUrl: currentLogoPreset === 'custom' ? logoDataUrl
            : currentLogoPreset !== 'none' ? getLogoPresetDataUrl(currentLogoPreset)
            : null,
        logoSize: parseInt(logoSize.value) || 20,
        logoMargin: parseInt(logoMargin.value) || 10
    };
}

downloadPng.addEventListener('click', () => {
    if (qrCode) qrCode.download({ name: generateQRFilename(), extension: 'png' });
});

downloadSvg.addEventListener('click', () => {
    if (qrCode) qrCode.download(Object.assign({ name: generateQRFilename(), extension: 'svg' }, getSvgDownloadOptions()));
});

qrType.addEventListener('change', () => {
    renderInputFields();
    updateQRCode();
    captureState();
});

qrSize.addEventListener('input', (e) => {
    currentQRSize = parseInt(e.target.value);
    qrSizeValue.textContent = currentQRSize;
    if (qrSizeLabel) qrSizeLabel.textContent = currentQRSize;
    if (qrSizeLabel2) qrSizeLabel2.textContent = currentQRSize;
    updateQRCode();
    _debounceCapture();
});

fgColorInput.addEventListener('input', (e) => {
    fgColorText.value = e.target.value;
    updateQRCode();
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
    updateQRCode();
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
    currentPattern = btn.getAttribute('data-pattern');
    updateShapeSelection();
    updateQRCode();
    captureState();
});

document.getElementById('outerCornerGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.corner-btn[data-outer]');
    if (!btn) return;
    currentOuterCorner = btn.getAttribute('data-outer');
    updateCornerSelection();
    updateQRCode();
    captureState();
});

document.getElementById('innerCornerGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.corner-btn[data-inner]');
    if (!btn) return;
    currentInnerCorner = btn.getAttribute('data-inner');
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
        useGradient = !useGradient;
        gradientToggleBtn.setAttribute('aria-pressed', useGradient);
        gradientToggleBtn.classList.toggle('active', useGradient);
        if (gradColor2Row) gradColor2Row.classList.toggle('hidden', !useGradient);
        updateQRCode();
        captureState();
    });
}
if (gradColor2Input) {
    gradColor2Input.addEventListener('input', (e) => {
        gradientColor2 = e.target.value;
        if (gradColor2Text) gradColor2Text.value = e.target.value;
        if (useGradient) updateQRCode();
        _debounceCapture();
    });
}
if (gradColor2Text) {
    gradColor2Text.addEventListener('change', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            gradientColor2 = e.target.value;
            if (gradColor2Input) gradColor2Input.value = e.target.value;
            if (useGradient) updateQRCode();
            captureState();
        }
    });
}

frameColorInput.addEventListener('input', (e) => {
    frameColorTextInput.value = e.target.value;
    updateQRCode();
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
    updateQRCode();
    _debounceCapture();
});

logoSize.addEventListener('input', (e) => {
    logoSizeValue.textContent = e.target.value;
    updateQRCode();
    checkScannability();
    _debounceCapture();
});

logoMargin.addEventListener('input', (e) => {
    logoMarginValue.textContent = e.target.value;
    updateQRCode();
    _debounceCapture();
});

// URL Hash Serialization
function getConfigHash() {
    const type = qrType.value;
    const values = getInputValues();
    const configObj = {
        type: type,
        values: values,
        fg: fgColorInput.value,
        bg: bgColorInput.value,
        pattern: currentPattern,
        outerCorner: currentOuterCorner,
        innerCorner: currentInnerCorner,
        useGradient: useGradient,
        gradientColor2: gradientColor2,
        size: currentQRSize,
        logoSize: logoSize.value,
        logoMargin: logoMargin.value,
        logoPreset: currentLogoPreset,
        frame: selectedFrame,
        frameColor: frameColorInput.value,
        frameText: frameTextInput.value,
    };
    return btoa(encodeURIComponent(JSON.stringify(configObj)));
}

function setConfigFromHash(hash) {
    try {
        const rawHash = hash.startsWith('settings=') ? hash.slice('settings='.length) : hash;
        const configObj = JSON.parse(decodeURIComponent(atob(rawHash)));
        applyConfig(configObj);
    } catch (e) {
        console.error('Invalid config hash', e);
    }
}

function updateShapeSelection() {
    document.querySelectorAll('.shape-btn').forEach(btn => {
        const active = btn.getAttribute('data-pattern') === currentPattern;
        if (active) {
            btn.classList.remove('border', 'border-gray-200', 'dark:border-gray-600');
            btn.classList.add('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
        } else {
            btn.classList.remove('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
            btn.classList.add('border', 'border-gray-200', 'dark:border-gray-600');
        }
    });
}

function updateCornerSelection() {
    document.querySelectorAll('#outerCornerGrid .corner-btn').forEach(btn => {
        const active = btn.getAttribute('data-outer') === currentOuterCorner;
        if (active) {
            btn.classList.remove('border', 'border-gray-200', 'dark:border-gray-600');
            btn.classList.add('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
        } else {
            btn.classList.remove('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
            btn.classList.add('border', 'border-gray-200', 'dark:border-gray-600');
        }
    });
    document.querySelectorAll('#innerCornerGrid .corner-btn').forEach(btn => {
        const active = btn.getAttribute('data-inner') === currentInnerCorner;
        if (active) {
            btn.classList.remove('border', 'border-gray-200', 'dark:border-gray-600');
            btn.classList.add('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
        } else {
            btn.classList.remove('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
            btn.classList.add('border', 'border-gray-200', 'dark:border-gray-600');
        }
    });
}

function updateFrameSelection() {
    frameBtns.forEach(btn => {
        if (btn.getAttribute('data-frame') === selectedFrame) {
            btn.classList.remove('border', 'border-gray-200', 'dark:border-gray-600');
            btn.classList.add('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
        } else {
            btn.classList.remove('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
            btn.classList.add('border', 'border-gray-200', 'dark:border-gray-600');
        }
    });
}

function copyShareLink() {
    const hash = getConfigHash();
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
        pattern: currentPattern,
        outerCorner: currentOuterCorner,
        innerCorner: currentInnerCorner,
        useGradient: useGradient,
        gradientColor2: gradientColor2,
        size: currentQRSize,
        logoSize: logoSize.value,
        logoMargin: logoMargin.value,
        logoPreset: currentLogoPreset,
        frame: selectedFrame,
        frameColor: frameColorInput.value,
        frameText: frameTextInput.value,
        logo: logoDataUrl
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
            applyConfig(configObj);
            // Handle custom logo from import
            if (configObj.logo) {
                logoDataUrl = configObj.logo;
                logoImg.src = logoDataUrl;
                customLogoBtn.style.display = 'flex';
                customLogoBtn.classList.remove('hidden');
                logoPreview.classList.remove('hidden');
                currentLogoPreset = 'custom';
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
    setConfigFromHash(hash);
} else {
    renderInputFields();
    updateQRCode();
}
renderPresets();
renderTemplates();

// ── Saved Designs (localStorage) ──────────────────────────────────────
const SAVED_KEY = 'qrtist_v1_designs';
const MAX_SAVED = 20;

function getSavedDesigns() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; }
    catch { return []; }
}

function saveDesign(design) {
    const all = getSavedDesigns();
    all.unshift(design);
    if (all.length > MAX_SAVED) all.length = MAX_SAVED;
    localStorage.setItem(SAVED_KEY, JSON.stringify(all));
    renderSavedDesigns();
}

function deleteSavedDesign(id) {
    const all = getSavedDesigns().filter(d => d.id !== id);
    localStorage.setItem(SAVED_KEY, JSON.stringify(all));
    renderSavedDesigns();
}

function captureThumbnail() {
    const canvas = qrCodeContainer.querySelector('canvas');
    if (!canvas) return null;
    try {
        const tmp = document.createElement('canvas');
        tmp.width = 72; tmp.height = 72;
        const ctx = tmp.getContext('2d');
        const s = Math.min(canvas.width, canvas.height);
        const sx = (canvas.width - s) / 2, sy = (canvas.height - s) / 2;
        ctx.drawImage(canvas, sx, sy, s, s, 0, 0, 72, 72);
        return tmp.toDataURL('image/png', 0.6);
    } catch { return null; }
}

function getCurrentDesignConfig() {
    return {
        type: qrType.value,
        values: getInputValues(),
        fg: fgColorInput.value,
        bg: bgColorInput.value,
        dots: currentPattern,
        outer: currentOuterCorner,
        inner: currentInnerCorner,
        frame: selectedFrame,
        frameColor: frameColorInput.value,
        size: currentQRSize,
        gradient: useGradient,
        gradientTo: useGradient ? gradientColor2 : null,
        logoPreset: currentLogoPreset,
        logoSize: parseInt(logoSize.value),
        logoMargin: parseInt(logoMargin.value),
        frameText: frameTextInput.value.trim()
    };
}

function restoreDesign(cfg) {
    qrType.value = cfg.type;
    renderInputFields();
    Object.entries(cfg.values || {}).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    });
    fgColorInput.value = cfg.fg || '#000000';
    fgColorText.value = cfg.fg || '#000000';
    bgColorInput.value = cfg.bg || '#ffffff';
    bgColorText.value = cfg.bg || '#ffffff';
    currentPattern = cfg.dots || 'square';
    currentOuterCorner = cfg.outer || 'square';
    currentInnerCorner = cfg.inner || 'square';
    selectedFrame = cfg.frame || 'none';
    frameColorInput.value = cfg.frameColor || '#000000';
    frameColorTextInput.value = cfg.frameColor || '#000000';
    if (cfg.size) { currentQRSize = cfg.size; qrSize.value = cfg.size; qrSizeValue.textContent = cfg.size; }
    if (cfg.gradient) {
        useGradient = true;
        gradientColor2 = cfg.gradientTo || '#3b82f6';
        gradientToggleBtn.setAttribute('aria-pressed', 'true');
        gradientToggleBtn.classList.add('active');
        gradColor2Row.classList.remove('hidden');
        document.getElementById('gradColor2').value = cfg.gradientTo;
        document.getElementById('gradColor2Text').value = cfg.gradientTo;
    } else {
        useGradient = false;
        gradientToggleBtn.setAttribute('aria-pressed', 'false');
        gradientToggleBtn.classList.remove('active');
        gradColor2Row.classList.add('hidden');
    }
    if (cfg.logoPreset && cfg.logoPreset !== 'none') {
        currentLogoPreset = cfg.logoPreset;
        logoSize.value = cfg.logoSize || 20;
        logoSizeValue.textContent = cfg.logoSize || 20;
        logoMargin.value = cfg.logoMargin || 10;
        logoMarginValue.textContent = cfg.logoMargin || 10;
    }
    if (cfg.frameText) frameTextInput.value = cfg.frameText;
    updateShapeSelection();
    updateCornerSelection();
    updateFrameSelection();
    updateLogoSelection();
    updateQRCode();
}

function renderSavedDesigns() {
    const section = document.getElementById('savedDesignsSection');
    const strip = document.getElementById('savedDesignsStrip');
    if (!section || !strip) return;
    const designs = getSavedDesigns();
    if (designs.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    strip.innerHTML = designs.map(d => `
        <button class="saved-design-card flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl border border-gray-600 hover:border-blue-400 transition-all" data-id="${d.id}" title="${d.label || d.type}">
            <img src="${d.thumbnail}" alt="${d.type} QR" class="w-14 h-14 rounded-lg object-cover" style="background:var(--md-surface-container-highest);">
            <span class="text-[10px] font-medium text-gray-300 truncate max-w-[72px]">${d.label || d.type}</span>
        </button>`).join('');
}

document.getElementById('savedDesignsStrip')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.saved-design-card');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const d = getSavedDesigns().find(x => x.id === id);
    if (d && d.config) restoreDesign(d.config);
});

document.getElementById('clearSavedDesigns')?.addEventListener('click', () => {
    localStorage.removeItem(SAVED_KEY);
    renderSavedDesigns();
});

// Auto-save after QR generation completes
let _saveTimer = null;
const _origUpdateQR = updateQRCode;
updateQRCode = function() {
    _origUpdateQR();
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
        const thumb = captureThumbnail();
        if (!thumb) return;
        const cfg = getCurrentDesignConfig();
        const label = { url: 'URL', text: 'Text', email: 'Email', phone: 'Phone', wifi: 'WiFi', 'wifi-direct': 'WiFi Direct', calendar: 'Event', geo: 'Location', deeplink: 'Link', social: 'Social', vcard: 'vCard' }[cfg.type] || 'QR';
        saveDesign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), timestamp: Date.now(), thumbnail: thumb, config: cfg, type: cfg.type, label: label });
    }, 800);
};

// ── Reset Design ─────────────────────────────────────────────────────
function doReset() {
    qrType.value = 'url';
    renderInputFields();
    fgColorInput.value = '#000000';
    fgColorText.value = '#000000';
    bgColorInput.value = '#ffffff';
    bgColorText.value = '#ffffff';
    currentPattern = 'square';
    currentOuterCorner = 'square';
    currentInnerCorner = 'square';
    useGradient = false;
    gradientColor2 = '#3b82f6';
    if (gradColor2Input) gradColor2Input.value = gradientColor2;
    if (gradColor2Text) gradColor2Text.value = gradientColor2;
    if (gradientToggleBtn) { gradientToggleBtn.setAttribute('aria-pressed', false); gradientToggleBtn.classList.remove('active'); }
    if (gradColor2Row) gradColor2Row.classList.add('hidden');
    currentQRSize = 300;
    qrSize.value = 300;
    qrSizeValue.textContent = '300';
    logoSize.value = 20;
    logoSizeValue.textContent = '20';
    logoMargin.value = 10;
    logoMarginValue.textContent = '10';
    selectedFrame = 'none';
    frameColorInput.value = '#000000';
    frameColorTextInput.value = '#000000';
    frameTextInput.value = '';
    currentLogoPreset = 'none';
    logoDataUrl = null;
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
        if (qrCode) qrCode.download({ name: generateQRFilename(), extension: 'png' });
    });
    if (dlSvgM) dlSvgM.addEventListener('click', () => {
        if (qrCode) qrCode.download(Object.assign({ name: generateQRFilename(), extension: 'svg' }, getSvgDownloadOptions()));
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
            banner.style.display = 'none';
            localStorage.setItem('qrtist_v1_welcomed', '1');
        });
    }

    // Header menu (replaces help & about)
    const headerMenuBtn = document.getElementById('headerMenuBtn');
    const headerMenu = document.getElementById('headerMenu');
    const resetFromMenu = document.getElementById('resetDesignFromMenu');

    if (headerMenuBtn && headerMenu) {
        headerMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = !headerMenu.classList.contains('hidden');
            headerMenu.classList.toggle('hidden');
            headerMenuBtn.setAttribute('aria-expanded', !isOpen);
            if (!isOpen) {
                const close = (ev) => {
                    if (!headerMenu.contains(ev.target) && ev.target !== headerMenuBtn) {
                        headerMenu.classList.add('hidden');
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
            headerMenu?.classList.add('hidden');
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

// ── Mobile Floating Download FAB ──────────────────────────────────────
(function initMobileFAB() {
    const fab = document.getElementById('mobileDownloadFAB');
    if (!fab) return;
    fab.addEventListener('click', () => {
        if (qrCode) qrCode.download({ name: generateQRFilename(), extension: 'png' });
    });
})();

// ── Auto-advance to Preview on mobile after preset/template ───────────
(function initMobileAutoAdvance() {
    function advanceToPreview() {
        if (window.innerWidth < 768) {
            setTimeout(() => {
                const previewTab = document.querySelector('.mobile-tab-btn[data-tab="1"]');
                if (previewTab) previewTab.click();
            }, 150);
        }
    }
    document.getElementById('presetStrip')?.addEventListener('click', advanceToPreview);
    document.getElementById('templateGrid')?.addEventListener('click', advanceToPreview);
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

// ── Batch Generation ──────────────────────────────────────────────────
(function initBatch() {
    const modal = document.getElementById('batchModal');
    const batchBtn = document.getElementById('batchBtn');
    const closeBtn = document.getElementById('batchClose');
    const input = document.getElementById('batchInput');
    const countEl = document.getElementById('batchCount');
    const fileInput = document.getElementById('batchFileInput');
    const previewGrid = document.getElementById('batchPreviewGrid');
    const generateBtn = document.getElementById('batchGenerate');
    const downloadBtn = document.getElementById('batchDownloadZip');
    if (!modal || !batchBtn) return;

    let batchResults = [];

    function getLines() {
        return (input.value || '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
    }

    function updateCount() {
        const n = getLines().length;
        countEl.textContent = `${n} item${n !== 1 ? 's' : ''}`;
    }

    batchBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        input.focus();
        updateCount();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    input.addEventListener('input', updateCount);

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            input.value = reader.result;
            updateCount();
        };
        reader.readAsText(file);
        fileInput.value = '';
    });

    generateBtn.addEventListener('click', async () => {
        const lines = getLines();
        if (lines.length === 0) return;
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Generating...';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        batchResults = [];
        previewGrid.innerHTML = '';
        previewGrid.style.display = 'grid';

        const fgColor = fgColorInput.value;
        const bgColor = bgColorInput.value;
        const dotsOpts = { color: fgColor, type: currentPattern };
        if (useGradient) dotsOpts.gradient = gradientColor2;

        for (let i = 0; i < lines.length; i++) {
            const data = lines[i];
            try {
                const opts = {
                    width: currentQRSize,
                    height: currentQRSize,
                    data: data,
                    dotsOptions: dotsOpts,
                    backgroundOptions: { color: bgColor },
                    cornersSquareOptions: { type: currentOuterCorner },
                    cornersDotOptions: { type: currentInnerCorner },
                    margin: 10,
                    errorCorrectionLevel: 'M'
                };
                const qr = new QRCodeStyling(opts);
                const canvas = document.createElement('canvas');
                canvas.width = currentQRSize;
                canvas.height = currentQRSize;
                await qr.getRawData('canvas').then(blob => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            resolve();
                        };
                        img.src = URL.createObjectURL(blob);
                    });
                });
                const thumb = canvas.toDataURL('image/png', 0.5);
                batchResults.push({ data, canvas, thumb });
                const item = document.createElement('div');
                item.className = 'batch-preview-item rounded-lg overflow-hidden border border-gray-600';
                item.innerHTML = `<img src="${thumb}" alt="QR ${i + 1}" class="w-full aspect-square object-cover"><p class="text-[9px] text-gray-400 truncate px-1 py-0.5" title="${data}">${data}</p>`;
                previewGrid.appendChild(item);
            } catch (err) {
                console.warn('Batch item failed:', data, err);
            }
        }

        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i data-lucide="sparkles" class="w-4 h-4"></i> Generate All';
        if (batchResults.length > 0) downloadBtn.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    downloadBtn.addEventListener('click', async () => {
        if (batchResults.length === 0) return;
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Packing...';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Lazy-load JSZip
        if (!window.JSZip) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js';
            document.head.appendChild(script);
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
        }

        const zip = new JSZip();
        const folder = zip.folder('qrtist-batch');
        for (let i = 0; i < batchResults.length; i++) {
            const r = batchResults[i];
            const blob = await new Promise(resolve => r.canvas.toBlob(resolve, 'image/png'));
            const safeName = r.data.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
            folder.file(`qr-${i + 1}-${safeName}.png`, blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qrtist-batch-${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);

        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i data-lucide="download" class="w-4 h-4"></i> Download ZIP';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });
})();
