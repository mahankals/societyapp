<?php
/**
 * Session Management
 */

class Session {
    private static bool $started = false;

    public static function init(): void {
        if (self::$started) {
            return;
        }

        $config = require __DIR__ . '/../../config/session.php';
        $lifetime = (int)($config['lifetime'] ?? 3600);

        $storagePath = defined('ROOT_PATH') ? ROOT_PATH . '/storage/sessions' : __DIR__ . '/../../storage/sessions';
        if (!is_dir($storagePath)) {
            @mkdir($storagePath, 0777, true);
        }
        if (is_dir($storagePath) && is_writable($storagePath)) {
            session_save_path($storagePath);
        }

        // Synchronize PHP session garbage collection with configured lifetime
        ini_set('session.gc_maxlifetime', (string)$lifetime);

        $isSecure = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
            || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443)
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower((string)$_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https');

        session_name($config['name']);
        session_set_cookie_params([
            'lifetime' => $lifetime,
            'path' => '/',
            'domain' => '',
            'secure' => $isSecure,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        if (session_status() === PHP_SESSION_NONE) {
            session_cache_limiter(''); // Disable PHP's automatic no-cache headers
            session_start();
        }

        self::$started = true;

        // Check if session has timed out based on previous activity
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > $lifetime) {
            self::destroy();
            session_name($config['name']);
            session_start();
            self::$started = true;
        }

        if (!isset($_SESSION['initiated'])) {
            $_SESSION['initiated'] = true;
            $_SESSION['created_at'] = time();
        }

        $_SESSION['last_activity'] = time();

        if (!headers_sent()) {
            setcookie($config['name'], session_id(), [
                'expires' => time() + $lifetime,
                'path' => '/',
                'domain' => '',
                'secure' => $isSecure,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
        }
    }

    public static function isExpired(?int $timeout = null): bool {
        $config = require __DIR__ . '/../../config/session.php';
        $timeout = $timeout ?? (int)($config['lifetime'] ?? 3600);
        return isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > $timeout;
    }

    public static function destroy(): void {
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
        self::$started = false;
    }

    public static function put(string $key, mixed $value): void {
        $_SESSION[$key] = $value;
    }

    public static function get(string $key, mixed $default = null): mixed {
        return $_SESSION[$key] ?? $default;
    }

    public static function has(string $key): bool {
        return isset($_SESSION[$key]);
    }

    public static function forget(string $key): void {
        unset($_SESSION[$key]);
    }

    public static function flash(string $type, string $message): void {
        $_SESSION['flash'] = ['type' => $type, 'message' => $message];
    }

    public static function getFlash(): ?array {
        if (isset($_SESSION['flash'])) {
            $flash = $_SESSION['flash'];
            unset($_SESSION['flash']);
            return $flash;
        }
        return null;
    }
}
