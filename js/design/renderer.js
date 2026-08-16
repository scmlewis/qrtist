import '../core/polyfill.js';
import { generateStyledSVG } from './render-svg.js';
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

        const ceilSz = Math.ceil(sz);
        if (!drawFinderPattern._tc || drawFinderPattern._tc.width !== ceilSz || drawFinderPattern._tc.height !== ceilSz) {
            drawFinderPattern._tc = document.createElement('canvas');
            drawFinderPattern._tc.width = ceilSz;
            drawFinderPattern._tc.height = ceilSz;
        }
        const tc = drawFinderPattern._tc;
        const tc_ctx = tc.getContext('2d');
        tc_ctx.clearRect(0, 0, ceilSz, ceilSz);

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
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
        }
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

    window.drawModule = drawModule;
    return QRCodeStyling;
})();
