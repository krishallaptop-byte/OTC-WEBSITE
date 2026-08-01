<?php
/**
 * Admin media upload/delete — stores files on local disk under UPLOAD_DIR
 * (equivalent to the original R2 bucket), returning public /uploads/... URLs.
 *
 * Uses lib/multipart.php's manual parser instead of relying purely on the
 * native $_FILES superglobal, because the unmodified frontend sends
 * repeated "files" parts (no "[]" suffix) for multi-upload, which PHP's
 * built-in parser would otherwise collapse down to just the last file.
 * Falls back to $_FILES/$_POST automatically if the manual parser finds
 * nothing (e.g. .user.ini not yet picked up by PHP-FPM on a fresh deploy).
 */

function ensure_upload_dir(string $subdir): string {
    $path = rtrim(UPLOAD_DIR, '/') . '/' . trim($subdir, '/');
    if (!is_dir($path)) {
        mkdir($path, 0755, true);
    }
    return $path;
}

function sanitize_folder(string $folder): string {
    $folder = preg_replace('/[^a-zA-Z0-9\/_-]/', '', $folder);
    $folder = trim($folder, '/');
    return $folder !== '' ? $folder : 'misc';
}

/**
 * Save a parsed-file-entry (array with name/type/tmp_name/size/error,
 * either from our manual multipart parser or from a native $_FILES slot)
 * to disk. Returns the storage key (relative path under uploads/) or
 * throws a RuntimeException with a user-facing message on failure.
 */
function save_uploaded_entry(array $entry, string $folder): array {
    if (($entry['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Upload error (code ' . $entry['error'] . ').');
    }
    $tmpName = $entry['tmp_name'];
    $mime = @mime_content_type($tmpName) ?: ($entry['type'] ?? 'application/octet-stream');
    if (!isset(ALLOWED_MIME_TYPES[$mime])) {
        throw new RuntimeException("Unsupported file type: $mime");
    }
    $size = $entry['size'] ?? (is_file($tmpName) ? filesize($tmpName) : 0);
    if ($size > MAX_UPLOAD_SIZE) {
        throw new RuntimeException('File too large. Max size is 8MB.');
    }

    $ext = ALLOWED_MIME_TYPES[$mime];
    $baseName = substr(slugify(pathinfo($entry['name'], PATHINFO_FILENAME)), 0, 40);
    $key = $folder . '/' . round(microtime(true) * 1000) . '-' . substr(bin2hex(random_bytes(3)), 0, 5) . '-' . $baseName . '.' . $ext;

    ensure_upload_dir($folder);
    $destPath = rtrim(UPLOAD_DIR, '/') . '/' . $key;

    // Files produced by our manual parser are plain temp files (written via
    // file_put_contents), NOT recognised by PHP as "uploaded" — so
    // move_uploaded_file() would reject them. Native $_FILES entries (the
    // fallback path) ARE real uploaded files and must use
    // move_uploaded_file() (required by PHP for security). Detect which
    // case we're in and use the right function.
    $moved = is_uploaded_file($tmpName)
        ? move_uploaded_file($tmpName, $destPath)
        : rename($tmpName, $destPath);

    if (!$moved) {
        throw new RuntimeException('Failed to save uploaded file. Check uploads/ folder permissions.');
    }
    @chmod($destPath, 0644);

    return ['key' => $key, 'name' => $entry['name']];
}

/**
 * Resolve the incoming request into a uniform shape regardless of whether
 * our manual multipart parser or native PHP superglobals captured it.
 * Returns ['fields' => [...], 'files' => ['field' => [entry, entry, ...]]]
 */
function resolve_upload_request(): array {
    $parsed = parse_multipart_form_data();
    if (!empty($parsed['files']) || !empty($parsed['fields'])) {
        return $parsed;
    }

    // Fallback: native $_FILES / $_POST (used if enable_post_data_reading
    // override in .user.ini hasn't taken effect yet on this host).
    $files = [];
    foreach ($_FILES as $fieldName => $data) {
        if (is_array($data['name'])) {
            $count = count($data['name']);
            for ($i = 0; $i < $count; $i++) {
                if (($data['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
                $files[$fieldName][] = [
                    'name'     => $data['name'][$i],
                    'type'     => $data['type'][$i],
                    'tmp_name' => $data['tmp_name'][$i],
                    'size'     => $data['size'][$i],
                    'error'    => $data['error'][$i],
                ];
            }
        } else {
            if (($data['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
            $files[$fieldName][] = $data;
        }
    }
    return ['fields' => $_POST, 'files' => $files];
}

/**
 * POST /api/admin/upload
 * multipart/form-data: file, folder (optional)
 */
function route_admin_upload(PDO $pdo): void {
    $req = resolve_upload_request();
    $entries = $req['files']['file'] ?? [];
    if (empty($entries)) {
        json_response(['ok' => false, 'error' => 'No file provided.'], 400);
    }
    $folder = sanitize_folder($req['fields']['folder'] ?? 'misc');

    try {
        $saved = save_uploaded_entry($entries[0], $folder);
    } catch (RuntimeException $e) {
        json_response(['ok' => false, 'error' => $e->getMessage()], 400);
    }

    json_response(['ok' => true, 'url' => UPLOAD_URL_PREFIX . '/' . $saved['key'], 'key' => $saved['key']]);
}

/**
 * POST /api/admin/upload-multi
 * multipart/form-data: files (repeated, no "[]" needed), folder (optional)
 */
function route_admin_upload_multi(PDO $pdo): void {
    $req = resolve_upload_request();
    $entries = $req['files']['files'] ?? [];
    if (empty($entries)) {
        json_response(['ok' => false, 'error' => 'No files provided.'], 400);
    }
    $folder = sanitize_folder($req['fields']['folder'] ?? 'misc');

    $uploaded = [];
    $errors = [];

    foreach ($entries as $entry) {
        try {
            $saved = save_uploaded_entry($entry, $folder);
            $uploaded[] = ['url' => UPLOAD_URL_PREFIX . '/' . $saved['key'], 'key' => $saved['key'], 'name' => $saved['name']];
        } catch (RuntimeException $e) {
            $errors[] = ($entry['name'] ?? 'file') . ': ' . $e->getMessage();
        }
    }

    json_response(['ok' => true, 'uploaded' => $uploaded, 'errors' => $errors]);
}

/**
 * DELETE /api/admin/media?key=...
 */
function route_admin_delete_media(PDO $pdo): void {
    $key = $_GET['key'] ?? '';
    if ($key === '') json_response(['ok' => false, 'error' => 'key query param required.'], 400);

    // Prevent path traversal outside the uploads directory.
    $key = str_replace('..', '', $key);
    $path = rtrim(UPLOAD_DIR, '/') . '/' . ltrim($key, '/');
    if (is_file($path)) unlink($path);

    json_response(['ok' => true]);
}
