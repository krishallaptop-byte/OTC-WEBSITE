/* =========================================================
   ORCHID TECH CLUB — COMMON SITE SCRIPT
   Header / Footer injection, navigation, lightbox,
   back-to-top, and the secret admin-login trigger.
   Now driven by the centralized D1/R2 backend via OTCApi —
   header/footer/nav content updates instantly for every
   visitor without redeploying any code.
   ========================================================= */

const OTC_LOGO_DEFAULT = '/static/images/logo.png';
const OTC_NAV_FALLBACK = [
  { href: 'index.html', label: 'Home' },
  { href: 'about.html', label: 'About' },
  { href: 'bod-history.html', label: 'BOD History' },
  { href: 'gallery.html', label: 'Gallery' },
  { href: 'news.html', label: 'News & Notices' },
  { href: 'resources.html', label: 'Resources' },
  { href: 'projects.html', label: 'Projects' },
  { href: 'membership.html', label: 'Membership' },
  { href: 'contact.html', label: 'Contact' }
];

function otcPageKeyFromHref(href) {
  return (href || '').replace('.html', '') || 'home';
}

async function otcRenderHeader(activeKey) {
  const mount = document.getElementById('site-header');
  if (!mount) return;

  let settings = {};
  let nav = { links: OTC_NAV_FALLBACK };
  try {
    const all = await OTCApi.getAllContent();
    if (all.settings) settings = all.settings;
    if (all.nav && Array.isArray(all.nav.links) && all.nav.links.length) nav = all.nav;
  } catch (e) { /* fall back to defaults below */ }

  const logo = settings.logo || OTC_LOGO_DEFAULT;
  const clubName = settings.clubName || 'Orchid Tech Club';
  const [clubWord1, ...clubRest] = clubName.split(' ');
  const clubRestWord = clubRest.join(' ') || 'TECH CLUB';

  const linksHtml = nav.links.map(l => {
    const key = otcPageKeyFromHref(l.href);
    return `<a href="${l.href}" class="${key === activeKey ? 'active' : ''}">${l.label}</a>`;
  }).join('');

  mount.innerHTML = `
  <nav class="navbar">
    <div class="nav-inner container">
      <a href="index.html" class="brand">
        <img src="${logo}" alt="${clubName} Logo" class="brand-logo" id="otc-logo-trigger" title="">
        <span class="brand-text">${clubWord1.toUpperCase()}<br><small>${clubRestWord.toUpperCase()}</small></span>
      </a>
      <div class="nav-links" id="nav-links">${linksHtml}</div>
      <div class="nav-actions">
        <a href="membership.html" class="btn btn-primary btn-sm">Join Us</a>
        <button class="nav-toggle" id="nav-toggle" aria-label="Menu"><i class="fas fa-bars"></i></button>
      </div>
    </div>
  </nav>`;

  const toggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  otcInitLogoClickCounter();
}

async function otcRenderFooter() {
  const mount = document.getElementById('site-footer');
  if (!mount) return;
  const year = new Date().getFullYear();

  let settings = {};
  let social = {};
  let footer = { quickLinks: [], connectLinks: [] };
  try {
    const all = await OTCApi.getAllContent();
    if (all.settings) settings = all.settings;
    if (all.social) social = all.social;
    if (all.footer) footer = all.footer;
  } catch (e) { /* use defaults */ }

  const logo = settings.logo || OTC_LOGO_DEFAULT;
  const clubName = (settings.clubName || 'Orchid Tech Club').toUpperCase();
  const footerText = settings.footerText || 'Innovate. Build. Lead. Together we create a better tomorrow through technology, collaboration and continuous learning.';
  const copyright = settings.copyright || '© Orchid Tech Club. All rights reserved.';
  const quickLinks = (footer.quickLinks && footer.quickLinks.length) ? footer.quickLinks : [
    { label: 'About', href: 'about.html' }, { label: 'BOD History', href: 'bod-history.html' },
    { label: 'Projects', href: 'projects.html' }, { label: 'Resources', href: 'resources.html' }
  ];
  const connectLinks = (footer.connectLinks && footer.connectLinks.length) ? footer.connectLinks : [
    { label: 'Gallery', href: 'gallery.html' }, { label: 'News & Notices', href: 'news.html' },
    { label: 'Membership', href: 'membership.html' }, { label: 'Contact', href: 'contact.html' }
  ];

  function socialIcon(key, url, iconClass) {
    if (!url) return '';
    return `<a href="${url}" target="_blank" rel="noopener"><i class="fab ${iconClass}"></i></a>`;
  }

  mount.innerHTML = `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="footer-brand">
            <img src="${logo}" alt="logo">
            <span class="name">${clubName}</span>
          </div>
          <p>${footerText}</p>
          <div class="social-icons">
            ${socialIcon('facebook', social.facebook, 'fa-facebook-f')}
            ${socialIcon('instagram', social.instagram, 'fa-instagram')}
            ${socialIcon('linkedin', social.linkedin, 'fa-linkedin-in')}
            ${socialIcon('youtube', social.youtube, 'fa-youtube')}
            ${socialIcon('github', social.github, 'fa-github')}
          </div>
        </div>
        <div>
          <h5>Quick Links</h5>
          <ul>${quickLinks.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join('')}</ul>
        </div>
        <div>
          <h5>Connect With Us</h5>
          <ul>${connectLinks.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join('')}</ul>
        </div>
        <div>
          <h5>Contact Info</h5>
          <ul>
            <li><i class="fas fa-envelope"></i> ${settings.email || 'orchidtechclub@gmail.com'}</li>
            <li><i class="fas fa-map-marker-alt"></i> ${settings.address || 'Dharan-11, Chitwan, Nepal'}</li>
            <li><i class="fas fa-phone"></i> ${settings.phone || '+977 980-0000000'}</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">${copyright.includes(String(year)) ? copyright : `© ${year} ` + copyright.replace(/^©\s*/, '')}</div>
    </div>
  </footer>
  <button class="back-to-top" id="back-to-top"><i class="fas fa-arrow-up"></i></button>
  <div class="click-hint" id="click-hint"></div>
  `;

  const btt = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) btt.classList.add('show'); else btt.classList.remove('show');
  });
  btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---------------- LIGHTBOX (simple single-image, legacy use) ---------------- */
function otcInitLightbox() {
  let overlay = document.getElementById('otc-lightbox');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.id = 'otc-lightbox';
    overlay.innerHTML = `<button class="lightbox-close" id="otc-lightbox-close"><i class="fas fa-times"></i></button><img id="otc-lightbox-img" src="" alt="preview">`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('show'); });
    document.getElementById('otc-lightbox-close').addEventListener('click', () => overlay.classList.remove('show'));
  }

  document.querySelectorAll('[data-lightbox]').forEach(el => {
    if (el.dataset.lightboxBound) return;
    el.dataset.lightboxBound = '1';
    el.addEventListener('click', () => {
      document.getElementById('otc-lightbox-img').src = el.getAttribute('data-lightbox');
      overlay.classList.add('show');
    });
  });
}

/* =========================================================
   SECRET ADMIN ACCESS SYSTEM
   Click the club logo 10 times consecutively (within a
   short time window) to reveal the hidden admin login panel.
   Credentials are now verified server-side via /api/auth/login
   (no credentials are ever exposed in client-side JS).
   ========================================================= */
const OTC_CLICK_TARGET = 10;
const OTC_CLICK_TIMEOUT = 2500; // ms between clicks before counter resets

let otcClickCount = 0;
let otcClickTimer = null;

function otcInitLogoClickCounter() {
  const logo = document.getElementById('otc-logo-trigger');
  if (!logo) return;

  logo.addEventListener('click', (e) => {
    e.preventDefault();

    otcClickCount++;
    clearTimeout(otcClickTimer);
    otcClickTimer = setTimeout(() => { otcClickCount = 0; }, OTC_CLICK_TIMEOUT);

    if (otcClickCount >= OTC_CLICK_TARGET) {
      otcClickCount = 0;
      clearTimeout(otcClickTimer);
      otcOpenLoginModal();
    }
  });
}

function otcBuildLoginModal() {
  if (document.getElementById('otc-admin-login-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'admin-overlay';
  overlay.id = 'otc-admin-login-overlay';
  overlay.innerHTML = `
    <div class="login-panel">
      <button class="close-login" id="otc-close-login"><i class="fas fa-times"></i></button>
      <img src="${OTC_LOGO_DEFAULT}" class="mini-logo" alt="logo">
      <h3>Admin Access</h3>
      <div class="sub">Restricted area — authorized personnel only</div>
      <form id="otc-login-form">
        <div class="form-group">
          <label>Username</label>
          <input type="text" class="form-control" id="otc-username" autocomplete="off" placeholder="Enter admin username" required>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" class="form-control" id="otc-password" autocomplete="off" placeholder="Enter admin password" required>
        </div>
        <span class="login-error" id="otc-login-error"></span>
        <button type="submit" class="btn btn-primary btn-block" id="otc-login-submit" style="margin-top:10px;">
          <i class="fas fa-unlock-keyhole"></i> Login
        </button>
      </form>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('otc-close-login').addEventListener('click', otcCloseLoginModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) otcCloseLoginModal(); });

  document.getElementById('otc-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('otc-username').value.trim();
    const p = document.getElementById('otc-password').value;
    const errBox = document.getElementById('otc-login-error');
    const submitBtn = document.getElementById('otc-login-submit');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    errBox.style.color = 'var(--danger)';
    errBox.textContent = '';

    try {
      await OTCApi.login(u, p);
      errBox.style.color = 'var(--success)';
      errBox.textContent = 'Access granted. Redirecting...';
      setTimeout(() => { window.location.href = 'admin.html'; }, 500);
    } catch (err) {
      errBox.style.color = 'var(--danger)';
      errBox.textContent = err.message || 'Invalid username or password.';
      document.getElementById('otc-password').value = '';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-unlock-keyhole"></i> Login';
    }
  });
}

function otcOpenLoginModal() {
  otcBuildLoginModal();
  document.getElementById('otc-admin-login-overlay').classList.add('show');
  setTimeout(() => document.getElementById('otc-username')?.focus(), 100);
}
function otcCloseLoginModal() {
  const overlay = document.getElementById('otc-admin-login-overlay');
  if (overlay) overlay.classList.remove('show');
  const err = document.getElementById('otc-login-error');
  if (err) err.textContent = '';
  const form = document.getElementById('otc-login-form');
  if (form) form.reset();
}

/* ---------------- INIT ON EVERY PAGE ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const active = document.body.getAttribute('data-page') || '';
  otcRenderHeader(active);
  otcRenderFooter();
  setTimeout(otcInitLightbox, 50);
});
