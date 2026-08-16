import { escapeHtml } from '../core/sanitize.js';

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

export function generateStyledSVG(data, opts) {
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
    const logoColor = opts.logoColor || null;

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
        svgParts.push(`<defs><linearGradient id="qrGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${escapeHtml(fgColor)}"/><stop offset="100%" stop-color="${escapeHtml(fgColor2)}"/></linearGradient></defs>`);
    }

    // Background
    svgParts.push(`<rect width="${finalW}" height="${finalH}" fill="${escapeHtml(bgColor)}"/>`);

    const fill = fgColor2 ? 'url(#qrGrad)' : escapeHtml(fgColor);

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
        svgParts.push(`<g fill="${escapeHtml(bgColor)}">`);
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
        svgParts.push(`<g fill="none" stroke="${escapeHtml(frameColor)}" shape-rendering="auto">`);
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
        svgParts.push(`<path d="${_svgRoundRect(barPad, barY + 4, finalW - barPad * 2, TEXT_BAR_H - 8, barR)}" fill="${escapeHtml(frameColor)}" shape-rendering="auto"/>`);
        svgParts.push(`<text x="${finalW / 2}" y="${barY + TEXT_BAR_H / 2 + 2}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" shape-rendering="auto">${escapeHtml(frameText)}</text>`);
    }

    // Logo
    if (hasLogo) {
        const logoPct = Math.min(logoSizePercent, 30);
        const logoPx = (size * logoPct) / 100;
        const lx = (size - logoPx) / 2 + qrX;
        const ly = (size - logoPx) / 2 + qrY;
        // White backing rect
        svgParts.push(`<rect x="${lx - logoMargin}" y="${ly - logoMargin}" width="${logoPx + logoMargin * 2}" height="${logoPx + logoMargin * 2}" fill="${escapeHtml(bgColor)}" shape-rendering="auto"/>`);
        svgParts.push(`<image x="${lx}" y="${ly}" width="${logoPx}" height="${logoPx}" href="${escapeHtml(logoDataUrl)}" shape-rendering="auto"/>`);
        if (logoColor && logoColor !== '#000000') {
            svgParts.push(`<rect x="${lx}" y="${ly}" width="${logoPx}" height="${logoPx}" fill="${escapeHtml(logoColor)}" opacity="0.5" style="mix-blend-mode:multiply" shape-rendering="auto"/>`);
        }
    }

    svgParts.push(`</svg>`);
    return svgParts.join('\n');
}
