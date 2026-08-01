/* =========================================================
   ORCHID TECH CLUB — FULLSCREEN ALBUM / GALLERY VIEWER
   Reusable across Gallery Albums and Project image galleries.
   Injects its own DOM on first use (no markup needed in the
   host page). Features: fullscreen overlay, zoom in/out/reset,
   pinch-zoom (touch), prev/next navigation, keyboard nav
   (desktop), swipe nav (mobile), thumbnail strip.
   ========================================================= */

const OTCAlbumViewer = (function () {
  let images = [];
  let currentIndex = 0;
  let title = '';
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let built = false;

  // pinch state
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  // pan state
  let isPanning = false;
  let panStartX = 0, panStartY = 0, panOrigX = 0, panOrigY = 0;
  // swipe state
  let touchStartX = 0, touchStartY = 0;

  function el(id) { return document.getElementById(id); }

  function ensureBuilt() {
    if (built) return;
    built = true;
    const overlay = document.createElement('div');
    overlay.className = 'album-viewer-overlay';
    overlay.id = 'album-viewer-overlay';
    overlay.innerHTML = `
      <div class="album-viewer-topbar">
        <div><span class="title" id="viewer-title"></span></div>
        <div style="display:flex;gap:0;">
          <button class="album-viewer-zoom-btn" id="viewer-zoom-out" title="Zoom out"><i class="fas fa-magnifying-glass-minus"></i></button>
          <button class="album-viewer-zoom-btn" id="viewer-zoom-reset" title="Reset zoom"><i class="fas fa-compress"></i></button>
          <button class="album-viewer-zoom-btn" id="viewer-zoom-in" title="Zoom in"><i class="fas fa-magnifying-glass-plus"></i></button>
          <button class="album-viewer-close" id="viewer-close" title="Close"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="album-viewer-stage" id="viewer-stage">
        <button class="album-viewer-nav prev" id="viewer-prev"><i class="fas fa-chevron-left"></i></button>
        <div class="viewer-img-wrap" id="viewer-img-wrap">
          <img id="viewer-img" src="" alt="">
        </div>
        <button class="album-viewer-nav next" id="viewer-next"><i class="fas fa-chevron-right"></i></button>
      </div>
      <div class="album-viewer-caption" id="viewer-caption"></div>
      <div class="album-viewer-thumbs" id="viewer-thumbs"></div>`;
    document.body.appendChild(overlay);

    el('viewer-close').addEventListener('click', close);
    el('viewer-next').addEventListener('click', next);
    el('viewer-prev').addEventListener('click', prev);
    el('viewer-zoom-in').addEventListener('click', zoomIn);
    el('viewer-zoom-out').addEventListener('click', zoomOut);
    el('viewer-zoom-reset').addEventListener('click', resetTransform);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKeydown);
    bindGestures();
  }

  function resetTransform() {
    scale = 1; translateX = 0; translateY = 0;
    applyTransform();
  }

  function applyTransform() {
    const img = el('viewer-img');
    if (img) img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }

  function renderCurrent() {
    if (!images.length) return;
    const img = images[currentIndex];
    el('viewer-img').src = typeof img === 'string' ? img : img.url;
    el('viewer-caption').textContent = typeof img === 'string' ? '' : (img.caption || '');
    el('viewer-title').textContent = `${title} — ${currentIndex + 1} / ${images.length}`;
    resetTransform();
    renderThumbs();
  }

  function renderThumbs() {
    const wrap = el('viewer-thumbs');
    if (!wrap) return;
    if (images.length < 2) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = images.map((img, idx) => `
      <img src="${typeof img === 'string' ? img : img.url}" class="${idx === currentIndex ? 'active' : ''}" data-idx="${idx}">`).join('');
    wrap.querySelectorAll('img').forEach(t => {
      t.addEventListener('click', () => { currentIndex = parseInt(t.dataset.idx); renderCurrent(); });
    });
  }

  function next() {
    if (!images.length) return;
    currentIndex = (currentIndex + 1) % images.length;
    renderCurrent();
  }
  function prev() {
    if (!images.length) return;
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    renderCurrent();
  }

  function zoomIn() { scale = Math.min(scale * 1.4, 6); applyTransform(); }
  function zoomOut() { scale = Math.max(scale / 1.4, 1); if (scale === 1) { translateX = 0; translateY = 0; } applyTransform(); }

  function onKeydown(e) {
    const overlay = el('album-viewer-overlay');
    if (!overlay || !overlay.classList.contains('show')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === '+') zoomIn();
    else if (e.key === '-') zoomOut();
  }

  function dist(t1, t2) {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  }

  function bindGestures() {
    const wrap = el('viewer-img-wrap');
    if (!wrap || wrap.dataset.bound) return;
    wrap.dataset.bound = '1';

    // Mouse wheel zoom (desktop)
    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn(); else zoomOut();
    }, { passive: false });

    // Mouse drag to pan when zoomed
    wrap.addEventListener('mousedown', (e) => {
      if (scale <= 1) return;
      isPanning = true;
      panStartX = e.clientX; panStartY = e.clientY;
      panOrigX = translateX; panOrigY = translateY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      translateX = panOrigX + (e.clientX - panStartX);
      translateY = panOrigY + (e.clientY - panStartY);
      applyTransform();
    });
    window.addEventListener('mouseup', () => { isPanning = false; });

    // Touch: pinch-zoom + swipe navigation + pan
    wrap.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        pinchStartDist = dist(e.touches[0], e.touches[1]);
        pinchStartScale = scale;
      } else if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        if (scale > 1) {
          isPanning = true;
          panStartX = touchStartX; panStartY = touchStartY;
          panOrigX = translateX; panOrigY = translateY;
        }
      }
    }, { passive: true });

    wrap.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const newDist = dist(e.touches[0], e.touches[1]);
        scale = Math.min(Math.max(pinchStartScale * (newDist / pinchStartDist), 1), 6);
        applyTransform();
      } else if (e.touches.length === 1 && isPanning && scale > 1) {
        translateX = panOrigX + (e.touches[0].clientX - panStartX);
        translateY = panOrigY + (e.touches[0].clientY - panStartY);
        applyTransform();
      }
    }, { passive: false });

    wrap.addEventListener('touchend', (e) => {
      isPanning = false;
      if (scale === 1 && e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) next(); else prev();
        }
      }
    });

    // Double-click / double-tap to toggle zoom
    let lastTap = 0;
    wrap.addEventListener('click', (e) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        if (scale > 1) resetTransform(); else { scale = 2.2; applyTransform(); }
      }
      lastTap = now;
    });
  }

  function open(albumTitle, imgs, startIndex) {
    ensureBuilt();
    title = albumTitle || '';
    images = imgs || [];
    currentIndex = startIndex || 0;
    const overlay = el('album-viewer-overlay');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    renderCurrent();
  }

  function close() {
    const overlay = el('album-viewer-overlay');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  return { open, close, next, prev };
})();
