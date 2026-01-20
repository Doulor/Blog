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

    // gallery navigation
    group: [], // Array<{ src: string, alt?: string, caption?: string, type?: string }>
    index: -1,
  };

  function isDirectVideoUrl(url) {
    if (!url) return false;
    return /\.(mp4|webm|ogg|mov|m4v|m3u8|mpd)(\?|#|$)/i.test(String(url));
  }

  function getVideoMimeType(url) {
    const src = String(url || '').split('?')[0].split('#')[0].toLowerCase();
    if (src.endsWith('.mp4') || src.endsWith('.m4v')) return 'video/mp4';
    if (src.endsWith('.webm')) return 'video/webm';
    if (src.endsWith('.ogg')) return 'video/ogg';
    if (src.endsWith('.mov')) return 'video/quicktime';
    if (src.endsWith('.m3u8')) return 'application/x-mpegURL';
    if (src.endsWith('.mpd')) return 'application/dash+xml';
    return '';
  }

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
    // Inject styles for fixed navigation buttons
    const style = document.createElement('style');
    style.textContent = `
      #mizuki-lightbox .mizuki-lightbox__nav {
        position: fixed;
        top: 50%;
        transform: translateY(-50%);
        z-index: 1001; /* Ensure above image */
        margin: 0;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        transition: background 0.2s, opacity 0.2s;
      }
      #mizuki-lightbox .mizuki-lightbox__nav:hover {
        background: rgba(0, 0, 0, 0.7);
      }
      #mizuki-lightbox .mizuki-lightbox__nav:disabled {
        opacity: 0.2;
        cursor: not-allowed;
      }
      #mizuki-lightbox .mizuki-lightbox__nav--prev {
        left: 20px;
      }
      #mizuki-lightbox .mizuki-lightbox__nav--next {
        right: 20px;
      }
      /* Adjust for mobile if needed */
      @media (max-width: 768px) {
        #mizuki-lightbox .mizuki-lightbox__nav {
          width: 40px;
          height: 40px;
          font-size: 20px;
        }
        #mizuki-lightbox .mizuki-lightbox__nav--prev {
          left: 10px;
        }
        #mizuki-lightbox .mizuki-lightbox__nav--next {
          right: 10px;
        }
      }
    `;
    document.head.appendChild(style);

    root.innerHTML = `
      <div class="mizuki-lightbox__backdrop" data-lb-close></div>
      <figure class="mizuki-lightbox__panel" role="dialog" aria-modal="true" data-lb-close>
        <button class="mizuki-lightbox__nav mizuki-lightbox__nav--prev" type="button" aria-label="上一张" data-lb-prev>‹</button>
        <button class="mizuki-lightbox__nav mizuki-lightbox__nav--next" type="button" aria-label="下一张" data-lb-next>›</button>
        <button class="mizuki-lightbox__close" type="button" aria-label="关闭" data-lb-close>×</button>
        <img class="mizuki-lightbox__img" alt="" />
        <div class="mizuki-lightbox__video" hidden></div>
        <div class="mizuki-lightbox__caption" aria-live="polite"></div>
      </figure>
    `;

    document.body.appendChild(root);
    return root;
  }

  function setNavVisibility(root) {
    const prev = root.querySelector('[data-lb-prev]');
    const next = root.querySelector('[data-lb-next]');
    const hasGroup = Array.isArray(state.group) && state.group.length > 1;
    const canPrev = hasGroup && state.index > 0;
    const canNext = hasGroup && state.index < state.group.length - 1;

    if (prev instanceof HTMLButtonElement) {
      prev.style.display = hasGroup ? '' : 'none';
      prev.disabled = !canPrev;
      prev.setAttribute('aria-disabled', String(!canPrev));
    }
    if (next instanceof HTMLButtonElement) {
      next.style.display = hasGroup ? '' : 'none';
      next.disabled = !canNext;
      next.setAttribute('aria-disabled', String(!canNext));
    }
  }

  function preload(src) {
    if (!src) return;
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = src;
  }

  function renderCurrent() {
    const root = document.getElementById('mizuki-lightbox');
    if (!root) return;
    const img = getImgEl(root);
    const cap = root.querySelector('.mizuki-lightbox__caption');
    if (!img || !(cap instanceof HTMLElement)) return;

    const item = state.group[state.index];
    if (!item) return;

    img.alt = item.alt || '';
    cap.textContent = item.caption || '';

    const isVideo = item.type === 'video';
    clearVideo(root);

    if (isVideo) {
      img.style.display = 'none';
      resetTransform(root);
      renderVideo(root, item.src);
      setNavVisibility(root);
      requestAnimationFrame(() => updateNavPosition(root));
      return;
    }

    img.style.display = '';
    img.removeAttribute('src');
    img.removeAttribute('srcset');
    resetTransform(root);
    img.src = item.src;

    // preload neighbors
    preload(state.group[state.index - 1]?.src);
    preload(state.group[state.index + 1]?.src);

    setNavVisibility(root);

    // 让导航按钮跟随图片两侧位置（图片加载/布局后再计算更准）
    const settle = () => updateNavPosition(root);
    if (img.complete) {
      requestAnimationFrame(settle);
    } else {
      img.addEventListener('load', () => requestAnimationFrame(settle), { once: true });
    }
  }

  function go(delta) {
    if (!state.open) return;
    if (!Array.isArray(state.group) || state.group.length === 0) return;
    const next = clamp(state.index + delta, 0, state.group.length - 1);
    if (next === state.index) return;
    state.index = next;
    renderCurrent();
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function getImgEl(root) {
    const img = root.querySelector('.mizuki-lightbox__img');
    return img instanceof HTMLImageElement ? img : null;
  }

  function getVideoBox(root) {
    const box = root.querySelector('.mizuki-lightbox__video');
    return box instanceof HTMLElement ? box : null;
  }

  function clearVideo(root) {
    const box = getVideoBox(root);
    if (!box) return;
    box.innerHTML = '';
    box.hidden = true;
  }

  function renderVideo(root, src) {
    const box = getVideoBox(root);
    if (!box) return;
    box.hidden = false;
    box.innerHTML = '';

    if (isDirectVideoUrl(src)) {
      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.className = 'mizuki-lightbox__video-player';
      const source = document.createElement('source');
      source.src = src;
      const mime = getVideoMimeType(src);
      if (mime) source.type = mime;
      video.appendChild(source);
      box.appendChild(video);
    } else {
      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.className = 'mizuki-lightbox__video-frame';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      box.appendChild(iframe);
    }
  }

  function applyTransform(root) {
    const img = getImgEl(root);
    if (!img) return;
    img.style.transform = `translate3d(${state.tx}px, ${state.ty}px, 0) scale(${state.scale})`;
    img.style.cursor = state.scale > 1 ? (state.dragging ? 'grabbing' : 'grab') : 'zoom-in';
  }

  function updateNavPosition(root) {
    const img = getImgEl(root);
    const videoBox = getVideoBox(root);
    const targetEl = videoBox && !videoBox.hidden ? videoBox : img;
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // 按钮距离图片边缘的间距
    const gap = 80;
    const prevLeft = Math.max(12, Math.round(rect.left - gap));
    const nextRight = Math.max(12, Math.round(window.innerWidth - rect.right - gap));

    root.style.setProperty('--mizuki-lb-prev-left', `${prevLeft}px`);
    root.style.setProperty('--mizuki-lb-next-right', `${nextRight}px`);
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

  function openLightbox({ src, alt, caption, group, index, type }) {
    const root = ensureDom();
    const img = root.querySelector('.mizuki-lightbox__img');
    const cap = root.querySelector('.mizuki-lightbox__caption');
    if (!(img instanceof HTMLImageElement) || !(cap instanceof HTMLElement)) return;

    root.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('mizuki-lightbox-open');

    state.open = true;

  state.group = Array.isArray(group) && group.length ? group : [{ src, alt, caption, type: type || 'image' }];
  state.index = typeof index === 'number' && index >= 0 ? index : 0;

    // 初始化交互样式（避免首次打开没有 transform 属性）
    img.style.transformOrigin = 'center center';
    img.style.willChange = 'transform';
    img.style.transition = 'transform 120ms ease-out';

  img.alt = '';
  cap.textContent = '';

    // reset before set src to avoid flashing old content
    img.removeAttribute('src');
    img.removeAttribute('srcset');

    resetTransform(root);

  renderCurrent();

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

    // 初次打开时也更新一次按钮位置
    requestAnimationFrame(() => updateNavPosition(root));

    // 视口变化（以及旋转/缩放）时让按钮继续贴着图片
    if (!window.__mizukiLightboxResizeBound__) {
      window.__mizukiLightboxResizeBound__ = true;
      window.addEventListener('resize', () => {
        const r = document.getElementById('mizuki-lightbox');
        if (!r || r.getAttribute('aria-hidden') === 'true') return;
        updateNavPosition(r);
      }, { passive: true });
    }
  }

  function closeLightbox() {
    const root = document.getElementById('mizuki-lightbox');
    if (!root) return;
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('mizuki-lightbox-open');

    state.open = false;
  state.group = [];
  state.index = -1;

    const img = root.querySelector('.mizuki-lightbox__img');
    if (img instanceof HTMLImageElement) {
      img.removeAttribute('src');
      img.removeAttribute('srcset');
      img.style.transform = '';
      img.style.display = '';
    }

    clearVideo(root);

    resetTransform(root);
  }

  function bindOnce() {
    if (window[STATE_KEY]) return;
    window[STATE_KEY] = true;

  // Click to open (delegated)
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      // Prev/Next
      if (t.closest('[data-lb-prev]')) {
        e.preventDefault();
        go(-1);
        return;
      }
      if (t.closest('[data-lb-next]')) {
        e.preventDefault();
        go(1);
        return;
      }

      // Close behaviors
      // 注意：panel 上也会带 data-lb-close，用于“点图片外边关闭”。
      // 但点击图片本身不应关闭。
      if (t.closest('[data-lb-close]') && !t.closest('.mizuki-lightbox__img')) {
        if (t.closest('.mizuki-lightbox__video')) return;
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

      // 收集同一组图片：优先找最近的容器（moment-images / markdown-content / 自定义容器都可）
      const container = trigger.closest('.moment-images') || trigger.closest('.markdown-content') || trigger.parentElement;
      const anchors = container ? Array.from(container.querySelectorAll('[data-lightbox-src]')) : [trigger];
      const group = anchors
        .map((el) => {
          if (!(el instanceof Element)) return null;
          const s = normalizeSrc(el.getAttribute('data-lightbox-src') || '');
          if (!s) return null;
          const im = el.querySelector('img');
          const inferredType = el.getAttribute('data-lightbox-type') || (isDirectVideoUrl(s) ? 'video' : 'image');
          return {
            src: s,
            alt: im instanceof HTMLImageElement ? im.alt : '',
            caption: el.getAttribute('data-lightbox-caption') || '',
            type: inferredType,
          };
        })
        .filter(Boolean);

      const index = Math.max(0, anchors.indexOf(trigger));
  const type = trigger.getAttribute('data-lightbox-type') || (isDirectVideoUrl(src) ? 'video' : 'image');
      openLightbox({ src, alt, caption, group, index, type });
    }, true);

    // Mouse wheel to zoom (only when open).
    // Use { passive: false } to be able to preventDefault() and stop page scroll.
    document.addEventListener('wheel', (e) => {
      if (!state.open) return;
      const root = document.getElementById('mizuki-lightbox');
      if (!root || root.getAttribute('aria-hidden') === 'true') return;

  const img = getImgEl(root);
  if (!img || img.style.display === 'none') return;

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
  if (!img || img.style.display === 'none') return;
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
      if (!state.open) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    });

    // Swup content replaced: no-op (delegated handler still works), but ensure overlay exists
    document.addEventListener('swup:contentReplaced', () => {
      ensureDom();
    });
  }

  bindOnce();
})();
