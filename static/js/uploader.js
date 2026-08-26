/* =========================================================
   ORCHID TECH CLUB — REUSABLE IMAGE UPLOAD COMPONENT
   Drag & drop, click-to-upload, multi-image, preview,
   progress bar, replace, delete, and drag-reorder.
   Used across Gallery, Projects, News, BOD, Homepage, About.
   ========================================================= */

/**
 * Create an uploader widget.
 * @param {Object} opts
 * @param {HTMLElement} opts.mount        - container element to render into
 * @param {string}      opts.folder       - R2 folder path (e.g. "gallery/2026-tech-spark")
 * @param {boolean}      [opts.multiple]  - allow multiple images (default true)
 * @param {boolean}      [opts.single]    - single-image "replace" mode (thumbnail/cover use)
 * @param {Array}        [opts.initial]   - initial images [{url, caption?, id?}] or single url string
 * @param {Function}     opts.onChange    - called with current images array (or url string in single mode) whenever it changes
 */
function OTCUploader(opts) {
  const mount = opts.mount;
  const folder = opts.folder || 'misc';
  const multiple = opts.single ? false : (opts.multiple !== false);
  const single = !!opts.single;
  let images = single
    ? (opts.initial ? [{ url: typeof opts.initial === 'string' ? opts.initial : opts.initial.url }] : [])
    : (opts.initial || []).map((i) => (typeof i === 'string' ? { url: i } : { ...i }));

  const onChange = opts.onChange || (() => {});

  function emit() {
    if (single) onChange(images[0] ? images[0].url : '');
    else onChange(images);
  }

  function render() {
    mount.innerHTML = `
      <div class="otc-uploader">
        <div class="otc-drop-zone" tabindex="0">
          <i class="fas fa-cloud-arrow-up"></i>
          <p>Drag & drop image${multiple ? 's' : ''} here or <span class="otc-browse-link">browse</span></p>
          <span class="otc-drop-hint">JPG, PNG, WEBP, GIF, SVG up to 8MB${multiple ? ' each' : ''}</span>
          <input type="file" class="otc-file-input" accept="image/*" ${multiple ? 'multiple' : ''} style="display:none;">
        </div>
        <div class="otc-upload-progress-wrap" style="display:none;">
          <div class="otc-upload-progress-bar"><div class="otc-upload-progress-fill"></div></div>
          <span class="otc-upload-progress-text">Uploading...</span>
        </div>
        <div class="otc-image-grid"></div>
      </div>`;

    const dropZone = mount.querySelector('.otc-drop-zone');
    const fileInput = mount.querySelector('.otc-file-input');
    const grid = mount.querySelector('.otc-image-grid');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    ['dragenter', 'dragover'].forEach(evt => dropZone.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over');
    }));
    ['dragleave', 'drop'].forEach(evt => dropZone.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over');
    }));
    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length) handleFiles(files);
    });

    renderGrid();
  }

  function renderGrid() {
    const grid = mount.querySelector('.otc-image-grid');
    if (!grid) return;
    grid.innerHTML = images.map((img, idx) => `
      <div class="otc-image-item" draggable="true" data-idx="${idx}">
        <img src="${img.url}" alt="preview">
        <div class="otc-image-overlay">
          <button type="button" class="otc-img-btn otc-img-replace" title="Replace"><i class="fas fa-rotate"></i></button>
          <button type="button" class="otc-img-btn otc-img-delete" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
        ${!single && multiple ? '<span class="otc-drag-handle"><i class="fas fa-up-down-left-right"></i></span>' : ''}
      </div>`).join('');

    grid.querySelectorAll('.otc-img-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.closest('.otc-image-item').dataset.idx);
        images.splice(idx, 1);
        renderGrid();
        emit();
      });
    });

    grid.querySelectorAll('.otc-img-replace').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.closest('.otc-image-item').dataset.idx);
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.accept = 'image/*';
        tempInput.onchange = () => {
          if (tempInput.files.length) replaceImage(idx, tempInput.files[0]);
        };
        tempInput.click();
      });
    });

    if (multiple && !single) {
      let dragSrcIdx = null;
      grid.querySelectorAll('.otc-image-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
          dragSrcIdx = parseInt(item.dataset.idx);
          e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragover', (e) => { e.preventDefault(); item.classList.add('drag-target'); });
        item.addEventListener('dragleave', () => item.classList.remove('drag-target'));
        item.addEventListener('drop', (e) => {
          e.preventDefault();
          item.classList.remove('drag-target');
          const targetIdx = parseInt(item.dataset.idx);
          if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;
          const [moved] = images.splice(dragSrcIdx, 1);
          images.splice(targetIdx, 0, moved);
          renderGrid();
          emit();
        });
      });
    }
  }

  function showProgress(pct) {
    const wrap = mount.querySelector('.otc-upload-progress-wrap');
    const fill = mount.querySelector('.otc-upload-progress-fill');
    const text = mount.querySelector('.otc-upload-progress-text');
    wrap.style.display = 'block';
    fill.style.width = pct + '%';
    text.textContent = `Uploading... ${pct}%`;
  }
  function hideProgress() {
    const wrap = mount.querySelector('.otc-upload-progress-wrap');
    if (wrap) wrap.style.display = 'none';
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList);
    if (!files.length) return;

    if (single) {
      try {
        showProgress(0);
        const res = await OTCApi.uploadFile(files[0], folder, showProgress);
        images = [{ url: res.url, key: res.key }];
        renderGrid();
        emit();
      } catch (err) {
        alert('Upload failed: ' + err.message);
      } finally {
        hideProgress();
      }
      return;
    }

    try {
      showProgress(0);
      const res = await OTCApi.uploadFiles(files, folder, showProgress);
      for (const u of res.uploaded) images.push({ url: u.url, key: u.key });
      if (res.errors && res.errors.length) alert('Some files were skipped:\n' + res.errors.join('\n'));
      renderGrid();
      emit();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      hideProgress();
    }
  }

  async function replaceImage(idx, file) {
    try {
      showProgress(0);
      const res = await OTCApi.uploadFile(file, folder, showProgress);
      images[idx] = { url: res.url, key: res.key };
      renderGrid();
      emit();
    } catch (err) {
      alert('Replace failed: ' + err.message);
    } finally {
      hideProgress();
    }
  }

  render();

  return {
    getImages: () => images.map(i => i.url),
    getImagesFull: () => images.slice(),
    setImages: (imgs) => { images = (imgs || []).map(i => typeof i === 'string' ? { url: i } : { ...i }); renderGrid(); },
    destroy: () => { mount.innerHTML = ''; }
  };
}

/* =========================================================
   PHOTO REPOSITION WIDGET (Facebook/Instagram-style)
   Lets the admin drag inside a preview of the photo to choose
   which part is centered when it's cropped into the hexagon
   frame. Used for BOD member photos so a face is never cropped
   out — either the automatic face-detection guess, or a manual
   override, both stored as photo_x/photo_y percentages (0-100).
   ========================================================= */

/**
 * @param {Object} opts
 * @param {HTMLElement} opts.mount   - container element to render into
 * @param {string} opts.imageUrl     - current photo URL (repositioner is hidden if empty)
 * @param {number} [opts.x=50]       - initial focal point X, percent (0-100)
 * @param {number} [opts.y=35]       - initial focal point Y, percent (0-100)
 * @param {Function} opts.onChange   - called with {x, y} whenever the position changes
 */
function OTCPhotoRepositioner(opts) {
  const mount = opts.mount;
  let imageUrl = opts.imageUrl || '';
  let x = typeof opts.x === 'number' ? opts.x : 50;
  let y = typeof opts.y === 'number' ? opts.y : 35;
  const onChange = opts.onChange || (() => {});

  function render() {
    if (!imageUrl) { mount.innerHTML = ''; return; }
    mount.innerHTML = `
      <div class="otc-reposition-wrap">
        <label class="otc-reposition-label"><i class="fas fa-crop-simple"></i>Reposition photo (drag to center the face)</label>
        <div class="otc-reposition-stage" tabindex="0">
          <img src="${imageUrl}" alt="Reposition preview" draggable="false">
          <div class="otc-reposition-crosshair"></div>
        </div>
        <p class="otc-reposition-hint">Drag inside the box, or click/tap a spot, to set what shows in the hexagon frame.</p>
        <div class="otc-reposition-actions">
          <button type="button" class="btn btn-outline btn-sm" data-action="rp-reset"><i class="fas fa-rotate-left"></i> Reset to Center</button>
        </div>
      </div>`;

    const stage = mount.querySelector('.otc-reposition-stage');
    const img = mount.querySelector('img');
    const crosshair = mount.querySelector('.otc-reposition-crosshair');

    function applyVisual() {
      stage.style.setProperty('--rp-x', x + '%');
      stage.style.setProperty('--rp-y', y + '%');
      img.style.objectPosition = x + '% ' + y + '%';
      crosshair.style.left = x + '%';
      crosshair.style.top = y + '%';
    }
    applyVisual();

    function setFromEvent(clientX, clientY) {
      const rect = stage.getBoundingClientRect();
      let px = ((clientX - rect.left) / rect.width) * 100;
      let py = ((clientY - rect.top) / rect.height) * 100;
      px = Math.max(0, Math.min(100, px));
      py = Math.max(0, Math.min(100, py));
      x = Math.round(px * 10) / 10;
      y = Math.round(py * 10) / 10;
      applyVisual();
      onChange({ x, y });
    }

    let dragging = false;
    stage.addEventListener('pointerdown', (e) => {
      dragging = true;
      stage.setPointerCapture(e.pointerId);
      setFromEvent(e.clientX, e.clientY);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      setFromEvent(e.clientX, e.clientY);
    });
    stage.addEventListener('pointerup', (e) => {
      dragging = false;
      try { stage.releasePointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener('keydown', (e) => {
      const step = 2;
      if (e.key === 'ArrowLeft') { x = Math.max(0, x - step); applyVisual(); onChange({ x, y }); }
      else if (e.key === 'ArrowRight') { x = Math.min(100, x + step); applyVisual(); onChange({ x, y }); }
      else if (e.key === 'ArrowUp') { y = Math.max(0, y - step); applyVisual(); onChange({ x, y }); }
      else if (e.key === 'ArrowDown') { y = Math.min(100, y + step); applyVisual(); onChange({ x, y }); }
      else return;
      e.preventDefault();
    });

    mount.querySelector('[data-action="rp-reset"]').onclick = () => {
      x = 50; y = 35;
      applyVisual();
      onChange({ x, y });
    };
  }

  render();

  return {
    getPosition: () => ({ x, y }),
    setImage: (url, newX, newY) => {
      imageUrl = url || '';
      if (typeof newX === 'number') x = newX;
      if (typeof newY === 'number') y = newY;
      render();
    },
    destroy: () => { mount.innerHTML = ''; }
  };
}
