// public/js/lightbox.js

function createLightbox(src, alt) {
  // 如果已存在灯箱，则不再创建
  if (document.querySelector('.global-lightbox-overlay')) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'global-lightbox-overlay fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 opacity-0 transition-opacity duration-200';

  // 兼容 data-lightbox-src 写成 url(...) 或 (http...) 的情况
  const normalizeSrc = (input) => {
    if (!input) return '';
    const s = String(input).trim();
    const urlMatch = s.match(/^url\((['"]?)(.+?)\1\)$/i);
    if (urlMatch) return urlMatch[2];
    const mdMatch = s.match(/\((https?:[^)]+)\)/i);
    if (mdMatch) return mdMatch[1];
    return s;
  };

  const safeSrc = normalizeSrc(src);

  const wrapper = document.createElement('div');
  wrapper.className = 'relative max-w-6xl w-full max-h-[90vh] flex items-center justify-center';

  const img = document.createElement('img');
  img.src = safeSrc;
  img.alt = alt || '';
  img.className = 'max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl';
  img.decoding = 'async';

  // 兜底：图片加载失败时给提示，避免看起来像“背景/空白”
  img.addEventListener('error', () => {
    img.alt = img.alt || '图片加载失败';
    img.style.display = 'none';
    const tip = document.createElement('div');
    tip.className = 'text-white/80 text-sm px-4 py-3 rounded-xl bg-black/40 border border-white/10';
    tip.textContent = `图片加载失败：${safeSrc}`;
    wrapper.insertBefore(tip, btn);
  }, { once: true });

  const btn = document.createElement('button');
  btn.setAttribute('aria-label', 'close');
  btn.className = 'absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 text-white text-2xl leading-none flex items-center justify-center hover:bg-black/80 transition';
  btn.style.cursor = 'pointer';
  btn.innerHTML = '&times;';

  wrapper.appendChild(img);
  wrapper.appendChild(btn);
  overlay.appendChild(wrapper);

  const remove = () => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }, 200);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') {
      remove();
    }
  };

  overlay.addEventListener('click', (e) => {
    // 点击背景或关闭按钮时关闭
    if (e.target === overlay || e.target.closest('button')) {
      remove();
    }
  });

  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);

  // 触发动画
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
  });
}

// 全局事件委托
document.addEventListener('click', (e) => {
  // 寻找被点击的、带有 `data-lightbox-src` 的最近父元素
  const lightboxTrigger = e.target.closest('[data-lightbox-src]');

  if (lightboxTrigger && lightboxTrigger instanceof HTMLElement) {
    // 只阻止默认行为（如 a 跳转），不要用 stopImmediatePropagation，避免干扰其它页面脚本
    e.preventDefault();

    const src = lightboxTrigger.dataset.lightboxSrc;
    const alt = lightboxTrigger.dataset.lightboxAlt || '';
    
    if (src) createLightbox(src, alt);
  }
}, false);
