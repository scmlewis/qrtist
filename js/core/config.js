import { st } from './state.js';
import { qrType, fgColorInput, fgColorText, bgColorInput, bgColorText, frameColorInput, frameColorTextInput, frameTextInput, qrSize, qrSizeValue, logoSize, logoSizeValue, logoMargin, logoMarginValue, logoColorInput, logoColorText, logoControls, customLogoBtn, logoPreview, logoImg } from './dom.js';
import { renderInputFields, getInputValues } from '../input/fields.js';
import { updateShapeSelection, updateCornerSelection, updateFrameSelection, updateLogoSelection } from '../ui/controls.js';

export function getConfig() {
    const type = qrType.value;
    const values = getInputValues();
    return {
        type: type,
        values: JSON.parse(JSON.stringify(values)),
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
        logoDataUrl: st.currentLogoPreset === 'custom' ? st.logoDataUrl : null,
        frame: st.selectedFrame,
        frameColor: frameColorInput.value,
        frameText: frameTextInput.value
    };
}

export function applyConfig(cfg, deps) {
    if (!cfg) return;
    qrType.value = cfg.type || 'url';
    renderInputFields(deps);
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
    st.currentPattern = cfg.pattern || 'square';
    st.currentOuterCorner = cfg.outerCorner || 'square';
    st.currentInnerCorner = cfg.innerCorner || 'square';
    st.useGradient = cfg.useGradient || false;
    st.gradientColor2 = cfg.gradientColor2 || '#3b82f6';
    const gradColor2Input = document.getElementById('gradColor2');
    const gradColor2Text = document.getElementById('gradColor2Text');
    const gradientToggleBtn = document.getElementById('gradientToggle');
    const gradColor2Row = document.getElementById('gradColor2Row');
    if (gradColor2Input) gradColor2Input.value = st.gradientColor2;
    if (gradColor2Text) gradColor2Text.value = st.gradientColor2;
    if (gradientToggleBtn) { gradientToggleBtn.setAttribute('aria-pressed', st.useGradient); gradientToggleBtn.classList.toggle('active', st.useGradient); }
    if (gradColor2Row) gradColor2Row.classList.toggle('hidden', !st.useGradient);
    st.currentQRSize = cfg.size || 300;
    qrSize.value = st.currentQRSize;
    qrSizeValue.textContent = st.currentQRSize;
    logoSize.value = cfg.logoSize || 20;
    logoSizeValue.textContent = cfg.logoSize || 20;
    logoMargin.value = cfg.logoMargin || 10;
    logoMarginValue.textContent = cfg.logoMargin || 10;
    st.selectedFrame = cfg.frame || 'none';
    frameColorInput.value = cfg.frameColor || '#000000';
    frameColorTextInput.value = cfg.frameColor || '#000000';
    frameTextInput.value = cfg.frameText || '';
    st.currentLogoPreset = cfg.logoPreset || 'none';
    st.logoColor = cfg.logoColor || '#000000';
    st.logoDataUrl = cfg.logoDataUrl || null;
    if (logoColorInput) logoColorInput.value = st.logoColor;
    if (logoColorText) logoColorText.value = st.logoColor;
    updateShapeSelection();
    updateCornerSelection();
    updateFrameSelection();
    updateLogoSelection();
    logoControls.classList.toggle('hidden', st.currentLogoPreset === 'none');
    if (st.currentLogoPreset === 'custom' && st.logoDataUrl) {
        customLogoBtn.style.display = 'flex';
        customLogoBtn.classList.remove('hidden');
        logoPreview.classList.remove('hidden');
        logoImg.src = st.logoDataUrl;
    } else {
        customLogoBtn.style.display = '';
        customLogoBtn.classList.add('hidden');
        logoPreview.classList.add('hidden');
    }
    if (deps && deps.render) deps.render();
}
