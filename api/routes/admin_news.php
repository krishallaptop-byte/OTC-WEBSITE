<?php
/**
 * Admin: News & Notices full CRUD + reorder + per-item images.
 */

function route_admin_get_news(PDO $pdo): void {
    $rows = $pdo->query('SELECT * FROM news ORDER BY pinned DESC, sort_order ASC, `date` DESC')->fetchAll();
    $ids = array_column($rows, 'id');
    $imagesByNews = [];
    if ($ids) {
        $stmt = $pdo->prepare('SELECT * FROM news_images WHERE news_id IN (' . in_placeholders($ids) . ') ORDER BY sort_order ASC');
        $stmt->execute($ids);
        foreach ($stmt->fetchAll() as $img) $imagesByNews[$img['news_id']][] = $img;
    }
    $data = array_map(function ($n) use ($imagesByNews) {
        $n['pinned'] = (bool) $n['pinned'];
        $n['images'] = $imagesByNews[$n['id']] ?? [];
        return $n;
    }, $rows);
    json_response(['ok' => true, 'data' => $data]);
}

function route_admin_create_news(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || empty($b['title'])) json_response(['ok' => false, 'error' => 'Title is required.'], 400);

    $nextOrder = next_sort_order($pdo, 'news');

    $stmt = $pdo->prepare(
        'INSERT INTO news (title, category, `date`, body, excerpt, cover_image, status, pinned, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $b['title'],
        $b['category'] ?? 'notice',
        $b['date'] ?? date('Y-m-d'),
        $b['body'] ?? '',
        $b['excerpt'] ?? '',
        $b['cover_image'] ?? '',
        $b['status'] ?? 'draft',
        !empty($b['pinned']) ? 1 : 0,
        $nextOrder,
    ]);
    $newsId = (int) $pdo->lastInsertId();

    if (!empty($b['images']) && is_array($b['images'])) {
        $ins = $pdo->prepare('INSERT INTO news_images (news_id, url, sort_order) VALUES (?, ?, ?)');
        foreach (array_values($b['images']) as $i => $url) $ins->execute([$newsId, $url, $i]);
    }

    json_response(['ok' => true, 'id' => $newsId]);
}

function route_admin_update_news(PDO $pdo, string $id): void {
    $b = read_json_body();
    if (!$b || empty($b['title'])) json_response(['ok' => false, 'error' => 'Title is required.'], 400);

    $stmt = $pdo->prepare(
        'UPDATE news SET title=?, category=?, `date`=?, body=?, excerpt=?, cover_image=?, status=?, pinned=?, updated_at=NOW() WHERE id=?'
    );
    $stmt->execute([
        $b['title'],
        $b['category'] ?? 'notice',
        $b['date'] ?? date('Y-m-d'),
        $b['body'] ?? '',
        $b['excerpt'] ?? '',
        $b['cover_image'] ?? '',
        $b['status'] ?? 'draft',
        !empty($b['pinned']) ? 1 : 0,
        $id,
    ]);

    if (isset($b['images']) && is_array($b['images'])) {
        $pdo->prepare('DELETE FROM news_images WHERE news_id = ?')->execute([$id]);
        $ins = $pdo->prepare('INSERT INTO news_images (news_id, url, sort_order) VALUES (?, ?, ?)');
        foreach (array_values($b['images']) as $i => $url) $ins->execute([$id, $url, $i]);
    }

    json_response(['ok' => true]);
}

function route_admin_delete_news(PDO $pdo, string $id): void {
    $pdo->prepare('DELETE FROM news WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function route_admin_reorder_news(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || !isset($b['order']) || !is_array($b['order'])) {
        json_response(['ok' => false, 'error' => 'order[] required'], 400);
    }
    $stmt = $pdo->prepare('UPDATE news SET sort_order = ? WHERE id = ?');
    foreach (array_values($b['order']) as $i => $id) $stmt->execute([$i, $id]);
    json_response(['ok' => true]);
}
