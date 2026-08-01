/* =========================================================
   ORCHID TECH CLUB — API CLIENT
   Thin fetch wrapper for the centralized Cloudflare D1 + R2
   backend. All content is now stored server-side so every
   visitor / device / browser sees the same live data.
   ========================================================= */

const OTC_TOKEN_KEY = 'otc_admin_token';

const OTCApi = {
  getToken() { return localStorage.getItem(OTC_TOKEN_KEY) || ''; },
  setToken(t) { localStorage.setItem(OTC_TOKEN_KEY, t); },
  clearToken() { localStorage.removeItem(OTC_TOKEN_KEY); },
  isLoggedIn() { return !!this.getToken(); },

  async _fetch(path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    const token = this.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let body = opts.body;
    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    const res = await fetch(path, { ...opts, headers, body });
    let json;
    try { json = await res.json(); } catch (e) { json = { ok: false, error: 'Invalid server response' }; }

    if (res.status === 401) {
      this.clearToken();
    }
    if (!json.ok) {
      const err = new Error(json.error || 'Request failed');
      err.status = res.status;
      throw err;
    }
    return json;
  },

  get(path) { return this._fetch(path, { method: 'GET' }); },
  post(path, body) { return this._fetch(path, { method: 'POST', body }); },
  put(path, body) { return this._fetch(path, { method: 'PUT', body }); },
  del(path) { return this._fetch(path, { method: 'DELETE' }); },

  /* ---------------- AUTH ---------------- */
  async login(username, password) {
    const json = await this._fetch('/api/auth/login', { method: 'POST', body: { username, password } });
    this.setToken(json.token);
    return json;
  },
  async logout() {
    try { await this.post('/api/auth/logout', {}); } catch (e) {}
    this.clearToken();
  },
  async verify() {
    try { await this.get('/api/auth/verify'); return true; } catch (e) { return false; }
  },

  /* ---------------- PUBLIC READ ---------------- */
  getContent(key) { return this.get('/api/content/' + key).then(r => r.data); },
  getAllContent() { return this.get('/api/content-all').then(r => r.data); },
  getNews(category) { return this.get('/api/news' + (category && category !== 'all' ? '?category=' + category : '')).then(r => r.data); },
  getNewsItem(id) { return this.get('/api/news/' + id).then(r => r.data); },
  getBodYears() { return this.get('/api/bod-years').then(r => r.data); },
  getBodCurrent() { return this.get('/api/bod-current').then(r => r.data); },
  getGalleryAlbums() { return this.get('/api/gallery-albums').then(r => r.data); },
  getGalleryAlbum(id) { return this.get('/api/gallery-albums/' + id).then(r => r.data); },
  getProjects() { return this.get('/api/projects').then(r => r.data); },
  getProject(id) { return this.get('/api/projects/' + id).then(r => r.data); },
  getResources() { return this.get('/api/resources').then(r => r.data); },

  /* ---------------- ADMIN WRITE ---------------- */
  saveContent(key, value) { return this.put('/api/admin/content/' + key, value); },

  createNews(data) { return this.post('/api/admin/news', data); },
  updateNews(id, data) { return this.put('/api/admin/news/' + id, data); },
  deleteNews(id) { return this.del('/api/admin/news/' + id); },
  reorderNews(order) { return this.post('/api/admin/news/reorder', { order }); },

  adminGetNews() { return this.get('/api/admin/news').then(r => r.data); },

  createBodYear(data) { return this.post('/api/admin/bod-years', data); },
  updateBodYear(id, data) { return this.put('/api/admin/bod-years/' + id, data); },
  deleteBodYear(id) { return this.del('/api/admin/bod-years/' + id); },
  reorderBodYears(order) { return this.post('/api/admin/bod-years/reorder', { order }); },
  adminGetBodYears() { return this.get('/api/admin/bod-years').then(r => r.data); },

  createBodMember(data) { return this.post('/api/admin/bod-members', data); },
  updateBodMember(id, data) { return this.put('/api/admin/bod-members/' + id, data); },
  deleteBodMember(id) { return this.del('/api/admin/bod-members/' + id); },
  reorderBodMembers(order) { return this.post('/api/admin/bod-members/reorder', { order }); },

  adminGetGalleryAlbums() { return this.get('/api/admin/gallery-albums').then(r => r.data); },
  createGalleryAlbum(data) { return this.post('/api/admin/gallery-albums', data); },
  updateGalleryAlbum(id, data) { return this.put('/api/admin/gallery-albums/' + id, data); },
  deleteGalleryAlbum(id) { return this.del('/api/admin/gallery-albums/' + id); },
  reorderGalleryAlbums(order) { return this.post('/api/admin/gallery-albums/reorder', { order }); },
  addGalleryImages(albumId, images) { return this.post(`/api/admin/gallery-albums/${albumId}/images`, { images }); },
  deleteGalleryImage(id) { return this.del('/api/admin/gallery-images/' + id); },
  reorderGalleryImages(order) { return this.post('/api/admin/gallery-images/reorder', { order }); },

  adminGetProjects() { return this.get('/api/admin/projects').then(r => r.data); },
  createProject(data) { return this.post('/api/admin/projects', data); },
  updateProject(id, data) { return this.put('/api/admin/projects/' + id, data); },
  deleteProject(id) { return this.del('/api/admin/projects/' + id); },
  reorderProjects(order) { return this.post('/api/admin/projects/reorder', { order }); },
  addProjectImages(projectId, images) { return this.post(`/api/admin/projects/${projectId}/images`, { images }); },
  deleteProjectImage(id) { return this.del('/api/admin/project-images/' + id); },
  reorderProjectImages(order) { return this.post('/api/admin/project-images/reorder', { order }); },

  adminGetResources() { return this.get('/api/admin/resources').then(r => r.data); },
  createResource(data) { return this.post('/api/admin/resources', data); },
  updateResource(id, data) { return this.put('/api/admin/resources/' + id, data); },
  deleteResource(id) { return this.del('/api/admin/resources/' + id); },
  reorderResources(order) { return this.post('/api/admin/resources/reorder', { order }); },

  /* ---------------- MEDIA UPLOAD ---------------- */
  async uploadFile(file, folder, onProgress) {
    return this._uploadWithProgress('/api/admin/upload', { file, folder }, onProgress);
  },
  async uploadFiles(files, folder, onProgress) {
    const form = new FormData();
    form.append('folder', folder || 'misc');
    for (const f of files) form.append('files', f);
    return this._uploadFormWithProgress('/api/admin/upload-multi', form, onProgress);
  },
  deleteMedia(key) { return this.del('/api/admin/media?key=' + encodeURIComponent(key)); },

  _uploadWithProgress(path, { file, folder }, onProgress) {
    const form = new FormData();
    form.append('folder', folder || 'misc');
    form.append('file', file);
    return this._uploadFormWithProgress(path, form, onProgress);
  },

  _uploadFormWithProgress(path, form, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', path);
      const token = this.getToken();
      if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);

      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && json.ok) resolve(json);
          else reject(new Error(json.error || 'Upload failed'));
        } catch (e) {
          reject(new Error('Invalid server response'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(form);
    });
  }
};
