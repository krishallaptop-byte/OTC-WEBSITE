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
