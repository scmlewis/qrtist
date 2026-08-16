import '../core/polyfill.js';
import { generateStyledSVG } from './render-svg.js';
import { drawFinderOuter, drawFinderInner, isFinderModule } from './finder.js';

export function drawModule(ctx, patternType, x, y, mSize) {
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

function drawFinderPattern(ctx, px, py, mSize, outerType, innerType, fgColor) {
    const sz = mSize * 7;
    const cx = sz / 2;
    const cy = sz / 2;
    const in3s = mSize * 3;

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
    drawFinderOuter(tc_ctx, 0, outerType, sz);

    tc_ctx.globalCompositeOperation = 'destination-out';
    tc_ctx.fillStyle = 'rgba(0,0,0,1)';
    drawFinderOuter(tc_ctx, mSize, outerType, sz);

    tc_ctx.globalCompositeOperation = 'source-over';
    tc_ctx.fillStyle = fgColor;
    drawFinderInner(tc_ctx, innerType, cx, cy, in3s);

    ctx.drawImage(tc, px, py);
}

window.QRCodeStyling = (function () {
    function QRCodeStyling(options) {
        this.options = options || {};
        this.canvas = null;
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
            drawFinderPattern(ctx, (c + margin) * mSize, (r + margin) * mSize, mSize, outerType, innerType, fgColor);
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
