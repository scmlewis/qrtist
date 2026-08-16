export function initMenu(deps) {
    const banner = document.getElementById('onboardingBanner');
    const dismissBtn = document.getElementById('dismissOnboarding');
    if (banner) {
        if (!localStorage.getItem('qrtist_v1_welcomed')) {
            banner.style.display = 'block';
        }
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                banner.classList.add('banner-hiding');
                setTimeout(() => {
                    banner.style.display = 'none';
                }, 300);
                localStorage.setItem('qrtist_v1_welcomed', '1');
            });
        }
    }

    const headerMenuBtn = document.getElementById('headerMenuBtn');
    const headerMenu = document.getElementById('headerMenu');
    const resetFromMenu = document.getElementById('resetDesignFromMenu');

    if (headerMenuBtn && headerMenu) {
        headerMenu.classList.add('menu-hidden');
        headerMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = headerMenu.classList.contains('menu-visible');
            if (isOpen) {
                headerMenu.classList.remove('menu-visible');
                headerMenu.classList.add('menu-hidden');
            } else {
                headerMenu.classList.remove('menu-hidden');
                headerMenu.classList.add('menu-visible');
            }
            headerMenuBtn.setAttribute('aria-expanded', !isOpen);
            if (!isOpen) {
                const close = (ev) => {
                    if (!headerMenu.contains(ev.target) && ev.target !== headerMenuBtn) {
                        headerMenu.classList.remove('menu-visible');
                        headerMenu.classList.add('menu-hidden');
                        headerMenuBtn.setAttribute('aria-expanded', 'false');
                        document.removeEventListener('click', close);
                    }
                };
                setTimeout(() => document.addEventListener('click', close), 0);
            }
        });
    }

    if (resetFromMenu) {
        resetFromMenu.addEventListener('click', () => {
            deps.reset();
            headerMenu?.classList.remove('menu-visible');
            headerMenu?.classList.add('menu-hidden');
            headerMenuBtn?.setAttribute('aria-expanded', 'false');
        });
    }
}
