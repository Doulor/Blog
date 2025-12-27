// public/js/lightbox.js

function createLightbox(src, alt) {
  // 如果已存在灯箱，则不再创建
  if (document.querySelector('.global-lightbox-overlay')) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'global-lightbox-overlay fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 opacity-0 transition-opacity duration-200';
  overlay.innerHTML = `
    <div class="relative max-w-6xl w-full max-h-[90vh] flex items-center justify-center">
      <img src="${src}" alt="${alt || ''}" class="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl" />
      <button aria-label="close" class="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 text-white text-2xl leading-none flex items-center justify-center hover:bg-black/80 transition" style="cursor:pointer">&times;</button>
    </div>
  `;

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
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const src = lightboxTrigger.dataset.lightboxSrc;
    const alt = lightboxTrigger.dataset.lightboxAlt || '';
    
    if (src) {
      createLightbox(src, alt);
    }
  }
}, true); // 使用捕获阶段以确保最高优先级
