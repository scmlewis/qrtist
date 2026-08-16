import { toastContainer } from './dom.js';
import { escapeHtml } from './sanitize.js';

export function showToast(message, type = 'info', duration = 3200) {
    const container = toastContainer;
    if (!container) return;
    const icons = { success: '&#10003;', error: '&#10007;', warn: '&#9888;', info: '&#8505;' };
    const icon = icons[type] || icons.info;
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<span aria-hidden="true">' + icon + '</span><span>' + escapeHtml(message) + '</span>';
    container.appendChild(toast);
    const fadeOut = () => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 290);
    };
    setTimeout(fadeOut, duration);
}
