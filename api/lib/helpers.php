<?php
/**
 * Small shared HTTP helpers used across every route file.
 */

function json_response($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function read_json_body(): ?array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return null;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function next_sort_order(PDO $pdo, string $table, ?string $whereCol = null, $whereVal = null, int $default = 0): int {
    if ($whereCol !== null) {
        $stmt = $pdo->prepare("SELECT COALESCE(MAX(sort_order), ?) AS m FROM `$table` WHERE `$whereCol` = ?");
        $stmt->execute([$default, $whereVal]);
    } else {
        $stmt = $pdo->prepare("SELECT COALESCE(MAX(sort_order), ?) AS m FROM `$table`");
        $stmt->execute([$default]);
    }
    $row = $stmt->fetch();
    return ((int) $row['m']) + 1;
}

function apply_cors(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/** Build the placeholders string "?,?,?" for an IN (...) clause. */
function in_placeholders(array $arr): string {
    return implode(',', array_fill(0, count($arr), '?'));
}
