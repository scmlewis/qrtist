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
import { getLogoPresetDataUrl } from './design/logo.js';
import { renderTemplates } from './design/templates.js';
import './design/renderer.js';
import { initPanels } from './ui/panels.js';
import { initMenu } from './ui/menu.js';
import { initAnimations } from './ui/animations.js';
import { initScanner } from './features/scanner.js';

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
renderTemplates({ onApply: (t) => applyTemplate(t) });

initPanels(deps);
initMenu(deps);
initAnimations();
initScanner();

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

