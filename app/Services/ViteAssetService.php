<?php

namespace App\Services;

class ViteAssetService
{
    private static ?array $manifest = null;
    private static ?string $manifestPath = null;

    /**
     * Check if Vite development server is actively running via hot file.
     */
    public static function isHot(): bool
    {
        $hotFile = self::getHotFilePath();
        return file_exists($hotFile) && is_readable($hotFile);
    }

    /**
     * Get the active Vite dev server base URL from hot file.
     */
    public static function getHotUrl(): ?string
    {
        $hotFile = self::getHotFilePath();
        if (file_exists($hotFile) && is_readable($hotFile)) {
            $url = trim((string)@file_get_contents($hotFile));
            return !empty($url) ? rtrim($url, '/') : 'http://localhost:5173';
        }
        return null;
    }

    private static function getHotFilePath(): string
    {
        if (defined('PUBLIC_PATH')) {
            return PUBLIC_PATH . '/hot';
        }
        $baseDir = defined('ROOT_PATH') ? ROOT_PATH : dirname(__DIR__, 2);
        return $baseDir . '/public/hot';
    }

    /**
     * Locate and parse the Vite production manifest.
     */
    public static function getManifest(): ?array
    {
        if (self::$manifest !== null) {
            return self::$manifest;
        }

        $baseDir = defined('ROOT_PATH') ? ROOT_PATH : dirname(__DIR__, 2);
        $candidates = [
            $baseDir . '/public/dist/manifest.json',
            $baseDir . '/public/dist/.vite/manifest.json',
        ];

        foreach ($candidates as $path) {
            if (file_exists($path) && is_readable($path)) {
                $content = @file_get_contents($path);
                if ($content !== false) {
                    $json = json_decode($content, true);
                    if (is_array($json)) {
                        self::$manifest = $json;
                        self::$manifestPath = $path;
                        return self::$manifest;
                    }
                }
            }
        }

        // Graceful fallback: log internal warning without leaking details
        error_log('ViteAssetService: manifest.json not found or unreadable.');
        self::$manifest = [];
        return self::$manifest;
    }

    /**
     * Resolve a path from the active dev server or manifest.
     */
    public static function getAssetUrl(string $entry): ?string
    {
        if (self::isHot()) {
            $devServer = self::getHotUrl();
            return $devServer . '/' . ltrim($entry, '/');
        }

        $manifest = self::getManifest();
        if (isset($manifest[$entry]['file'])) {
            return '/dist/' . ltrim($manifest[$entry]['file'], '/');
        }
        return null;
    }

    /**
     * Render HTML link/script tags for entry points with HMR in dev and manifest fallback in production.
     */
    public static function renderTags(string $jsEntry = 'resources/js/main.jsx', string $cssEntry = 'resources/css/app.css'): string
    {
        // 1. Vite HMR Dev Server Active Mode
        if (self::isHot()) {
            $devServer = self::getHotUrl();
            $tags = [
                // React Fast Refresh preamble for Vite
                '<script type="module">' . "\n" .
                '      import RefreshRuntime from "' . $devServer . '/@react-refresh";' . "\n" .
                '      RefreshRuntime.injectIntoGlobalHook(window);' . "\n" .
                '      window.$RefreshReg$ = () => {};' . "\n" .
                '      window.$RefreshSig$ = () => (type) => type;' . "\n" .
                '      window.__vite_plugin_react_preamble_installed__ = true;' . "\n" .
                '    </script>',
                // Vite HMR Client
                '<script type="module" src="' . htmlspecialchars($devServer . '/@vite/client', ENT_QUOTES, 'UTF-8') . '"></script>',
                // CSS Entry
                '<link rel="stylesheet" href="' . htmlspecialchars($devServer . '/' . ltrim($cssEntry, '/'), ENT_QUOTES, 'UTF-8') . '">',
                // JS Entry
                '<script type="module" src="' . htmlspecialchars($devServer . '/' . ltrim($jsEntry, '/'), ENT_QUOTES, 'UTF-8') . '"></script>',
            ];
            return implode("\n    ", $tags);
        }

        // 2. Production Manifest Mode
        $manifest = self::getManifest();
        $tags = [];

        // CSS
        if (isset($manifest[$cssEntry]['file'])) {
            $cssUrl = '/dist/' . ltrim($manifest[$cssEntry]['file'], '/');
            $tags[] = '<link rel="stylesheet" href="' . htmlspecialchars($cssUrl, ENT_QUOTES, 'UTF-8') . '">';
        } else {
            // Fallback to legacy compiled output.css
            $fallbackCss = '/assets/dist/output.css';
            $v = file_exists((defined('PUBLIC_PATH') ? PUBLIC_PATH : 'public') . '/assets/dist/output.css')
                ? '?v=' . filemtime((defined('PUBLIC_PATH') ? PUBLIC_PATH : 'public') . '/assets/dist/output.css')
                : '';
            $tags[] = '<link rel="stylesheet" href="' . $fallbackCss . $v . '">';
        }

        // JS
        if (isset($manifest[$jsEntry]['file'])) {
            $jsUrl = '/dist/' . ltrim($manifest[$jsEntry]['file'], '/');
            $tags[] = '<script type="module" src="' . htmlspecialchars($jsUrl, ENT_QUOTES, 'UTF-8') . '"></script>';
        }

        return implode("\n    ", $tags);
    }
}
