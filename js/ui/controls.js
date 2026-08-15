import { st } from '../core/state.js';
import { frameBtns } from '../core/dom.js';

export function updateShapeSelection() {
    document.querySelectorAll('.shape-btn').forEach(btn => {
        const active = btn.getAttribute('data-pattern') === st.currentPattern;
        if (active) {
            btn.classList.remove('border', 'border-gray-200', 'dark:border-gray-600');
            btn.classList.add('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
        } else {
            btn.classList.remove('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
            btn.classList.add('border', 'border-gray-200', 'dark:border-gray-600');
        }
    });
}

export function updateCornerSelection() {
    document.querySelectorAll('#outerCornerGrid .corner-btn').forEach(btn => {
        const active = btn.getAttribute('data-outer') === st.currentOuterCorner;
        if (active) {
            btn.classList.remove('border', 'border-gray-200', 'dark:border-gray-600');
            btn.classList.add('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
        } else {
            btn.classList.remove('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
            btn.classList.add('border', 'border-gray-200', 'dark:border-gray-600');
        }
    });
    document.querySelectorAll('#innerCornerGrid .corner-btn').forEach(btn => {
        const active = btn.getAttribute('data-inner') === st.currentInnerCorner;
        if (active) {
            btn.classList.remove('border', 'border-gray-200', 'dark:border-gray-600');
            btn.classList.add('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
        } else {
            btn.classList.remove('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
            btn.classList.add('border', 'border-gray-200', 'dark:border-gray-600');
        }
    });
}

export function updateFrameSelection() {
    frameBtns.forEach(btn => {
        if (btn.getAttribute('data-frame') === st.selectedFrame) {
            btn.classList.remove('border', 'border-gray-200', 'dark:border-gray-600');
            btn.classList.add('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
        } else {
            btn.classList.remove('selected', 'border-2', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
            btn.classList.add('border', 'border-gray-200', 'dark:border-gray-600');
        }
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
