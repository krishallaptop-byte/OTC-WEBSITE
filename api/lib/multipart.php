<?php
/**
 * Manual multipart/form-data parser.
 *
 * WHY THIS EXISTS:
 * PHP's native $_FILES superglobal only correctly groups multiple uploaded
 * files under the SAME field name when the field name ends in "[]"
 * (e.g. "files[]"). The original frontend (api.js, unmodified) uses plain
 * FormData.append('files', file) in a loop — i.e. repeated parts all named
 * "files" WITHOUT brackets. Browsers send this correctly as multiple
 * separate multipart parts, but PHP's built-in parser silently keeps only
 * the LAST one and discards the rest, which would corrupt the "upload
 * multiple images" feature on every PHP host (this is standard, documented
 * PHP behavour — not specific to any one host or SAPI).
 *
 * To keep the frontend 100% unmodified, we parse the raw multipart body
 * ourselves for the two upload endpoints and return every part, correctly
 * grouped by field name, regardless of whether the field name has "[]" or
 * not. A ".user.ini" in the api/ folder disables enable_post_data_reading
 * so php://input still contains the raw body during a multipart request.
 *
 * Returns:
 *   [
 *     'fields' => ['folder' => 'misc', ...],                 // text fields
 *     'files'  => [ 'files' => [ [name, type, tmp_name, size, error], ... ],
 *                   'file'  => [ [ ... ] ] ]                  // grouped by field name
 *   ]
 * Each file entry has a real temp file at 'tmp_name' (created with
 * tmpfile()-equivalent semantics via a manually written temp path) so the
 * rest of the code can keep using move_uploaded_file()-like semantics via
 * rename()/copy().
 */

function parse_multipart_form_data(): array {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? ($_SERVER['HTTP_CONTENT_TYPE'] ?? '');
    $fields = [];
    $files = [];

    if (stripos($contentType, 'multipart/form-data') === false) {
        // Not multipart — nothing to parse (caller should fall back to $_POST/$_FILES).
        return ['fields' => $fields, 'files' => $files];
    }

    if (!preg_match('/boundary=(?:"([^"]+)"|([^;]+))/i', $contentType, $m)) {
        return ['fields' => $fields, 'files' => $files];
    }
    $boundary = $m[1] !== '' ? $m[1] : $m[2];
    $boundary = trim($boundary);

    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return ['fields' => $fields, 'files' => $files];
    }

    $delimiter = '--' . $boundary;
    // Split on the boundary; drop the first (empty) chunk and the final "--" closing chunk.
    $parts = explode($delimiter, $raw);

    foreach ($parts as $part) {
        $part = trim($part, "\r\n");
        if ($part === '' || $part === '--') continue;

        // Separate headers from body (double CRLF).
        $sep = strpos($part, "\r\n\r\n");
        if ($sep === false) continue;
        $headerBlock = substr($part, 0, $sep);
        $body = substr($part, $sep + 4);
        // Strip the trailing CRLF that precedes the next boundary.
        $body = preg_replace('/\r\n$/', '', $body);

        $headers = [];
        foreach (preg_split('/\r\n/', $headerBlock) as $line) {
            if (strpos($line, ':') === false) continue;
            [$hk, $hv] = explode(':', $line, 2);
            $headers[strtolower(trim($hk))] = trim($hv);
        }
        $disposition = $headers['content-disposition'] ?? '';
        if ($disposition === '') continue;

        if (!preg_match('/name="([^"]*)"/', $disposition, $nm)) continue;
        $fieldName = $nm[1];

        $isFile = preg_match('/filename="([^"]*)"/', $disposition, $fm);
        if ($isFile) {
            $filename = $fm[1];
            if ($filename === '') continue; // Empty file input part — skip.
            $mime = $headers['content-type'] ?? 'application/octet-stream';

            // NOTE: We intentionally do NOT use sys_get_temp_dir() here.
            // Many cPanel/shared hosts restrict PHP's open_basedir to the
            // account's home directory tree and EXCLUDE the OS-level temp
            // dir (e.g. /tmp), which silently breaks tempnam()/file_put_
            // contents() on those hosts (this was confirmed as the cause of
            // a real "Internal server error." upload failure on a live
            // cPanel deployment). uploads/ is already required to be
            // writable by the app, and always lives inside the same
            // open_basedir-allowed path, so we write temp files into a
            // uploads/.tmp/ subdirectory instead — same permissions
            // requirement as before, no new server config needed.
            $tmpDir = rtrim(UPLOAD_DIR, '/') . '/.tmp';
            if (!is_dir($tmpDir)) {
                @mkdir($tmpDir, 0755, true);
            }
            $tmpPath = @tempnam($tmpDir, 'otcup_');
            if ($tmpPath === false) {
                // Last-resort fallback: manually construct a unique path in
                // the same directory (covers the rare case where tempnam()
                // itself is restricted but plain file writes are not).
                $tmpPath = $tmpDir . '/otcup_' . bin2hex(random_bytes(8));
            }
            file_put_contents($tmpPath, $body);

            $entry = [
                'name'     => $filename,
                'type'     => $mime,
                'tmp_name' => $tmpPath,
                'size'     => strlen($body),
                'error'    => UPLOAD_ERR_OK,
            ];
            $files[$fieldName][] = $entry;
        } else {
            // Plain text field. Repeated non-file fields keep the last value
            // (matches native PHP $_POST behaviour for non-array field names).
            $fields[$fieldName] = $body;
        }
    }

    return ['fields' => $fields, 'files' => $files];
}
