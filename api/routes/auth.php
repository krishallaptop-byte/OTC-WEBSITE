<?php
/**
 * Authentication routes: login / logout / verify.
 */

function route_login(PDO $pdo): void {
    $body = read_json_body();
    if (!$body || empty($body['username']) || empty($body['password'])) {
        json_response(['ok' => false, 'error' => 'Username and password are required.'], 400);
    }

    $stmt = $pdo->prepare('SELECT * FROM admin_users WHERE username = ?');
    $stmt->execute([$body['username']]);
    $admin = $stmt->fetch();

    if (!$admin) {
        json_response(['ok' => false, 'error' => 'Invalid username or password.'], 401);
    }

    $hash = hash_password($body['password']);
    if (!hash_equals($admin['password_hash'], $hash)) {
        json_response(['ok' => false, 'error' => 'Invalid username or password.'], 401);
    }

    $token = generate_token();
    create_session($pdo, (int) $admin['id'], $token);

    json_response([
        'ok' => true,
        'token' => $token,
        'admin' => ['id' => (int) $admin['id'], 'username' => $admin['username'], 'role' => $admin['role']],
    ]);
}

function route_logout(PDO $pdo): void {
    require_auth($pdo);
    $token = extract_bearer_token();
    if ($token !== '') delete_session($pdo, $token);
    json_response(['ok' => true]);
}

function route_verify(PDO $pdo): void {
    $adminId = require_auth($pdo);
    json_response(['ok' => true, 'adminId' => $adminId]);
}
