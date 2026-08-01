# Orchid Tech Club — PHP + MySQL Edition (cPanel Compatible)

This is the **standard-hosting-compatible** rebuild of the Orchid Tech Club
website. The frontend (every `.html` page, all CSS, all JavaScript) is
**100% unchanged** from the original Cloudflare Workers version. Only the
backend was rewritten — from Hono/Cloudflare Workers + D1 + R2 to
**plain PHP + MySQL + local disk storage** — so the whole project can be
deployed to any ordinary shared/cPanel host by uploading files through
**cPanel File Manager**, with no Node.js, no Cloudflare account, and no
command line required.

For step-by-step deployment instructions, see **[INSTALL.md](./INSTALL.md)**.

## Project Overview

- **Name:** Orchid Tech Club — official club website + hidden admin CMS
- **Goal:** A public-facing site (Home / About / BOD History / Gallery /
  News / Resources / Projects / Membership / Contact) fully editable by
  club admins through a hidden admin panel, deployable on ordinary shared
  hosting.
- **Admin access:** Click the site logo **10 times quickly** on any page to
  reveal the hidden admin login modal.
- **Default admin credentials** (change after first login — see
  INSTALL.md "Step 6" / password-change helper):
  - Username: `ORCHIDtechCluB@OTC`
  - Password: `Otc@TechWEBadmin@143`

## What Changed From the Cloudflare Version

| Concern            | Cloudflare version         | This version                          |
|---------------------|-----------------------------|-----------------------------------------|
| Backend runtime     | Hono on Cloudflare Workers  | Plain PHP 7.4+/8.x, no framework        |
| Database            | Cloudflare D1 (SQLite)      | MySQL / MariaDB (via PDO)               |
| File storage        | Cloudflare R2               | Local disk, under `uploads/`            |
| Deployment          | `wrangler pages deploy`     | Upload via cPanel File Manager / FTP    |
| Sessions             | D1-backed bearer tokens     | MySQL-backed bearer tokens (same design)|
| Password hashing     | Web Crypto SHA-256 + salt   | PHP `hash()` SHA-256 + same salt        |
| **Frontend**         | HTML/CSS/JS                | **Identical, byte-for-byte unchanged**  |
| **API contract**     | `/api/...` JSON endpoints  | **Identical URLs, methods, JSON shapes**|

Because the API contract (URL paths + request/response JSON shapes) is
replicated exactly, the existing frontend JavaScript (`api.js`, `admin.js`,
`uploader.js`, `album-viewer.js`, `common.js`) works completely unmodified
against this new backend.

## Data Architecture

- **Database:** MySQL/MariaDB, 12 tables (see `schema.sql`):
  `admin_users`, `admin_sessions`, `site_content` (JSON blobs for
  Homepage/About/Settings/Social/Membership/Nav/Footer), `news` +
  `news_images`, `bod_years` + `bod_members`, `gallery_albums` +
  `gallery_images`, `projects` + `project_images`, `resources`.
- **File storage:** Uploaded images are saved under `uploads/<folder>/` on
  disk (e.g. `uploads/gallery/…`, `uploads/misc/…`) and served either
  directly at `/uploads/...` or via the `/media/...` alias (both work — the
  `.htaccess` rewrites `/media/*` to the physical `uploads/*` path).
- **Sessions:** Bearer tokens stored in the `admin_sessions` table with an
  expiry timestamp, checked on every `/api/admin/*` request.

## API Reference (unchanged contract, PHP-implemented)

All routes are served from a single front controller, `api/index.php`,
matching the original Hono route map 1:1:

**Public (no auth):**
`GET /api/content/:key`, `/api/content-all`, `/api/news[?category=]`,
`/api/news/:id`, `/api/bod-years`, `/api/bod-current`,
`/api/gallery-albums`, `/api/gallery-albums/:id`, `/api/projects`,
`/api/projects/:id`, `/api/resources`.

**Auth:** `POST /api/auth/login`, `POST /api/auth/logout`,
`GET /api/auth/verify` (Bearer token).

**Admin (Bearer token required):** full CRUD + reorder for `news`,
`bod-years`, `bod-members`, `gallery-albums` (+ bulk image add/delete),
`projects` (+ bulk image add/delete), `resources`; `PUT
/api/admin/content/:key`; `POST /api/admin/upload`,
`POST /api/admin/upload-multi`, `DELETE /api/admin/media?key=`.

## User Guide

1. Visit the site — browse Home, About, BOD History, Gallery, News,
   Resources, Projects, Membership, Contact like any visitor.
2. Club admins: click the logo 10× quickly → log in → manage all content,
   news, BOD history per year, gallery albums, projects, and site
   settings/homepage/about/footer/nav text from one panel.
3. Uploaded images are used directly by public pages as soon as saved —
   no rebuild/redeploy step needed (unlike the old Cloudflare version, PHP
   changes take effect immediately).

## Known Limitations / Notes

- No "change password" button in the admin UI — use the included
  `tools/generate_password_hash.php` helper + phpMyAdmin (see INSTALL.md).
- No forgot-password/email flow — this is a small single-admin club site.
- Multi-image upload requires PHP's `.user.ini` support (standard on
  PHP-FPM, which is the default PHP handler on virtually all modern cPanel
  hosts) — see the Troubleshooting section in INSTALL.md if bulk image
  uploads only save one file on your specific host.

## Deployment

- **Platform:** Any standard shared/cPanel hosting (Apache + PHP + MySQL)
- **Status:** ✅ Tested locally end-to-end (auth, full CRUD for every
  module, reorder, single + multi file upload, media serving) — see
  INSTALL.md before going live on a real host.
- **Tech stack:** Plain PHP 7.4+/8.x (no framework) + MySQL/MariaDB (PDO) +
  Apache `.htaccess` rewriting + local disk file storage. Frontend:
  unchanged HTML/CSS/vanilla JS with Tailwind CSS and Font Awesome via CDN.
- **Deployment method:** Upload via cPanel File Manager (zip + extract, or
  individual file upload) — see [INSTALL.md](./INSTALL.md) for the full
  step-by-step guide including database setup.
