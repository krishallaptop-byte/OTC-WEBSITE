<?php
/**
 * Admin: Gallery Albums + Gallery Images full CRUD + reorder.
 */

function route_admin_get_gallery_albums(PDO $pdo): void {
    $albums = $pdo->query('SELECT * FROM gallery_albums ORDER BY sort_order ASC')->fetchAll();
    $ids = array_column($albums, 'id');
    $imagesByAlbum = [];
    if ($ids) {
        $stmt = $pdo->prepare('SELECT * FROM gallery_images WHERE album_id IN (' . in_placeholders($ids) . ') ORDER BY sort_order ASC');
        $stmt->execute($ids);
        foreach ($stmt->fetchAll() as $img) $imagesByAlbum[$img['album_id']][] = $img;
    }
    $data = array_map(function ($a) use ($imagesByAlbum) {
        $a['images'] = $imagesByAlbum[$a['id']] ?? [];
        return $a;
    }, $albums);
    json_response(['ok' => true, 'data' => $data]);
}

function route_admin_create_gallery_album(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || empty($b['name']) || empty($b['event_date'])) {
        json_response(['ok' => false, 'error' => 'name and event_date are required.'], 400);
    }
    $nextOrder = next_sort_order($pdo, 'gallery_albums');

    $stmt = $pdo->prepare('INSERT INTO gallery_albums (name, event_date, cover_image, description, sort_order) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$b['name'], $b['event_date'], $b['cover_image'] ?? '', $b['description'] ?? '', $nextOrder]);
    $albumId = (int) $pdo->lastInsertId();

    if (!empty($b['images']) && is_array($b['images'])) {
        $ins = $pdo->prepare('INSERT INTO gallery_images (album_id, url, caption, sort_order) VALUES (?, ?, ?, ?)');
        foreach (array_values($b['images']) as $i => $img) {
            $url = is_array($img) ? ($img['url'] ?? '') : $img;
            $caption = is_array($img) ? ($img['caption'] ?? '') : '';
            $ins->execute([$albumId, $url, $caption, $i]);
        }
    }

    json_response(['ok' => true, 'id' => $albumId]);
}

function route_admin_update_gallery_album(PDO $pdo, string $id): void {
    $b = read_json_body();
    if (!$b || empty($b['name']) || empty($b['event_date'])) {
        json_response(['ok' => false, 'error' => 'name and event_date are required.'], 400);
    }
    $stmt = $pdo->prepare('UPDATE gallery_albums SET name=?, event_date=?, cover_image=?, description=? WHERE id=?');
    $stmt->execute([$b['name'], $b['event_date'], $b['cover_image'] ?? '', $b['description'] ?? '', $id]);
    json_response(['ok' => true]);
}

function route_admin_delete_gallery_album(PDO $pdo, string $id): void {
    $pdo->prepare('DELETE FROM gallery_albums WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function route_admin_reorder_gallery_albums(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || !isset($b['order']) || !is_array($b['order'])) {
        json_response(['ok' => false, 'error' => 'order[] required'], 400);
    }
    $stmt = $pdo->prepare('UPDATE gallery_albums SET sort_order = ? WHERE id = ?');
    foreach (array_values($b['order']) as $i => $id) $stmt->execute([$i, $id]);
    json_response(['ok' => true]);
}

/* ---------------- ALBUM IMAGES ---------------- */

function route_admin_add_gallery_images(PDO $pdo, string $albumId): void {
    $b = read_json_body();
    if (!$b || !isset($b['images']) || !is_array($b['images'])) {
        json_response(['ok' => false, 'error' => 'images[] required'], 400);
    }

    $nextOrder = next_sort_order($pdo, 'gallery_images', 'album_id', $albumId, -1);

    $inserted = [];
    $ins = $pdo->prepare('INSERT INTO gallery_images (album_id, url, caption, sort_order) VALUES (?, ?, ?, ?)');
    foreach ($b['images'] as $img) {
        $url = is_array($img) ? ($img['url'] ?? '') : $img;
        $caption = is_array($img) ? ($img['caption'] ?? '') : '';
        $ins->execute([$albumId, $url, $caption, $nextOrder++]);
        $inserted[] = (int) $pdo->lastInsertId();
    }

    json_response(['ok' => true, 'ids' => $inserted]);
}

function route_admin_delete_gallery_image(PDO $pdo, string $id): void {
    $pdo->prepare('DELETE FROM gallery_images WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function route_admin_reorder_gallery_images(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || !isset($b['order']) || !is_array($b['order'])) {
        json_response(['ok' => false, 'error' => 'order[] required'], 400);
    }
    $stmt = $pdo->prepare('UPDATE gallery_images SET sort_order = ? WHERE id = ?');
    foreach (array_values($b['order']) as $i => $id) $stmt->execute([$i, $id]);
    json_response(['ok' => true]);
}
