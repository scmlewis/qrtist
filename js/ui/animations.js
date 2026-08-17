function initStaggerAnimation() {
    const panels = document.querySelectorAll('.grid-layout > .panel-card');
    if (panels.length) {
        panels.forEach((panel, i) => {
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(12px)';
            panel.style.transition = `opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)`;
            panel.style.transitionDelay = `${i * 80}ms`;
            requestAnimationFrame(() => {
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
            });
        });
    }
}

function initAccordionAnimations() {
    const panels = document.querySelectorAll('#panelDesign, #panelData');
    if (!panels.length) return;

    panels.forEach(panel => panel.querySelectorAll('details').forEach((details) => {
        const body = details.querySelector('.acc-body');
        const summary = details.querySelector('summary');
        if (!body || !summary) return;

        // Wrap the body so height can be animated with CSS Grid (0fr -> 1fr)
        // instead of measuring scrollHeight in JS — robust even inside hidden panels.
        // The grid item itself must stay padding-free (Tailwind padding is moved to
        // an inner element) so its min-content height is 0 and the track can collapse fully.
        const wrap = document.createElement('div');
        wrap.className = 'acc-body-wrap';
        body.parentNode.insertBefore(wrap, body);
        wrap.appendChild(body);

        const inner = document.createElement('div');
        // Carry only the Tailwind spacing/padding utilities — NOT the `acc-body`
        // hook class, otherwise the inner would inherit `opacity: 0` and render blank.
        inner.className = body.className.replace('acc-body', '').trim();
        body.className = 'acc-body';      // keep only the hook class (CSS adds overflow/min-height)
        while (body.firstChild) inner.appendChild(body.firstChild);
        body.appendChild(inner);

        // Reflect initial state. Keep the native `open` attribute present so the
        // browser keeps the content in the DOM; visibility is driven by the
        // `.acc-open` class + CSS grid, never by inline max-height.
        const initiallyOpen = details.hasAttribute('open');
        details.setAttribute('open', '');
        if (initiallyOpen) {
            details.classList.add('acc-open');
        }

        summary.addEventListener('click', (e) => {
            e.preventDefault();
            details.classList.toggle('acc-open');
        });
    }));
}

export function initAnimations() {
    if (document.readyState === 'complete') {
        initStaggerAnimation();
    } else {
        window.addEventListener('load', initStaggerAnimation);
    }
    initAccordionAnimations();
}
