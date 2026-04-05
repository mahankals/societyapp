<?php
/**
 * Auth Helper Functions
 */

function isLoggedIn(): bool {
    return Session::has('user_id') && !empty(Session::get('user_id'));
}

function isAdmin(): bool {
    return Session::get('role') === 'admin';
}

function requireLogin(): void {
    if (!isLoggedIn()) {
        $currentUrl = $_SERVER['REQUEST_URI'] ?? '/';
        if (!empty($currentUrl) && $currentUrl !== '/') {
            Session::put('return_url', $currentUrl);
        }
        redirect('/auth/login');
    }
}

function requireAdmin(): void {
    requireLogin();
    if (!isAdmin()) {
        http_response_code(403);
        $loader = new \Twig\Loader\FilesystemLoader(__DIR__ . '/../views');
        $twig = new \Twig\Environment($loader, ['debug' => true]);
        echo $twig->render('errors/403.html.twig');
        exit;
    }
}

function getUser(): ?array {
    if (!isLoggedIn()) {
        return null;
    }
    return Database::fetchOne(
        "SELECT id, email, name, google_id, role, pin_hash, created_at FROM users WHERE id = ?",
        [Session::get('user_id')]
    );
}

function getUserProfile(): ?array {
    if (!isLoggedIn()) {
        return null;
    }
    return Database::fetchOne(
        "SELECT * FROM user_profiles WHERE user_id = ?",
        [Session::get('user_id')]
    );
}

function loginUser(int $userId, string $role, string $email): void {
    Session::put('user_id', $userId);
    Session::put('role', $role);
    Session::put('email', $email);
    Session::put('last_activity', time());
    Session::put('login_time', time());
    session_regenerate_id(true);
}

function logoutUser(): void {
    Session::destroy();
}

function redirect(string $url): void {
    header('Location: ' . $url);
    exit;
}

function sanitize($data) {
    if (is_array($data)) {
        return array_map('sanitize', $data);
    }
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

function generateCSRFToken(): string {
    if (!Session::has('csrf_token')) {
        Session::put('csrf_token', bin2hex(random_bytes(32)));
    }
    return Session::get('csrf_token');
}

function verifyCSRFToken(string $token): bool {
    return Session::has('csrf_token') && hash_equals(Session::get('csrf_token'), $token);
}

function view(string $name, array $data = []): string {
    $config = require __DIR__ . '/../../config/app.php';
    $loader = new \Twig\Loader\FilesystemLoader(__DIR__ . '/../views');
    $twig = new \Twig\Environment($loader, [
        'debug' => $config['app']['debug'],
        'strict_variables' => false,
    ]);

    $data['appConfig'] = $config;
    return $twig->render($name . '.html.twig', $data);
}

function asset(string $path): string {
    return '/assets/' . ltrim($path, '/');
}
