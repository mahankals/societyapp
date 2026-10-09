<?php
/**
 * Session Configuration
 */

if (!function_exists('parseSessionLifetime')) {
    /**
     * Parse human-readable session lifetime strings into seconds.
     * Examples: '1hr', '60min', '30min', '7d', '30d', or '3600'.
     * Defaults to 3600 seconds (60 minutes).
     */
    function parseSessionLifetime(mixed $value): int {
        if (empty($value)) {
            return 3600; // default 60 min
        }
        if (is_numeric($value)) {
            return max(60, (int)$value);
        }
        $val = strtolower(trim((string)$value));
        if (preg_match('/^(\d+)\s*(d|day|days)$/', $val, $m)) {
            return (int)$m[1] * 86400;
        }
        if (preg_match('/^(\d+)\s*(h|hr|hrs|hour|hours)$/', $val, $m)) {
            return (int)$m[1] * 3600;
        }
        if (preg_match('/^(\d+)\s*(m|min|mins|minute|minutes)$/', $val, $m)) {
            return (int)$m[1] * 60;
        }
        if (preg_match('/^(\d+)\s*(s|sec|secs|second|seconds)$/', $val, $m)) {
            return (int)$m[1];
        }
        if (preg_match('/^(\d+)\s*(w|week|weeks)$/', $val, $m)) {
            return (int)$m[1] * 604800;
        }
        return 3600;
    }
}

$rawLifetime = getenv('SESSION_LIFETIME') ?: ($_ENV['SESSION_LIFETIME'] ?? null);

// If not in environment, read directly from .env file
if ($rawLifetime === null || $rawLifetime === '') {
    $envPath = (defined('ROOT_PATH') ? ROOT_PATH : dirname(__DIR__)) . '/.env';
    if (file_exists($envPath)) {
        $envLines = @file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($envLines as $line) {
            $line = trim($line);
            if (str_starts_with($line, '#')) continue;
            if (str_starts_with($line, 'SESSION_LIFETIME=')) {
                $rawLifetime = trim(substr($line, strlen('SESSION_LIFETIME=')));
                $rawLifetime = trim($rawLifetime, '"\'');
                break;
            }
        }
    }
}

if (empty($rawLifetime)) {
    $rawLifetime = '60min';
}

return [
    'name' => 'SOCIETYAPP_SESSION',
    'lifetime' => parseSessionLifetime($rawLifetime),
    'raw' => $rawLifetime,
];
