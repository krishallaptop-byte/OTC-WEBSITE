<?php
/**
 * Session-based Bearer token authentication.
 */

function create_session(PDO $pdo, int $adminId, string $token): void {
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_TTL_SECONDS);
    $stmt = $pdo->prepare('INSERT INTO admin_sessions (token, admin_id, expires_at) VALUES (?, ?, ?)');
    $stmt->execute([$token, $adminId, $expiresAt]);
}

function get_session(PDO $pdo, string $token): ?array {
    if ($token === '') return null;
    $stmt = $pdo->prepare('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > NOW()');
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function delete_session(PDO $pdo, string $token): void {
    $stmt = $pdo->prepare('DELETE FROM admin_sessions WHERE token = ?');
    $stmt->execute([$token]);
}

function extract_bearer_token(): string {
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';

    // Some Apache/cPanel setups strip the Authorization header from
    // $_SERVER; getallheaders() is a reliable fallback in that case.
    if ($header === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strtolower($name) === 'authorization') {
                $header = $value;
                break;
            }
        }
    }

    if (stripos($header, 'Bearer ') === 0) {
        return substr($header, 7);
    }
    return '';
}

/**
 * Call at the top of any admin-protected route. Sends a 401 JSON
 * response and stops execution if the request is not authenticated.
 * Returns the admin_id of the authenticated session on success.
 */
function require_auth(PDO $pdo): int {
    $token = extract_bearer_token();
    $session = get_session($pdo, $token);
    if (!$session) {
        json_response(['ok' => false, 'error' => 'Unauthorized. Please log in again.'], 401);
    }
    return (int) $session['admin_id'];
}
