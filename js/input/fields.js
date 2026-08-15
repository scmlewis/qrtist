import { qrTypeConfig } from './types.js';

export function renderInputFields(deps, elements) {
    const refs = elements || { qrType: document.getElementById('qrType'), inputFields: document.getElementById('inputFields') };
    const { render, renderDebounced, capture, captureDebounced } = deps;
    const type = refs.qrType.value;
    const config = qrTypeConfig[type];
    const inputFields = refs.inputFields;
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
            select.addEventListener('change', () => { render(); capture(); });
            wrapper.appendChild(select);
        } else {
            const input = document.createElement('input');
            input.id = field.id;
            input.type = field.type;
            input.placeholder = field.placeholder;
            input.value = field.value;
            if (field.help) input.title = field.help;
            input.className = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition';
            input.addEventListener('input', () => { renderDebounced(); captureDebounced(); });
            input.addEventListener('change', () => { render(); capture(); });
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

export function getInputValues(elements) {
    const refs = elements || { qrType: document.getElementById('qrType') };
    const type = refs.qrType.value;
    const config = qrTypeConfig[type];
    const values = {};
    config.fields.forEach(field => {
        const element = document.getElementById(field.id);
        values[field.id] = element ? element.value : '';
    });
    return values;
}
