<?php
/**
 * =========================================================
 * ORCHID TECH CLUB — API FRONT CONTROLLER (PHP / MySQL)
 * =========================================================
 * All requests to /api/* are routed through this single file
 * (see the .htaccess in the project root). It reproduces the
 * exact same route map as the original Cloudflare Worker.
 * =========================================================
 */

declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0'); // never leak PHP errors/HTML into JSON responses

require __DIR__ . '/config.php';
require __DIR__ . '/lib/helpers.php';
require __DIR__ . '/lib/crypto.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/multipart.php';
require __DIR__ . '/routes/public.php';
require __DIR__ . '/routes/auth.php';
require __DIR__ . '/routes/admin_content.php';
require __DIR__ . '/routes/admin_news.php';
require __DIR__ . '/routes/admin_bod.php';
require __DIR__ . '/routes/admin_gallery.php';
require __DIR__ . '/routes/admin_projects.php';
require __DIR__ . '/routes/admin_resources.php';
require __DIR__ . '/routes/media.php';

apply_cors();

set_exception_handler(function (Throwable $e) {
    error_log('OTC API error: ' . $e->getMessage());
    json_response(['ok' => false, 'error' => 'Internal server error.'], 500);
});

$pdo = db();

// Path relative to /api/, e.g. "news", "bod-years/3", "admin/news/5"
$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])); // .../api
$fullPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
$path = '/' . ltrim(substr($fullPath, strlen($scriptDir)), '/');
$path = rtrim($path, '/');
if ($path === '') $path = '/';
$segments = array_values(array_filter(explode('/', $path), fn($s) => $s !== ''));
$method = $_SERVER['REQUEST_METHOD'];

/**
 * $segments examples for a request to /api/admin/gallery-albums/3/images:
 *   ['admin', 'gallery-albums', '3', 'images']
 * for /api/news/5:
 *   ['news', '5']
 */

function seg(array $s, int $i): ?string {
    return $s[$i] ?? null;
}

// ---------------------------------------------------------
// /api/auth/*
// ---------------------------------------------------------
if (seg($segments, 0) === 'auth') {
    $sub = seg($segments, 1);
    if ($sub === 'login' && $method === 'POST') { route_login($pdo); }
    if ($sub === 'logout' && $method === 'POST') { route_logout($pdo); }
    if ($sub === 'verify' && $method === 'GET') { route_verify($pdo); }
    json_response(['ok' => false, 'error' => 'Not found'], 404);
}

// ---------------------------------------------------------
// /api/admin/* (all require Bearer token)
// ---------------------------------------------------------
if (seg($segments, 0) === 'admin') {
    require_auth($pdo); // sends 401 + exits if not authenticated
    $s = array_slice($segments, 1); // drop "admin"
    $r0 = seg($s, 0);
    $r1 = seg($s, 1);
    $r2 = seg($s, 2);

    // ---- content ----
    if ($r0 === 'content' && $r1 !== null && $method === 'PUT') { route_admin_save_content($pdo, $r1); }

    // ---- news ----
    if ($r0 === 'news' && $r1 === null && $method === 'GET') { route_admin_get_news($pdo); }
    if ($r0 === 'news' && $r1 === null && $method === 'POST') { route_admin_create_news($pdo); }
    if ($r0 === 'news' && $r1 === 'reorder' && $method === 'POST') { route_admin_reorder_news($pdo); }
    if ($r0 === 'news' && $r1 !== null && $method === 'PUT') { route_admin_update_news($pdo, $r1); }
    if ($r0 === 'news' && $r1 !== null && $method === 'DELETE') { route_admin_delete_news($pdo, $r1); }

    // ---- bod-years ----
    if ($r0 === 'bod-years' && $r1 === null && $method === 'GET') { route_admin_get_bod_years($pdo); }
    if ($r0 === 'bod-years' && $r1 === null && $method === 'POST') { route_admin_create_bod_year($pdo); }
    if ($r0 === 'bod-years' && $r1 === 'reorder' && $method === 'POST') { route_admin_reorder_bod_years($pdo); }
    if ($r0 === 'bod-years' && $r1 !== null && $method === 'PUT') { route_admin_update_bod_year($pdo, $r1); }
    if ($r0 === 'bod-years' && $r1 !== null && $method === 'DELETE') { route_admin_delete_bod_year($pdo, $r1); }

    // ---- bod-members ----
    if ($r0 === 'bod-members' && $r1 === null && $method === 'POST') { route_admin_create_bod_member($pdo); }
    if ($r0 === 'bod-members' && $r1 === 'reorder' && $method === 'POST') { route_admin_reorder_bod_members($pdo); }
    if ($r0 === 'bod-members' && $r1 !== null && $method === 'PUT') { route_admin_update_bod_member($pdo, $r1); }
    if ($r0 === 'bod-members' && $r1 !== null && $method === 'DELETE') { route_admin_delete_bod_member($pdo, $r1); }

    // ---- gallery-albums ----
    if ($r0 === 'gallery-albums' && $r1 === null && $method === 'GET') { route_admin_get_gallery_albums($pdo); }
    if ($r0 === 'gallery-albums' && $r1 === null && $method === 'POST') { route_admin_create_gallery_album($pdo); }
    if ($r0 === 'gallery-albums' && $r1 === 'reorder' && $method === 'POST') { route_admin_reorder_gallery_albums($pdo); }
    if ($r0 === 'gallery-albums' && $r1 !== null && $r2 === 'images' && $method === 'POST') { route_admin_add_gallery_images($pdo, $r1); }
    if ($r0 === 'gallery-albums' && $r1 !== null && $r2 === null && $method === 'PUT') { route_admin_update_gallery_album($pdo, $r1); }
    if ($r0 === 'gallery-albums' && $r1 !== null && $r2 === null && $method === 'DELETE') { route_admin_delete_gallery_album($pdo, $r1); }

    // ---- gallery-images ----
    if ($r0 === 'gallery-images' && $r1 === 'reorder' && $method === 'POST') { route_admin_reorder_gallery_images($pdo); }
    if ($r0 === 'gallery-images' && $r1 !== null && $method === 'DELETE') { route_admin_delete_gallery_image($pdo, $r1); }

    // ---- projects ----
    if ($r0 === 'projects' && $r1 === null && $method === 'GET') { route_admin_get_projects($pdo); }
    if ($r0 === 'projects' && $r1 === null && $method === 'POST') { route_admin_create_project($pdo); }
    if ($r0 === 'projects' && $r1 === 'reorder' && $method === 'POST') { route_admin_reorder_projects($pdo); }
    if ($r0 === 'projects' && $r1 !== null && $r2 === 'images' && $method === 'POST') { route_admin_add_project_images($pdo, $r1); }
    if ($r0 === 'projects' && $r1 !== null && $r2 === null && $method === 'PUT') { route_admin_update_project($pdo, $r1); }
    if ($r0 === 'projects' && $r1 !== null && $r2 === null && $method === 'DELETE') { route_admin_delete_project($pdo, $r1); }

    // ---- project-images ----
    if ($r0 === 'project-images' && $r1 === 'reorder' && $method === 'POST') { route_admin_reorder_project_images($pdo); }
    if ($r0 === 'project-images' && $r1 !== null && $method === 'DELETE') { route_admin_delete_project_image($pdo, $r1); }

    // ---- resources ----
    if ($r0 === 'resources' && $r1 === null && $method === 'GET') { route_admin_get_resources($pdo); }
    if ($r0 === 'resources' && $r1 === null && $method === 'POST') { route_admin_create_resource($pdo); }
    if ($r0 === 'resources' && $r1 === 'reorder' && $method === 'POST') { route_admin_reorder_resources($pdo); }
    if ($r0 === 'resources' && $r1 !== null && $method === 'PUT') { route_admin_update_resource($pdo, $r1); }
    if ($r0 === 'resources' && $r1 !== null && $method === 'DELETE') { route_admin_delete_resource($pdo, $r1); }

    // ---- media upload/delete ----
    if ($r0 === 'upload' && $method === 'POST') { route_admin_upload($pdo); }
    if ($r0 === 'upload-multi' && $method === 'POST') { route_admin_upload_multi($pdo); }
    if ($r0 === 'media' && $method === 'DELETE') { route_admin_delete_media($pdo); }

    json_response(['ok' => false, 'error' => 'Not found'], 404);
}

// ---------------------------------------------------------
// Public read-only API
// ---------------------------------------------------------
$r0 = seg($segments, 0);
$r1 = seg($segments, 1);

if ($r0 === 'content' && $r1 !== null && $method === 'GET') { route_get_content($pdo, $r1); }
if ($r0 === 'content-all' && $method === 'GET') { route_get_content_all($pdo); }

if ($r0 === 'news' && $r1 === null && $method === 'GET') { route_get_news_list($pdo); }
if ($r0 === 'news' && $r1 !== null && $method === 'GET') { route_get_news_item($pdo, $r1); }

if ($r0 === 'bod-years' && $method === 'GET') { route_get_bod_years($pdo); }
if ($r0 === 'bod-current' && $method === 'GET') { route_get_bod_current($pdo); }

if ($r0 === 'gallery-albums' && $r1 === null && $method === 'GET') { route_get_gallery_albums($pdo); }
if ($r0 === 'gallery-albums' && $r1 !== null && $method === 'GET') { route_get_gallery_album($pdo, $r1); }

if ($r0 === 'projects' && $r1 === null && $method === 'GET') { route_get_projects($pdo); }
if ($r0 === 'projects' && $r1 !== null && $method === 'GET') { route_get_project($pdo, $r1); }

if ($r0 === 'resources' && $method === 'GET') { route_get_resources($pdo); }

json_response(['ok' => false, 'error' => 'Not found'], 404);
