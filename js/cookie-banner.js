(function() {
    // Verificamos si ya hay preferencia guardada
    const consent = localStorage.getItem('ejez_cookie_consent');

    if (!consent) {
        // Inyectamos el HTML del banner
        const bannerHTML = `
            <div id="cookie-banner" class="cookie-banner" role="dialog" aria-live="polite" aria-label="cookieconsent">
                <div class="cookie-content">
                    <p>Utilizamos cookies para optimizar la experiencia, analizar el tráfico y mejorar nuestros servicios.</p>
                </div>
                <div class="cookie-actions">
                    <button id="cookie-reject" class="btn-ghost">Rechazar</button>
                    <button id="cookie-accept" class="btn-accent">Aceptar</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', bannerHTML);

        const banner = document.getElementById('cookie-banner');
        const btnAccept = document.getElementById('cookie-accept');
        const btnReject = document.getElementById('cookie-reject');

        // Mostrar el banner con una ligera demora para una aparición suave
        setTimeout(() => {
            banner.classList.add('visible');
        }, 500);

        btnAccept.addEventListener('click', () => {
            localStorage.setItem('ejez_cookie_consent', 'granted');
            
            // Habilitar PostHog
            if (window.posthog) {
                posthog.opt_in_capturing();
            }

            // Habilitar Google Analytics
            if (typeof gtag === 'function') {
                gtag('consent', 'update', {
                    'analytics_storage': 'granted'
                });
            }

            hideBanner(banner);
        });

        btnReject.addEventListener('click', () => {
            localStorage.setItem('ejez_cookie_consent', 'denied');
            
            // PostHog ya nace 'opt_out_capturing_by_default: true', pero por las dudas
            if (window.posthog) {
                posthog.opt_out_capturing();
            }

            hideBanner(banner);
        });
    }

    function hideBanner(banner) {
        banner.classList.remove('visible');
        setTimeout(() => {
            banner.remove();
        }, 400); // Esperar a que termine la transición
    }
})();
