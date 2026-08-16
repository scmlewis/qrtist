import { st } from '../core/state.js';
import { frameBtns } from '../core/dom.js';

const ACTIVE_CLASSES = ['selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30'];
const INACTIVE_CLASSES = ['border', 'border-gray-200', 'dark:border-gray-600'];

function setActive(btn, active) {
    if (active) {
        btn.classList.remove(...INACTIVE_CLASSES);
        btn.classList.add(...ACTIVE_CLASSES);
    } else {
        btn.classList.remove(...ACTIVE_CLASSES);
        btn.classList.add(...INACTIVE_CLASSES);
    }
}

export function updateShapeSelection() {
    document.querySelectorAll('.shape-btn').forEach(btn => {
        setActive(btn, btn.getAttribute('data-pattern') === st.currentPattern);
    });
}

export function updateCornerSelection() {
    document.querySelectorAll('#outerCornerGrid .corner-btn').forEach(btn => {
        setActive(btn, btn.getAttribute('data-outer') === st.currentOuterCorner);
    });
    document.querySelectorAll('#innerCornerGrid .corner-btn').forEach(btn => {
        setActive(btn, btn.getAttribute('data-inner') === st.currentInnerCorner);
    });
}

export function updateFrameSelection() {
    frameBtns.forEach(btn => {
        setActive(btn, btn.getAttribute('data-frame') === st.selectedFrame);
    });
}

export function updateLogoSelection() {
    document.querySelectorAll('.logo-btn').forEach(btn => {
        const active = btn.getAttribute('data-logo') === st.currentLogoPreset;
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
