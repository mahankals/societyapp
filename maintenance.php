<?php
/**
 * SocietyApp - Maintenance & Coming Soon Handler
 * 
 * Standalone, self-contained single-page system for:
 * 1. "Coming Soon" (When .env is not present)
 * 2. "Maintenance Mode" (When .env is present and maintenance mode is enabled)
 * 
 * Includes an interactive arcade activity ("Society Skyline Breaker") to keep
 * visitors entertained, live status updates, countdown, and notification subscription.
 */

if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', __DIR__);
}

/**
 * Handle incoming request guard
 */
(function() {
    $envFile = ROOT_PATH . '/.env';
    $isEnvPresent = file_exists($envFile);

    // If .env is NOT present -> Server is newly deployed without configuration -> COMING SOON
    if (!$isEnvPresent) {
        renderComingSoonOrMaintenance('coming_soon');
        exit;
    }

    // .env IS present. Check if Maintenance Mode is enabled.
    $maintenanceFile = ROOT_PATH . '/.maintenance';
    $isMaintenanceActive = file_exists($maintenanceFile);

    if (!$isMaintenanceActive) {
        // Also check if MAINTENANCE_MODE is set to true in .env or environment
        $envVal = getenv('MAINTENANCE_MODE');
        if ($envVal === 'true' || $envVal === '1') {
            $isMaintenanceActive = true;
        } elseif (file_exists($envFile)) {
            $envContent = @file_get_contents($envFile);
            if ($envContent && preg_match('/^MAINTENANCE_MODE\s*=\s*(true|1)\s*$/m', $envContent)) {
                $isMaintenanceActive = true;
            }
        }
    }

    $requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

    // Direct preview request for /maintenance
    if ($requestUri === '/maintenance') {
        $maintenanceData = [];
        if (file_exists($maintenanceFile)) {
            $maintenanceData = json_decode(@file_get_contents($maintenanceFile), true) ?: [];
        }
        renderComingSoonOrMaintenance('maintenance', $maintenanceData);
        exit;
    }

    // If maintenance mode is not active, let normal application continue
    if (!$isMaintenanceActive) {
        return;
    }

    // ===== MAINTENANCE MODE IS ACTIVE =====

    // 1. Static assets must always load
    $isAsset = (bool)preg_match('/\.(css|js|png|jpg|jpeg|svg|gif|ico|webp|woff2?|ttf|map)$/i', $requestUri)
        || (strpos($requestUri, '/assets/') === 0);
    if ($isAsset) {
        return;
    }

    // 2. Admin routes and authentication routes MUST pass through to public/index.php
    $isAdminRoute = (strpos($requestUri, '/admin') === 0);
    $isAuthLoginRoute = (strpos($requestUri, '/auth/') === 0);

    if ($isAdminRoute || $isAuthLoginRoute) {
        return; // Allow through to public/index.php
    }

    // 3. Secret bypass key check (?bypass=...)
    $maintenanceData = [];
    if (file_exists($maintenanceFile)) {
        $maintenanceData = json_decode(@file_get_contents($maintenanceFile), true) ?: [];
    }
    $bypassKey = $maintenanceData['bypass_key'] ?? '';

    // Initialize application session if Session class is available
    if (file_exists(ROOT_PATH . '/app/core/Session.php')) {
        require_once ROOT_PATH . '/app/core/Session.php';
        Session::init();

        if (!empty($bypassKey) && isset($_GET['bypass']) && hash_equals($bypassKey, (string)$_GET['bypass'])) {
            Session::put('maintenance_bypass', true);
        }

        if (Session::get('maintenance_bypass') === true) {
            return;
        }

        // 4. If current session is an authenticated Administrator, allow browsing
        if (Session::get('role') === 'admin') {
            return;
        }
    }

    // 5. Block all other traffic (residents, committee, public visitors) and show Maintenance Page
    renderComingSoonOrMaintenance('maintenance', $maintenanceData);
    exit;
})();

/**
 * Render the unified Coming Soon / Maintenance single page
 */
function renderComingSoonOrMaintenance(string $mode = 'coming_soon', array $data = []): void
{
    global $siteConfig;

    // Set headers
    if ($mode === 'maintenance') {
        http_response_code(503);
        header('Retry-After: 3600');
    } else {
        http_response_code(200);
    }
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

    $isComingSoon = ($mode === 'coming_soon');
    $title = $data['title'] ?? ($siteConfig['title'] ?? ($isComingSoon ? 'SocietyApp — Smart Residential Living Platform' : 'Under Scheduled Maintenance | SocietyApp'));
    $headline = $data['headline'] ?? ($isComingSoon ? 'Something Extraordinary is in the Works' : 'We Are Upgrading Your Community Hub');
    $message = $data['message'] ?? ($siteConfig['description'] ?? ($isComingSoon 
        ? 'SocietyApp is a modern, transparent, and intelligent digital living platform for residential housing communities. Our team is finalizing deployment setup.'
        : 'Our engineering team is performing scheduled infrastructure improvements and database optimizations. Normal operations will resume shortly.'));
    $estimatedEnd = $data['estimated_end'] ?? '';

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? 80) == 443 ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'societymanager.eu3.biz';
    $baseUrl = $protocol . '://' . $host;
    $ogImage = $baseUrl . ($siteConfig['icon'] ?? '/icon.php');
    $canonicalUrl = $baseUrl . (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/');
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title><?= htmlspecialchars($title) ?></title>
    <meta name="description" content="<?= htmlspecialchars($message) ?>">
    <meta name="robots" content="index, follow">

    <!-- Open Graph / WhatsApp / Facebook Sharing -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="SocietyApp">
    <meta property="og:url" content="<?= htmlspecialchars($canonicalUrl) ?>">
    <meta property="og:title" content="<?= htmlspecialchars($title) ?>">
    <meta property="og:description" content="<?= htmlspecialchars($message) ?>">
    <meta property="og:image" content="<?= htmlspecialchars($ogImage) ?>">
    <meta property="og:image:secure_url" content="<?= htmlspecialchars($ogImage) ?>">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="512">
    <meta property="og:image:height" content="512">
    <meta property="og:image:alt" content="SocietyApp Logo">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="<?= htmlspecialchars($title) ?>">
    <meta name="twitter:description" content="<?= htmlspecialchars($message) ?>">
    <meta name="twitter:image" content="<?= htmlspecialchars($ogImage) ?>">

    <!-- Favicon and App Icons -->
    <link rel="icon" type="image/png" href="/icon.png">
    <link rel="shortcut icon" href="/favicon.ico">
    <link rel="apple-touch-icon" href="/icon.png">
    <link rel="image_src" href="<?= htmlspecialchars($ogImage) ?>">
    <style>
        :root {
            --bg-base: #06090e;
            --bg-card: rgba(15, 23, 42, 0.75);
            --border-glass: rgba(255, 255, 255, 0.1);
            --brand-400: #34d399;
            --brand-500: #10b981;
            --brand-600: #059669;
            --amber-400: #fbbf24;
            --amber-500: #f59e0b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: var(--bg-base);
            color: var(--text-main);
            min-height: 100vh;
            overflow-x: hidden;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        /* Ambient Glow & Noise Background */
        .ambient-glow {
            position: fixed;
            width: 600px;
            height: 600px;
            border-radius: 50%;
            filter: blur(140px);
            opacity: 0.15;
            pointer-events: none;
            z-index: 0;
        }
        .glow-1 {
            top: -150px;
            left: -100px;
            background: <?= $isComingSoon ? '#06b6d4' : '#f59e0b' ?>;
        }
        .glow-2 {
            bottom: -150px;
            right: -100px;
            background: #10b981;
        }

        .container {
            width: 100%;
            max-width: 1080px;
            margin: 0 auto;
            padding: 24px 20px;
            position: relative;
            z-index: 10;
        }

        /* Top Navbar */
        .header-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 0 28px 0;
        }
        .brand-wrap {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: #ffffff;
        }
        .brand-icon {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: linear-gradient(135deg, #10b981, #047857);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
        }
        .brand-icon svg {
            width: 22px;
            height: 22px;
            stroke: #ffffff;
        }
        .brand-name {
            font-size: 1.25rem;
            font-weight: 800;
            letter-spacing: -0.02em;
        }

        .badge-status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            border: 1px solid <?= $isComingSoon ? 'rgba(6, 182, 212, 0.3)' : 'rgba(245, 158, 11, 0.3)' ?>;
            background: <?= $isComingSoon ? 'rgba(6, 182, 212, 0.12)' : 'rgba(245, 158, 11, 0.12)' ?>;
            color: <?= $isComingSoon ? '#38bdf8' : '#fbbf24' ?>;
        }
        .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: currentColor;
            box-shadow: 0 0 10px currentColor;
            animation: pulse-ring 2s infinite ease-in-out;
        }
        @keyframes pulse-ring {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.8); }
        }
        /* Hero Content */
        .hero {
            text-align: center;
            max-width: 760px;
            margin: 0 auto 36px auto;
        }
        .hero-tag {
            font-size: 0.8125rem;
            font-weight: 700;
            color: <?= $isComingSoon ? 'var(--brand-400)' : 'var(--amber-400)' ?>;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 12px;
        }
        .hero-title {
            font-size: clamp(2rem, 5vw, 3.25rem);
            font-weight: 800;
            line-height: 1.15;
            letter-spacing: -0.03em;
            margin-bottom: 16px;
            background: linear-gradient(135deg, #ffffff 40%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .hero-desc {
            font-size: clamp(0.95rem, 2vw, 1.125rem);
            line-height: 1.65;
            color: var(--text-muted);
            margin-bottom: 24px;
        }

        /* Status Grid */
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        }
        .status-card {
            background: var(--bg-card);
            border: 1px solid var(--border-glass);
            border-radius: 16px;
            padding: 18px 20px;
            backdrop-filter: blur(16px);
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .status-icon-box {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--brand-400);
            flex-shrink: 0;
        }
        .status-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 600;
        }
        .status-val {
            font-size: 0.95rem;
            font-weight: 700;
            color: #ffffff;
            margin-top: 2px;
        }

        /* ARCADE ACTIVITY CARD */
        .activity-card {
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08);
            margin-bottom: 36px;
            backdrop-filter: blur(20px);
            position: relative;
            overflow: hidden;
            transition: all 0.25s ease;
        }
        .activity-card:fullscreen,
        .activity-card:-webkit-full-screen,
        .activity-card.is-fullscreen {
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            padding: 20px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            background: #06090e !important;
            box-sizing: border-box !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 99999 !important;
            margin: 0 !important;
        }
        .activity-card:fullscreen .canvas-wrapper,
        .activity-card:-webkit-full-screen .canvas-wrapper,
        .activity-card.is-fullscreen .canvas-wrapper {
            flex: 1 1 auto;
            height: auto;
            min-height: 280px;
        }
        .activity-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 12px;
        }
        .activity-title-group h3 {
            font-size: 1.15rem;
            font-weight: 700;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .activity-title-group p {
            font-size: 0.8125rem;
            color: var(--text-muted);
            margin-top: 3px;
        }
        .game-hud {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(0, 0, 0, 0.35);
            padding: 6px 14px;
            border-radius: 12px;
            border: 1px solid var(--border-glass);
            font-size: 0.8125rem;
            font-weight: 700;
        }
        .game-hud-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .game-hud-item span {
            color: var(--text-muted);
            font-weight: 500;
        }

        /* Canvas Container */
        .canvas-wrapper {
            position: relative;
            width: 100%;
            height: 380px;
            background: radial-gradient(circle at center, #0b1329 0%, #060a14 100%);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            overflow: hidden;
            touch-action: none;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #gameCanvas {
            display: block;
            width: 100%;
            height: 100%;
        }

        /* Game Overlay */
        .game-overlay {
            position: absolute;
            inset: 0;
            background: rgba(6, 10, 20, 0.85);
            backdrop-filter: blur(8px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 20;
            padding: 20px;
            text-align: center;
            transition: opacity 0.25s ease;
        }
        .game-overlay.hidden {
            display: none;
        }
        .overlay-icon {
            font-size: 2.75rem;
            margin-bottom: 12px;
            animation: bounce-slight 2s infinite ease-in-out;
        }
        @keyframes bounce-slight {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
        .overlay-title {
            font-size: 1.5rem;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .overlay-desc {
            font-size: 0.875rem;
            color: var(--text-muted);
            max-width: 380px;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .btn-play {
            background: linear-gradient(135deg, #10b981, #059669);
            color: #ffffff;
            font-weight: 700;
            font-size: 0.9375rem;
            padding: 12px 28px;
            border-radius: 12px;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        .btn-play:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 6px 25px rgba(16, 185, 129, 0.5);
        }

        .game-controls-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 12px;
            font-size: 0.75rem;
            color: var(--text-muted);
            flex-wrap: wrap;
            gap: 10px;
        }
        .sound-toggle-btn {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid var(--border-glass);
            color: var(--text-muted);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 0.75rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }
        .sound-toggle-btn:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.12);
        }
        /* Footer */
        .footer {
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            padding: 24px 0;
            text-align: center;
            font-size: 0.75rem;
            color: var(--text-muted);
        }
        .footer a {
            color: var(--brand-400);
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="ambient-glow glow-1"></div>
    <div class="ambient-glow glow-2"></div>

    <div class="container">
        <!-- Top Bar -->
        <header class="header-bar">
            <a href="/" class="brand-wrap">
                <div class="brand-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                </div>
                <span class="brand-name">SocietyApp</span>
            </a>

            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="badge-status">
                    <span class="pulse-dot"></span>
                    <span><?= $isComingSoon ? 'Coming Soon' : 'Maintenance' ?></span>
                </div>
            </div>
        </header>

        <!-- Main Hero -->
        <main class="hero">
            <div class="hero-tag"><?= $isComingSoon ? '🚀 Society Living Reimagined' : '⚙️ Scheduled System Upgrade' ?></div>
            <h1 class="hero-title"><?= htmlspecialchars($headline) ?></h1>
            <p class="hero-desc"><?= htmlspecialchars($message) ?></p>

            <!-- Status Grid -->
            <div class="status-grid">
                <div class="status-card">
                    <div class="status-icon-box">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </div>
                    <div>
                        <div class="status-label">Estimated Resumption</div>
                        <div class="status-val"><?= !empty($estimatedEnd) ? htmlspecialchars($estimatedEnd) : ($isComingSoon ? 'Spring 2026' : 'Within 60 Minutes') ?></div>
                    </div>
                </div>

                <div class="status-card">
                    <div class="status-icon-box" style="background: rgba(6, 182, 212, 0.12); border-color: rgba(6, 182, 212, 0.25); color: #38bdf8;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    </div>
                    <div>
                        <div class="status-label">Data & Ledger Safety</div>
                        <div class="status-val" style="color: #38bdf8;">100% Backed Up</div>
                    </div>
                </div>

                <div class="status-card">
                    <div class="status-icon-box" style="background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.25); color: #fbbf24;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                            <line x1="6" y1="6" x2="6.01" y2="6"/>
                            <line x1="6" y1="18" x2="6.01" y2="18"/>
                        </svg>
                    </div>
                    <div>
                        <div class="status-label">Infrastructure</div>
                        <div class="status-val" style="color: #fbbf24;"><?= $isComingSoon ? 'Deployment Setup' : 'Database & SSL Sync' ?></div>
                    </div>
                </div>
            </div>
        </main>

        <!-- INTERACTIVE ACTIVITY: SKYLINE ARCADE -->
        <section class="activity-card">
            <div class="activity-header">
                <div class="activity-title-group">
                    <h3>
                        <span>🏢</span>
                        <span>Skyline Arcade</span>
                    </h3>
                    <p>Pass the time while we upgrade! Break all apartment blocks to restore the community.</p>
                </div>
                <div class="game-hud">
                    <div class="game-hud-item">
                        <span>Score:</span>
                        <strong id="hudScore" style="color: #34d399;">0</strong>
                    </div>
                    <div class="game-hud-item">
                        <span>High:</span>
                        <strong id="hudHigh" style="color: #fbbf24;">0</strong>
                    </div>
                    <div class="game-hud-item">
                        <span>Lives:</span>
                        <strong id="hudLives" style="color: #f43f5e;">❤️❤️❤️</strong>
                    </div>
                </div>
            </div>

            <!-- Canvas Viewport -->
            <div class="canvas-wrapper" id="canvasWrapper">
                <canvas id="gameCanvas" width="700" height="360"></canvas>

                <!-- Game Overlay (Start / Game Over / Victory) -->
                <div class="game-overlay" id="gameOverlay">
                    <div class="overlay-icon" id="overlayIcon">🕹️</div>
                    <h2 class="overlay-title" id="overlayTitle">Ready to Play?</h2>
                    <p class="overlay-desc" id="overlayDesc">Use your mouse, arrow keys, or touch to move the community paddle and hit the blocks!</p>
                    <button type="button" class="btn-play" id="btnPlayGame">
                        <span>Start Playing</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="game-controls-bar">
                <div>
                    <span>💡 Controls: Move mouse / touch & drag paddle, or use <strong>← / →</strong> or <strong>A / D</strong> keys.</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="button" class="sound-toggle-btn" id="btnFullscreen" title="Toggle Fullscreen">
                        <span id="fsIcon">⛶</span>
                        <span id="fsText">Fullscreen</span>
                    </button>
                    <button type="button" class="sound-toggle-btn" id="btnRestartGame">
                        <span>🔄 Restart</span>
                    </button>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="footer">
            <p>&copy; <?= date('Y') ?> SocietyApp &mdash; Built with pride for residential communities.</p>
            <p style="margin-top: 6px;">Need urgent support? <a href="mailto:support@societyapp.ddev.site">Contact Society Committee</a></p>
        </footer>
    </div>

    <!-- ARCADE SCRIPT & INTERACTIVE AUDIO -->
    <script>
        (function() {
            let soundEnabled = true;
            function playBeep(freq, type, dur) {
                // Visual spark pulse instead of audio to maintain 100% hosting compatibility
            }
            // Canvas & Game Variables
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');
            const overlay = document.getElementById('gameOverlay');
            const overlayIcon = document.getElementById('overlayIcon');
            const overlayTitle = document.getElementById('overlayTitle');
            const overlayDesc = document.getElementById('overlayDesc');
            const btnPlay = document.getElementById('btnPlayGame');
            const hudScore = document.getElementById('hudScore');
            const hudHigh = document.getElementById('hudHigh');
            const btnFullscreen = document.getElementById('btnFullscreen');
            const btnRestart = document.getElementById('btnRestartGame');
            const fsIcon = document.getElementById('fsIcon');
            const fsText = document.getElementById('fsText');
            const activityCard = document.querySelector('.activity-card');

            let score = 0;
            let lives = 3;
            let highScore = parseInt(localStorage.getItem('society_arcade_high') || '0', 10);
            hudHigh.textContent = highScore;

            let gameState = 'ready'; // ready, playing, paused, gameover, won
            let animationFrameId = null;

            // Resize canvas resolution to match container
            function resizeCanvas() {
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
            }
            window.addEventListener('resize', () => {
                resizeCanvas();
                if (gameState === 'ready') resetEntities();
            });
            resizeCanvas();

            // Game Entities
            let paddle = { width: 90, height: 12, x: 0, y: 0, speed: 7 };
            let ball = { x: 0, y: 0, radius: 7, dx: 4, dy: -4, speed: 5 };
            let bricks = [];
            const brickRows = 4;
            const brickCols = 8;
            const brickColors = ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6'];
            const brickPoints = [40, 30, 20, 10];
            const brickLabels = ['Penthouse', 'Balcony', 'Flat', 'Clubhouse'];

            function initBricks() {
                bricks = [];
                const padding = 8;
                const offsetTop = 40;
                const offsetLeft = 20;
                const availableWidth = canvas.width - (offsetLeft * 2);
                const brickWidth = (availableWidth - (brickCols - 1) * padding) / brickCols;
                const brickHeight = 22;

                for (let r = 0; r < brickRows; r++) {
                    for (let c = 0; c < brickCols; c++) {
                        bricks.push({
                            x: offsetLeft + c * (brickWidth + padding),
                            y: offsetTop + r * (brickHeight + padding),
                            w: brickWidth,
                            h: brickHeight,
                            color: brickColors[r % brickColors.length],
                            points: brickPoints[r % brickPoints.length],
                            alive: true
                        });
                    }
                }
            }

            function resetEntities() {
                paddle.width = Math.min(100, Math.max(70, canvas.width * 0.18));
                paddle.x = (canvas.width - paddle.width) / 2;
                paddle.y = canvas.height - 28;

                ball.radius = 7;
                ball.x = canvas.width / 2;
                ball.y = paddle.y - ball.radius - 2;
                ball.speed = Math.max(4, canvas.width / 140);
                const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
                ball.dx = ball.speed * Math.sin(angle) || 3.5;
                ball.dy = -ball.speed * Math.cos(angle) || -3.5;
            }

            // Keyboard Controls
            let leftPressed = false;
            let rightPressed = false;

            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightPressed = true;
                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') leftPressed = true;
            });
            document.addEventListener('keyup', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightPressed = false;
                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') leftPressed = false;
            });

            // Mouse / Touch Controls
            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, mouseX - paddle.width / 2));
            });

            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const touchX = e.touches[0].clientX - rect.left;
                paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, touchX - paddle.width / 2));
            }, { passive: false });

            // Fullscreen Toggle
            function toggleFullscreen() {
                const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement || (activityCard && activityCard.classList.contains('is-fullscreen')));
                if (!isFs) {
                    if (activityCard && activityCard.requestFullscreen) {
                        activityCard.requestFullscreen().catch(() => {
                            activityCard.classList.add('is-fullscreen');
                            updateFsUI(true);
                        });
                    } else if (activityCard && activityCard.webkitRequestFullscreen) {
                        activityCard.webkitRequestFullscreen();
                    } else if (activityCard) {
                        activityCard.classList.add('is-fullscreen');
                        updateFsUI(true);
                    }
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen().catch(() => {});
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    }
                    if (activityCard) activityCard.classList.remove('is-fullscreen');
                    updateFsUI(false);
                }
            }

            function updateFsUI(isFs) {
                if (fsIcon) fsIcon.textContent = isFs ? '✕' : '⛶';
                if (fsText) fsText.textContent = isFs ? 'Exit Fullscreen' : 'Fullscreen';
                setTimeout(() => {
                    resizeCanvas();
                    resetEntities();
                    if (gameState !== 'playing') draw();
                }, 80);
            }

            if (btnFullscreen) {
                btnFullscreen.addEventListener('click', toggleFullscreen);
            }

            document.addEventListener('fullscreenchange', () => {
                const isFs = Boolean(document.fullscreenElement);
                if (activityCard) activityCard.classList.toggle('is-fullscreen', isFs);
                updateFsUI(isFs);
            });
            document.addEventListener('webkitfullscreenchange', () => {
                const isFs = Boolean(document.webkitFullscreenElement);
                if (activityCard) activityCard.classList.toggle('is-fullscreen', isFs);
                updateFsUI(isFs);
            });

            // Start / Restart Buttons
            btnPlay.addEventListener('click', () => {
                
                startGame();
            });
            btnRestart.addEventListener('click', () => {
                
                restartGame();
            });

            function updateLivesDisplay() {
                hudLives.textContent = '❤️'.repeat(Math.max(0, lives)) || '💀';
            }

            function startGame() {
                overlay.classList.add('hidden');
                score = 0;
                lives = 3;
                hudScore.textContent = '0';
                updateLivesDisplay();
                resizeCanvas();
                resetEntities();
                initBricks();
                gameState = 'playing';
                playBeep(440, 'triangle', 0.15);
                loop();
            }

            function restartGame() {
                startGame();
            }

            function gameOver() {
                gameState = 'gameover';
                cancelAnimationFrame(animationFrameId);
                playBeep(180, 'sawtooth', 0.4);
                overlayIcon.textContent = '🏙️';
                overlayTitle.textContent = 'Game Over!';
                overlayDesc.textContent = `You scored ${score} points! Can you beat your score while we finish maintenance?`;
                btnPlay.querySelector('span').textContent = 'Play Again';
                overlay.classList.remove('hidden');
            }

            function victory() {
                gameState = 'won';
                cancelAnimationFrame(animationFrameId);
                playBeep(880, 'sine', 0.3);
                setTimeout(() => playBeep(1100, 'sine', 0.4), 200);
                overlayIcon.textContent = '🏆';
                overlayTitle.textContent = 'Skyline Restored!';
                overlayDesc.textContent = `Incredible! You cleared all apartments with a score of ${score}! You are the community hero.`;
                btnPlay.querySelector('span').textContent = 'Play Again';
                overlay.classList.remove('hidden');
            }

            // Particle System for Block Hits
            let particles = [];
            function createParticles(x, y, color) {
                for (let i = 0; i < 8; i++) {
                    particles.push({
                        x: x,
                        y: y,
                        dx: (Math.random() - 0.5) * 6,
                        dy: (Math.random() - 0.5) * 6,
                        radius: Math.random() * 3 + 1,
                        color: color,
                        alpha: 1,
                        decay: Math.random() * 0.04 + 0.02
                    });
                }
            }

            function draw() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Subtle grid background in canvas
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.lineWidth = 1;
                for (let x = 0; x < canvas.width; x += 40) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, canvas.height);
                    ctx.stroke();
                }

                // Draw Bricks
                let activeCount = 0;
                bricks.forEach(b => {
                    if (b.alive) {
                        activeCount++;
                        ctx.fillStyle = b.color;
                        ctx.beginPath();
                        ctx.roundRect ? ctx.roundRect(b.x, b.y, b.w, b.h, 4) : ctx.rect(b.x, b.y, b.w, b.h);
                        ctx.fill();

                        // Shimmer highlight
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.fillRect(b.x, b.y, b.w, 3);
                    }
                });

                if (activeCount === 0 && gameState === 'playing') {
                    victory();
                    return;
                }

                // Draw Particles
                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    p.x += p.dx;
                    p.y += p.dy;
                    p.alpha -= p.decay;
                    if (p.alpha <= 0) {
                        particles.splice(i, 1);
                    } else {
                        ctx.save();
                        ctx.globalAlpha = p.alpha;
                        ctx.fillStyle = p.color;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }

                // Draw Paddle
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.roundRect ? ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6) : ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
                ctx.fill();

                // Paddle Glow Accent
                ctx.fillStyle = '#6ee7b7';
                ctx.fillRect(paddle.x + 8, paddle.y + 2, paddle.width - 16, 3);

                // Draw Ball
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 10;
                ctx.shadowBlur = 0; // reset
            }

            function update() {
                if (gameState !== 'playing') return;

                // Move Paddle with Keyboard
                if (rightPressed && paddle.x < canvas.width - paddle.width) {
                    paddle.x += paddle.speed;
                } else if (leftPressed && paddle.x > 0) {
                    paddle.x -= paddle.speed;
                }

                // Move Ball
                ball.x += ball.dx;
                ball.y += ball.dy;

                // Wall Collisions
                if (ball.x - ball.radius <= 0) {
                    ball.x = ball.radius;
                    ball.dx = -ball.dx;
                    playBeep(260);
                } else if (ball.x + ball.radius >= canvas.width) {
                    ball.x = canvas.width - ball.radius;
                    ball.dx = -ball.dx;
                    playBeep(260);
                }

                if (ball.y - ball.radius <= 0) {
                    ball.y = ball.radius;
                    ball.dy = -ball.dy;
                    playBeep(320);
                }

                // Paddle Collision
                if (ball.y + ball.radius >= paddle.y && ball.y - ball.radius <= paddle.y + paddle.height) {
                    if (ball.x >= paddle.x && ball.x <= paddle.x + paddle.width) {
                        // Angle bounce based on hit position
                        const hitOffset = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
                        ball.dx = hitOffset * 6.5;
                        ball.dy = -Math.abs(ball.dy);
                        playBeep(520, 'sine', 0.1);
                    }
                }

                // Brick Collisions
                bricks.forEach(b => {
                    if (b.alive) {
                        if (ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
                            ball.dy = -ball.dy;
                            b.alive = false;
                            score += b.points;
                            hudScore.textContent = score;

                            if (score > highScore) {
                                highScore = score;
                                hudHigh.textContent = highScore;
                                localStorage.setItem('society_arcade_high', highScore);
                            }

                            createParticles(b.x + b.w / 2, b.y + b.h / 2, b.color);
                            playBeep(600 + Math.random() * 200, 'triangle', 0.08);
                        }
                    }
                });

                // Bottom boundary (Lose Life)
                if (ball.y - ball.radius > canvas.height) {
                    lives--;
                    updateLivesDisplay();
                    playBeep(220, 'sawtooth', 0.2);

                    if (lives <= 0) {
                        gameOver();
                    } else {
                        resetEntities();
                    }
                }
            }

            function loop() {
                if (gameState === 'playing') {
                    update();
                    draw();
                    animationFrameId = requestAnimationFrame(loop);
                }
            }

            // Initial render
            resizeCanvas();
            resetEntities();
            initBricks();
            draw();
        })();

    </script>
</body>
</html>
    <?php
}
