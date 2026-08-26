/* =========================================================
   ORCHID TECH CLUB — ADMIN PANEL LOGIC
   Auth guard, view routing, and full CRUD for every module:
   News, BOD & History, Gallery Albums, Projects, Resources,
   Membership, Homepage, About, Settings, Footer & Navigation.
   Talks to the centralized D1 + R2 backend via OTCApi and
   uses OTCUploader for every image upload surface.
   ========================================================= */

let currentView = 'dashboard';
const activeUploaders = [];

function trackUploader(u) { activeUploaders.push(u); return u; }
function destroyUploaders() { activeUploaders.forEach(u => { try { u.destroy(); } catch (e) {} }); activeUploaders.length = 0; }

/* ---------------- HELPERS ---------------- */
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function slugifyClient(text) {
  return (text || 'item').toString().toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}
function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch (e) { return d; }
}

/* ---------------- TOAST ---------------- */
let toastTimer;
function showToast(msg, isError) {
  const toast = document.getElementById('admin-toast');
  const text = document.getElementById('toast-text');
  if (!toast || !text) return;
  text.textContent = msg;
  toast.classList.toggle('toast-error', !!isError);
  const icon = toast.querySelector('i');
  if (icon) icon.className = isError ? 'fas fa-circle-exclamation' : 'fas fa-check-circle';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ---------------- MODAL ---------------- */
function openModal(html) {
  const content = document.getElementById('admin-modal-content');
  content.innerHTML = html;
  document.getElementById('admin-modal-overlay').classList.add('show');
}
function closeModal() {
  const overlay = document.getElementById('admin-modal-overlay');
  if (overlay) overlay.classList.remove('show');
  const content = document.getElementById('admin-modal-content');
  if (content) content.innerHTML = '';
}

/* ---------------- DRAG REORDER (generic) ---------------- */
function makeDragReorder(container, itemSelector, onDrop) {
  let dragEl = null;
  container.querySelectorAll(itemSelector).forEach((item) => {
    item.addEventListener('dragstart', () => { dragEl = item; item.classList.add('drag-target'); });
    item.addEventListener('dragend', () => item.classList.remove('drag-target'));
    item.addEventListener('dragover', (e) => e.preventDefault());
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragEl || dragEl === item) return;
      const items = Array.from(container.querySelectorAll(itemSelector));
      const dragIdx = items.indexOf(dragEl);
      const dropIdx = items.indexOf(item);
      if (dragIdx < dropIdx) item.after(dragEl); else item.before(dragEl);
      const newIds = Array.from(container.querySelectorAll(itemSelector)).map((el) => el.dataset.id);
      onDrop(newIds).catch((e) => showToast(e.message, true));
    });
  });
}

/* ---------------- LIST BUILDERS (benefits / faq / expertise / timeline / links) ---------------- */
function renderStringList(container, arr, placeholder) {
  function sync() {
    container.querySelectorAll('.list-builder-item').forEach((el) => {
      const idx = parseInt(el.dataset.idx);
      const input = el.querySelector('.lb-value');
      if (input) arr[idx] = input.value;
    });
  }
  function render() {
    container.innerHTML = arr.map((val, idx) => `
      <div class="list-builder-item" data-idx="${idx}">
        <input class="form-control lb-value" value="${escapeHtml(val)}" placeholder="${escapeHtml(placeholder || '')}">
        <button type="button" class="list-builder-remove" data-action="up" title="Move up"><i class="fas fa-arrow-up"></i></button>
        <button type="button" class="list-builder-remove" data-action="down" title="Move down"><i class="fas fa-arrow-down"></i></button>
        <button type="button" class="list-builder-remove" data-action="remove" title="Remove"><i class="fas fa-trash"></i></button>
      </div>`).join('') || '<p style="color:var(--text-dim);font-size:0.8rem;">No items yet.</p>';

    container.querySelectorAll('.list-builder-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        sync();
        const idx = parseInt(btn.closest('.list-builder-item').dataset.idx);
        const action = btn.dataset.action;
        if (action === 'remove') arr.splice(idx, 1);
        else if (action === 'up' && idx > 0) { const t = arr[idx - 1]; arr[idx - 1] = arr[idx]; arr[idx] = t; }
        else if (action === 'down' && idx < arr.length - 1) { const t = arr[idx + 1]; arr[idx + 1] = arr[idx]; arr[idx] = t; }
        render();
      });
    });
  }
  render();
  return { sync, addItem: (blank) => { sync(); arr.push(blank); render(); } };
}

function renderObjectList(container, arr, fields) {
  function sync() {
    container.querySelectorAll('.list-builder-item').forEach((el) => {
      const idx = parseInt(el.dataset.idx);
      fields.forEach((f) => {
        const input = el.querySelector(`[data-field="${f.key}"]`);
        if (input) arr[idx][f.key] = input.value;
      });
    });
  }
  function render() {
    container.innerHTML = arr.map((item, idx) => `
      <div class="list-builder-item" data-idx="${idx}" style="flex-wrap:wrap;align-items:flex-start;">
        ${fields.map((f) => f.type === 'textarea'
          ? `<textarea class="form-control" data-field="${f.key}" placeholder="${escapeHtml(f.placeholder || '')}" style="min-height:56px;">${escapeHtml(item[f.key] || '')}</textarea>`
          : `<input class="form-control" data-field="${f.key}" placeholder="${escapeHtml(f.placeholder || '')}" value="${escapeHtml(item[f.key] || '')}">`
        ).join('')}
        <div style="display:flex;gap:6px;">
          <button type="button" class="list-builder-remove" data-action="up" title="Move up"><i class="fas fa-arrow-up"></i></button>
          <button type="button" class="list-builder-remove" data-action="down" title="Move down"><i class="fas fa-arrow-down"></i></button>
          <button type="button" class="list-builder-remove" data-action="remove" title="Remove"><i class="fas fa-trash"></i></button>
        </div>
      </div>`).join('') || '<p style="color:var(--text-dim);font-size:0.8rem;">No items yet.</p>';

    container.querySelectorAll('.list-builder-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        sync();
        const idx = parseInt(btn.closest('.list-builder-item').dataset.idx);
        const action = btn.dataset.action;
        if (action === 'remove') arr.splice(idx, 1);
        else if (action === 'up' && idx > 0) { const t = arr[idx - 1]; arr[idx - 1] = arr[idx]; arr[idx] = t; }
        else if (action === 'down' && idx < arr.length - 1) { const t = arr[idx + 1]; arr[idx + 1] = arr[idx]; arr[idx] = t; }
        render();
      });
    });
  }
  render();
  return { sync, addItem: (blank) => { sync(); arr.push(blank); render(); } };
}

/* ---------------- RICH TEXT EDITOR (basic contenteditable) ---------------- */
function buildRichText(container, initialHtml) {
  container.innerHTML = `
    <div class="otc-richtext-toolbar">
      <button type="button" data-cmd="bold" title="Bold"><i class="fas fa-bold"></i></button>
      <button type="button" data-cmd="italic" title="Italic"><i class="fas fa-italic"></i></button>
      <button type="button" data-cmd="underline" title="Underline"><i class="fas fa-underline"></i></button>
      <button type="button" data-cmd="insertUnorderedList" title="Bullet List"><i class="fas fa-list-ul"></i></button>
      <button type="button" data-cmd="insertOrderedList" title="Numbered List"><i class="fas fa-list-ol"></i></button>
      <button type="button" data-cmd="createLink" title="Insert Link"><i class="fas fa-link"></i></button>
      <button type="button" data-cmd="removeFormat" title="Clear Formatting"><i class="fas fa-eraser"></i></button>
    </div>
    <div class="otc-richtext-editor" contenteditable="true">${initialHtml || ''}</div>`;
  const editor = container.querySelector('.otc-richtext-editor');
  container.querySelectorAll('[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editor.focus();
      const cmd = btn.dataset.cmd;
      if (cmd === 'createLink') {
        const url = prompt('Enter URL:');
        if (url) document.execCommand(cmd, false, url);
      } else {
        document.execCommand(cmd, false, null);
      }
    });
  });
  return { getHtml: () => editor.innerHTML, setHtml: (h) => { editor.innerHTML = h || ''; } };
}

/* ---------------- SUB-TABS (Settings / Footer & Nav) ---------------- */
function initSubtabs(tabsContainerId, panelPrefix) {
  const container = document.getElementById(tabsContainerId);
  if (!container) return;
  container.querySelectorAll('.filter-tab').forEach((btn) => {
    btn.onclick = () => {
      container.querySelectorAll('.filter-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll(`[id^="${panelPrefix}-"]`).forEach((p) => { p.style.display = 'none'; });
      const panel = document.getElementById(`${panelPrefix}-${btn.dataset.subtab}`);
      if (panel) panel.style.display = '';
    };
  });
}

/* ---------------- IMAGE DELTA SYNC (gallery/project images on edit) ---------------- */
async function syncDeltaImages(parentId, initialImages, currentFull, apiAdd, apiDel, apiReorder) {
  const initialIds = initialImages.filter((i) => i.id).map((i) => i.id);
  const currentIds = currentFull.filter((i) => i.id).map((i) => i.id);
  const removed = initialIds.filter((id) => !currentIds.includes(id));
  const added = currentFull.filter((i) => !i.id).map((i) => i.url);
  for (const id of removed) await apiDel(id);
  if (added.length) await apiAdd(parentId, added);
  const orderIds = currentFull.filter((i) => i.id).map((i) => i.id);
  if (orderIds.length > 1) await apiReorder(orderIds);
}

/* =========================================================
   VIEW ROUTING
   ========================================================= */
const viewTitles = {
  dashboard: 'Dashboard Overview', news: 'News & Notices', bod: 'BOD & History',
  gallery: 'Gallery Albums', projects: 'Projects', resources: 'Resources',
  membership: 'Membership Registration', homepage: 'Homepage Content', about: 'About Page',
  settings: 'Website Settings', footernav: 'Footer & Navigation', profile: 'Profile'
};
const viewLoaders = {
  dashboard: loadDashboard, news: loadNews, bod: loadBod, gallery: loadGallery,
  projects: loadProjects, resources: loadResources, membership: loadMembership,
  homepage: loadHomepage, about: loadAbout, settings: loadSettings,
  footernav: loadFooterNav, profile: loadProfile
};

async function switchView(view) {
  destroyUploaders();
  closeModal();
  document.querySelectorAll('.admin-view').forEach((v) => { v.style.display = 'none'; });
  const target = document.getElementById('view-' + view);
  if (target) target.style.display = '';
  document.querySelectorAll('.admin-nav a[data-view]').forEach((a) => a.classList.toggle('active', a.dataset.view === view));
  const titleEl = document.getElementById('view-title');
  if (titleEl) titleEl.textContent = viewTitles[view] || 'Dashboard';
  currentView = view;
  const sidebar = document.getElementById('admin-sidebar');
  if (sidebar) sidebar.classList.remove('open');
  try {
    if (viewLoaders[view]) await viewLoaders[view]();
  } catch (e) {
    showToast('Failed to load view: ' + e.message, true);
  }
}

/* =========================================================
   DASHBOARD
   ========================================================= */
async function loadDashboard() {
  const cards = document.getElementById('admin-stats-cards');
  cards.innerHTML = '<p style="color:var(--text-dim);">Loading stats...</p>';
  try {
    const [news, years, albums, projects, resources] = await Promise.all([
      OTCApi.adminGetNews(), OTCApi.adminGetBodYears(), OTCApi.adminGetGalleryAlbums(),
      OTCApi.adminGetProjects(), OTCApi.adminGetResources()
    ]);
    const memberCount = years.reduce((sum, y) => sum + (y.members ? y.members.length : 0), 0);
    const stats = [
      { icon: 'fa-newspaper', num: news.length, label: 'News Posts' },
      { icon: 'fa-user-tie', num: memberCount, label: 'BOD Members' },
      { icon: 'fa-images', num: albums.length, label: 'Gallery Albums' },
      { icon: 'fa-diagram-project', num: projects.length, label: 'Projects' },
      { icon: 'fa-book', num: resources.length, label: 'Resources' }
    ];
    cards.innerHTML = stats.map((s) => `
      <div class="admin-stat-card">
        <i class="fas ${s.icon}"></i>
        <div class="num">${s.num}</div>
        <div class="label">${s.label}</div>
      </div>`).join('');
  } catch (e) {
    cards.innerHTML = `<p style="color:var(--danger);">Failed to load stats: ${escapeHtml(e.message)}</p>`;
  }

  document.querySelectorAll('[data-quick]').forEach((btn) => {
    btn.onclick = async () => {
      const q = btn.dataset.quick;
      if (q === 'add-news') { await switchView('news'); openNewsModal(null); }
      if (q === 'add-project') { await switchView('projects'); openProjectModal(null); }
      if (q === 'add-album') { await switchView('gallery'); openAlbumModal(null); }
    };
  });
}

/* =========================================================
   NEWS & NOTICES
   ========================================================= */
async function loadNews() {
  const tbody = document.getElementById('news-table-body');
  tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
  let items = [];
  try { items = await OTCApi.adminGetNews(); } catch (e) { tbody.innerHTML = `<tr><td colspan="6" style="color:var(--danger);">${escapeHtml(e.message)}</td></tr>`; return; }

  tbody.innerHTML = items.map((n) => `
    <tr draggable="true" data-id="${n.id}">
      <td class="title">${escapeHtml(n.title)}</td>
      <td>${escapeHtml(n.category)}</td>
      <td>${fmtDate(n.date)}</td>
      <td>${n.pinned ? '<i class="fas fa-thumbtack" style="color:var(--purple);"></i>' : ''}</td>
      <td><span class="badge badge-${n.status === 'published' ? 'published' : 'draft'}">${n.status}</span></td>
      <td>
        <button class="icon-btn" data-action="edit" data-id="${n.id}" title="Edit"><i class="fas fa-pen"></i></button>
        <button class="icon-btn danger" data-action="delete" data-id="${n.id}" title="Delete"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6" style="color:var(--text-dim);">No news posts yet.</td></tr>';

  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => btn.addEventListener('click', () => {
    openNewsModal(items.find((x) => x.id == btn.dataset.id));
  }));
  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!confirm('Delete this news post?')) return;
    try { await OTCApi.deleteNews(btn.dataset.id); showToast('News post deleted.'); loadNews(); }
    catch (e) { showToast(e.message, true); }
  }));
  makeDragReorder(tbody, 'tr', (ids) => OTCApi.reorderNews(ids));

  document.getElementById('add-news-btn').onclick = () => openNewsModal(null);
}

function openNewsModal(item) {
  const isEdit = !!item;
  openModal(`
    <h3>${isEdit ? 'Edit' : 'Add'} News / Notice</h3>
    <div class="form-group"><label>Title</label><input class="form-control" id="modal-news-title" value="${escapeHtml(item?.title || '')}"></div>
    <div class="grid grid-2">
      <div class="form-group"><label>Category</label>
        <select class="form-control" id="modal-news-category">
          <option value="notice" ${item?.category === 'notice' ? 'selected' : ''}>Notice</option>
          <option value="event" ${item?.category === 'event' ? 'selected' : ''}>Event</option>
          <option value="workshop" ${item?.category === 'workshop' ? 'selected' : ''}>Workshop</option>
          <option value="achievement" ${item?.category === 'achievement' ? 'selected' : ''}>Achievement</option>
        </select>
      </div>
      <div class="form-group"><label>Date</label><input type="date" class="form-control" id="modal-news-date" value="${item?.date || ''}"></div>
    </div>
    <div class="form-group"><label>Excerpt (short summary)</label><textarea class="form-control" id="modal-news-excerpt" style="min-height:70px;">${escapeHtml(item?.excerpt || '')}</textarea></div>
    <label style="display:block;margin-bottom:6px;color:#fff;font-size:0.85rem;">Cover Image</label>
    <div id="modal-news-cover-uploader" style="margin-bottom:14px;"></div>
    <label style="display:block;margin-bottom:6px;color:#fff;font-size:0.85rem;">Body Content</label>
    <div id="modal-news-richtext" style="margin-bottom:14px;"></div>
    <label style="display:block;margin-bottom:6px;color:#fff;font-size:0.85rem;">Additional Photos (optional)</label>
    <div id="modal-news-images-uploader" style="margin-bottom:14px;"></div>
    <div class="grid grid-2">
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="modal-news-status">
          <option value="draft" ${item?.status === 'draft' ? 'selected' : ''}>Draft</option>
          <option value="published" ${item?.status === 'published' ? 'selected' : ''}>Published</option>
        </select>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:10px;margin-top:26px;">
        <label class="toggle-switch"><input type="checkbox" id="modal-news-pinned" ${item?.pinned ? 'checked' : ''}><span class="toggle-slider"></span></label>
        <span style="color:var(--text-muted);font-size:0.85rem;">Pin to top</span>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" type="button" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" type="button" id="modal-save-btn"><i class="fas fa-save"></i> Save Post</button>
    </div>`);

  const folder = `news/${slugifyClient(item?.title || 'untitled')}`;
  let coverUrl = item?.cover_image || '';
  trackUploader(OTCUploader({
    mount: document.getElementById('modal-news-cover-uploader'), folder, single: true,
    initial: coverUrl, onChange: (url) => { coverUrl = url; }
  }));
  const richtext = buildRichText(document.getElementById('modal-news-richtext'), item?.body || '');
  const imagesUploader = trackUploader(OTCUploader({
    mount: document.getElementById('modal-news-images-uploader'), folder, multiple: true,
    initial: (item?.images || []).map((i) => ({ url: i.url, id: i.id }))
  }));

  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const title = document.getElementById('modal-news-title').value.trim();
    if (!title) { showToast('Title is required.', true); return; }
    const payload = {
      title,
      category: document.getElementById('modal-news-category').value,
      date: document.getElementById('modal-news-date').value || new Date().toISOString().slice(0, 10),
      excerpt: document.getElementById('modal-news-excerpt').value,
      cover_image: coverUrl,
      body: richtext.getHtml(),
      status: document.getElementById('modal-news-status').value,
      pinned: document.getElementById('modal-news-pinned').checked,
      images: imagesUploader.getImages()
    };
    try {
      if (isEdit) await OTCApi.updateNews(item.id, payload);
      else await OTCApi.createNews(payload);
      closeModal(); showToast('News post saved.'); loadNews();
    } catch (e) { showToast(e.message, true); }
  };
}

/* =========================================================
   BOD & HISTORY
   ========================================================= */
async function loadBod() {
  const container = document.getElementById('bod-years-admin-list');
  container.innerHTML = '<p style="color:var(--text-dim);">Loading...</p>';
  let years = [];
  try { years = await OTCApi.adminGetBodYears(); } catch (e) { container.innerHTML = `<p style="color:var(--danger);">${escapeHtml(e.message)}</p>`; return; }

  container.innerHTML = years.map((y) => `
    <div class="admin-box drag-year-card" draggable="true" data-id="${y.id}" style="margin-bottom:22px;">
      <div class="admin-section-top">
        <div style="display:flex;align-items:center;gap:12px;">
          <i class="fas fa-up-down-left-right" style="color:var(--text-dim);cursor:grab;" title="Drag to reorder"></i>
          <h4 class="mb-0" style="margin:0;">${escapeHtml(y.title)} ${y.is_current ? '<span class="current-badge">Current</span>' : ''}</h4>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${!y.is_current ? `<button class="icon-btn" data-action="set-current" data-id="${y.id}" title="Mark as Current"><i class="fas fa-star"></i></button>` : ''}
          <button class="icon-btn" data-action="edit-year" data-id="${y.id}" title="Edit Year"><i class="fas fa-pen"></i></button>
          <button class="icon-btn danger" data-action="delete-year" data-id="${y.id}" title="Delete Year"><i class="fas fa-trash"></i></button>
          <button class="btn btn-outline btn-sm" data-action="add-member" data-id="${y.id}" type="button"><i class="fas fa-plus"></i> Add Member</button>
        </div>
      </div>
      <div class="grid grid-3 bod-admin-member-grid" data-year-grid="${y.id}">
        ${(y.members || []).map((m) => `
          <div class="bod-member-card" draggable="true" data-id="${m.id}" style="cursor:grab;">
            <div class="hex-frame" style="--face-x:${m.photo_x != null ? m.photo_x : 50}%;--face-y:${m.photo_y != null ? m.photo_y : 35}%;">${m.photo ? `<img src="${m.photo}" alt="${escapeHtml(m.name)}">` : '<div class="bod-avatar-icon"><i class="fas fa-user"></i></div>'}</div>
            <h4>${escapeHtml(m.name)}</h4><span class="position">${escapeHtml(m.position)}</span>
            <div style="display:flex;justify-content:center;gap:6px;margin-top:6px;">
              <button class="icon-btn" data-action="edit-member" data-id="${m.id}" title="Edit"><i class="fas fa-pen"></i></button>
              <button class="icon-btn danger" data-action="delete-member" data-id="${m.id}" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
          </div>`).join('') || '<p style="color:var(--text-dim);font-size:0.82rem;">No members yet.</p>'}
      </div>
    </div>`).join('') || '<p style="color:var(--text-dim);">No BOD years yet. Click "Add Year" to create one.</p>';

  // Year-level actions
  container.querySelectorAll('[data-action="set-current"]').forEach((btn) => btn.addEventListener('click', async () => {
    const y = years.find((x) => x.id == btn.dataset.id);
    try { await OTCApi.updateBodYear(y.id, { title: y.title, is_current: true }); showToast('Current year updated.'); loadBod(); }
    catch (e) { showToast(e.message, true); }
  }));
  container.querySelectorAll('[data-action="edit-year"]').forEach((btn) => btn.addEventListener('click', () => {
    openYearModal(years.find((x) => x.id == btn.dataset.id));
  }));
  container.querySelectorAll('[data-action="delete-year"]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!confirm('Delete this year and all its members?')) return;
    try { await OTCApi.deleteBodYear(btn.dataset.id); showToast('Year deleted.'); loadBod(); }
    catch (e) { showToast(e.message, true); }
  }));
  container.querySelectorAll('[data-action="add-member"]').forEach((btn) => btn.addEventListener('click', () => {
    const y = years.find((x) => x.id == btn.dataset.id);
    openMemberModal(null, y);
  }));
  container.querySelectorAll('[data-action="edit-member"]').forEach((btn) => btn.addEventListener('click', () => {
    for (const y of years) {
      const m = (y.members || []).find((mm) => mm.id == btn.dataset.id);
      if (m) { openMemberModal(m, y); break; }
    }
  }));
  container.querySelectorAll('[data-action="delete-member"]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!confirm('Delete this member?')) return;
    try { await OTCApi.deleteBodMember(btn.dataset.id); showToast('Member deleted.'); loadBod(); }
    catch (e) { showToast(e.message, true); }
  }));

  makeDragReorder(container, '.drag-year-card', (ids) => OTCApi.reorderBodYears(ids));
  container.querySelectorAll('.bod-admin-member-grid').forEach((grid) => {
    makeDragReorder(grid, '.bod-member-card', (ids) => OTCApi.reorderBodMembers(ids));
  });

  document.getElementById('add-bodyear-btn').onclick = () => openYearModal(null);
}

function openYearModal(year) {
  const isEdit = !!year;
  openModal(`
    <h3>${isEdit ? 'Edit' : 'Add'} BOD Year</h3>
    <div class="form-group"><label>Year Title (e.g. 2026–2027)</label><input class="form-control" id="modal-year-title" value="${escapeHtml(year?.title || '')}"></div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <label class="toggle-switch"><input type="checkbox" id="modal-year-current" ${year?.is_current ? 'checked' : ''}><span class="toggle-slider"></span></label>
      <span style="color:var(--text-muted);font-size:0.85rem;">Mark as Current Board</span>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" type="button" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" type="button" id="modal-save-btn"><i class="fas fa-save"></i> Save Year</button>
    </div>`);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const title = document.getElementById('modal-year-title').value.trim();
    if (!title) { showToast('Title is required.', true); return; }
    const data = { title, is_current: document.getElementById('modal-year-current').checked };
    try {
      if (isEdit) await OTCApi.updateBodYear(year.id, data);
      else await OTCApi.createBodYear(data);
      closeModal(); showToast('Year saved.'); loadBod();
    } catch (e) { showToast(e.message, true); }
  };
}

function openMemberModal(member, year) {
  const isEdit = !!member;
  openModal(`
    <h3>${isEdit ? 'Edit' : 'Add'} BOD Member <span style="color:var(--text-dim);font-size:0.8rem;">(${escapeHtml(year.title)})</span></h3>
    <label style="display:block;margin-bottom:6px;color:#fff;font-size:0.85rem;">Photo</label>
    <div id="modal-member-photo-uploader" style="margin-bottom:14px;"></div>
    <div id="modal-member-photo-reposition"></div>
    <div class="grid grid-2">
      <div class="form-group"><label>Name</label><input class="form-control" id="modal-member-name" value="${escapeHtml(member?.name || '')}"></div>
      <div class="form-group"><label>Position</label><input class="form-control" id="modal-member-position" value="${escapeHtml(member?.position || '')}"></div>
    </div>
    <div class="form-group"><label>Description (optional)</label><textarea class="form-control" id="modal-member-desc">${escapeHtml(member?.description || '')}</textarea></div>
    <div class="grid grid-2">
      <div class="form-group"><label><i class="fab fa-facebook-f"></i> Facebook (optional)</label><input class="form-control" id="modal-member-fb" value="${escapeHtml(member?.facebook || '')}"></div>
      <div class="form-group"><label><i class="fab fa-linkedin-in"></i> LinkedIn (optional)</label><input class="form-control" id="modal-member-li" value="${escapeHtml(member?.linkedin || '')}"></div>
    </div>
    <div class="form-group"><label><i class="fab fa-github"></i> GitHub (optional)</label><input class="form-control" id="modal-member-gh" value="${escapeHtml(member?.github || '')}"></div>
    <div class="modal-actions">
      <button class="btn btn-outline" type="button" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" type="button" id="modal-save-btn"><i class="fas fa-save"></i> Save Member</button>
    </div>`);

  let photoUrl = member?.photo || '';
  let photoX = member?.photo_x != null ? Number(member.photo_x) : 50;
  let photoY = member?.photo_y != null ? Number(member.photo_y) : 35;

  const repositioner = OTCPhotoRepositioner({
    mount: document.getElementById('modal-member-photo-reposition'),
    imageUrl: photoUrl, x: photoX, y: photoY,
    onChange: (pos) => { photoX = pos.x; photoY = pos.y; }
  });

  trackUploader(OTCUploader({
    mount: document.getElementById('modal-member-photo-uploader'), folder: `bod/${slugifyClient(year.title)}`,
    single: true, initial: photoUrl,
    onChange: (url) => {
      photoUrl = url;
      // A newly uploaded/replaced photo gets a fresh centered default —
      // the admin can then drag to fine-tune it in the box below.
      photoX = 50; photoY = 35;
      repositioner.setImage(url, photoX, photoY);
    }
  }));

  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const name = document.getElementById('modal-member-name').value.trim();
    const position = document.getElementById('modal-member-position').value.trim();
    if (!name || !position) { showToast('Name and position are required.', true); return; }
    const data = {
      name, position, photo: photoUrl,
      photo_x: photoX, photo_y: photoY,
      facebook: document.getElementById('modal-member-fb').value,
      linkedin: document.getElementById('modal-member-li').value,
      github: document.getElementById('modal-member-gh').value,
      description: document.getElementById('modal-member-desc').value,
      year_id: year.id
    };
    try {
      if (isEdit) await OTCApi.updateBodMember(member.id, data);
      else await OTCApi.createBodMember(data);
      closeModal(); showToast('Member saved.'); loadBod();
    } catch (e) { showToast(e.message, true); }
  };
}

/* =========================================================
   GALLERY ALBUMS
   ========================================================= */
async function loadGallery() {
  const grid = document.getElementById('gallery-admin-grid');
  grid.innerHTML = '<p style="color:var(--text-dim);">Loading...</p>';
  let albums = [];
  try { albums = await OTCApi.adminGetGalleryAlbums(); } catch (e) { grid.innerHTML = `<p style="color:var(--danger);">${escapeHtml(e.message)}</p>`; return; }

  grid.innerHTML = albums.map((a) => `
    <div class="card album-card" draggable="true" data-id="${a.id}">
      <div class="album-cover">
        <img src="${a.cover_image || (a.images[0] && a.images[0].url) || '/static/images/logo.png'}" alt="${escapeHtml(a.name)}">
        <span class="album-count-badge"><i class="fas fa-images"></i> ${a.images.length}</span>
      </div>
      <div class="album-body">
        <h4>${escapeHtml(a.name)}</h4>
        <span class="album-date">${fmtDate(a.event_date)}</span>
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="icon-btn" data-action="edit" data-id="${a.id}" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="icon-btn danger" data-action="delete" data-id="${a.id}" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('') || '<p style="color:var(--text-dim);">No albums yet. Click "Add Album" to create one.</p>';

  grid.querySelectorAll('[data-action="edit"]').forEach((btn) => btn.addEventListener('click', () => {
    openAlbumModal(albums.find((x) => x.id == btn.dataset.id));
  }));
  grid.querySelectorAll('[data-action="delete"]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!confirm('Delete this album and all its images?')) return;
    try { await OTCApi.deleteGalleryAlbum(btn.dataset.id); showToast('Album deleted.'); loadGallery(); }
    catch (e) { showToast(e.message, true); }
  }));
  makeDragReorder(grid, '.album-card', (ids) => OTCApi.reorderGalleryAlbums(ids));

  document.getElementById('add-album-btn').onclick = () => openAlbumModal(null);
}

function openAlbumModal(album) {
  const isEdit = !!album;
  const initialImages = (album?.images || []).map((i) => ({ url: i.url, id: i.id }));
  openModal(`
    <h3>${isEdit ? 'Edit' : 'Add'} Gallery Album</h3>
    <div class="form-group"><label>Album Name</label><input class="form-control" id="modal-album-name" value="${escapeHtml(album?.name || '')}"></div>
    <div class="form-group"><label>Event Date</label><input type="date" class="form-control" id="modal-album-date" value="${album?.event_date || ''}"></div>
    <div class="form-group"><label>Description</label><textarea class="form-control" id="modal-album-desc">${escapeHtml(album?.description || '')}</textarea></div>
    <label style="display:block;margin-bottom:6px;color:#fff;font-size:0.85rem;">Cover Image</label>
    <div id="modal-album-cover-uploader" style="margin-bottom:14px;"></div>
    <label style="display:block;margin-bottom:6px;color:#fff;font-size:0.85rem;">Album Photos</label>
    <div id="modal-album-images-uploader" style="margin-bottom:10px;"></div>
    <label style="display:block;margin-bottom:6px;color:var(--text-dim);font-size:0.78rem;">Click a photo below to set it as the album cover:</label>
    <div id="modal-album-cover-picker" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;"></div>
    <div class="modal-actions">
      <button class="btn btn-outline" type="button" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" type="button" id="modal-save-btn"><i class="fas fa-save"></i> Save Album</button>
    </div>`);

  const folder = `gallery/${slugifyClient(album?.name || 'new-album')}`;
  let coverUrl = album?.cover_image || '';
  const coverUploader = trackUploader(OTCUploader({
    mount: document.getElementById('modal-album-cover-uploader'), folder, single: true,
    initial: coverUrl, onChange: (url) => { coverUrl = url; refreshCoverPicker(); }
  }));
  const imagesUploader = trackUploader(OTCUploader({
    mount: document.getElementById('modal-album-images-uploader'), folder, multiple: true,
    initial: initialImages, onChange: refreshCoverPicker
  }));

  function refreshCoverPicker() {
    const picker = document.getElementById('modal-album-cover-picker');
    if (!picker) return;
    const imgs = imagesUploader.getImages();
    picker.innerHTML = imgs.map((u) => `
      <img src="${u}" data-url="${u}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid ${u === coverUrl ? 'var(--purple)' : 'transparent'};">
    `).join('') || '<span style="color:var(--text-dim);font-size:0.8rem;">Upload photos above to choose a cover.</span>';
    picker.querySelectorAll('img').forEach((img) => img.addEventListener('click', () => {
      coverUrl = img.dataset.url;
      coverUploader.setImages([coverUrl]);
      refreshCoverPicker();
    }));
  }
  refreshCoverPicker();

  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const name = document.getElementById('modal-album-name').value.trim();
    const event_date = document.getElementById('modal-album-date').value;
    if (!name || !event_date) { showToast('Name and date are required.', true); return; }
    const description = document.getElementById('modal-album-desc').value;
    try {
      if (isEdit) {
        await OTCApi.updateGalleryAlbum(album.id, { name, event_date, cover_image: coverUrl, description });
        await syncDeltaImages(album.id, initialImages, imagesUploader.getImagesFull(),
          OTCApi.addGalleryImages.bind(OTCApi), OTCApi.deleteGalleryImage.bind(OTCApi), OTCApi.reorderGalleryImages.bind(OTCApi));
      } else {
        const fullImgs = imagesUploader.getImagesFull();
        await OTCApi.createGalleryAlbum({ name, event_date, cover_image: coverUrl, description, images: fullImgs.map((i) => i.url) });
      }
      closeModal(); showToast('Album saved.'); loadGallery();
    } catch (e) { showToast(e.message, true); }
  };
}

/* =========================================================
   PROJECTS
   ========================================================= */
async function loadProjects() {
  const tbody = document.getElementById('projects-table-body');
  tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
  let items = [];
  try { items = await OTCApi.adminGetProjects(); } catch (e) { tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger);">${escapeHtml(e.message)}</td></tr>`; return; }

  const statusColor = { Completed: '#2ecc71', Ongoing: '#4facfe', Planned: '#ffb84d' };
  tbody.innerHTML = items.map((p) => `
    <tr draggable="true" data-id="${p.id}">
      <td><img src="${p.thumbnail || '/static/images/logo.png'}" alt="" style="width:52px;height:40px;object-fit:cover;border-radius:6px;"></td>
      <td class="title">${escapeHtml(p.title)}</td>
      <td>${escapeHtml(p.tag)}</td>
      <td><span class="badge" style="background:${statusColor[p.status] || 'rgba(157,78,221,0.15)'}22;color:${statusColor[p.status] || 'var(--purple)'};">${escapeHtml(p.status)}</span></td>
      <td>
        <button class="icon-btn" data-action="edit" data-id="${p.id}" title="Edit"><i class="fas fa-pen"></i></button>
        <button class="icon-btn danger" data-action="delete" data-id="${p.id}" title="Delete"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('') || '<tr><td colspan="5" style="color:var(--text-dim);">No projects yet.</td></tr>';

  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => btn.addEventListener('click', () => {
    openProjectModal(items.find((x) => x.id == btn.dataset.id));
  }));
  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!confirm('Delete this project?')) return;
    try { await OTCApi.deleteProject(btn.dataset.id); showToast('Project deleted.'); loadProjects(); }
    catch (e) { showToast(e.message, true); }
  }));
  makeDragReorder(tbody, 'tr', (ids) => OTCApi.reorderProjects(ids));

  document.getElementById('add-project-btn').onclick = () => openProjectModal(null);
}

function openProjectModal(project) {
  const isEdit = !!project;
  const initialImages = (project?.images || []).map((i) => ({ url: i.url, id: i.id }));
  openModal(`
    <h3>${isEdit ? 'Edit' : 'Add'} Project</h3>
    <div class="form-group"><label>Title</label><input class="form-control" id="modal-project-title" value="${escapeHtml(project?.title || '')}"></div>
    <div class="grid grid-2">
      <div class="form-group"><label>Tag / Category</label><input class="form-control" id="modal-project-tag" value="${escapeHtml(project?.tag || '')}" placeholder="e.g. AI/ML, Web Dev"></div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="modal-project-status">
          <option value="Ongoing" ${project?.status === 'Ongoing' ? 'selected' : ''}>Ongoing</option>
          <option value="Completed" ${project?.status === 'Completed' ? 'selected' : ''}>Completed</option>
          <option value="Planned" ${project?.status === 'Planned' ? 'selected' : ''}>Planned</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>Description</label><textarea class="form-control" id="modal-project-desc">${escapeHtml(project?.description || '')}</textarea></div>
    <label style="display:block;margin-bottom:6px;color:#fff;font-size:0.85rem;">Project Gallery (process photos, testing, prototypes)</label>
    <div id="modal-project-images-uploader" style="margin-bottom:10px;"></div>
    <label style="display:block;margin-bottom:6px;color:var(--text-dim);font-size:0.78rem;">Click a photo below to set it as the card thumbnail:</label>
    <div id="modal-project-thumb-picker" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;"></div>
    <div class="modal-actions">
      <button class="btn btn-outline" type="button" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" type="button" id="modal-save-btn"><i class="fas fa-save"></i> Save Project</button>
    </div>`);

  const folder = `projects/${slugifyClient(project?.title || 'new-project')}`;
  let thumbnailUrl = project?.thumbnail || '';
  const imagesUploader = trackUploader(OTCUploader({
    mount: document.getElementById('modal-project-images-uploader'), folder, multiple: true,
    initial: initialImages, onChange: refreshThumbPicker
  }));

  function refreshThumbPicker() {
    const picker = document.getElementById('modal-project-thumb-picker');
    if (!picker) return;
    const imgs = imagesUploader.getImages();
    picker.innerHTML = imgs.map((u) => `
      <img src="${u}" data-url="${u}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid ${u === thumbnailUrl ? 'var(--purple)' : 'transparent'};">
    `).join('') || '<span style="color:var(--text-dim);font-size:0.8rem;">Upload photos above to choose a thumbnail.</span>';
    picker.querySelectorAll('img').forEach((img) => img.addEventListener('click', () => {
      thumbnailUrl = img.dataset.url;
      refreshThumbPicker();
    }));
  }
  refreshThumbPicker();

  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const title = document.getElementById('modal-project-title').value.trim();
    if (!title) { showToast('Title is required.', true); return; }
    const data = {
      title, tag: document.getElementById('modal-project-tag').value,
      description: document.getElementById('modal-project-desc').value,
      status: document.getElementById('modal-project-status').value,
      thumbnail: thumbnailUrl
    };
    try {
      if (isEdit) {
        await OTCApi.updateProject(project.id, data);
        await syncDeltaImages(project.id, initialImages, imagesUploader.getImagesFull(),
          OTCApi.addProjectImages.bind(OTCApi), OTCApi.deleteProjectImage.bind(OTCApi), OTCApi.reorderProjectImages.bind(OTCApi));
      } else {
        data.images = imagesUploader.getImages();
        await OTCApi.createProject(data);
      }
      closeModal(); showToast('Project saved.'); loadProjects();
    } catch (e) { showToast(e.message, true); }
  };
}

/* =========================================================
   RESOURCES
   ========================================================= */
async function loadResources() {
  const tbody = document.getElementById('resources-table-body');
  tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
  let items = [];
  try { items = await OTCApi.adminGetResources(); } catch (e) { tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger);">${escapeHtml(e.message)}</td></tr>`; return; }

  tbody.innerHTML = items.map((r) => `
    <tr draggable="true" data-id="${r.id}">
      <td>${r.logo ? `<img src="${r.logo}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">` : '<i class="fas fa-book" style="color:var(--text-dim);"></i>'}</td>
      <td class="title">${escapeHtml(r.title)}</td>
      <td>${escapeHtml(r.category)}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;">${r.url ? `<a href="${r.url}" target="_blank" style="color:var(--blue);">${escapeHtml(r.url)}</a>` : ''}</td>
      <td>
        <button class="icon-btn" data-action="edit" data-id="${r.id}" title="Edit"><i class="fas fa-pen"></i></button>
        <button class="icon-btn danger" data-action="delete" data-id="${r.id}" title="Delete"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('') || '<tr><td colspan="5" style="color:var(--text-dim);">No resources yet.</td></tr>';

  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => btn.addEventListener('click', () => {
    openResourceModal(items.find((x) => x.id == btn.dataset.id));
  }));
  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!confirm('Delete this resource?')) return;
    try { await OTCApi.deleteResource(btn.dataset.id); showToast('Resource deleted.'); loadResources(); }
    catch (e) { showToast(e.message, true); }
  }));
  makeDragReorder(tbody, 'tr', (ids) => OTCApi.reorderResources(ids));

  document.getElementById('add-resource-btn').onclick = () => openResourceModal(null);
}

function openResourceModal(resource) {
  const isEdit = !!resource;
  openModal(`
    <h3>${isEdit ? 'Edit' : 'Add'} Resource</h3>
    <label style="display:block;margin-bottom:6px;color:#fff;font-size:0.85rem;">Logo / Icon Image</label>
    <div id="modal-resource-logo-uploader" style="margin-bottom:14px;"></div>
    <div class="form-group"><label>Title</label><input class="form-control" id="modal-resource-title" value="${escapeHtml(resource?.title || '')}"></div>
    <div class="form-group"><label>Description</label><textarea class="form-control" id="modal-resource-desc">${escapeHtml(resource?.description || '')}</textarea></div>
    <div class="grid grid-2">
      <div class="form-group"><label>Category</label><input class="form-control" id="modal-resource-category" value="${escapeHtml(resource?.category || 'General')}"></div>
      <div class="form-group"><label>URL (optional)</label><input class="form-control" id="modal-resource-url" value="${escapeHtml(resource?.url || '')}"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" type="button" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" type="button" id="modal-save-btn"><i class="fas fa-save"></i> Save Resource</button>
    </div>`);

  let logoUrl = resource?.logo || '';
  trackUploader(OTCUploader({
    mount: document.getElementById('modal-resource-logo-uploader'), folder: 'resources', single: true,
    initial: logoUrl, onChange: (url) => { logoUrl = url; }
  }));

  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const title = document.getElementById('modal-resource-title').value.trim();
    if (!title) { showToast('Title is required.', true); return; }
    const data = {
      title, description: document.getElementById('modal-resource-desc').value,
      logo: logoUrl, url: document.getElementById('modal-resource-url').value,
      category: document.getElementById('modal-resource-category').value || 'General'
    };
    try {
      if (isEdit) await OTCApi.updateResource(resource.id, data);
      else await OTCApi.createResource(data);
      closeModal(); showToast('Resource saved.'); loadResources();
    } catch (e) { showToast(e.message, true); }
  };
}

/* =========================================================
   MEMBERSHIP REGISTRATION
   ========================================================= */
let membershipData = {};
let membershipBenefitsHandle, membershipFaqHandle;
async function loadMembership() {
  try { membershipData = await OTCApi.getContent('membership') || {}; } catch (e) { membershipData = {}; }
  membershipData.benefits = membershipData.benefits || [];
  membershipData.faq = membershipData.faq || [];

  document.getElementById('m-status').value = membershipData.registrationStatus || 'open';
  document.getElementById('m-formurl').value = membershipData.googleFormUrl || '';
  document.getElementById('m-deadline').value = membershipData.registrationDeadline || '';
  document.getElementById('m-instructions').value = membershipData.instructions || '';

  membershipBenefitsHandle = renderStringList(document.getElementById('m-benefits-list'), membershipData.benefits, 'Benefit text');
  membershipFaqHandle = renderObjectList(document.getElementById('m-faq-list'), membershipData.faq, [
    { key: 'q', placeholder: 'Question' }, { key: 'a', placeholder: 'Answer', type: 'textarea' }
  ]);

  document.getElementById('m-add-benefit').onclick = () => membershipBenefitsHandle.addItem('');
  document.getElementById('m-add-faq').onclick = () => membershipFaqHandle.addItem({ q: '', a: '' });
  document.getElementById('save-membership-btn').onclick = async () => {
    membershipBenefitsHandle.sync(); membershipFaqHandle.sync();
    membershipData.registrationStatus = document.getElementById('m-status').value;
    membershipData.googleFormUrl = document.getElementById('m-formurl').value;
    membershipData.registrationDeadline = document.getElementById('m-deadline').value;
    membershipData.instructions = document.getElementById('m-instructions').value;
    try { await OTCApi.saveContent('membership', membershipData); showToast('Membership settings saved.'); }
    catch (e) { showToast(e.message, true); }
  };
}

/* =========================================================
   HOMEPAGE CONTENT
   ========================================================= */
let homepageData = {};
let homepageExpertiseHandle;
async function loadHomepage() {
  try { homepageData = await OTCApi.getContent('homepage') || {}; } catch (e) { homepageData = {}; }
  homepageData.stats = homepageData.stats || {};
  homepageData.expertise = homepageData.expertise || [];

  document.getElementById('h-title').value = homepageData.heroTitle || '';
  document.getElementById('h-subtitle').value = homepageData.heroSubtitle || '';
  document.getElementById('h-lead').value = homepageData.heroLead || '';
  document.getElementById('h-s-years').value = homepageData.stats.yearsActive ?? '';
  document.getElementById('h-s-members').value = homepageData.stats.members ?? '';
  document.getElementById('h-s-projects').value = homepageData.stats.projects ?? '';
  document.getElementById('h-s-workshops').value = homepageData.stats.workshops ?? '';
  document.getElementById('h-s-events').value = homepageData.stats.events ?? '';
  document.getElementById('h-s-achievements').value = homepageData.stats.achievements ?? '';
  document.getElementById('h-about-title').value = homepageData.aboutPreviewTitle || '';
  document.getElementById('h-about-text').value = homepageData.aboutPreviewText || '';

  trackUploader(OTCUploader({
    mount: document.getElementById('h-bg-uploader'), folder: 'homepage', single: true,
    initial: homepageData.heroBackground || '', onChange: (url) => { homepageData.heroBackground = url; }
  }));
  trackUploader(OTCUploader({
    mount: document.getElementById('h-about-img-uploader'), folder: 'homepage', single: true,
    initial: homepageData.aboutPreviewImage || '', onChange: (url) => { homepageData.aboutPreviewImage = url; }
  }));

  homepageExpertiseHandle = renderObjectList(document.getElementById('h-expertise-list'), homepageData.expertise, [
    { key: 'icon', placeholder: 'Font Awesome class e.g. fa-brain' }, { key: 'label', placeholder: 'Label' }
  ]);
  document.getElementById('h-add-expertise').onclick = () => homepageExpertiseHandle.addItem({ icon: 'fa-star', label: '' });

  document.getElementById('save-homepage-btn').onclick = async () => {
    homepageExpertiseHandle.sync();
    homepageData.heroTitle = document.getElementById('h-title').value;
    homepageData.heroSubtitle = document.getElementById('h-subtitle').value;
    homepageData.heroLead = document.getElementById('h-lead').value;
    homepageData.stats.yearsActive = parseInt(document.getElementById('h-s-years').value) || 0;
    homepageData.stats.members = parseInt(document.getElementById('h-s-members').value) || 0;
    homepageData.stats.projects = parseInt(document.getElementById('h-s-projects').value) || 0;
    homepageData.stats.workshops = parseInt(document.getElementById('h-s-workshops').value) || 0;
    homepageData.stats.events = parseInt(document.getElementById('h-s-events').value) || 0;
    homepageData.stats.achievements = parseInt(document.getElementById('h-s-achievements').value) || 0;
    homepageData.aboutPreviewTitle = document.getElementById('h-about-title').value;
    homepageData.aboutPreviewText = document.getElementById('h-about-text').value;
    try { await OTCApi.saveContent('homepage', homepageData); showToast('Homepage content saved.'); }
    catch (e) { showToast(e.message, true); }
  };
}

/* =========================================================
   ABOUT PAGE
   ========================================================= */
let aboutData = {};
let aboutExpertiseHandle, aboutTimelineHandle;
async function loadAbout() {
  try { aboutData = await OTCApi.getContent('about') || {}; } catch (e) { aboutData = {}; }
  aboutData.expertiseCards = aboutData.expertiseCards || [];
  aboutData.timeline = aboutData.timeline || [];

  document.getElementById('a-story').value = aboutData.story || '';
  document.getElementById('a-vision').value = aboutData.vision || '';
  document.getElementById('a-mission').value = aboutData.mission || '';
  document.getElementById('a-motto').value = aboutData.motto || '';
  document.getElementById('a-corevalues').value = aboutData.coreValues || '';

  trackUploader(OTCUploader({
    mount: document.getElementById('a-story-img-uploader'), folder: 'about', single: true,
    initial: aboutData.storyImage || '', onChange: (url) => { aboutData.storyImage = url; }
  }));

  aboutExpertiseHandle = renderObjectList(document.getElementById('a-expertise-list'), aboutData.expertiseCards, [
    { key: 'icon', placeholder: 'Font Awesome class e.g. fa-brain' }, { key: 'label', placeholder: 'Label' }
  ]);
  aboutTimelineHandle = renderObjectList(document.getElementById('a-timeline-list'), aboutData.timeline, [
    { key: 'year', placeholder: 'e.g. 2025 — Present' }, { key: 'title', placeholder: 'Board Title' }, { key: 'text', placeholder: 'Description', type: 'textarea' }
  ]);
  document.getElementById('a-add-expertise').onclick = () => aboutExpertiseHandle.addItem({ icon: 'fa-star', label: '' });
  document.getElementById('a-add-timeline').onclick = () => aboutTimelineHandle.addItem({ year: '', title: '', text: '' });

  document.getElementById('save-about-btn').onclick = async () => {
    aboutExpertiseHandle.sync(); aboutTimelineHandle.sync();
    aboutData.story = document.getElementById('a-story').value;
    aboutData.vision = document.getElementById('a-vision').value;
    aboutData.mission = document.getElementById('a-mission').value;
    aboutData.motto = document.getElementById('a-motto').value;
    aboutData.coreValues = document.getElementById('a-corevalues').value;
    try { await OTCApi.saveContent('about', aboutData); showToast('About page saved.'); }
    catch (e) { showToast(e.message, true); }
  };
}

/* =========================================================
   WEBSITE SETTINGS (General / Contact / Social)
   ========================================================= */
let settingsData = {};
let socialData = {};
async function loadSettings() {
  try { settingsData = await OTCApi.getContent('settings') || {}; } catch (e) { settingsData = {}; }
  try { socialData = await OTCApi.getContent('social') || {}; } catch (e) { socialData = {}; }

  document.getElementById('st-clubname').value = settingsData.clubName || '';
  document.getElementById('st-theme1').value = settingsData.themePrimary || '#7b2ff7';
  document.getElementById('st-theme2').value = settingsData.themeSecondary || '#4facfe';
  document.getElementById('st-footertext').value = settingsData.footerText || '';
  document.getElementById('st-copyright').value = settingsData.copyright || '';
  document.getElementById('st-email').value = settingsData.email || '';
  document.getElementById('st-phone').value = settingsData.phone || '';
  document.getElementById('st-address').value = settingsData.address || '';
  document.getElementById('st-mapurl').value = settingsData.mapUrl || '';
  document.getElementById('so-facebook').value = socialData.facebook || '';
  document.getElementById('so-instagram').value = socialData.instagram || '';
  document.getElementById('so-linkedin').value = socialData.linkedin || '';
  document.getElementById('so-youtube').value = socialData.youtube || '';
  document.getElementById('so-github').value = socialData.github || '';

  trackUploader(OTCUploader({
    mount: document.getElementById('st-logo-uploader'), folder: 'site', single: true,
    initial: settingsData.logo || '', onChange: (url) => { settingsData.logo = url; }
  }));
  trackUploader(OTCUploader({
    mount: document.getElementById('st-favicon-uploader'), folder: 'site', single: true,
    initial: settingsData.favicon || '', onChange: (url) => { settingsData.favicon = url; }
  }));

  initSubtabs('settings-subtabs', 'settings-tab');

  document.getElementById('save-settings-general-btn').onclick = async () => {
    settingsData.clubName = document.getElementById('st-clubname').value;
    settingsData.themePrimary = document.getElementById('st-theme1').value;
    settingsData.themeSecondary = document.getElementById('st-theme2').value;
    settingsData.footerText = document.getElementById('st-footertext').value;
    settingsData.copyright = document.getElementById('st-copyright').value;
    try { await OTCApi.saveContent('settings', settingsData); showToast('General settings saved.'); }
    catch (e) { showToast(e.message, true); }
  };
  document.getElementById('save-settings-contact-btn').onclick = async () => {
    settingsData.email = document.getElementById('st-email').value;
    settingsData.phone = document.getElementById('st-phone').value;
    settingsData.address = document.getElementById('st-address').value;
    settingsData.mapUrl = document.getElementById('st-mapurl').value;
    try { await OTCApi.saveContent('settings', settingsData); showToast('Contact info saved.'); }
    catch (e) { showToast(e.message, true); }
  };
  document.getElementById('save-settings-social-btn').onclick = async () => {
    socialData.facebook = document.getElementById('so-facebook').value;
    socialData.instagram = document.getElementById('so-instagram').value;
    socialData.linkedin = document.getElementById('so-linkedin').value;
    socialData.youtube = document.getElementById('so-youtube').value;
    socialData.github = document.getElementById('so-github').value;
    try { await OTCApi.saveContent('social', socialData); showToast('Social links saved.'); }
    catch (e) { showToast(e.message, true); }
  };
}

/* =========================================================
   FOOTER & NAVIGATION
   ========================================================= */
let navData = {};
let footerData = {};
let navLinksHandle, footerQuickHandle, footerConnectHandle;
async function loadFooterNav() {
  try { navData = await OTCApi.getContent('nav') || {}; } catch (e) { navData = {}; }
  try { footerData = await OTCApi.getContent('footer') || {}; } catch (e) { footerData = {}; }
  navData.links = navData.links || [];
  footerData.quickLinks = footerData.quickLinks || [];
  footerData.connectLinks = footerData.connectLinks || [];

  const linkFields = [{ key: 'label', placeholder: 'Label' }, { key: 'href', placeholder: 'e.g. about.html' }];
  navLinksHandle = renderObjectList(document.getElementById('nav-links-list'), navData.links, linkFields);
  footerQuickHandle = renderObjectList(document.getElementById('footer-quick-list'), footerData.quickLinks, linkFields);
  footerConnectHandle = renderObjectList(document.getElementById('footer-connect-list'), footerData.connectLinks, linkFields);

  document.getElementById('nav-add-link').onclick = () => navLinksHandle.addItem({ label: '', href: '' });
  document.getElementById('footer-add-quick').onclick = () => footerQuickHandle.addItem({ label: '', href: '' });
  document.getElementById('footer-add-connect').onclick = () => footerConnectHandle.addItem({ label: '', href: '' });

  document.getElementById('save-nav-btn').onclick = async () => {
    navLinksHandle.sync();
    try { await OTCApi.saveContent('nav', navData); showToast('Navigation menu saved.'); }
    catch (e) { showToast(e.message, true); }
  };
  document.getElementById('save-footer-btn').onclick = async () => {
    footerQuickHandle.sync(); footerConnectHandle.sync();
    try { await OTCApi.saveContent('footer', footerData); showToast('Footer saved.'); }
    catch (e) { showToast(e.message, true); }
  };

  initSubtabs('footernav-subtabs', 'footernav-tab');
}

/* =========================================================
   PROFILE
   ========================================================= */
async function loadProfile() {
  document.getElementById('profile-logout-btn').onclick = logout;
}

async function logout() {
  try { await OTCApi.logout(); } catch (e) {}
  window.location.href = 'index.html';
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  let ok = false;
  try { ok = await OTCApi.verify(); } catch (e) { ok = false; }

  if (!ok) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('auth-guard').style.display = 'none';
  document.getElementById('admin-dashboard').classList.add('show');

  document.querySelectorAll('.admin-nav a[data-view]').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); switchView(a.dataset.view); });
  });
  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) logoutLink.addEventListener('click', (e) => { e.preventDefault(); logout(); });

  const mobileToggle = document.getElementById('admin-mobile-toggle');
  if (mobileToggle) mobileToggle.addEventListener('click', () => document.getElementById('admin-sidebar').classList.toggle('open'));

  const overlay = document.getElementById('admin-modal-overlay');
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target.id === 'admin-modal-overlay') closeModal(); });

  switchView('dashboard');
});
