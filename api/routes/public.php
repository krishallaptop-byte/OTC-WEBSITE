<?php
/**
 * Public, read-only API — no authentication required.
 * Mirrors src/routes/public.ts from the Cloudflare Workers version exactly.
 */

const CONTENT_KEYS = ['homepage', 'about', 'settings', 'social', 'membership', 'nav', 'footer'];

function route_get_content(PDO $pdo, string $key): void {
    if (!in_array($key, CONTENT_KEYS, true)) {
        json_response(['ok' => false, 'error' => 'Unknown content key'], 404);
    }
    $stmt = $pdo->prepare('SELECT value FROM site_content WHERE `key` = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if (!$row) json_response(['ok' => true, 'data' => new stdClass()]);
    json_response(['ok' => true, 'data' => json_decode($row['value'])]);
}

function route_get_content_all(PDO $pdo): void {
    $rows = $pdo->query('SELECT `key`, value FROM site_content')->fetchAll();
    $out = new stdClass();
    foreach ($rows as $row) {
        $out->{$row['key']} = json_decode($row['value']);
    }
    json_response(['ok' => true, 'data' => $out]);
}

function route_get_news_list(PDO $pdo): void {
    $category = $_GET['category'] ?? null;
    $sql = "SELECT * FROM news WHERE status = 'published'";
    $binds = [];
    if ($category && $category !== 'all') {
        $sql .= ' AND category = ?';
        $binds[] = $category;
    }
    $sql .= ' ORDER BY pinned DESC, sort_order ASC, `date` DESC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($binds);
    $newsRows = $stmt->fetchAll();

    $imagesByNews = [];
    $ids = array_column($newsRows, 'id');
    if ($ids) {
        $stmt = $pdo->prepare('SELECT * FROM news_images WHERE news_id IN (' . in_placeholders($ids) . ') ORDER BY sort_order ASC');
        $stmt->execute($ids);
        foreach ($stmt->fetchAll() as $img) {
            $imagesByNews[$img['news_id']][] = $img;
        }
    }

    $data = array_map(function ($n) use ($imagesByNews) {
        $n['pinned'] = (bool) $n['pinned'];
        $n['images'] = $imagesByNews[$n['id']] ?? [];
        return $n;
    }, $newsRows);

    json_response(['ok' => true, 'data' => $data]);
}

function route_get_news_item(PDO $pdo, string $id): void {
    $stmt = $pdo->prepare('SELECT * FROM news WHERE id = ?');
    $stmt->execute([$id]);
    $item = $stmt->fetch();
    if (!$item) json_response(['ok' => false, 'error' => 'Not found'], 404);

    $stmt = $pdo->prepare('SELECT * FROM news_images WHERE news_id = ? ORDER BY sort_order ASC');
    $stmt->execute([$id]);
    $item['pinned'] = (bool) $item['pinned'];
    $item['images'] = $stmt->fetchAll();
    json_response(['ok' => true, 'data' => $item]);
}

function route_get_bod_years(PDO $pdo): void {
    $years = $pdo->query('SELECT * FROM bod_years ORDER BY sort_order ASC')->fetchAll();
    $membersByYear = [];
    $ids = array_column($years, 'id');
    if ($ids) {
        $stmt = $pdo->prepare('SELECT * FROM bod_members WHERE year_id IN (' . in_placeholders($ids) . ') ORDER BY sort_order ASC');
        $stmt->execute($ids);
        foreach ($stmt->fetchAll() as $m) {
            $membersByYear[$m['year_id']][] = $m;
        }
    }
    $data = array_map(function ($y) use ($membersByYear) {
        $y['is_current'] = (bool) $y['is_current'];
        $y['members'] = $membersByYear[$y['id']] ?? [];
        return $y;
    }, $years);
    json_response(['ok' => true, 'data' => $data]);
}

function route_get_bod_current(PDO $pdo): void {
    $year = $pdo->query('SELECT * FROM bod_years WHERE is_current = 1 LIMIT 1')->fetch();
    if (!$year) json_response(['ok' => true, 'data' => null]);
    $stmt = $pdo->prepare('SELECT * FROM bod_members WHERE year_id = ? ORDER BY sort_order ASC');
    $stmt->execute([$year['id']]);
    $year['is_current'] = true;
    $year['members'] = $stmt->fetchAll();
    json_response(['ok' => true, 'data' => $year]);
}

function route_get_gallery_albums(PDO $pdo): void {
    $albums = $pdo->query('SELECT * FROM gallery_albums ORDER BY sort_order ASC, event_date DESC')->fetchAll();
    $countByAlbum = [];
    $ids = array_column($albums, 'id');
    if ($ids) {
        $stmt = $pdo->prepare('SELECT album_id, COUNT(*) as cnt FROM gallery_images WHERE album_id IN (' . in_placeholders($ids) . ') GROUP BY album_id');
        $stmt->execute($ids);
        foreach ($stmt->fetchAll() as $row) $countByAlbum[$row['album_id']] = (int) $row['cnt'];
    }
    $data = array_map(function ($a) use ($countByAlbum) {
        $a['image_count'] = $countByAlbum[$a['id']] ?? 0;
        return $a;
    }, $albums);
    json_response(['ok' => true, 'data' => $data]);
}

function route_get_gallery_album(PDO $pdo, string $id): void {
    $stmt = $pdo->prepare('SELECT * FROM gallery_albums WHERE id = ?');
    $stmt->execute([$id]);
    $album = $stmt->fetch();
    if (!$album) json_response(['ok' => false, 'error' => 'Not found'], 404);
    $stmt = $pdo->prepare('SELECT * FROM gallery_images WHERE album_id = ? ORDER BY sort_order ASC');
    $stmt->execute([$id]);
    $album['images'] = $stmt->fetchAll();
    json_response(['ok' => true, 'data' => $album]);
}

function route_get_projects(PDO $pdo): void {
    $data = $pdo->query('SELECT * FROM projects ORDER BY sort_order ASC')->fetchAll();
    json_response(['ok' => true, 'data' => $data]);
}

function route_get_project(PDO $pdo, string $id): void {
    $stmt = $pdo->prepare('SELECT * FROM projects WHERE id = ?');
    $stmt->execute([$id]);
    $project = $stmt->fetch();
    if (!$project) json_response(['ok' => false, 'error' => 'Not found'], 404);
    $stmt = $pdo->prepare('SELECT * FROM project_images WHERE project_id = ? ORDER BY sort_order ASC');
    $stmt->execute([$id]);
    $project['images'] = $stmt->fetchAll();
    json_response(['ok' => true, 'data' => $project]);
}

function route_get_resources(PDO $pdo): void {
    $data = $pdo->query('SELECT * FROM resources ORDER BY sort_order ASC')->fetchAll();
    json_response(['ok' => true, 'data' => $data]);
}
