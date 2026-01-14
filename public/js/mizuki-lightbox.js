/*
  Mizuki Lightbox (minimal, swup-safe)
  - Delegated click on [data-lightbox-src]
  - ESC / click backdrop to close
  - Wheel / pinch-gesture not implemented; keep simple + stable.
*/

(function () {
  const STATE_KEY = '__mizukiLightboxBound__';

  const ZOOM = {
    min: 1,
    max: 6,
    step: 1.12,
  };

  const state = {
    open: false,
    scale: 1,
    tx: 0,
    ty: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartTx: 0,
    dragStartTy: 0,
    imgNaturalW: 0,
    imgNaturalH: 0,
  };

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
      <figure class="mizuki-lightbox__panel" role="dialog" aria-modal="true" data-lb-close>
        <button class="mizuki-lightbox__close" type="button" aria-label="关闭" data-lb-close>×</button>
        <img class="mizuki-lightbox__img" alt="" />
        <div class="mizuki-lightbox__caption" aria-live="polite"></div>
      </figure>
    `;

    document.body.appendChild(root);
    return root;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function getImgEl(root) {
    const img = root.querySelector('.mizuki-lightbox__img');
    return img instanceof HTMLImageElement ? img : null;
  }

  function applyTransform(root) {
    const img = getImgEl(root);
    if (!img) return;
    img.style.transform = `translate3d(${state.tx}px, ${state.ty}px, 0) scale(${state.scale})`;
    img.style.cursor = state.scale > 1 ? (state.dragging ? 'grabbing' : 'grab') : 'zoom-in';
  }

  function resetTransform(root) {
    state.scale = 1;
    state.tx = 0;
    state.ty = 0;
    state.dragging = false;
    applyTransform(root);
  }

  function setScaleAtPoint(root, nextScale, clientX, clientY) {
    const img = getImgEl(root);
    if (!img) return;
    const rect = img.getBoundingClientRect();

    // 当图片还没布局出来时，直接设置 scale
    if (!rect.width || !rect.height) {
      state.scale = nextScale;
      applyTransform(root);
      return;
    }

    const prevScale = state.scale;
    if (prevScale === nextScale) return;

    // 以鼠标点为锚：缩放前后保持该点对应的图片像素不“跳”
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;

    const dx = cx - rect.width / 2;
    const dy = cy - rect.height / 2;

    // 变换关系：translate + scale，近似围绕中心缩放
    const ratio = nextScale / prevScale;
    state.tx = state.tx - dx * (ratio - 1);
    state.ty = state.ty - dy * (ratio - 1);
    state.scale = nextScale;
    applyTransform(root);
  }

  function openLightbox({ src, alt, caption }) {
    const root = ensureDom();
    const img = root.querySelector('.mizuki-lightbox__img');
    const cap = root.querySelector('.mizuki-lightbox__caption');
    if (!(img instanceof HTMLImageElement) || !(cap instanceof HTMLElement)) return;

    root.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('mizuki-lightbox-open');

    state.open = true;

    // 初始化交互样式（避免首次打开没有 transform 属性）
    img.style.transformOrigin = 'center center';
    img.style.willChange = 'transform';
    img.style.transition = 'transform 120ms ease-out';

    img.alt = alt || '';
    cap.textContent = caption || '';

    // reset before set src to avoid flashing old content
    img.removeAttribute('src');
    img.removeAttribute('srcset');

    resetTransform(root);

    img.src = src;

    // 图片加载后再解锁 transition（减少“加载中跳动”）
    const onLoaded = () => {
      state.imgNaturalW = img.naturalWidth || 0;
      state.imgNaturalH = img.naturalHeight || 0;
      img.style.transition = 'transform 120ms ease-out';
    };
    if (img.complete) {
      onLoaded();
    } else {
      img.addEventListener('load', onLoaded, { once: true });
    }

    // Focus close button for accessibility
    const closeBtn = root.querySelector('.mizuki-lightbox__close');
    if (closeBtn instanceof HTMLButtonElement) closeBtn.focus();
  }

  function closeLightbox() {
    const root = document.getElementById('mizuki-lightbox');
    if (!root) return;
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('mizuki-lightbox-open');

    state.open = false;

    const img = root.querySelector('.mizuki-lightbox__img');
    if (img instanceof HTMLImageElement) {
      img.removeAttribute('src');
      img.removeAttribute('srcset');
      img.style.transform = '';
    }

    resetTransform(root);
  }

  function bindOnce() {
    if (window[STATE_KEY]) return;
    window[STATE_KEY] = true;

  // Click to open (delegated)
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      // Close behaviors
      // 注意：panel 上也会带 data-lb-close，用于“点图片外边关闭”。
      // 但点击图片本身不应关闭。
      if (t.closest('[data-lb-close]') && !t.closest('.mizuki-lightbox__img')) {
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

    // Mouse wheel to zoom (only when open).
    // Use { passive: false } to be able to preventDefault() and stop page scroll.
    document.addEventListener('wheel', (e) => {
      if (!state.open) return;
      const root = document.getElementById('mizuki-lightbox');
      if (!root || root.getAttribute('aria-hidden') === 'true') return;

      const img = getImgEl(root);
      if (!img) return;

      // 如果滚轮事件不是发生在灯箱内，就不处理
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('#mizuki-lightbox')) return;

      e.preventDefault();

      // deltaY > 0 往下滚：缩小；<0：放大
      const zoomIn = e.deltaY < 0;
      const factor = zoomIn ? ZOOM.step : 1 / ZOOM.step;
      const next = clamp(state.scale * factor, ZOOM.min, ZOOM.max);

      // 缩回 1 时顺便归位
      if (next === 1) {
        state.scale = 1;
        state.tx = 0;
        state.ty = 0;
        applyTransform(root);
        return;
      }

      setScaleAtPoint(root, next, e.clientX, e.clientY);
    }, { passive: false });

    // Drag to pan when zoomed
    document.addEventListener('pointerdown', (e) => {
      if (!state.open) return;
      const root = document.getElementById('mizuki-lightbox');
      if (!root || root.getAttribute('aria-hidden') === 'true') return;
      if (state.scale <= 1) return;

      const t = e.target;
      if (!(t instanceof Element)) return;
      const img = getImgEl(root);
      if (!img) return;
      if (t !== img && !t.closest('.mizuki-lightbox__img')) return;

      state.dragging = true;
      state.dragStartX = e.clientX;
      state.dragStartY = e.clientY;
      state.dragStartTx = state.tx;
      state.dragStartTy = state.ty;

      try {
        img.setPointerCapture(e.pointerId);
      } catch (_) {
        // ignore
      }

      applyTransform(root);
    });

    document.addEventListener('pointermove', (e) => {
      if (!state.open) return;
      if (!state.dragging) return;
      const root = document.getElementById('mizuki-lightbox');
      if (!root) return;
      state.tx = state.dragStartTx + (e.clientX - state.dragStartX);
      state.ty = state.dragStartTy + (e.clientY - state.dragStartY);
      applyTransform(root);
    });

    const endDrag = () => {
      if (!state.dragging) return;
      state.dragging = false;
      const root = document.getElementById('mizuki-lightbox');
      if (root) applyTransform(root);
    };
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);

    // Double click to toggle zoom
    document.addEventListener('dblclick', (e) => {
      if (!state.open) return;
      const root = document.getElementById('mizuki-lightbox');
      if (!root || root.getAttribute('aria-hidden') === 'true') return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (!t.closest('#mizuki-lightbox .mizuki-lightbox__img')) return;

      e.preventDefault();
      const next = state.scale > 1 ? 1 : 2;
      if (next === 1) {
        state.scale = 1;
        state.tx = 0;
        state.ty = 0;
        applyTransform(root);
      } else {
        setScaleAtPoint(root, next, e.clientX, e.clientY);
      }
    });

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
