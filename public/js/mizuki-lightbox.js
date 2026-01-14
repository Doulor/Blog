/*
  Mizuki Lightbox (minimal, swup-safe)
  - Delegated click on [data-lightbox-src]
  - ESC / click backdrop to close
  - Wheel / pinch-gesture not implemented; keep simple + stable.
*/

(function () {
  const STATE_KEY = '__mizukiLightboxBound__';

  function normalizeSrc(raw) {
    if (!raw) return '';
    const s = String(raw).trim();
    // Support url("...")
    const urlMatch = s.match(/^url\((['"]?)(.*?)\1\)$/i);
    if (urlMatch) return urlMatch[2];
    // Support markdown style [alt](http...)
    const mdMatch = s.match(/\((https?:[^)]+)\)/i);
    if (mdMatch) return mdMatch[1];
    return s;
  }

  function ensureDom() {
    let root = document.getElementById('mizuki-lightbox');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'mizuki-lightbox';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="mizuki-lightbox__backdrop" data-lb-close></div>
      <figure class="mizuki-lightbox__panel" role="dialog" aria-modal="true">
        <button class="mizuki-lightbox__close" type="button" aria-label="关闭" data-lb-close>×</button>
        <img class="mizuki-lightbox__img" alt="" />
        <div class="mizuki-lightbox__caption" aria-live="polite"></div>
      </figure>
    `;

    document.body.appendChild(root);
    return root;
  }

  function openLightbox({ src, alt, caption }) {
    const root = ensureDom();
    const img = root.querySelector('.mizuki-lightbox__img');
    const cap = root.querySelector('.mizuki-lightbox__caption');
    if (!(img instanceof HTMLImageElement) || !(cap instanceof HTMLElement)) return;

    root.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('mizuki-lightbox-open');

    img.alt = alt || '';
    cap.textContent = caption || '';

    // reset before set src to avoid flashing old content
    img.removeAttribute('src');
    img.removeAttribute('srcset');

    img.src = src;

    // Focus close button for accessibility
    const closeBtn = root.querySelector('.mizuki-lightbox__close');
    if (closeBtn instanceof HTMLButtonElement) closeBtn.focus();
  }

  function closeLightbox() {
    const root = document.getElementById('mizuki-lightbox');
    if (!root) return;
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('mizuki-lightbox-open');

    const img = root.querySelector('.mizuki-lightbox__img');
    if (img instanceof HTMLImageElement) {
      img.removeAttribute('src');
      img.removeAttribute('srcset');
    }
  }

  function bindOnce() {
    if (window[STATE_KEY]) return;
    window[STATE_KEY] = true;

    // Click to open (delegated)
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      // Close behaviors
      if (t.closest('[data-lb-close]')) {
        e.preventDefault();
        closeLightbox();
        return;
      }

      const trigger = t.closest('[data-lightbox-src]');
      if (!trigger) return;

      // If it's a link, prevent navigation (lightbox owns this click)
      if (trigger instanceof HTMLAnchorElement) e.preventDefault();

      const src = normalizeSrc(trigger.getAttribute('data-lightbox-src') || '');
      if (!src) return;

      const img = trigger.querySelector('img');
      const alt = img instanceof HTMLImageElement ? img.alt : '';
      const caption = trigger.getAttribute('data-lightbox-caption') || '';

      openLightbox({ src, alt, caption });
    }, true);

    // Esc to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });

    // Swup content replaced: no-op (delegated handler still works), but ensure overlay exists
    document.addEventListener('swup:contentReplaced', () => {
      ensureDom();
    });
  }

  bindOnce();
})();
