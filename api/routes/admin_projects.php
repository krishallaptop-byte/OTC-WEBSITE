<?php
/**
 * Admin: Projects + Project Images full CRUD + reorder.
 */

function route_admin_get_projects(PDO $pdo): void {
    $projects = $pdo->query('SELECT * FROM projects ORDER BY sort_order ASC')->fetchAll();
    $ids = array_column($projects, 'id');
    $imagesByProject = [];
    if ($ids) {
        $stmt = $pdo->prepare('SELECT * FROM project_images WHERE project_id IN (' . in_placeholders($ids) . ') ORDER BY sort_order ASC');
        $stmt->execute($ids);
        foreach ($stmt->fetchAll() as $img) $imagesByProject[$img['project_id']][] = $img;
    }
    $data = array_map(function ($p) use ($imagesByProject) {
        $p['images'] = $imagesByProject[$p['id']] ?? [];
        return $p;
    }, $projects);
    json_response(['ok' => true, 'data' => $data]);
}

function route_admin_create_project(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || empty($b['title'])) json_response(['ok' => false, 'error' => 'Title is required.'], 400);

    $nextOrder = next_sort_order($pdo, 'projects');

    $stmt = $pdo->prepare('INSERT INTO projects (title, tag, description, status, thumbnail, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$b['title'], $b['tag'] ?? '', $b['description'] ?? '', $b['status'] ?? 'Ongoing', $b['thumbnail'] ?? '', $nextOrder]);
    $projectId = (int) $pdo->lastInsertId();

    if (!empty($b['images']) && is_array($b['images'])) {
        $ins = $pdo->prepare('INSERT INTO project_images (project_id, url, caption, sort_order) VALUES (?, ?, ?, ?)');
        foreach (array_values($b['images']) as $i => $img) {
            $url = is_array($img) ? ($img['url'] ?? '') : $img;
            $caption = is_array($img) ? ($img['caption'] ?? '') : '';
            $ins->execute([$projectId, $url, $caption, $i]);
        }
    }

    json_response(['ok' => true, 'id' => $projectId]);
}

function route_admin_update_project(PDO $pdo, string $id): void {
    $b = read_json_body();
    if (!$b || empty($b['title'])) json_response(['ok' => false, 'error' => 'Title is required.'], 400);

    $stmt = $pdo->prepare('UPDATE projects SET title=?, tag=?, description=?, status=?, thumbnail=? WHERE id=?');
    $stmt->execute([$b['title'], $b['tag'] ?? '', $b['description'] ?? '', $b['status'] ?? 'Ongoing', $b['thumbnail'] ?? '', $id]);

    json_response(['ok' => true]);
}

function route_admin_delete_project(PDO $pdo, string $id): void {
    $pdo->prepare('DELETE FROM projects WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function route_admin_reorder_projects(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || !isset($b['order']) || !is_array($b['order'])) {
        json_response(['ok' => false, 'error' => 'order[] required'], 400);
    }
    $stmt = $pdo->prepare('UPDATE projects SET sort_order = ? WHERE id = ?');
    foreach (array_values($b['order']) as $i => $id) $stmt->execute([$i, $id]);
    json_response(['ok' => true]);
}

/* ---------------- PROJECT IMAGES ---------------- */

function route_admin_add_project_images(PDO $pdo, string $projectId): void {
    $b = read_json_body();
    if (!$b || !isset($b['images']) || !is_array($b['images'])) {
        json_response(['ok' => false, 'error' => 'images[] required'], 400);
    }

    $nextOrder = next_sort_order($pdo, 'project_images', 'project_id', $projectId, -1);

    $inserted = [];
    $ins = $pdo->prepare('INSERT INTO project_images (project_id, url, caption, sort_order) VALUES (?, ?, ?, ?)');
    foreach ($b['images'] as $img) {
        $url = is_array($img) ? ($img['url'] ?? '') : $img;
        $caption = is_array($img) ? ($img['caption'] ?? '') : '';
        $ins->execute([$projectId, $url, $caption, $nextOrder++]);
        $inserted[] = (int) $pdo->lastInsertId();
    }

    json_response(['ok' => true, 'ids' => $inserted]);
}

function route_admin_delete_project_image(PDO $pdo, string $id): void {
    $pdo->prepare('DELETE FROM project_images WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function route_admin_reorder_project_images(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || !isset($b['order']) || !is_array($b['order'])) {
        json_response(['ok' => false, 'error' => 'order[] required'], 400);
    }
    $stmt = $pdo->prepare('UPDATE project_images SET sort_order = ? WHERE id = ?');
    foreach (array_values($b['order']) as $i => $id) $stmt->execute([$i, $id]);
    json_response(['ok' => true]);
}
