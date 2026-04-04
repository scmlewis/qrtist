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

/**
 * RENDERING ARCHITECTURE:
 * 
 * The QR code rendering pipeline has been optimized to prevent glitches when combining
 * frames, logos, and other elements. The key insight is that logos and frames must be
 * rendered in the correct Z-order and timing, otherwise visual artifacts occur.
 * 
 * OLD PROBLEMATIC APPROACH (causes glitches):
 * 1. QRCodeStyling renders QR modules + logo async (logo onload callback)
 * 2. updateQRCode() separately handles frame expansion on timeout
 * 3. Race condition: logo might load after frame, or frame might draw over logo
 * 
 * NEW OPTIMIZED APPROACH (glitch-free):
 * 1. QRCodeStyling renders QR modules ONLY (no logo)
 * 2. updateQRCode() triggers processFrameAndLogo() via requestAnimationFrame
 * 3. processFrameAndLogo() handles ALL post-processing in correct order:
 *    a. Expand canvas for frame + text (single operation, not separate)
 *    b. Paste QR code with proper positioning
 *    c. Draw frame borders on top of QR (ensures frame doesn't hide modules)
 *    d. Load and draw logo on top (with white background erasing)
 *    e. Apply foreground overlay (if present)
 * 4. Proper error handling for all async operations
 * 5. Mobile thumbnail update after all rendering complete
 * 
 * Benefits:
 * - No race conditions between logo and frame rendering
 * - Proper Z-order: modules → frame → logo → foreground
 * - Single canvas expansion instead of multiple sequential ones
 * - Proper error handling and fallbacks
 * - Better performance via requestAnimationFrame synchronization
 */

window.QRCodeStyling = (function () {
    // Cache for finder pattern canvases to improve rendering performance
    const finderPatternCache = new Map();

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

    // ── Path helpers ──────────────────────────────────────
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
        const cx = sz / 2;   // local coords for temp canvas
        const cy = sz / 2;
        const in3s = mSize * 3;

        // Check cache for this finder pattern combination
        const cacheKey = `${outerType}_${innerType}_${mSize}_${fgColor}_${bgColor}`;
        if (finderPatternCache.has(cacheKey)) {
            ctx.drawImage(finderPatternCache.get(cacheKey), px, py);
            return;
        }

        // Helper: draw outer shape on any ctx at local coords (0,0,sz)
        function outerShape(c, inset, type) {
            const s = sz - inset * 2;
            const x0 = inset, y0 = inset;
            const lx = x0 + s / 2, ly = y0 + s / 2; // local center
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
                default: // square
                    c.fillRect(x0, y0, s, s);
            }
        }

        // Use OffscreenCanvas stencil for clean uniform ring thickness
        const tc = document.createElement('canvas');
        tc.width = Math.ceil(sz);
        tc.height = Math.ceil(sz);
        const tc_ctx = tc.getContext('2d');

        // 1. Fill outer shape
        tc_ctx.fillStyle = fgColor;
        outerShape(tc_ctx, 0, outerType);

        // 2. Punch hole — erase the inner ring area using destination-out
        tc_ctx.globalCompositeOperation = 'destination-out';
        tc_ctx.fillStyle = 'rgba(0,0,0,1)';
        outerShape(tc_ctx, mSize, outerType);

        // 3. Draw inner center shape on top (source-over)
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
            default: // square
                tc_ctx.fillRect(cx - in3s / 2, cy - in3s / 2, in3s, in3s);
        }

        // 4. Blit to main canvas — the transparent hole shows bgColor through
        ctx.drawImage(tc, px, py);

        // Cache this finder pattern for future use (limit cache size to prevent memory bloat)
        if (finderPatternCache.size > 50) {
            const firstKey = finderPatternCache.keys().next().value;
            finderPatternCache.delete(firstKey);
        }
        finderPatternCache.set(cacheKey, tc);
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
        // Gradient or solid dot fill
        if (fgColor2) {
            const grad = ctx.createLinearGradient(0, 0, size, size);
            grad.addColorStop(0, fgColor);
            grad.addColorStop(1, fgColor2);
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = fgColor;
        }

        // ── Module drawing optimization: batch via temp canvas for better perf on large QR codes ──
        // For simple square patterns, draw all modules to a temp canvas and blit at once.
        // This avoids per-module drawPath overhead and is significantly faster for large matrices.
        if (pattern === 'square' && !fgColor2) {
            // Fast path: batch all modules to a single temp canvas fill
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
            // Fallback for complex patterns: use per-module drawing
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
        
        // NOTE: Logo rendering is NO LONGER handled here.
        // Instead, logos are applied in the processFrameAndLogo() function (in app.js)
        // to prevent async race conditions with frame rendering.
        // This ensures proper z-order: QR modules → frame → logo
        
        container.appendChild(this.canvas);
        console.log('✓ QR rendered — pattern:', pattern, ' outer:', outerType, ' inner:', innerType, ' modules:', numModules);
    };

    QRCodeStyling.prototype.download = function (options) {
        if (!this.canvas) return;
        const link = document.createElement('a');
        const extension = options?.extension || 'png';
        const name = options?.name || 'qr-code';

        if (extension === 'svg') {
            // Generate actual SVG instead of PNG
            try {
                const qrData = window.QRCodeLib.create(this.options.data, {
                    errorCorrectionLevel: this.options.errorCorrectionLevel || 'M'
                });
                const svgString = window.QRCodeLib.toString(qrData, {
                    width: this.options.width || 300,
                    margin: this.options.margin || 10,
                    color: {
                        dark: this.options.dotsOptions?.color || '#000000',
                        light: this.options.backgroundOptions?.color || '#ffffff'
                    }
                });
                const blob = new Blob([svgString], { type: 'image/svg+xml' });
                link.href = URL.createObjectURL(blob);
                link.download = name + '.svg';
            } catch (e) {
                console.error('Failed to generate SVG, falling back to PNG:', e);
                link.href = this.canvas.toDataURL('image/png');
                link.download = name + '.png';
            }
        } else {
            // PNG download (default)
            link.href = this.canvas.toDataURL('image/png');
            link.download = name + '.png';
        }

        link.click();

        // Clean up object URL if SVG was created
        if (extension === 'svg') {
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
        }
    };

    return QRCodeStyling;
})();

let qrCode = null;
let logoDataUrl = null;
let currentLogoPreset = 'none';
let selectedFrame = 'none';
let currentQRSize = 300;
let currentPattern = 'square';
let currentOuterCorner = 'square';
let currentInnerCorner = 'square';
// Gradient state
let useGradient = false;
let gradientColor2 = '#3b82f6';
// Foreground overlay state
let foregroundDataUrl = null;
let foregroundOpacity = 0.15;
// Memoization cache for foreground mask (key: "w_h", value: ImageData)
const foregroundMaskCache = new Map();

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

// Logo color overrides: stores user-selected colors keyed by preset name
const logoColorOverrides = {};

const LOGO_PRESETS = {
    'globe': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    'scan-brackets': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 56" fill="none"><g stroke="currentColor" stroke-width="5"><polyline points="4,16 4,4 16,4"/><polyline points="44,4 56,4 56,16"/><polyline points="4,40 4,52 16,52"/><polyline points="44,52 56,52 56,40"/></g><text x="30" y="24" font-size="12" text-anchor="middle" font-weight="900" font-family="Arial,sans-serif" fill="currentColor">SCAN</text><text x="30" y="40" font-size="12" text-anchor="middle" font-weight="900" font-family="Arial,sans-serif" fill="currentColor">ME</text></svg>`,
    'scan-text': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="46" font-size="22" text-anchor="middle" font-weight="900" font-family="Arial,sans-serif" fill="currentColor">SCAN</text><text x="50" y="74" font-size="22" text-anchor="middle" font-weight="900" font-family="Arial,sans-serif" fill="currentColor">ME</text></svg>`,
    'x-twitter': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z" fill="currentColor"/></svg>`,
    'facebook': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="currentColor"/></svg>`,
    'instagram': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.249 1.805-.415 2.227-.217.562-.477.96-.896 1.382-.42.419-.819.679-1.381.896-.422.164-1.057.36-2.227.413-1.266.057-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.805-.249-2.227-.415-.562-.217-.96-.477-1.382-.896-.419-.42-.679-.819-.896-1.381-.164-.422-.36-1.057-.413-2.227-.057-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.054-1.17.249-1.805.415-2.227.217-.562.477-.96.896-1.382.42-.419.819-.679 1.381-.896.422-.164 1.057-.36 2.227-.413 1.266-.057 1.646-.07 4.85-.07zM12 0C8.741 0 8.333.014 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.776.072 7.054.014 8.333 0 8.741 0 12s.014 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.986 8.74 24 12 24s3.667-.014 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0z" fill="currentColor"/><path d="M12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a3.838 3.838 0 1 1 0-7.676A3.838 3.838 0 0 1 12 16zM18.405 4.155a1.44 1.44 0 1 0 0 2.879 1.44 1.44 0 0 0 0-2.879z" fill="currentColor"/></svg>`,
    'linkedin': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" fill="currentColor"/></svg>`,
    'pinterest': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.411-5.996 1.411-5.996s-.36-.72-.36-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.1.12.115.225.085.345-.094.393-.304 1.239-.345 1.411-.055.231-.184.28-.423.169-1.573-.732-2.556-3.031-2.556-4.872 0-3.966 2.883-7.608 8.308-7.608 4.363 0 7.752 3.109 7.752 7.261 0 4.333-2.731 7.82-6.522 7.82-1.272 0-2.47-.661-2.879-1.442 0 0-.629 2.393-.781 2.977-.282 1.083-1.042 2.441-1.554 3.271 1.127.348 2.319.537 3.557.537 6.622 0 11.988-5.366 11.988-11.987C24.005 5.367 18.639 0 12.017 0z" fill="currentColor"/></svg>`,
    'telegram': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M11.944 0C5.346 0 0 5.345 0 11.944c0 6.598 5.346 11.943 11.944 11.943s11.944-5.345 11.944-11.943C23.888 5.345 18.542 0 11.944 0zm5.83 8.324c-.161 1.698-.865 5.86-1.226 7.794-.153.818-.454 1.092-.746 1.12-.634.06-1.115-.417-1.728-.82-.96-.63-1.502-1.022-2.433-1.635-1.077-.708-.379-1.097.235-1.737.161-.167 2.956-2.71 3.01-2.937.006-.029.012-.138-.053-.195-.065-.057-.16-.038-.228-.023-.098.022-1.657 1.054-4.68 3.097-.442.304-.843.454-1.202.446-.394-.008-1.154-.223-1.719-.406-.692-.224-1.242-.343-1.194-.725.025-.199.3-.404.825-.615 3.235-1.408 5.392-2.339 6.472-2.793 3.08-1.29 3.72-1.514 4.136-1.52.091-.001.297.021.43.128.112.09.143.211.15.3l-.001.073z" fill="currentColor"/></svg>`,
    'discord': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01 10.175 10.175 0 0 0 .372.292.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z" fill="currentColor"/></svg>`,
    'spotify': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.306c-.215.353-.674.464-1.026.25-2.863-1.748-6.466-2.143-10.707-1.176-.403.093-.81-.157-.903-.56s.157-.81.56-.903c4.646-1.062 8.636-.597 11.827 1.35.352.214.463.674.249 1.026s-.353.464-.674.249zm1.468-3.264c-.272.443-.848.583-1.291.311-3.277-2.015-8.272-2.599-12.146-1.424-.495.15-1.233-.162-1.415-.762-.182-.6.162-1.233.762-1.415 4.341-1.318 11.52-1.066 16.03 1.61.54.32.716 1.02.396 1.56s-1.02.716-1.56.396zm.127-3.41c-3.929-2.333-10.435-2.55-14.218-1.4c-.6.182-1.233-.162-1.415-.762-.182-.6.162-1.233.762-1.415 4.341-1.318 11.52-1.066 16.03 1.61.54.32.716 1.02.396 1.56s-1.02.716-1.56.396z" fill="currentColor"/></svg>`,
    'youtube': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" fill="currentColor"/></svg>`,
};

function getLogoPresetDataUrl(preset, color) {
    const svg = LOGO_PRESETS[preset];
    if (!svg) return null;
    // If color is provided, replace currentColor with the specified color
    let modifiedSvg = svg;
    if (color && color !== '' && preset !== 'custom') {
        modifiedSvg = svg.replace(/fill="currentColor"/g, `fill="${color}"`)
                          .replace(/stroke="currentColor"/g, `stroke="${color}"`);
    }
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(modifiedSvg);
}

// ── Design Templates ──────────────────────────────────────────────────
const TEMPLATES = [
    { id: 'classic-black', name: 'Classic', fg: '#000000', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'none', frameColor: '#000000' },
    { id: 'corporate-blue', name: 'Corporate', fg: '#1a56db', bg: '#ffffff', dots: 'rounded', outer: 'rounded', inner: 'dot', frame: 'none', frameColor: '#1a56db' },
    { id: 'instagram-pink', name: 'Instagram', fg: '#c13584', bg: '#fdf2f8', dots: 'dots', outer: 'circle', inner: 'dot', frame: 'none', frameColor: '#c13584' },
    { id: 'discord-purple', name: 'Discord', fg: '#5865f2', bg: '#ffffff', dots: 'rounded', outer: 'rounded', inner: 'dot', frame: 'none', frameColor: '#5865f2' },
    { id: 'youtube-red', name: 'YouTube', fg: '#ff0000', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'simple', frameColor: '#ff0000' },
    { id: 'ocean-breeze', name: 'Ocean', fg: '#0ea5e9', bg: '#f0f9ff', dots: 'dots', outer: 'circle', inner: 'dot', frame: 'rounded-rect', frameColor: '#0ea5e9' },
    { id: 'neon-night', name: 'Neon', fg: '#00ff88', bg: '#0a0a1a', dots: 'extra-rounded', outer: 'circle', inner: 'dot', frame: 'neon-glow', frameColor: '#00ff88' },
    { id: 'elegant-gold', name: 'Gold', fg: '#b8860b', bg: '#fffbeb', dots: 'classy', outer: 'rounded', inner: 'square', frame: 'double', frameColor: '#b8860b' },
    { id: 'minimal-gray', name: 'Minimal', fg: '#374151', bg: '#f9fafb', dots: 'rounded', outer: 'rounded', inner: 'rounded', frame: 'none', frameColor: '#374151' },
    { id: 'linkedin-navy', name: 'LinkedIn', fg: '#0a66c2', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'simple', frameColor: '#0a66c2' },
];

function renderTemplates() {
    const grid = document.getElementById('templateGrid');
    if (!grid) return;
    grid.innerHTML = TEMPLATES.map(t => `
    <button class="template-btn flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-400 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 transition-all" data-template="${t.id}" title="Preview: ${t.name}">
        <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-500 flex-shrink-0" style="background:${t.fg}" title="Dots"></span>
            <span class="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-500 flex-shrink-0" style="background:${t.bg}" title="Background"></span>
        </div>
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
}

function applyTemplate(t) {
    if (!t) return;
    
    // Colors
    fgColorInput.value = t.fg;
    fgColorText.value = t.fg;
    bgColorInput.value = t.bg;
    bgColorText.value = t.bg;
    
    // Dots pattern
    currentPattern = t.dots;
    updateShapeSelection();
    
    // Corners
    currentOuterCorner = t.outer;
    currentInnerCorner = t.inner;
    updateCornerSelection();
    
    // Frame - ensure frame is valid and UI is synced
    const newFrame = t.frame || 'none';
    selectedFrame = newFrame;
    frameColorInput.value = t.frameColor || '#000000';
    frameColorTextInput.value = t.frameColor || '#000000';
    
    // Update UI to reflect the new frame selection
    updateFrameSelection();
    
    // Clear any data validation warnings that might be stale
    if (contrastWarningText && contrastWarningText.textContent.includes('too large')) {
        contrastWarning.classList.add('hidden');
    }
    
    // Regenerate QR with new template settings
    updateQRCode();
}

// Global error hook to make debugging easier in the browser
window.addEventListener('error', (e) => {
    console.error('Unhandled error:', e.message, e.error || e.filename + ':' + e.lineno);
});

// Dark mode removed - dark mode only
const qrTypeConfig = {
    url: { fields: [{ id: 'urlInput', label: 'URL', type: 'text', placeholder: 'https://example.com', value: 'https://google.com' }], encode: (values) => values.urlInput || 'https://google.com' },
    text: { fields: [{ id: 'textInput', label: 'Text', type: 'text', placeholder: 'Enter text', value: 'Hello World' }], encode: (values) => values.textInput || 'Hello World' },
    email: { fields: [{ id: 'emailInput', label: 'Email', type: 'email', placeholder: 'test@example.com', value: 'test@example.com' }, { id: 'subjectInput', label: 'Subject (optional)', type: 'text', placeholder: 'Subject' }], encode: (values) => `mailto:${values.emailInput || 'test@example.com'}${values.subjectInput ? '?subject=' + encodeURIComponent(values.subjectInput) : ''}` },
    phone: { fields: [{ id: 'phoneInput', label: 'Phone Number', type: 'tel', placeholder: '+1234567890', value: '+14155552671' }], encode: (values) => `tel:${values.phoneInput || '+14155552671'}` },
    wifi: { fields: [{ id: 'wifiSsid', label: 'Network Name (SSID)', type: 'text', placeholder: 'MyWiFi', value: 'MyNetwork', help: 'The WiFi network name users will see' }, { id: 'wifiPassword', label: 'Password', type: 'password', placeholder: 'password', value: 'password123', help: 'Leave blank for open networks' }, { id: 'wifiSecurity', label: 'Security Type', type: 'select', options: [{ value: 'WPA', label: 'WPA/WPA2' }, { value: 'WEP', label: 'WEP' }, { value: 'nopass', label: 'Open' }], value: 'WPA', help: 'Select your network security type' }], encode: (values) => `WIFI:S:${values.wifiSsid || 'MyNetwork'};T:${values.wifiSecurity || 'WPA'};P:${values.wifiPassword || 'password123'};;` },
    vcard: { fields: [{ id: 'vcardName', label: 'Full Name', type: 'text', placeholder: 'John Doe', value: 'John Doe', help: 'Person or business name' }, { id: 'vcardEmail', label: 'Email', type: 'email', placeholder: 'john@example.com', value: 'john@example.com', help: 'Contact email address' }, { id: 'vcardPhone', label: 'Phone', type: 'tel', placeholder: '+1234567890', value: '+14155552671', help: 'Phone number with country code' }], encode: (values) => `BEGIN:VCARD
VERSION:3.0
FN:${values.vcardName || 'John Doe'}
EMAIL:${values.vcardEmail || 'john@example.com'}
TEL:${values.vcardPhone || '+14155552671'}
END:VCARD` }
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

const framesDivider = document.getElementById('framesDivider');
const framesSection = document.getElementById('framesSection');
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
            select.addEventListener('change', updateQRCode);
            wrapper.appendChild(select);
        } else {
            const input = document.createElement('input');
            input.id = field.id;
            input.type = field.type;
            input.placeholder = field.placeholder;
            input.value = field.value;
            if (field.help) input.title = field.help;
            input.className = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition';
            input.addEventListener('input', updateQRCode);
            input.addEventListener('change', updateQRCode);
            wrapper.appendChild(input);
            // Inline validation for URL and email fields
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
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance;
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

function updateLogoColorUI() {
    const logoColorRow = document.getElementById('logoColorRow');
    const logoColorInput = document.getElementById('logoColor');
    const logoColorText = document.getElementById('logoColorText');
    
    // Show color picker only for preset logos (not custom uploads or none)
    const isPresetLogo = currentLogoPreset !== 'none' && currentLogoPreset !== 'custom';
    logoColorRow.classList.toggle('hidden', !isPresetLogo);
    
    if (isPresetLogo) {
        // Get the current color for this logo (or empty if not overridden)
        const currentColor = logoColorOverrides[currentLogoPreset] || '';
        logoColorInput.value = currentColor || '#000000';
        logoColorText.value = currentColor || '';
    }
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
        updateLogoColorUI();
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
    updateLogoColorUI();
    updateQRCode();
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
});

frameBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        const clickedFrame = btn.getAttribute('data-frame');
        selectedFrame = clickedFrame;
        updateFrameSelection();
        updateQRCode();
    });
});

// Composite foreground image ONLY onto the dark QR modules (not the white background)
// by building a luminance mask from the existing canvas content.
// Memoizes mask for repeated operations on same size to avoid per-pixel recomputation.
function applyForegroundMask(canvas, fgImg, opacity) {
    const w = canvas.width, h = canvas.height;
    const cacheKey = `${w}_${h}`;
    let maskCanvas = null;

    // Check cache: if we've already computed a mask for this size, reuse it
    if (foregroundMaskCache.has(cacheKey)) {
        maskCanvas = foregroundMaskCache.get(cacheKey);
    } else {
        // Build a mask: dark module pixels → opaque, light/white pixels → transparent
        maskCanvas = document.createElement('canvas');
        maskCanvas.width = w; maskCanvas.height = h;
        const mctx = maskCanvas.getContext('2d');
        mctx.drawImage(canvas, 0, 0);
        const maskData = mctx.getImageData(0, 0, w, h);
        const d = maskData.data;
        for (let i = 0; i < d.length; i += 4) {
            // Perceived luminance (ITU-R BT.601)
            const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
            // Dark pixels (modules) → fully opaque; bright pixels → transparent
            d[i + 3] = lum < 140 ? 255 : 0;
        }
        mctx.putImageData(maskData, 0, 0);
        // Cache for future use; limit to 20 entries to prevent memory bloat
        if (foregroundMaskCache.size >= 20) {
            const firstKey = foregroundMaskCache.keys().next().value;
            foregroundMaskCache.delete(firstKey);
        }
        foregroundMaskCache.set(cacheKey, maskCanvas);
    }

    // Draw image on temp canvas, then clip to the module mask
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(fgImg, 0, 0, w, h);           // fill with image
    tctx.globalCompositeOperation = 'destination-in';
    tctx.drawImage(maskCanvas, 0, 0);             // keep only where modules are

    // Paint the clipped image onto the main canvas
    const ctx = canvas.getContext('2d');
    ctx.globalAlpha = opacity;
    ctx.drawImage(tmp, 0, 0);
    ctx.globalAlpha = 1.0;
}

function drawFrame(ctx, size, frame, frameColor, frameText, textBarHeight) {
    const color = frameColor || '#000000';
    const padding = 10;
    const x = padding;
    const y = padding;
    const w = size - padding * 2;
    const h = size - padding * 2;
    ctx.strokeStyle = color;

    // Draw frame only if it's not 'text-only' (which means no frame border, just text)
    if (frame !== 'text-only') {
        switch (frame) {
            case 'rounded-rect': {
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); ctx.stroke();
                break;
            }
        case 'gradient': {
            ctx.lineWidth = 5;
            const grd = ctx.createLinearGradient(x, y, x + w, y + h);
            // Parse color → complementary hue shift for gradient end
            const hexToHsl = (hex) => {
                let r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
                const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
                let h2 = 0, s = 0;
                if (max !== min) { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min); if (max === r) h2 = (g - b) / d + (g < b ? 6 : 0); else if (max === g) h2 = (b - r) / d + 2; else h2 = (r - g) / d + 4; h2 /= 6; }
                return [h2 * 360, s * 100, l * 100];
            };
            const hslToHex = (h2, s, l) => { s /= 100; l /= 100; const a = s * Math.min(l, 1 - l); const f = n => { const k = (n + h2 / 30) % 12; const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(255 * c).toString(16).padStart(2, '0'); }; return `#${f(0)}${f(8)}${f(4)}`; };
            const [hh, ss, ll] = hexToHsl(color);
            grd.addColorStop(0, color);
            grd.addColorStop(1, hslToHex((hh + 150) % 360, ss, ll));
            ctx.strokeStyle = grd;
            ctx.strokeRect(x, y, w, h);
            break;
        }
        case 'corners': {
            ctx.lineWidth = 4;
            const cl = 30;
            ctx.beginPath(); ctx.moveTo(x, y + cl); ctx.lineTo(x, y); ctx.lineTo(x + cl, y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + w - cl, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cl); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y + h - cl); ctx.lineTo(x, y + h); ctx.lineTo(x + cl, y + h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + w - cl, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cl); ctx.stroke();
            break;
        }
        case 'shadow':
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(x + 4, y + 4, w, h);
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            break;
        case 'thick-border':
            ctx.lineWidth = 8;
            ctx.strokeRect(x, y, w, h);
            break;
        case 'simple':
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            break;
        case 'double':
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            ctx.strokeRect(x + 7, y + 7, w - 14, h - 14);
            break;
        case 'thick-rounded':
            ctx.lineWidth = 8;
            ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.stroke();
            break;
        case 'corner-circles': {
            const cr = 7;
            [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx2, cy2]) => {
                ctx.beginPath(); ctx.arc(cx2, cy2, cr, 0, Math.PI * 2);
                ctx.fillStyle = color; ctx.fill();
            });
            break;
        }
        case 'double-rounded':
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.stroke();
            ctx.beginPath(); ctx.roundRect(x + 7, y + 7, w - 14, h - 14, 10); ctx.stroke();
            break;
        case 'dashed':
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 6]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
            break;
        case 'dotted':
            ctx.lineWidth = 4;
            ctx.setLineDash([2, 7]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
            break;
        case 'neon-glow':
            [[12, 0.3], [7, 0.5], [3, 1]].forEach(([blur, alpha]) => {
                ctx.shadowColor = color;
                ctx.shadowBlur = blur;
                ctx.lineWidth = 2;
                ctx.globalAlpha = alpha;
                ctx.strokeRect(x, y, w, h);
            });
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            break;
        case 'polaroid': {
            // Outer border rect
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);
            // Polaroid accent strip: occupies space BELOW the frame rect
            // (canvas was expanded extra on bottom specifically for polaroid)
            const tbH2 = (textBarHeight > 0 ? textBarHeight : 0);
            const stripTop = y + h + ctx.lineWidth / 2 + 2;
            const stripBot = ctx.canvas.height - tbH2 - 2;
            if (stripBot > stripTop + 4) {
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.18;
                ctx.fillRect(x + 1, stripTop, w - 2, stripBot - stripTop);
                ctx.globalAlpha = 1;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + 1, stripTop);
                ctx.lineTo(x + w - 1, stripTop);
                ctx.stroke();
            }
            break;
        }
        case 'speech-bubble': {
            ctx.lineWidth = 3;
            const sbR = 16, tailW = 20, tailH = 14, tailX = size / 2;
            ctx.beginPath();
            ctx.roundRect(x, y, w, h - tailH, sbR);
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(tailX - tailW / 2, y + h - tailH);
            ctx.lineTo(tailX, y + h);
            ctx.lineTo(tailX + tailW / 2, y + h - tailH);
            ctx.closePath();
            ctx.fill();
            break;
        }
    }
} // end of frame drawing (only if frame !== 'text-only')

    // Draw text label banner below the QR code (when frameText is present)
    if (frameText && textBarHeight > 0) {
        const barY = size;
        const barH = textBarHeight;
        const barPad = 8;
        const barR = 8;
        // Background pill
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(barPad, barY + 4, size - barPad * 2, barH - 8, barR);
        ctx.fill();
        // Text
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
    const type = qrType.value;
    const config = qrTypeConfig[type];
    const values = getInputValues();
    const data = config.encode(values);

    if (!data) return;

    // Validate data length
    if (data.length > 2953) {
        contrastWarning.classList.remove('hidden');
        if (contrastWarningText) contrastWarningText.textContent = 'Data too long — QR may not scan. Max ~2953 chars.';
        return;
    } else if (data.length < 1) {
        contrastWarning.classList.remove('hidden');
        if (contrastWarningText) contrastWarningText.textContent = 'Please enter some data.';
        return;
    } else {
        // Clear old length warnings on valid input
        if (contrastWarningText && contrastWarningText.textContent.includes('too long')) {
            contrastWarning.classList.add('hidden');
        }
    }

    qrCodeContainer.innerHTML = '';

    const fgColor = fgColorInput.value;
    const bgColor = bgColorInput.value;
    const logoColor = logoColorOverrides[currentLogoPreset] || '';
    const activeLogoUrl = currentLogoPreset === 'custom' ? logoDataUrl
        : currentLogoPreset !== 'none' ? getLogoPresetDataUrl(currentLogoPreset, logoColor)
            : null;
    const logoPercent = activeLogoUrl ? parseInt(logoSize.value) : undefined;
    const logoMarginVal = activeLogoUrl ? parseInt(logoMargin.value) : undefined;
    const frameColor = frameColorInput.value;
    const frameText = frameTextInput.value.trim();
    const TEXT_BAR_H = 44;
    const hasText = frameText.length > 0;

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
        // NOTE: Image/logo is NOT passed to QRCodeStyling here
        // Instead, it's handled separately in processFrameAndLogo() to avoid async race conditions
    };

    try {
        qrCode = new QRCodeStyling(qrOptions);
        qrCode.append(qrCodeContainer);
        const baseCanvas = qrCode.canvas;
        
        // Use requestAnimationFrame for better synchronization instead of arbitrary timeouts
        requestAnimationFrame(() => {
            if (renderToken !== activeRenderGeneration) return;
            if (!baseCanvas || baseCanvas.width === 0) return;

            // Apply rendering optimizations
            const ctx = baseCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Save original canvas state before any modifications
            const originalCanvas = document.createElement('canvas');
            originalCanvas.width = baseCanvas.width;
            originalCanvas.height = baseCanvas.height;
            const originalCtx = originalCanvas.getContext('2d');
            originalCtx.drawImage(baseCanvas, 0, 0);

            // Process frame, text, and logo together in proper order
            processFrameAndLogo(baseCanvas, originalCanvas, bgColor, renderToken);
        });
        
        constrainPreviewCanvas();
        console.log('✓ QR code generated successfully');
    } catch (err) {
        console.error('Failed to create QRCodeStyling instance:', err);
    }

    checkContrast();
    checkScannability();
    // Badge the Preview tab on mobile when QR updates while user is on another tab
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

/**
 * Unified function to handle frame, text, and logo rendering in correct order
 * Eliminates race conditions and ensures proper layering
 */
function processFrameAndLogo(canvas, originalCanvas, bgColor, renderToken) {
    if (renderToken !== activeRenderGeneration) return;
    // Validate selectedFrame state
    if (selectedFrame === undefined || selectedFrame === null) {
        console.warn('selectedFrame is undefined, defaulting to none');
        selectedFrame = 'none';
    }
    
    const hasFrame = selectedFrame !== 'none';
    const hasText = frameTextInput && frameTextInput.value.trim().length > 0;
    const hasLogo = currentLogoPreset !== 'none';
    
    if (!hasFrame && !hasText && !hasLogo && !foregroundDataUrl) {
        constrainPreviewCanvas();
        return; // No processing needed
    }

    const FRAME_PAD = 20;
    const FRAME_PAD_BOT = (selectedFrame === 'polaroid') ? 56 : FRAME_PAD;
    const TEXT_BAR_H = 44;

    // Calculate final canvas dimensions
    let finalWidth = canvas.width;
    let finalHeight = canvas.height;
    
    if (hasFrame) {
        finalWidth = currentQRSize + FRAME_PAD * 2;
        finalHeight = currentQRSize + FRAME_PAD + FRAME_PAD_BOT;
    }
    if (hasText) {
        finalHeight = (hasFrame ? finalHeight : canvas.height) + TEXT_BAR_H;
    }

    // Step 1: Create expanded canvas if needed
    let finalCanvas = canvas;
    if (hasFrame || hasText) {
        finalCanvas = document.createElement('canvas');
        finalCanvas.width = finalWidth;
        finalCanvas.height = finalHeight;
        const fc = finalCanvas.getContext('2d');
        
        // Fill background
        fc.fillStyle = bgColor;
        fc.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        // Position original QR code with frame padding
        const qrX = hasFrame ? FRAME_PAD : 0;
        const qrY = hasFrame ? FRAME_PAD : 0;
        fc.drawImage(canvas, qrX, qrY);
        
        // Replace container canvas
        qrCodeContainer.innerHTML = '';
        qrCodeContainer.appendChild(finalCanvas);
        if (qrCode) qrCode.canvas = finalCanvas;
    }

    // Step 2: Draw frame and text borders (before logo so frame appears "beneath" logo)
    if (hasFrame || hasText) {
        const frameCtx = finalCanvas.getContext('2d');
        frameCtx.imageSmoothingEnabled = true;
        frameCtx.imageSmoothingQuality = 'high';
        
        if (hasFrame) {
            drawFrame(frameCtx, finalWidth, selectedFrame, frameColorInput.value, hasText ? frameTextInput.value.trim() : '', TEXT_BAR_H);
        } else if (hasText) {
            // Draw only text bar (no frame border)
            drawFrame(frameCtx, finalWidth, 'text-only', frameColorInput.value, frameTextInput.value.trim(), TEXT_BAR_H);
        }
    }

    // Step 3: Load and apply logo with proper error handling
    if (hasLogo) {
        const logoColor = logoColorOverrides[currentLogoPreset] || '';
        const logoUrl = currentLogoPreset === 'custom' ? logoDataUrl
            : getLogoPresetDataUrl(currentLogoPreset, logoColor);
        
        if (logoUrl) {
            const logoImg = new Image();
            logoImg.onload = () => {
                if (renderToken !== activeRenderGeneration) return;

                // Check for oversized logo warning
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
                
                // Calculate logo position (centered)
                const logoX = (currentQRSize - logoSize_px) / 2 + (hasFrame ? FRAME_PAD : 0);
                const logoY = (currentQRSize - logoSize_px) / 2 + (hasFrame ? FRAME_PAD : 0);
                
                // Draw white background for logo (with margin)
                ctx.fillStyle = bgColor;
                ctx.fillRect(logoX - logoMarginVal, logoY - logoMarginVal,
                    logoSize_px + logoMarginVal * 2, logoSize_px + logoMarginVal * 2);
                
                // Draw logo image
                ctx.drawImage(logoImg, logoX, logoY, logoSize_px, logoSize_px);
                
                // Apply foreground overlay if present
                if (foregroundDataUrl) {
                    applyForegroundOverlay(finalCanvas, renderToken);
                } else {
                    constrainPreviewCanvas();
                }
            };
            logoImg.onerror = () => {
                if (renderToken !== activeRenderGeneration) return;
                console.error('Failed to load logo:', logoUrl);
                showToast('Failed to load logo image', 'error');
                constrainPreviewCanvas();
            };
            logoImg.src = logoUrl;
        }
    } else if (foregroundDataUrl) {
        // No logo, but apply foreground overlay
        applyForegroundOverlay(finalCanvas, renderToken);
    } else {
        constrainPreviewCanvas();
    }
}

/**
 * Apply foreground overlay with proper masking to dark QR modules only
 */
function applyForegroundOverlay(canvas, renderToken) {
    const fgImg = new Image();
    fgImg.onload = () => {
        if (renderToken !== activeRenderGeneration) return;
        applyForegroundMask(canvas, fgImg, foregroundOpacity);
        constrainPreviewCanvas();
    };
    fgImg.onerror = () => {
        if (renderToken !== activeRenderGeneration) return;
        console.error('Failed to load foreground overlay');
        constrainPreviewCanvas();
    };
    fgImg.src = foregroundDataUrl;
}


// Scales the preview canvas display size to fit inside the panel
// without affecting the canvas pixel resolution used for downloads.
// Self-retries if QRCodeStyling hasn't finished rendering yet (canvas.width === 0).
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
    // Update mobile floating thumbnail chip with latest QR render
    const mChip = document.getElementById('mobileQrChip');
    const mThumb = document.getElementById('mobileQrThumb');
    if (mChip && mThumb) {
        try {
            mThumb.src = canvas.toDataURL('image/png');
            mChip.classList.remove('chip-pulse');
            void mChip.offsetWidth; // reflow to restart animation
            mChip.classList.add('chip-pulse');
        } catch (e) { /* cross-origin canvas taint — ignore */ }
    }
}

function generateQRFilename() {
    const type = qrType.value;
    const timestamp = new Date().toISOString().slice(0, 10);
    const typeLabel = { url: 'url', text: 'text', email: 'email', phone: 'phone', wifi: 'wifi', vcard: 'contact' }[type] || 'qr';
    return `qr-${typeLabel}-${timestamp}`;
}

downloadPng.addEventListener('click', () => {
    if (qrCode) qrCode.download({ name: generateQRFilename(), extension: 'png' });
});

downloadSvg.addEventListener('click', () => {
    if (qrCode) qrCode.download({ name: generateQRFilename(), extension: 'svg' });
});

qrType.addEventListener('change', () => {
    renderInputFields();
    updateQRCode();
});

qrSize.addEventListener('input', (e) => {
    currentQRSize = parseInt(e.target.value);
    qrSizeValue.textContent = currentQRSize;
    if (qrSizeLabel) qrSizeLabel.textContent = currentQRSize;
    if (qrSizeLabel2) qrSizeLabel2.textContent = currentQRSize;
    updateQRCode();
});

fgColorInput.addEventListener('input', (e) => {
    fgColorText.value = e.target.value;
    updateQRCode();
});

fgColorText.addEventListener('change', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        fgColorInput.value = e.target.value;
        updateQRCode();
    }
});

bgColorInput.addEventListener('input', (e) => {
    bgColorText.value = e.target.value;
    updateQRCode();
});

bgColorText.addEventListener('change', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        bgColorInput.value = e.target.value;
        updateQRCode();
    }
});

// Shape buttons
document.getElementById('shapeGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.shape-btn');
    if (!btn) return;
    currentPattern = btn.getAttribute('data-pattern');
    updateShapeSelection();
    updateQRCode();
});

// Outer corner buttons
document.getElementById('outerCornerGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.corner-btn[data-outer]');
    if (!btn) return;
    currentOuterCorner = btn.getAttribute('data-outer');
    updateCornerSelection();
    updateQRCode();
});

// Inner corner buttons
document.getElementById('innerCornerGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.corner-btn[data-inner]');
    if (!btn) return;
    currentInnerCorner = btn.getAttribute('data-inner');
    updateCornerSelection();
    updateQRCode();
});

// Gradient toggle
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
    });
}
if (gradColor2Input) {
    gradColor2Input.addEventListener('input', (e) => {
        gradientColor2 = e.target.value;
        if (gradColor2Text) gradColor2Text.value = e.target.value;
        if (useGradient) updateQRCode();
    });
}
if (gradColor2Text) {
    gradColor2Text.addEventListener('change', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            gradientColor2 = e.target.value;
            if (gradColor2Input) gradColor2Input.value = e.target.value;
            if (useGradient) updateQRCode();
        }
    });
}

// Foreground overlay
const fgOverlayInput = document.getElementById('fgOverlayInput');
const fgOverlayRemove = document.getElementById('fgOverlayRemove');
const fgOpacitySlider = document.getElementById('fgOpacity');
const fgOpacityDisplay = document.getElementById('fgOpacityValue');
const fgOverlayControls = document.getElementById('fgOverlayControls');
if (fgOverlayInput) {
    fgOverlayInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            foregroundDataUrl = ev.target.result;
            if (fgOverlayControls) fgOverlayControls.classList.remove('hidden');
            updateQRCode();
        };
        reader.readAsDataURL(file);
    });
}
if (fgOverlayRemove) {
    fgOverlayRemove.addEventListener('click', () => {
        foregroundDataUrl = null;
        if (fgOverlayInput) fgOverlayInput.value = '';
        if (fgOverlayControls) fgOverlayControls.classList.add('hidden');
        updateQRCode();
    });
}
if (fgOpacitySlider) {
    fgOpacitySlider.addEventListener('input', (e) => {
        foregroundOpacity = parseInt(e.target.value) / 100;
        if (fgOpacityDisplay) fgOpacityDisplay.textContent = e.target.value + '%';
        if (foregroundDataUrl) updateQRCode();
    });
}

// Frame color
frameColorInput.addEventListener('input', (e) => {
    frameColorTextInput.value = e.target.value;
    updateQRCode();
});
frameColorTextInput.addEventListener('change', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        frameColorInput.value = e.target.value;
        updateQRCode();
    }
});

// Frame label preview
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
});

logoSize.addEventListener('input', (e) => {
    logoSizeValue.textContent = e.target.value;
    updateQRCode();
    checkScannability();
});

logoMargin.addEventListener('input', (e) => {
    logoMarginValue.textContent = e.target.value;
    updateQRCode();
});

// Logo color picker listeners
const logoColorInput = document.getElementById('logoColor');
const logoColorText = document.getElementById('logoColorText');
const logoColorReset = document.getElementById('logoColorReset');

if (logoColorInput) {
    logoColorInput.addEventListener('input', (e) => {
        const color = e.target.value;
        logoColorOverrides[currentLogoPreset] = color;
        if (logoColorText) logoColorText.value = color;
        updateQRCode();
    });
}
if (logoColorText) {
    logoColorText.addEventListener('change', (e) => {
        const color = e.target.value.trim();
        if (color === '' || /^#[0-9A-F]{6}$/i.test(color)) {
            logoColorOverrides[currentLogoPreset] = color;
            if (logoColorInput) logoColorInput.value = color || '#000000';
            updateQRCode();
        }
    });
}
if (logoColorReset) {
    logoColorReset.addEventListener('click', () => {
        delete logoColorOverrides[currentLogoPreset];
        updateLogoColorUI();
        updateQRCode();
    });
}

// URL Hash Serialization
function getConfigHash() {
    const type = qrType.value;
    const config = qrTypeConfig[type];
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
        logoColors: { ...logoColorOverrides },
        frame: selectedFrame,
        frameColor: frameColorInput.value,
        frameText: frameTextInput.value,
        fgOpacity: Math.round(foregroundOpacity * 100)
    };
    return btoa(JSON.stringify(configObj));
}

function setConfigFromHash(hash) {
    try {
        const configObj = JSON.parse(atob(hash));
        qrType.value = configObj.type;
        renderInputFields();

        Object.keys(configObj.values).forEach(key => {
            const element = document.getElementById(key);
            if (element) element.value = configObj.values[key];
        });

        fgColorInput.value = configObj.fg || '#000000';
        fgColorText.value = configObj.fg || '#000000';
        bgColorInput.value = configObj.bg || '#ffffff';
        bgColorText.value = configObj.bg || '#ffffff';
        currentPattern = configObj.pattern || 'square';
        currentOuterCorner = configObj.outerCorner || configObj.cornerStyle || 'square';
        currentInnerCorner = configObj.innerCorner || 'square';
        useGradient = configObj.useGradient || false;
        gradientColor2 = configObj.gradientColor2 || '#3b82f6';
        foregroundOpacity = (configObj.fgOpacity || 15) / 100;
        if (gradColor2Input) gradColor2Input.value = gradientColor2;
        if (gradColor2Text) gradColor2Text.value = gradientColor2;
        if (gradientToggleBtn) { gradientToggleBtn.setAttribute('aria-pressed', useGradient); gradientToggleBtn.classList.toggle('active', useGradient); }
        if (gradColor2Row) gradColor2Row.classList.toggle('hidden', !useGradient);
        if (fgOpacitySlider) { fgOpacitySlider.value = Math.round(foregroundOpacity * 100); }
        if (fgOpacityDisplay) fgOpacityDisplay.textContent = Math.round(foregroundOpacity * 100) + '%';
        currentQRSize = configObj.size || 300;
        qrSize.value = currentQRSize;
        qrSizeValue.textContent = currentQRSize;
        logoSize.value = configObj.logoSize || 20;
        logoSizeValue.textContent = configObj.logoSize || 20;
        logoMargin.value = configObj.logoMargin || 10;
        logoMarginValue.textContent = configObj.logoMargin || 10;
        selectedFrame = configObj.frame || 'none';
        frameColorInput.value = configObj.frameColor || '#000000';
        frameColorTextInput.value = configObj.frameColor || '#000000';
        frameTextInput.value = configObj.frameText || '';
        currentLogoPreset = configObj.logoPreset || 'none';
        Object.assign(logoColorOverrides, configObj.logoColors || {});
        updateShapeSelection();
        updateCornerSelection();
        updateFrameSelection();
        updateLogoSelection();
        updateLogoColorUI();
        logoControls.classList.toggle('hidden', currentLogoPreset === 'none');
        updateQRCode();
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
    const config = qrTypeConfig[type];
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
        logoColors: { ...logoColorOverrides },
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
            qrType.value = configObj.type;
            renderInputFields();

            Object.keys(configObj.values).forEach(key => {
                const element = document.getElementById(key);
                if (element) element.value = configObj.values[key];
            });

            fgColorInput.value = configObj.fg || '#000000';
            fgColorText.value = configObj.fg || '#000000';
            bgColorInput.value = configObj.bg || '#ffffff';
            bgColorText.value = configObj.bg || '#ffffff';
            currentPattern = configObj.pattern || 'square';
            currentOuterCorner = configObj.outerCorner || configObj.cornerStyle || 'square';
            currentInnerCorner = configObj.innerCorner || 'square';
            useGradient = configObj.useGradient || false;
            gradientColor2 = configObj.gradientColor2 || '#3b82f6';
            if (gradColor2Input) gradColor2Input.value = gradientColor2;
            if (gradColor2Text) gradColor2Text.value = gradientColor2;
            if (gradientToggleBtn) { gradientToggleBtn.setAttribute('aria-pressed', useGradient); gradientToggleBtn.classList.toggle('active', useGradient); }
            if (gradColor2Row) gradColor2Row.classList.toggle('hidden', !useGradient);
            currentQRSize = configObj.size || 300;
            qrSize.value = currentQRSize;
            qrSizeValue.textContent = currentQRSize;
            logoSize.value = configObj.logoSize || 20;
            logoSizeValue.textContent = configObj.logoSize || 20;
            logoMargin.value = configObj.logoMargin || 10;
            logoMarginValue.textContent = configObj.logoMargin || 10;
            selectedFrame = configObj.frame || 'none';
            frameColorInput.value = configObj.frameColor || '#000000';
            frameColorTextInput.value = configObj.frameColor || '#000000';
            frameTextInput.value = configObj.frameText || '';

            currentLogoPreset = configObj.logoPreset || 'none';
            Object.assign(logoColorOverrides, configObj.logoColors || {});
            if (configObj.logo) {
                logoDataUrl = configObj.logo;
                logoImg.src = logoDataUrl;
                customLogoBtn.style.display = 'flex';
                customLogoBtn.classList.remove('hidden');
                logoPreview.classList.remove('hidden');
                currentLogoPreset = 'custom';
            }
            logoControls.classList.toggle('hidden', currentLogoPreset === 'none');
            updateShapeSelection();
            updateCornerSelection();
            updateFrameSelection();
            updateLogoSelection();
            updateLogoColorUI();
            updateQRCode();
        } catch (e) {
            showToast('Import failed: ' + e.message, 'error');
        }
    };
    reader.readAsText(e.target.files[0]);
});

document.getElementById('copyShareLink').addEventListener('click', copyShareLink);
document.getElementById('exportConfig').addEventListener('click', exportConfig);
document.getElementById('importConfig').addEventListener('click', importConfig);

// Fullscreen preview modal
const fullscreenModal = document.getElementById('fullscreenModal');
const fullscreenPreviewBtn = document.getElementById('fullscreenPreviewBtn');
const closeFullscreenModal = document.getElementById('closeFullscreenModal');
const closeFullscreenModal2 = document.getElementById('closeFullscreenModal2');
const fullscreenPreviewContent = document.getElementById('fullscreenPreviewContent');
const downloadFromModal = document.getElementById('downloadFromModal');

if (fullscreenPreviewBtn) {
    fullscreenPreviewBtn.addEventListener('click', () => {
        const qrContainer = document.getElementById('qrCodeContainer');
        if (!qrContainer || !qrContainer.querySelector('canvas')) {
            showToast('QR code not ready yet', 'warn');
            return;
        }
        const canvas = qrContainer.querySelector('canvas');
        const clone = canvas.cloneNode(true);
        clone.style.maxWidth = '80vh';
        clone.style.maxHeight = '80vh';
        clone.style.width = 'auto';
        clone.style.height = 'auto';
        fullscreenPreviewContent.innerHTML = '';
        fullscreenPreviewContent.appendChild(clone);
        fullscreenModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });
}
if (closeFullscreenModal || closeFullscreenModal2) {
    const handler = () => {
        fullscreenModal.classList.add('hidden');
        document.body.style.overflow = '';
    };
    if (closeFullscreenModal) closeFullscreenModal.addEventListener('click', handler);
    if (closeFullscreenModal2) closeFullscreenModal2.addEventListener('click', handler);
}
if (fullscreenModal) {
    fullscreenModal.addEventListener('click', (e) => {
        if (e.target === fullscreenModal) {
            fullscreenModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });
}
if (downloadFromModal) {
    downloadFromModal.addEventListener('click', () => {
        if (qrCode) qrCode.download({ name: generateQRFilename(), extension: 'png' });
    });
}
if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    setConfigFromHash(hash);
} else {
    renderInputFields();
    updateQRCode();
}
renderTemplates();

// ── Export/Share Settings (Mobile Preview Panel) ───────────────────────
(function exportShareModals() {
    const exportBtn = document.getElementById('exportSettingsMobile');
    const shareBtn = document.getElementById('shareLinkMobile');
    const exportModal = document.getElementById('exportSettingsModal');
    const shareModal = document.getElementById('shareLinkModal');
    const closeExportBtn = document.getElementById('closeExportSettingsModal');
    const closeShareBtn = document.getElementById('closeShareLinkModal');
    const closeShareBtn2 = document.getElementById('closeShareLinkModal2');
    const copyExportBtn = document.getElementById('copyExportSettingsBtn');
    const downloadExportBtn = document.getElementById('downloadExportSettingsBtn');
    const copyShareBtn = document.getElementById('copyShareLinkBtn');
    const openShareBtn = document.getElementById('openShareLinkBtn');

    // Gather current settings for export
    function gatherSettings() {
        return {
            text: (typeof inputText !== 'undefined') ? inputText.value : '',
            errorCorrection: (typeof errorCorrectionSelect !== 'undefined') ? errorCorrectionSelect.value : 'M',
            width: (typeof inputWidthField !== 'undefined') ? parseInt(inputWidthField.value) : 300,
            height: (typeof inputHeightField !== 'undefined') ? parseInt(inputHeightField.value) : 300,
            type: (typeof errorCorrectionSelect !== 'undefined') ? errorCorrectionSelect.value : 'M',
            dataPattern: typeof currentPattern !== 'undefined' ? currentPattern : 'square',
            dataColor: (typeof fgColorInput !== 'undefined') ? fgColorInput.value : '#000000',
            cornerSquareType: typeof currentOuterCorner !== 'undefined' ? currentOuterCorner : 'square',
            cornerSquareColor: (typeof fgColorInput !== 'undefined') ? fgColorInput.value : '#000000',
            cornerDotType: typeof currentInnerCorner !== 'undefined' ? currentInnerCorner : 'square',
            cornerDotColor: (typeof fgColorInput !== 'undefined') ? fgColorInput.value : '#000000',
            backgroundColor: (typeof bgColorInput !== 'undefined') ? bgColorInput.value : '#ffffff',
            logoEnabled: (document.getElementById('showLogo') && document.getElementById('showLogo').checked) || false,
            logoUrl: typeof logoDataUrl !== 'undefined' ? logoDataUrl : '',
            logoSize: (typeof logoSize !== 'undefined') ? parseInt(logoSize.value || 20) : 20,
            logoMargin: (typeof logoMargin !== 'undefined') ? parseInt(logoMargin.value || 10) : 10,
            frameLabel: (document.getElementById('frameLabel') && document.getElementById('frameLabel').checked) || false,
            frameText: (typeof frameTextInput !== 'undefined') ? frameTextInput.value : '',
            frameColor: (typeof frameColorInput !== 'undefined') ? frameColorInput.value : '#000000',
            selectedFrame: typeof selectedFrame !== 'undefined' ? selectedFrame : 'none',
            useGradient: typeof useGradient !== 'undefined' ? useGradient : false,
            gradientColor2: typeof gradientColor2 !== 'undefined' ? gradientColor2 : '#3b82f6'
        };
    }

    // Export Settings Modal
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const settings = gatherSettings();
            const json = JSON.stringify(settings, null, 2);
            document.getElementById('exportSettingsJson').textContent = json;
            exportModal.classList.remove('hidden');
        });
    }

    if (closeExportBtn) {
        closeExportBtn.addEventListener('click', () => exportModal.classList.add('hidden'));
    }
    exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) exportModal.classList.add('hidden');
    });

    if (copyExportBtn) {
        copyExportBtn.addEventListener('click', () => {
            const text = document.getElementById('exportSettingsJson').textContent;
            navigator.clipboard.writeText(text).then(() => {
                const label = document.getElementById('copyExportSettingsLabel');
                const orig = label.textContent;
                label.textContent = 'Copied!';
                setTimeout(() => label.textContent = orig, 2000);
            }).catch(err => showToast('Failed to copy', 'error'));
        });
    }

    if (downloadExportBtn) {
        downloadExportBtn.addEventListener('click', () => {
            const text = document.getElementById('exportSettingsJson').textContent;
            const blob = new Blob([text], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qrtist-settings-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // Share Link Modal
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const settings = gatherSettings();
            const encoded = btoa(JSON.stringify(settings));
            const baseUrl = window.location.origin + window.location.pathname;
            const fullUrl = baseUrl + '#settings=' + encoded;
            
            document.getElementById('shareLinkInput').value = fullUrl;
            shareModal.classList.remove('hidden');
            
            // Generate QR for the share link
            const qrContainer = document.getElementById('shareLinkQr');
            qrContainer.innerHTML = '';
            const qr = new QRCodeStyling({ text: fullUrl, width: 160, height: 160 });
            qr.append(qrContainer);
        });
    }

    if (closeShareBtn) {
        closeShareBtn.addEventListener('click', () => shareModal.classList.add('hidden'));
    }
    if (closeShareBtn2) {
        closeShareBtn2.addEventListener('click', () => shareModal.classList.add('hidden'));
    }
    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) shareModal.classList.add('hidden');
    });

    if (copyShareBtn) {
        copyShareBtn.addEventListener('click', () => {
            const url = document.getElementById('shareLinkInput').value;
            navigator.clipboard.writeText(url).then(() => {
                copyShareBtn.style.color = '#10b981';
                setTimeout(() => copyShareBtn.style.color = '', 2000);
            }).catch(err => showToast('Failed to copy link', 'error'));
        });
    }

    if (openShareBtn) {
        openShareBtn.addEventListener('click', () => {
            const url = document.getElementById('shareLinkInput').value;
            window.open(url, '_blank');
        });
    }
})();

// ── [DEPRECATED - Duplicate functionality disabled] Old Mobile Menu & Advanced Options ───────────
/*
(function  mobileMenuAndAdvanced() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');
    const advancedBtn = document.getElementById('advancedOptionsBtn');
    const advancedModal = document.getElementById('advancedModal');
    const closeAdvancedBtn = document.getElementById('closeAdvancedModal');
    const importSettingsInput = document.getElementById('importSettingsInput');
    const importChooseFileBtn = document.getElementById('importSettingsChooseFile');
    const resetBtn = document.getElementById('resetDesignBtn');
    const csvBtn = document.getElementById('exportCsvBtn');

    // Mobile menu toggle
    if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && menuBtn && !menuBtn.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });

    // Advanced Options
    if (advancedBtn) {
        advancedBtn.addEventListener('click', () => {
            menu.classList.add('hidden');
            advancedModal.classList.remove('hidden');
            advancedModal.classList.add('visible');
        });
    }

    // Close advanced modal
    if (closeAdvancedBtn) {
        closeAdvancedBtn.addEventListener('click', () => {
            advancedModal.classList.add('hidden');
            advancedModal.classList.remove('visible');
        });
    }

    advancedModal.addEventListener('click', (e) => {
        if (e.target === advancedModal) {
            advancedModal.classList.add('hidden');
            advancedModal.classList.remove('visible');
        }
    });

    // Import Settings File
    if (importChooseFileBtn) {
        importChooseFileBtn.addEventListener('click', () => {
            importSettingsInput.click();
        });
    }

    if (importSettingsInput) {
        importSettingsInput.addEventListener('change', (e) => {
            if (!e.target.files[0]) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const settings = JSON.parse(event.target.result);
                    // Apply settings
                    inputText.value = settings.text || '';
                    errorCorrectionSelect.value = settings.errorCorrection || 'M';
                    inputWidthField.value = settings.width || 300;
                    inputHeightField.value = settings.height || 300;
                    fgColorInput.value = settings.dataColor || '#000000';
                    fgColorText.value = settings.dataColor || '#000000';
                    bgColorInput.value = settings.backgroundColor || '#ffffff';
                    bgColorText.value = settings.backgroundColor || '#ffffff';
                    currentPattern = settings.dataPattern || 'square';
                    currentOuterCorner = settings.cornerSquareType || 'square';
                    currentInnerCorner = settings.cornerDotType || 'square';
                    useGradient = settings.useGradient || false;
                    gradientColor2 = settings.gradientColor2 || '#3b82f6';
                    if (gradColor2Input) gradColor2Input.value = gradientColor2;
                    if (gradientToggleBtn) {
                        gradientToggleBtn.setAttribute('aria-pressed', useGradient);
                        gradientToggleBtn.classList.toggle('active', useGradient);
                    }
                    if (gradColor2Row) gradColor2Row.classList.toggle('hidden', !useGradient);
                    logoSize.value = settings.logoSize || 20;
                    logoSizeValue.textContent = settings.logoSize || 20;
                    logoMargin.value = settings.logoMargin || 10;
                    logoMarginValue.textContent = settings.logoMargin || 10;
                    frameColorInput.value = settings.frameColor || '#000000';
                    frameColorTextInput.value = settings.frameColor || '#000000';
                    frameTextInput.value = settings.frameText || '';
                    selectedFrame = settings.selectedFrame || 'none';
                    if (document.getElementById('showLogo')) {
                        document.getElementById('showLogo').checked = settings.logoEnabled || false;
                    }
                    if (document.getElementById('frameLabel')) {
                        document.getElementById('frameLabel').checked = settings.frameLabel || false;
                    }
                    updateQRCode();
                    advancedModal.classList.add('hidden');
                    advancedModal.classList.remove('visible');
                    showToast('Settings imported', 'success');
                } catch (err) {
                    showToast('Error importing settings: ' + err.message, 'error');
                }
            };
            reader.readAsText(e.target.files[0]);
        });
    }

    // Reset Design to Defaults
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (!confirm('Are you sure? This will reset all settings to defaults.')) return;
            inputText.value = '';
            errorCorrectionSelect.value = 'M';
            inputWidthField.value = 300;
            inputHeightField.value = 300;
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
            if (gradientToggleBtn) {
                gradientToggleBtn.setAttribute('aria-pressed', 'false');
                gradientToggleBtn.classList.remove('active');
            }
            if (gradColor2Row) gradColor2Row.classList.add('hidden');
            if (document.getElementById('showLogo')) document.getElementById('showLogo').checked = false;
            if (document.getElementById('frameLabel')) document.getElementById('frameLabel').checked = false;
            logoDataUrl = null;
            currentLogoPreset = 'none';
            updateQRCode();
            advancedModal.classList.add('hidden');
            advancedModal.classList.remove('visible');
        });
    }

    // Export as CSV
    if (csvBtn) {
        csvBtn.addEventListener('click', () => {
            const text = inputText.value || 'Empty QR Code';
            const csv = 'Text,Value\
\"QR Data\",\"' + text.replace(/\"/g, '\"\"') + '\"';
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qrtist-data-${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // Desktop: Reset Design button
    const desktopResetBtn = document.getElementById('resetDesign');
    if (desktopResetBtn) {
        desktopResetBtn.addEventListener('click', () => {
            if (!confirm('Are you sure? This will reset all settings to defaults.')) return;
            inputText.value = '';
            errorCorrectionSelect.value = 'M';
            inputWidthField.value = 300;
            inputHeightField.value = 300;
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
            if (gradientToggleBtn) {
                gradientToggleBtn.setAttribute('aria-pressed', 'false');
                gradientToggleBtn.classList.remove('active');
            }
            if (gradColor2Row) gradColor2Row.classList.add('hidden');
            if (document.getElementById('showLogo')) document.getElementById('showLogo').checked = false;
            if (document.getElementById('frameLabel')) document.getElementById('frameLabel').checked = false;
            logoDataUrl = null;
            currentLogoPreset = 'none';
            updateQRCode();
        });
    }

    // Desktop: Export as CSV button
    const desktopCsvBtn = document.getElementById('exportCsvDesktop');
    if (desktopCsvBtn) {
        desktopCsvBtn.addEventListener('click', () => {
            const text = inputText.value || 'Empty QR Code';
            const csv = 'Text,Value\
\"QR Data\",\"' + text.replace(/\"/g, '\"\"') + '\"';
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qrtist-data-${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
})();
*/

// ── Mobile Tab Navigation ───────────────────────────────────────────────
(function () {
    const panels = [
        document.getElementById('panelData'),
        document.getElementById('panelPreview'),
        document.getElementById('panelDesign')
    ];
    const tabBtns = document.querySelectorAll('.mobile-tab-btn');
    const qrChip  = document.getElementById('mobileQrChip');
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
        // Hide chip when Preview tab is active (full-size QR is visible)
        if (qrChip) qrChip.style.display = (index === 1) ? 'none' : '';
        // When switching to Preview: clear badge & refresh thumbnail
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
            // Desktop: show all panels, remove mobile gating
            panels.forEach(p => { if (p) p.classList.remove('mobile-active-panel'); });
            if (qrChip) qrChip.style.display = '';
        }
    }

    // Expose so updateQRCode badge logic can query current tab
    window.__isMobilePreviewTab = () => currentMobileTab === 1 && window.innerWidth < 768;

    // Tab button clicks
    tabBtns.forEach((btn, i) => {
        btn.addEventListener('click', () => switchMobileTab(i));
    });

    // Chip tap → jump to Preview tab
    if (qrChip) {
        qrChip.addEventListener('click', () => switchMobileTab(1));
        qrChip.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchMobileTab(1); }
        });
    }

    window.addEventListener('resize', applyMobileLayout);
    applyMobileLayout();

    // Wire mobile-only duplicate download buttons (Preview tab)
    const dlPngM = document.getElementById('downloadPngMobile');
    const dlSvgM = document.getElementById('downloadSvgMobile');
    if (dlPngM) dlPngM.addEventListener('click', () => {
        if (qrCode) qrCode.download({ name: generateQRFilename(), extension: 'png' });
    });
    if (dlSvgM) dlSvgM.addEventListener('click', () => {
        if (qrCode) qrCode.download({ name: generateQRFilename(), extension: 'svg' });
    });

    // ── Logo Presets ──────────────────────────────────────────────────
    const LOGO_PRESETS = {
        'globe': `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.3'><circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/></svg>`,
        'scan-brackets': `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 56' fill='none'><g stroke='currentColor' stroke-width='5'><polyline points='4,16 4,4 16,4'/><polyline points='44,4 56,4 56,16'/><polyline points='4,40 4,52 16,52'/><polyline points='44,52 56,52 56,40'/></g><text x='30' y='24' font-size='12' text-anchor='middle' font-weight='900' font-family='Arial,sans-serif' fill='currentColor'>SCAN</text><text x='30' y='40' font-size='12' text-anchor='middle' font-weight='900' font-family='Arial,sans-serif' fill='currentColor'>ME</text></svg>`,
        'scan-text': `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='50' y='46' font-size='22' text-anchor='middle' font-weight='900' font-family='Arial,sans-serif' fill='currentColor'>SCAN</text><text x='50' y='74' font-size='22' text-anchor='middle' font-weight='900' font-family='Arial,sans-serif' fill='currentColor'>ME</text></svg>`,
        'x-twitter': `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z' fill='currentColor'/></svg>`,
        'facebook': `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' fill='currentColor'/></svg>`,
        'instagram': `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.249 1.805-.415 2.227-.217.562-.477.96-.896 1.382-.42.419-.819.679-1.381.896-.422.164-1.057.36-2.227.413-1.266.057-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.805-.249-2.227-.415-.562-.217-.96-.477-1.382-.896-.419-.42-.679-.819-.896-1.381-.164-.422-.36-1.057-.413-2.227-.057-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.054-1.17.249-1.805.415-2.227.217-.562.477-.96.896-1.382.42-.419.819-.679 1.381-.896.422-.164 1.057-.36 2.227-.413 1.266-.057 1.646-.07 4.85-.07zM12 0C8.741 0 8.333.014 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.776.072 7.054.014 8.333 0 8.741 0 12s.014 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.986 8.74 24 12 24s3.667-.014 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0z' fill='currentColor'/><path d='M12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a3.838 3.838 0 1 1 0-7.676A3.838 3.838 0 0 1 12 16zM18.405 4.155a1.44 1.44 0 1 0 0 2.879 1.44 1.44 0 0 0 0-2.879z' fill='currentColor'/></svg>`,
        'linkedin': `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z' fill='currentColor'/></svg>`,
        'pinterest': `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.411-5.996 1.411-5.996s-.36-.72-.36-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.1.12.115.225.085.345-.094.393-.304 1.239-.345 1.411-.055.231-.184.28-.423.169-1.573-.732-2.556-3.031-2.556-4.872 0-3.966 2.883-7.608 8.308-7.608 4.363 0 7.752 3.109 7.752 7.261 0 4.333-2.731 7.82-6.522 7.82-1.272 0-2.47-.661-2.879-1.442 0 0-.629 2.393-.781 2.977-.282 1.083-1.042 2.441-1.554 3.271 1.127.348 2.319.537 3.557.537 6.622 0 11.988-5.366 11.988-11.987C24.005 5.367 18.639 0 12.017 0z' fill='currentColor'/></svg>`,
        'telegram': `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M11.944 0C5.346 0 0 5.345 0 11.944c0 6.598 5.346 11.943 11.944 11.943s11.944-5.345 11.944-11.943C23.888 5.345 18.542 0 11.944 0zm5.83 8.324c-.161 1.698-.865 5.86-1.226 7.794-.153.818-.454 1.092-.746 1.12-.634.06-1.115-.417-1.728-.82-.96-.63-1.502-1.022-2.433-1.635-1.077-.708-.379-1.097.235-1.737.161-.167 2.956-2.71 3.01-2.937.006-.029.012-.138-.053-.195-.065-.057-.16-.038-.228-.023-.098.022-1.657 1.054-4.68 3.097-.442.304-.843.454-1.202.446-.394-.008-1.154-.223-1.719-.406-.692-.224-1.242-.343-1.194-.725.025-.199.3-.404.825-.615 3.235-1.408 5.392-2.339 6.472-2.793 3.08-1.29 3.72-1.514 4.136-1.52.091-.001.297.021.43.128.112.09.143.211.15.3l-.001.073z' fill='currentColor'/></svg>`,
        'discord': `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01 10.175 10.175 0 0 0 .372.292.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z' fill='currentColor'/></svg>`,
        'spotify': `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.306c-.215.353-.674.464-1.026.25-2.863-1.748-6.466-2.143-10.707-1.176-.403.093-.81-.157-.903-.56s.157-.81.56-.903c4.646-1.062 8.636-.597 11.827 1.35.352.214.463.674.249 1.026s-.353.464-.674.249zm1.468-3.264c-.272.443-.848.583-1.291.311-3.277-2.015-8.272-2.599-12.146-1.424-.495.15-1.233-.162-1.415-.762-.182-.6.162-1.233.762-1.415 4.341-1.318 11.52-1.066 16.03 1.61.54.32.716 1.02.396 1.56s-1.02.716-1.56.396zm.127-3.41c-3.929-2.333-10.435-2.55-14.218-1.4c-.6.182-1.233-.162-1.415-.762-.182-.6.162-1.233.762-1.415 4.341-1.318 11.52-1.066 16.03 1.61.54.32.716 1.02.396 1.56s-1.02.716-1.56.396z' fill='currentColor'/></svg>`,
        'youtube': `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z' fill='currentColor'/></svg>`,
    };

    function getLogoPresetDataUrl(preset, color) {
        const svg = LOGO_PRESETS[preset];
        if (!svg) return null;
        let modifiedSvg = svg;
        if (color && color !== '' && preset !== 'custom') {
            modifiedSvg = svg.replace(/fill="currentColor"/g, `fill="${color}"`)
                              .replace(/stroke="currentColor"/g, `stroke="${color}"`);
        }
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(modifiedSvg);
    }

    // ── Design Templates ──────────────────────────────────────────────────
    const TEMPLATES = [
        { id: 'classic-black', name: 'Classic', fg: '#000000', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'none', frameColor: '#000000' },
        { id: 'corporate-blue', name: 'Corporate', fg: '#1a56db', bg: '#ffffff', dots: 'rounded', outer: 'rounded', inner: 'dot', frame: 'none', frameColor: '#1a56db' },
        { id: 'instagram-pink', name: 'Instagram', fg: '#c13584', bg: '#fdf2f8', dots: 'dots', outer: 'circle', inner: 'dot', frame: 'none', frameColor: '#c13584' },
        { id: 'discord-purple', name: 'Discord', fg: '#5865f2', bg: '#ffffff', dots: 'rounded', outer: 'rounded', inner: 'dot', frame: 'none', frameColor: '#5865f2' },
        { id: 'youtube-red', name: 'YouTube', fg: '#ff0000', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'simple', frameColor: '#ff0000' },
        { id: 'ocean-breeze', name: 'Ocean', fg: '#0ea5e9', bg: '#f0f9ff', dots: 'dots', outer: 'circle', inner: 'dot', frame: 'rounded-rect', frameColor: '#0ea5e9' },
        { id: 'neon-night', name: 'Neon', fg: '#00ff88', bg: '#0a0a1a', dots: 'extra-rounded', outer: 'circle', inner: 'dot', frame: 'neon-glow', frameColor: '#00ff88' },
        { id: 'elegant-gold', name: 'Gold', fg: '#b8860b', bg: '#fffbeb', dots: 'classy', outer: 'rounded', inner: 'square', frame: 'double', frameColor: '#b8860b' },
        { id: 'minimal-gray', name: 'Minimal', fg: '#374151', bg: '#f9fafb', dots: 'rounded', outer: 'rounded', inner: 'rounded', frame: 'none', frameColor: '#374151' },
        { id: 'linkedin-navy', name: 'LinkedIn', fg: '#0a66c2', bg: '#ffffff', dots: 'square', outer: 'square', inner: 'square', frame: 'simple', frameColor: '#0a66c2' },
    ];

    function renderTemplates() {
        const grid = document.getElementById('templateGrid');
        if (!grid) return;
        grid.innerHTML = TEMPLATES.map(t => `
            <button class="template-btn flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-400 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 transition-all" data-template="${t.id}" title="Preview: ${t.name}">
                <div class="flex items-center gap-1.5">
                    <span class="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-500 flex-shrink-0" style="background:${t.fg}" title="Dots"></span>
                    <span class="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-500 flex-shrink-0" style="background:${t.bg}" title="Background"></span>
                </div>
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
    }

    function applyTemplate(t) {
        document.getElementById('fgColor').value = t.fg;
        document.getElementById('fgColorText').value = t.fg;
        document.getElementById('bgColor').value = t.bg;
        document.getElementById('bgColorText').value = t.bg;
        document.getElementById('frameColor').value = t.frameColor;
        document.getElementById('frameColorText').value = t.frameColor;
        document.querySelectorAll('.shape-btn').forEach(btn => btn.classList.remove('selected'));
        document.querySelector(`.shape-btn[data-pattern="${t.dots}"]`)?.classList.add('selected');
        document.querySelectorAll('.corner-btn[data-outer]').forEach(btn => btn.classList.remove('selected'));
        document.querySelector(`.corner-btn[data-outer="${t.outer}"]`)?.classList.add('selected');
        document.querySelectorAll('.corner-btn[data-inner]').forEach(btn => btn.classList.remove('selected'));
        document.querySelector(`.corner-btn[data-inner="${t.inner}"]`)?.classList.add('selected');
        document.querySelectorAll('.frame-btn').forEach(btn => btn.classList.remove('selected'));
        document.querySelector(`.frame-btn[data-frame="${t.frame}"]`)?.classList.add('selected');
        qrType.value = 'url';
        renderInputFields();
        updateQRCode();
    }

    renderTemplates();

    // Reset design handler
    const resetBtn = document.getElementById('resetDesign') || document.getElementById('resetDesignBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Reset all settings to defaults?')) {
                localStorage.removeItem('qrConfig');
                location.reload();
            }
        });
    }

    // Export settings modal handler
    const exportSettingsModalBtn = document.getElementById('exportConfig');
    if (exportSettingsModalBtn) {
        exportSettingsModalBtn.addEventListener('click', () => {
            document.getElementById('exportSettingsModal').classList.remove('hidden');
            const config = getConfig();
            document.getElementById('exportSettingsJson').textContent = JSON.stringify(config, null, 2);
        });
    }

    // Export settings mobile handler
    const exportSettingsMobileBtn = document.getElementById('exportSettingsMobile');
    if (exportSettingsMobileBtn) {
        exportSettingsMobileBtn.addEventListener('click', () => {
            document.getElementById('exportSettingsModal').classList.remove('hidden');
            const type = qrType.value;
            const values = getInputValues();
            const config = {
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
                logoColors: { ...logoColorOverrides },
                frame: selectedFrame,
                frameColor: frameColorInput.value,
                frameText: frameTextInput.value,
                logo: logoDataUrl
            };
            document.getElementById('exportSettingsJson').textContent = JSON.stringify(config, null, 2);
        });
    }

    // Import settings handler
    const importConfigBtn = document.getElementById('importConfig');
    if (importConfigBtn) {
        importConfigBtn.addEventListener('click', () => {
            document.getElementById('importConfigInput').click();
        });
    }

    // Wire file input for import
    const importInput = document.getElementById('importConfigInput');
    if (importInput) {
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const imported = JSON.parse(evt.target.result);
                        setConfigFromImport(imported);
                        updateQRCode();
                    } catch (err) {
                        showToast('Invalid JSON file', 'error');
                    }
                };
                reader.readAsText(file);
            }
        });
    }

    // Close export settings modal
    const closeExportBtn = document.getElementById('closeExportSettingsModal');
    if (closeExportBtn) {
        closeExportBtn.addEventListener('click', () => {
            document.getElementById('exportSettingsModal').classList.add('hidden');
        });
    }

    // Copy export settings button
    const copyExportBtn = document.getElementById('copyExportSettingsBtn');
    if (copyExportBtn) {
        copyExportBtn.addEventListener('click', () => {
            const text = document.getElementById('exportSettingsJson').textContent;
            navigator.clipboard.writeText(text).then(() => {
                copyExportBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyExportBtn.textContent = 'Copy JSON';
                }, 2000);
            });
        });
    }

    // Download export settings button
    const downloadExportBtn = document.getElementById('downloadExportSettingsBtn');
    if (downloadExportBtn) {
        downloadExportBtn.addEventListener('click', () => {
            const type = qrType.value;
            const values = getInputValues();
            const config = {
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
                logoColors: { ...logoColorOverrides },
                frame: selectedFrame,
                frameColor: frameColorInput.value,
                frameText: frameTextInput.value,
                logo: logoDataUrl
            };
            const dataStr = JSON.stringify(config, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'qrtist-config.json';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // Close advanced modal
    const closeAdvancedBtn = document.getElementById('closeAdvancedModal');
    if (closeAdvancedBtn) {
        closeAdvancedBtn.addEventListener('click', () => {
            document.getElementById('advancedModal').classList.remove('visible');
            document.getElementById('advancedModal').classList.add('hidden');
        });
    }

    // Open advanced modal from hamburger menu
    const advancedMenuBtn = document.getElementById('advancedOptionsBtn');
    if (advancedMenuBtn) {
        advancedMenuBtn.addEventListener('click', () => {
            const modal = document.getElementById('advancedModal');
            modal.classList.remove('hidden');
            modal.classList.add('visible');
        });
    }

    // Mobile 3-dot menu toggle (re-enabled)
    const menuBtn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');
    if (menuBtn && menu) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });

        // Prevent clicks inside the menu from closing it
        menu.addEventListener('click', (e) => e.stopPropagation());

        // Close menu when clicking outside
        document.addEventListener('click', () => {
            if (!menu.classList.contains('hidden')) menu.classList.add('hidden');
        });
    }

    // Reset design handler (all variants)
    const resetDesignInModal = document.getElementById('resetDesignBtn');
    const resetDesignMain = document.getElementById('resetDesign');
    const resetHandler = () => {
        if (confirm('Reset all settings to defaults?')) {
            localStorage.removeItem('qrConfig');
            location.reload();
        }
    };
    if (resetDesignInModal) {
        resetDesignInModal.addEventListener('click', resetHandler);
    }
    if (resetDesignMain) {
        resetDesignMain.addEventListener('click', resetHandler);
    }

    // Note: Import settings handled by existing importConfig() function (lines 1470-1533)

    // Export as CSV button (desktop and mobile variants)
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportCsvDesktop = document.getElementById('exportCsvDesktop');
    const csvExportHandler = () => {
        const type = qrType.value;
        const values = getInputValues();
        const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent('QRtist QR Code Export\n' + new Date().toISOString() + '\n\nData Type,' + type + '\n' + Object.entries(values).map(([k, v]) => k + ',' + v.toString().replace(/,/g, ' ')).join('\n'));
        const link = document.createElement('a');
        link.setAttribute('href', csvContent);
        link.setAttribute('download', 'qrtist-export.csv');
        link.click();
    };
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', csvExportHandler);
    }
    if (exportCsvDesktop) {
        exportCsvDesktop.addEventListener('click', csvExportHandler);
    }

    // Wire modal import button
    const importSettingsChooseFileBtn = document.getElementById('importSettingsChooseFile');
    if (importSettingsChooseFileBtn) {
        importSettingsChooseFileBtn.addEventListener('click', () => {
            document.getElementById('importSettingsInput').click();
        });
    }

    // Handle modal import file selection
    const importSettingsInput = document.getElementById('importSettingsInput');
    if (importSettingsInput) {
        importSettingsInput.addEventListener('change', (e) => {
            if (!e.target.files[0]) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const configObj = JSON.parse(event.target.result);
                    qrType.value = configObj.type;
                    renderInputFields();

                    Object.keys(configObj.values || {}).forEach(key => {
                        const element = document.getElementById(key);
                        if (element) element.value = configObj.values[key];
                    });

                    fgColorInput.value = configObj.fg || '#000000';
                    fgColorText.value = configObj.fg || '#000000';
                    bgColorInput.value = configObj.bg || '#ffffff';
                    bgColorText.value = configObj.bg || '#ffffff';
                    currentPattern = configObj.pattern || 'square';
                    currentOuterCorner = configObj.outerCorner || 'square';
                    currentInnerCorner = configObj.innerCorner || 'square';
                    useGradient = configObj.useGradient || false;
                    gradientColor2 = configObj.gradientColor2 || '#3b82f6';
                    currentQRSize = configObj.size || 300;
                    qrSize.value = currentQRSize;
                    qrSizeValue.textContent = currentQRSize;
                    currentLogoPreset = configObj.logoPreset || 'none';
                    logoSize.value = configObj.logoSize || 20;
                    logoSizeValue.textContent = configObj.logoSize || 20;
                    logoMargin.value = configObj.logoMargin || 10;
                    logoMarginValue.textContent = configObj.logoMargin || 10;
                    selectedFrame = configObj.frame || 'none';
                    frameColorInput.value = configObj.frameColor || '#000000';
                    frameColorTextInput.value = configObj.frameColor || '#000000';
                    frameTextInput.value = configObj.frameText || '';
                    
                    Object.assign(logoColorOverrides, configObj.logoColors || {});
                    if (configObj.logo) {
                        logoDataUrl = configObj.logo;
                        logoImg.src = logoDataUrl;
                        customLogoBtn.style.display = 'flex';
                        customLogoBtn.classList.remove('hidden');
                        logoPreview.classList.remove('hidden');
                    }
                    
                    updateShapeSelection();
                    updateCornerSelection();
                    updateFrameSelection();
                    updateLogoSelection();
                    updateLogoColorUI();
                    updateQRCode();
                    document.getElementById('advancedModal').classList.add('hidden');
                    showToast('Settings imported', 'success');
                } catch (err) {
                    showToast('Error importing settings: ' + err.message, 'error');
                }
            };
            reader.readAsText(e.target.files[0]);
        });
    }

    // Initialize with default sample URL
    qrType.value = 'url';
    renderInputFields();
    setTimeout(() => {
        const urlInput = document.getElementById('urlInput');
        if (urlInput) {
            urlInput.value = 'https://google.com';
            updateQRCode();
        }
    }, 10);
})();

// ── Onboarding banner ──────────────────────────────────────────────────
(function initOnboarding() {
    const banner = document.getElementById('onboardingBanner');
    const dismissBtn = document.getElementById('dismissOnboarding');
    const helpBtn = document.getElementById('helpBtn');
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
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            const visible = banner.style.display !== 'none';
            banner.style.display = visible ? 'none' : 'block';
            if (!visible) banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }
})();

// ── Mobile “Preview my QR” CTA ─────────────────────────────────────────
(function initMobileNextBtn() {
    const btn = document.getElementById('mobileNextBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const previewTab = document.querySelector('.mobile-tab-btn[data-tab="1"]');
        if (previewTab) previewTab.click();
    });
})();

// ── History ──────────────────────────────────────────────────────────────────
const HISTORY_KEY = 'qrtist_history_v1';
const HISTORY_MAX = 20;

const historyManager = {
    _load() {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
        catch { return []; }
    },
    _save(entries) {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                showToast('Storage full — delete some snapshots to free space', 'warn', 6000);
            }
        }
    },
    _genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },
    _autoName(type) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const d = new Date();
        return type.charAt(0).toUpperCase() + type.slice(1) + ' — ' + months[d.getMonth()] + ' ' + d.getDate();
    },
    _thumb() {
        try {
            const canvas = document.querySelector('#qrCodeContainer canvas');
            if (!canvas) return '';
            const t = document.createElement('canvas');
            t.width = 80; t.height = 80;
            t.getContext('2d').drawImage(canvas, 0, 0, 80, 80);
            return t.toDataURL('image/jpeg', 0.7);
        } catch { return ''; }
    },
    save() {
        const configObj = JSON.parse(atob(getConfigHash()));
        if (logoDataUrl) configObj.logo = logoDataUrl;
        if (foregroundDataUrl) configObj.fgOverlay = foregroundDataUrl;
        const entry = {
            id: this._genId(),
            timestamp: Date.now(),
            name: this._autoName(configObj.type),
            starred: false,
            thumb: this._thumb(),
            config: configObj
        };
        const all = this._load();
        all.unshift(entry);
        const starred = all.filter(e => e.starred);
        const unstarred = all.filter(e => !e.starred).slice(0, HISTORY_MAX);
        this._save([...starred, ...unstarred]);
        return entry;
    },
    getAll() {
        const all = this._load();
        return {
            favourites: all.filter(e => e.starred).sort((a, b) => b.timestamp - a.timestamp),
            recents: all.filter(e => !e.starred).sort((a, b) => b.timestamp - a.timestamp)
        };
    },
    star(id) {
        const all = this._load();
        const e = all.find(e => e.id === id);
        if (e) { e.starred = !e.starred; this._save(all); }
    },
    rename(id, name) {
        const all = this._load();
        const e = all.find(e => e.id === id);
        if (e && name.trim()) { e.name = name.trim(); this._save(all); }
    },
    delete(id) { this._save(this._load().filter(e => e.id !== id)); },
    restore(id) {
        const entry = this._load().find(e => e.id === id);
        if (entry) restoreFromConfig(entry.config);
    },
    count() { return this._load().length; }
};

function restoreFromConfig(configObj) {
    qrType.value = configObj.type || 'url';
    renderInputFields();
    Object.keys(configObj.values || {}).forEach(key => {
        const el = document.getElementById(key);
        if (el) el.value = configObj.values[key];
    });
    fgColorInput.value = configObj.fg || '#000000';
    fgColorText.value = configObj.fg || '#000000';
    bgColorInput.value = configObj.bg || '#ffffff';
    bgColorText.value = configObj.bg || '#ffffff';
    currentPattern = configObj.pattern || 'square';
    currentOuterCorner = configObj.outerCorner || 'square';
    currentInnerCorner = configObj.innerCorner || 'square';
    useGradient = !!configObj.useGradient;
    gradientColor2 = configObj.gradientColor2 || '#3b82f6';
    foregroundOpacity = (configObj.fgOpacity || 15) / 100;
    if (gradColor2Input) gradColor2Input.value = gradientColor2;
    if (gradColor2Text) gradColor2Text.value = gradientColor2;
    if (gradientToggleBtn) {
        gradientToggleBtn.setAttribute('aria-pressed', useGradient);
        gradientToggleBtn.classList.toggle('active', useGradient);
    }
    if (gradColor2Row) gradColor2Row.classList.toggle('hidden', !useGradient);
    if (fgOpacitySlider) fgOpacitySlider.value = Math.round(foregroundOpacity * 100);
    if (fgOpacityDisplay) fgOpacityDisplay.textContent = Math.round(foregroundOpacity * 100) + '%';
    currentQRSize = configObj.size || 300;
    qrSize.value = currentQRSize;
    qrSizeValue.textContent = currentQRSize;
    logoSize.value = configObj.logoSize || 20;
    logoSizeValue.textContent = configObj.logoSize || 20;
    logoMargin.value = configObj.logoMargin || 10;
    logoMarginValue.textContent = configObj.logoMargin || 10;
    selectedFrame = configObj.frame || 'none';
    frameColorInput.value = configObj.frameColor || '#000000';
    frameColorTextInput.value = configObj.frameColor || '#000000';
    frameTextInput.value = configObj.frameText || '';
    currentLogoPreset = configObj.logoPreset || 'none';
    Object.keys(logoColorOverrides).forEach(k => delete logoColorOverrides[k]);
    Object.assign(logoColorOverrides, configObj.logoColors || {});
    logoDataUrl = configObj.logo || null;
    foregroundDataUrl = configObj.fgOverlay || null;
    updateShapeSelection();
    updateCornerSelection();
    updateFrameSelection();
    updateLogoSelection();
    updateLogoColorUI();
    logoControls.classList.toggle('hidden', currentLogoPreset === 'none');
    if (foregroundDataUrl) {
        const fgC = document.getElementById('fgOverlayControls');
        const fgR = document.getElementById('fgOverlayRemove');
        if (fgC) fgC.classList.remove('hidden');
        if (fgR) { fgR.classList.remove('hidden'); fgR.style.display = 'flex'; }
    }
    updateQRCode();
}

function _relativeTime(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
}

function renderHistoryPanel() {
    const body = document.getElementById('historyBody');
    if (!body) return;
    const { favourites, recents } = historyManager.getAll();
    const total = favourites.length + recents.length;

    const badge = document.getElementById('historyBadge');
    if (badge) {
        badge.style.display = total > 0 ? 'flex' : 'none';
        badge.textContent = total > 9 ? '9+' : String(total);
    }

    if (total === 0) {
        body.innerHTML = '<div class="history-empty"><svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" style="color:#374151;margin:0 auto 10px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>No snapshots yet.<br>Click <strong style="color:#e5e7eb">Save Snapshot</strong> to save the current design.</div>';
        return;
    }

    const makeCard = (entry) => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.dataset.id = entry.id;

        if (entry.thumb) {
            const img = document.createElement('img');
            img.className = 'history-thumb';
            img.src = entry.thumb;
            img.alt = '';
            img.loading = 'lazy';
            card.appendChild(img);
        } else {
            const ph = document.createElement('div');
            ph.className = 'history-thumb';
            ph.style.cssText = 'display:flex;align-items:center;justify-content:center;color:#374151';
            ph.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
            card.appendChild(ph);
        }

        const info = document.createElement('div');
        info.className = 'history-info';

        const nameEl = document.createElement('span');
        nameEl.className = 'history-name';
        nameEl.contentEditable = 'true';
        nameEl.setAttribute('role', 'textbox');
        nameEl.setAttribute('aria-label', 'Snapshot name');
        nameEl.textContent = entry.name;
        nameEl.title = 'Click to rename';
        nameEl.addEventListener('blur', () => {
            const n = nameEl.textContent.trim();
            if (n && n !== entry.name) historyManager.rename(entry.id, n);
        });
        nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); } });
        nameEl.addEventListener('click', e => e.stopPropagation());
        info.appendChild(nameEl);

        const time = document.createElement('div');
        time.className = 'history-time';
        time.textContent = _relativeTime(entry.timestamp);
        info.appendChild(time);
        card.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'history-actions';

        const starBtn = document.createElement('button');
        starBtn.className = 'history-action-btn' + (entry.starred ? ' starred' : '');
        starBtn.title = entry.starred ? 'Remove from favourites' : 'Add to favourites';
        starBtn.setAttribute('aria-label', entry.starred ? 'Unstar' : 'Star');
        const starFill = entry.starred ? 'currentColor' : 'none';
        starBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="' + starFill + '" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        starBtn.addEventListener('click', e => { e.stopPropagation(); historyManager.star(entry.id); renderHistoryPanel(); });
        actions.appendChild(starBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'history-action-btn delete-btn';
        delBtn.title = 'Delete snapshot';
        delBtn.setAttribute('aria-label', 'Delete snapshot');
        delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
        delBtn.addEventListener('click', e => { e.stopPropagation(); historyManager.delete(entry.id); renderHistoryPanel(); });
        actions.appendChild(delBtn);
        card.appendChild(actions);

        card.addEventListener('click', e => {
            if (e.target.closest('.history-action-btn') || e.target.closest('[contenteditable]')) return;
            restoreFromConfig(entry.config);
            closeHistoryDrawer();
            showToast('Snapshot restored', 'success');
        });

        return card;
    };

    body.innerHTML = '';

    if (favourites.length > 0) {
        const lbl = document.createElement('div');
        lbl.className = 'history-section-label';
        lbl.textContent = '\u2B50 Favourites';
        body.appendChild(lbl);
        favourites.forEach(e => body.appendChild(makeCard(e)));
    }

    if (recents.length > 0) {
        const lbl = document.createElement('div');
        lbl.className = 'history-section-label';
        lbl.textContent = favourites.length > 0 ? 'Recent' : 'Snapshots';
        body.appendChild(lbl);
        recents.forEach(e => body.appendChild(makeCard(e)));
    }
}

function openHistoryDrawer() {
    renderHistoryPanel();
    document.getElementById('historyDrawer').classList.add('open');
    document.getElementById('historyOverlay').classList.add('open');
    const btn = document.getElementById('historyToggleBtn');
    if (btn) btn.classList.add('active');
}

function closeHistoryDrawer() {
    document.getElementById('historyDrawer').classList.remove('open');
    document.getElementById('historyOverlay').classList.remove('open');
    const btn = document.getElementById('historyToggleBtn');
    if (btn) btn.classList.remove('active');
}

(function initHistory() {
    const toggleBtn = document.getElementById('historyToggleBtn');
    const closeBtn  = document.getElementById('historyCloseBtn');
    const overlay   = document.getElementById('historyOverlay');
    const saveBtn   = document.getElementById('saveSnapshot');
    const saveBtnM  = document.getElementById('saveSnapshotMobile');

    if (toggleBtn) toggleBtn.addEventListener('click', () => {
        document.getElementById('historyDrawer').classList.contains('open')
            ? closeHistoryDrawer()
            : openHistoryDrawer();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeHistoryDrawer);
    if (overlay)  overlay.addEventListener('click', closeHistoryDrawer);

    const doSave = () => {
        historyManager.save();
        renderHistoryPanel();
        showToast('Snapshot saved', 'success');
    };
    if (saveBtn)  saveBtn.addEventListener('click', doSave);
    if (saveBtnM) saveBtnM.addEventListener('click', doSave);

    renderHistoryPanel();
})();
