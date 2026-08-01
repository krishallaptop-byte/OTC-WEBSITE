<?php
/**
 * Standalone helper — NOT part of the live site, NOT web-routed.
 * Run from the command line (or briefly via browser then DELETE this file)
 * to generate a new admin password hash for the `admin_users` table.
 *
 * Usage (SSH/CLI):   php generate_password_hash.php "MyNewPassword123!"
 * Usage (browser):   yourdomain.com/tools/generate_password_hash.php?password=MyNewPassword123!
 *                    (delete this file immediately after use if you upload it — it has no auth)
 *
 * Then in phpMyAdmin, run:
 *   UPDATE admin_users SET password_hash = '<the hash printed below>' WHERE username = 'ORCHIDtechCluB@OTC';
 */

const PASSWORD_SALT = 'orchid_tech_club_salt_v1';

$password = $argv[1] ?? ($_GET['password'] ?? null);

if (!$password) {
    echo "Usage: php generate_password_hash.php \"YourNewPassword\"\n";
    exit(1);
}

$hash = hash('sha256', PASSWORD_SALT . $password);

if (php_sapi_name() === 'cli') {
    echo "New password hash for \"$password\":\n$hash\n\n";
    echo "Run this in phpMyAdmin's SQL tab:\n";
    echo "UPDATE admin_users SET password_hash = '$hash' WHERE username = 'ORCHIDtechCluB@OTC';\n";
} else {
    header('Content-Type: text/plain');
    echo "New password hash:\n$hash\n\n";
    echo "Run this in phpMyAdmin's SQL tab:\n";
    echo "UPDATE admin_users SET password_hash = '$hash' WHERE username = 'ORCHIDtechCluB@OTC';\n\n";
    echo "SECURITY: delete this file (tools/generate_password_hash.php) from your server now.\n";
}
