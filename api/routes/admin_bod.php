<?php
/**
 * Admin: BOD Years + BOD Members full CRUD + reorder.
 */

function route_admin_get_bod_years(PDO $pdo): void {
    $years = $pdo->query('SELECT * FROM bod_years ORDER BY sort_order ASC')->fetchAll();
    $ids = array_column($years, 'id');
    $membersByYear = [];
    if ($ids) {
        $stmt = $pdo->prepare('SELECT * FROM bod_members WHERE year_id IN (' . in_placeholders($ids) . ') ORDER BY sort_order ASC');
        $stmt->execute($ids);
        foreach ($stmt->fetchAll() as $m) $membersByYear[$m['year_id']][] = $m;
    }
    $data = array_map(function ($y) use ($membersByYear) {
        $y['is_current'] = (bool) $y['is_current'];
        $y['members'] = $membersByYear[$y['id']] ?? [];
        return $y;
    }, $years);
    json_response(['ok' => true, 'data' => $data]);
}

function route_admin_create_bod_year(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || empty($b['title'])) json_response(['ok' => false, 'error' => 'Title is required.'], 400);

    $nextOrder = next_sort_order($pdo, 'bod_years');

    if (!empty($b['is_current'])) {
        $pdo->exec('UPDATE bod_years SET is_current = 0');
    }

    $stmt = $pdo->prepare('INSERT INTO bod_years (title, is_current, sort_order) VALUES (?, ?, ?)');
    $stmt->execute([$b['title'], !empty($b['is_current']) ? 1 : 0, $nextOrder]);

    json_response(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
}

function route_admin_update_bod_year(PDO $pdo, string $id): void {
    $b = read_json_body();
    if (!$b || empty($b['title'])) json_response(['ok' => false, 'error' => 'Title is required.'], 400);

    if (!empty($b['is_current'])) {
        $pdo->exec('UPDATE bod_years SET is_current = 0');
    }

    $stmt = $pdo->prepare('UPDATE bod_years SET title=?, is_current=? WHERE id=?');
    $stmt->execute([$b['title'], !empty($b['is_current']) ? 1 : 0, $id]);

    json_response(['ok' => true]);
}

function route_admin_delete_bod_year(PDO $pdo, string $id): void {
    $pdo->prepare('DELETE FROM bod_years WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function route_admin_reorder_bod_years(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || !isset($b['order']) || !is_array($b['order'])) {
        json_response(['ok' => false, 'error' => 'order[] required'], 400);
    }
    $stmt = $pdo->prepare('UPDATE bod_years SET sort_order = ? WHERE id = ?');
    foreach (array_values($b['order']) as $i => $id) $stmt->execute([$i, $id]);
    json_response(['ok' => true]);
}

/* ---------------- BOD MEMBERS ---------------- */

function route_admin_create_bod_member(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || empty($b['name']) || empty($b['position']) || empty($b['year_id'])) {
        json_response(['ok' => false, 'error' => 'name, position and year_id are required.'], 400);
    }

    $nextOrder = next_sort_order($pdo, 'bod_members', 'year_id', $b['year_id']);

    $stmt = $pdo->prepare(
        'INSERT INTO bod_members (year_id, name, position, photo, facebook, linkedin, github, description, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $b['year_id'],
        $b['name'],
        $b['position'],
        $b['photo'] ?? '',
        $b['facebook'] ?? '',
        $b['linkedin'] ?? '',
        $b['github'] ?? '',
        $b['description'] ?? '',
        $nextOrder,
    ]);

    json_response(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
}

function route_admin_update_bod_member(PDO $pdo, string $id): void {
    $b = read_json_body();
    if (!$b || empty($b['name']) || empty($b['position'])) {
        json_response(['ok' => false, 'error' => 'name and position are required.'], 400);
    }

    $stmt = $pdo->prepare(
        'UPDATE bod_members SET name=?, position=?, photo=?, facebook=?, linkedin=?, github=?, description=? WHERE id=?'
    );
    $stmt->execute([
        $b['name'], $b['position'], $b['photo'] ?? '', $b['facebook'] ?? '',
        $b['linkedin'] ?? '', $b['github'] ?? '', $b['description'] ?? '', $id,
    ]);

    json_response(['ok' => true]);
}

function route_admin_delete_bod_member(PDO $pdo, string $id): void {
    $pdo->prepare('DELETE FROM bod_members WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function route_admin_reorder_bod_members(PDO $pdo): void {
    $b = read_json_body();
    if (!$b || !isset($b['order']) || !is_array($b['order'])) {
        json_response(['ok' => false, 'error' => 'order[] required'], 400);
    }
    $stmt = $pdo->prepare('UPDATE bod_members SET sort_order = ? WHERE id = ?');
    foreach (array_values($b['order']) as $i => $id) $stmt->execute([$i, $id]);
    json_response(['ok' => true]);
}
