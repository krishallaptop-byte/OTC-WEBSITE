<?php
/**
 * =========================================================
 * ORCHID TECH CLUB — DATABASE & APP CONFIGURATION
 * =========================================================
 * Edit the DB_* constants below with the MySQL database
 * credentials from your cPanel "MySQL Databases" section.
 *
 * Typical cPanel database/user names look like:
 *   DB_NAME => cpanelusername_otcwebsite
 *   DB_USER => cpanelusername_otcuser
 * =========================================================
 */

// ---------- DATABASE CREDENTIALS (EDIT THESE) ----------
define('DB_HOST', 'localhost');
define('DB_NAME', 'otc_website');
define('DB_USER', 'otc_user');
define('DB_PASS', 'otc_pass_2026');
define('DB_CHARSET', 'utf8mb4');

// ---------- APP SETTINGS ----------
// Static salt used when hashing admin passwords (keep this secret & unchanged
// after go-live, otherwise existing password hashes will stop matching).
define('PASSWORD_SALT', 'orchid_tech_club_salt_v1');

// Session token lifetime, in seconds (7 days)
define('SESSION_TTL_SECONDS', 60 * 60 * 24 * 7);

// Absolute filesystem path to the folder where uploaded files are stored.
// Must be writable by the web server (chmod 755 or 775).
define('UPLOAD_DIR', __DIR__ . '/../uploads');

// Public URL prefix used to build links to uploaded files (no trailing slash).
// If your site lives in a subfolder on cPanel (e.g. https://example.com/otc/),
// change this to '/otc/uploads'.
define('UPLOAD_URL_PREFIX', '/uploads');

// Max upload size per file, in bytes (8MB)
define('MAX_UPLOAD_SIZE', 8 * 1024 * 1024);

// Allowed image mime types => file extension
define('ALLOWED_MIME_TYPES', [
    'image/jpeg'    => 'jpg',
    'image/jpg'     => 'jpg',
    'image/png'     => 'png',
    'image/webp'    => 'webp',
    'image/gif'     => 'gif',
    'image/svg+xml' => 'svg',
]);

// ---------- PDO CONNECTION ----------
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['ok' => false, 'error' => 'Database connection failed. Check config.php credentials.']);
            exit;
        }
    }
    return $pdo;
}
