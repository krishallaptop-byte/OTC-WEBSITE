# Orchid Tech Club — cPanel Installation Guide (PHP + MySQL)

This is the **cPanel File Manager compatible** version of the Orchid Tech Club
website. It requires only standard shared hosting: **PHP 7.4+ (8.x
recommended) and MySQL/MariaDB** — no Node.js, no special server access, no
SSH required. Everything below can be done through the cPanel web UI.

## What You Need

- A cPanel hosting account with:
  - PHP 7.4 or newer (8.0–8.4 all work)
  - PHP extensions: `pdo_mysql`, `mbstring`, `fileinfo`, `json` (these are
    enabled by default on virtually every cPanel host)
  - A MySQL/MariaDB database
  - `mod_rewrite` enabled (also on by default on cPanel/Apache)

## Step 1 — Create the MySQL Database

1. In cPanel, open **MySQL® Databases**.
2. Under "Create New Database", enter a name (e.g. `otcwebsite`) and click
   **Create Database**. cPanel will usually prefix it, e.g.
   `youruser_otcwebsite` — note the **full** prefixed name.
3. Under "MySQL Users → Add New User", create a user with a strong password.
   Note the full prefixed username, e.g. `youruser_otcadmin`.
4. Under "Add User To Database", add the new user to the new database and
   grant **ALL PRIVILEGES**.

## Step 2 — Import the Database Schema and Seed Data

1. In cPanel, open **phpMyAdmin**.
2. Select your new database in the left sidebar.
3. Click the **Import** tab.
4. Click **Choose File**, select `schema.sql` from this package, and click
   **Go**. This creates all 12 tables.
5. Repeat the **Import** step with `seed.sql`. This populates the site with
   the same demo content (news, BOD history, gallery, projects, resources,
   and the admin login) that the original site shipped with.
   - Admin login credentials are seeded automatically:
     **username:** `ORCHIDtechCluB@OTC`  **password:** `Otc@TechWEBadmin@143`
6. Confirm success: click the `site_content` table and check that the
   `value` column for each row shows readable JSON (not garbled text).

## Step 3 — Configure Database Credentials

1. Open **File Manager** (or upload the project first — see Step 4 — then
   come back to this step).
2. Edit `api/config.php`.
3. Update these four lines with the credentials from Step 1:
   ```php
   define('DB_HOST', 'localhost');           // almost always 'localhost' on cPanel
   define('DB_NAME', 'youruser_otcwebsite');  // your full prefixed DB name
   define('DB_USER', 'youruser_otcadmin');    // your full prefixed DB user
   define('DB_PASS', 'your-actual-password');
   ```
4. Save the file.

## Step 4 — Upload the Files

1. In cPanel **File Manager**, navigate to `public_html` (or the
   subdirectory/subdomain document root you want the site to live at).
2. Upload the provided `.zip` of this project and use **Extract** (right
   click → Extract) to unpack it directly into that folder — OR upload each
   file/folder individually if your host doesn't support zip extraction.
3. After extracting, `public_html/` (or your target folder) should directly
   contain: `index.html`, `admin.html`, `.htaccess`, the `api/`, `static/`,
   and `uploads/` folders, etc. — **not** nested inside an extra
   subfolder. If the zip extracted into a subfolder (e.g.
   `public_html/webapp-php/`), move everything up one level.

## Step 5 — Set `uploads/` Folder Permissions

The `uploads/` folder must be writable by PHP so the admin panel can save
uploaded images.

1. In File Manager, right-click the `uploads` folder → **Change Permissions**.
2. Set permissions to **755** (or **775**/**777** only if 755 doesn't work on
   your specific host — try 755 first, it's sufficient on almost all cPanel
   accounts since PHP runs as your own user).

## Step 6 — Verify

1. Visit your domain — the homepage should load with full styling and content.
2. Click the Orchid Tech Club logo **10 times quickly** to open the hidden
   admin login modal (same secret trigger as the original site).
3. Log in with the seeded admin credentials above.
4. Try editing homepage content, adding a news item, and uploading an image
   to confirm the database and file uploads both work end-to-end.
5. **Change the admin password** afterwards if this is a public production
   site. There is no "change password" button in the admin UI yet, but you
   can change it directly via phpMyAdmin using the included helper script:
   - Run `php tools/generate_password_hash.php "YourNewPassword"` (via SSH
     if your host has it), or open
     `yourdomain.com/tools/generate_password_hash.php?password=YourNewPassword`
     in a browser (then **delete `tools/generate_password_hash.php` from
     the server immediately after**, since it has no login protection).
   - Copy the printed `UPDATE admin_users SET password_hash = '...' WHERE
     username = 'ORCHIDtechCluB@OTC';` line and run it in phpMyAdmin's SQL tab.

## Folder Structure Reference

```
public_html/                  (or wherever you extracted the project)
├── index.html, about.html, admin.html, ... (all original pages, unchanged)
├── static/                   CSS, JS, images (unchanged from the original site)
├── .htaccess                 Rewrites /api/* and /media/* — do not delete
├── api/
│   ├── index.php             Single front controller for all /api/* requests
│   ├── config.php            <-- EDIT THIS with your DB credentials
│   ├── .htaccess, .user.ini  Security + PHP settings — do not delete
│   ├── lib/                  Internal PHP libraries (blocked from direct web access)
│   └── routes/                Internal PHP route handlers (blocked from direct web access)
├── uploads/                  Uploaded images land here — must stay writable
├── schema.sql                 Already imported in Step 2 — safe to delete after setup
└── seed.sql                    Already imported in Step 2 — safe to delete after setup
```

## Troubleshooting

**"Database connection failed" on every page**
→ Double-check `api/config.php` — the DB name/user/pass must be the FULL
  cPanel-prefixed values (e.g. `youruser_otcwebsite`, not just `otcwebsite`).

**Homepage loads but shows no content / blank sections**
→ Re-check that `seed.sql` imported without errors and that the
  `site_content` table has 7 rows with valid-looking JSON in `phpMyAdmin`.

**Uploading ONE image works, but "Add Multiple Images" to a gallery album or
project only saves the first image, or gives an error**
→ This means your host hasn't picked up the `.user.ini` setting yet.
  `.user.ini` files are read by PHP-FPM (the PHP handler used by almost all
  modern cPanel hosts) automatically, but can take a few minutes to be
  picked up (`user_ini.cache_ttl`, default 300 seconds) after upload. Wait
  5 minutes and try again. If it still doesn't work, ask your host to
  confirm PHP is running as **PHP-FPM** (not legacy "DSO"/"suPHP" — if it's
  one of those older handlers, ask them to switch, or as a workaround add
  images one at a time using "Add Single Image" instead).

**Admin login says "Unauthorized" immediately after logging in**
→ Clear your browser's localStorage for the site domain and try again —
  usually caused by a stale token from testing on a different domain/port.

**404 on every `/api/...` request**
→ Confirm `mod_rewrite` is enabled and the root `.htaccess` file was
  actually uploaded (some FTP clients/zip tools hide dotfiles by default —
  make sure "show hidden files" is on in File Manager, or re-upload the zip
  and use Extract instead of drag-and-drop).

**Images don't display / broken image icons**
→ Check that the `uploads/` folder has permission **755** and that its own
  `.htaccess` file was uploaded (it blocks script execution for security but
  still allows normal image serving).
