<?php
/**
 * Admin: Resources full CRUD + reorder.
 */

function route_admin_get_resources(PDO $pdo): void {
    $data = $pdo->query('SELECT * FROM resources ORDER BY sort_order ASC')->fetchAll();
    json_response(['ok' => true, 'data' => $data]);
}

function route_admin_create_resource(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || empty($b['title'])) json_response(['ok' => false, 'error' => 'Title is required.'], 400);

    $nextOrder = next_sort_order($pdo, 'resources');

    $stmt = $pdo->prepare('INSERT INTO resources (title, description, logo, url, category, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$b['title'], $b['description'] ?? '', $b['logo'] ?? '', $b['url'] ?? '', $b['category'] ?? 'General', $nextOrder]);

    json_response(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
}

function route_admin_update_resource(PDO $pdo, string $id): void {
    $b = read_json_body();
    if (!$b || empty($b['title'])) json_response(['ok' => false, 'error' => 'Title is required.'], 400);

    $stmt = $pdo->prepare('UPDATE resources SET title=?, description=?, logo=?, url=?, category=? WHERE id=?');
    $stmt->execute([$b['title'], $b['description'] ?? '', $b['logo'] ?? '', $b['url'] ?? '', $b['category'] ?? 'General', $id]);

    json_response(['ok' => true]);
}

function route_admin_delete_resource(PDO $pdo, string $id): void {
    $pdo->prepare('DELETE FROM resources WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function route_admin_reorder_resources(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || !isset($b['order']) || !is_array($b['order'])) {
        json_response(['ok' => false, 'error' => 'order[] required'], 400);
    }
    $stmt = $pdo->prepare('UPDATE resources SET sort_order = ? WHERE id = ?');
    foreach (array_values($b['order']) as $i => $id) $stmt->execute([$i, $id]);
    json_response(['ok' => true]);
}
