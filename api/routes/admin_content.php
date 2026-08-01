<?php
/**
 * Admin: site_content JSON-blob upsert (homepage, about, settings, ...).
 */

function route_admin_save_content(PDO $pdo, string $key): void {
    if (!in_array($key, CONTENT_KEYS, true)) {
        json_response(['ok' => false, 'error' => 'Unknown content key'], 400);
    }
    $body = read_json_body();
    if ($body === null) {
        json_response(['ok' => false, 'error' => 'Invalid JSON body'], 400);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO site_content (`key`, value, updated_at) VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()'
    );
    $stmt->execute([$key, json_encode($body)]);

    json_response(['ok' => true]);
}
