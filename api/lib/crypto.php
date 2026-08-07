<?php
/**
 * Crypto / helper functions — mirrors the original Cloudflare Worker's
 * Web Crypto implementation exactly, so existing password hashes and
 * client-side expectations keep working unchanged.
 */

function hash_password(string $password): string {
    return hash('sha256', PASSWORD_SALT . $password);
}

function generate_token(): string {
    return bin2hex(random_bytes(32));
}

function slugify(string $text): string {
    $text = strtolower(trim($text));
    $text = preg_replace('/[^\w\s-]/', '', $text);
    $text = preg_replace('/[\s_-]+/', '-', $text);
    $text = trim($text, '-');
    return $text !== '' ? $text : 'item';
}
