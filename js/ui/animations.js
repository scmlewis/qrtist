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

    const DURATION = 300;

    function initOpenState(details, body) {
        if (details.open) {
            details.classList.add('acc-open');
            body.style.maxHeight = body.scrollHeight + 'px';
        }
    }

    panels.forEach(panel => panel.querySelectorAll('details').forEach((details) => {
        const body = details.querySelector('.acc-body');
        const summary = details.querySelector('summary');
        if (!body || !summary) return;

        initOpenState(details, body);

        summary.addEventListener('click', (e) => {
            e.preventDefault();
            if (details.classList.contains('acc-open')) {
                body.style.maxHeight = body.scrollHeight + 'px';
                requestAnimationFrame(() => {
                    body.style.maxHeight = '0';
                });
                details.classList.remove('acc-open');
                setTimeout(() => {
                    details.removeAttribute('open');
                }, DURATION);
            } else {
                details.setAttribute('open', '');
                details.classList.add('acc-open');
                body.style.maxHeight = body.scrollHeight + 'px';
                summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
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
