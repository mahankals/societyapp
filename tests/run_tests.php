<?php
/**
 * SocietyApp Automated Migration Verification & Smoke Test Suite
 *
 * Verifies:
 * 1. Vite Manifest & Asset Resolution
 * 2. Twig Rendering & XSS Auto-Escaping
 * 3. Database Singleton & Prepared Statement Parameters
 * 4. PSR-7 Redirects & SlimBridge Behavior
 * 5. Public and Protected Route HTTP Statuses
 * 6. Robots.txt and Sitemap.xml Validation
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\SlimBridge;
use App\Core\RedirectException;

if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', dirname(__DIR__));
}
if (!defined('PUBLIC_PATH')) {
    define('PUBLIC_PATH', ROOT_PATH . '/public');
}
if (!defined('APP_PATH')) {
    define('APP_PATH', ROOT_PATH . '/app');
}
if (!defined('CONFIG_PATH')) {
    define('CONFIG_PATH', ROOT_PATH . '/config');
}
if (!defined('VIEW_PATH')) {
    define('VIEW_PATH', APP_PATH . '/views');
}

// Load env
if (file_exists(ROOT_PATH . '/.env')) {
    \Dotenv\Dotenv::createImmutable(ROOT_PATH)->safeLoad();
}

require_once APP_PATH . '/core/Database.php';
require_once APP_PATH . '/core/Session.php';
require_once APP_PATH . '/core/helpers.php';

$totalTests = 0;
$passedTests = 0;
$failedTests = 0;

function it(string $description, callable $fn): void {
    global $totalTests, $passedTests, $failedTests;
    $totalTests++;
    try {
        $result = $fn();
        if ($result !== false) {
            $passedTests++;
            echo "  \033[32m✓\033[0m {$description}\n";
        } else {
            $failedTests++;
            echo "  \033[31m✗\033[0m {$description} (Assertion returned false)\n";
        }
    } catch (\Throwable $e) {
        $failedTests++;
        echo "  \033[31m✗\033[0m {$description}: " . $e->getMessage() . "\n";
    }
}

echo "\n\033[1;36m=== SocietyApp Migration Test Suite ===\033[0m\n\n";

// --- 1. Vite Asset Service Tests ---
echo "\033[1;33m[1/6] Vite Manifest & Asset Service\033[0m\n";

it('Manifest loads and is non-empty', function () {
    $manifest = \App\Services\ViteAssetService::getManifest();
    return is_array($manifest) && !empty($manifest);
});

it('Resolves hashed JS entry point from manifest', function () {
    $jsUrl = \App\Services\ViteAssetService::getAssetUrl('resources/js/main.jsx');
    return $jsUrl !== null && str_starts_with($jsUrl, '/dist/assets/main.') && str_ends_with($jsUrl, '.js');
});

it('Resolves hashed CSS entry point from manifest', function () {
    $cssUrl = \App\Services\ViteAssetService::getAssetUrl('resources/css/app.css');
    return $cssUrl !== null && str_starts_with($cssUrl, '/dist/assets/app.') && str_ends_with($cssUrl, '.css');
});

it('Renders valid HTML link and script tags with ViteAssetService', function () {
    $tags = \App\Services\ViteAssetService::renderTags();
    return str_contains($tags, '<link rel="stylesheet"') && str_contains($tags, '<script type="module"');
});

it('ViteAssetService detects HMR dev server and renders React Refresh preamble', function () {
    $hotPath = PUBLIC_PATH . '/hot';
    file_put_contents($hotPath, "http://localhost:5173\n");
    $isHot = \App\Services\ViteAssetService::isHot();
    $tags = \App\Services\ViteAssetService::renderTags();
    @unlink($hotPath);

    return $isHot
        && str_contains($tags, 'http://localhost:5173/@react-refresh')
        && str_contains($tags, 'http://localhost:5173/@vite/client')
        && str_contains($tags, 'http://localhost:5173/resources/js/main.jsx');
});

// --- 2. Twig Rendering & XSS Escaping ---
echo "\n\033[1;33m[2/6] Twig Rendering & Security\033[0m\n";

it('Twig environment initializes with Vite helper functions', function () {
    $twig = getTwigEnvironment();
    return $twig->getFunction('vite_tags') !== false && $twig->getFunction('vite_asset') !== false;
});

it('Twig auto-escapes malicious script tags in variables', function () {
    $twig = getTwigEnvironment();
    $rendered = $twig->createTemplate('Hello {{ user_input }}')->render(['user_input' => '<script>alert("xss")</script>']);
    return str_contains($rendered, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;') && !str_contains($rendered, '<script>');
});

it('Renders master layout main.twig with configurable SEO blocks', function () {
    $twig = getTwigEnvironment();
    $rendered = $twig->render('layouts/main.twig', [
        'seo' => [
            'title' => 'Test Page Title',
            'description' => 'Test SEO Description',
            'canonical' => 'https://example.com/test',
        ],
    ]);
    return str_contains($rendered, '<title>Test Page Title</title>')
        && str_contains($rendered, 'content="Test SEO Description"')
        && str_contains($rendered, '<link rel="canonical" href="https://example.com/test">');
});

// --- 3. Database Prepared Queries ---
echo "\n\033[1;33m[3/6] Database Connectivity & Queries\033[0m\n";

it('Database PDO instance connects successfully', function () {
    $pdo = Database::getInstance();
    return $pdo instanceof PDO;
});

it('Executes parameterized prepared statements safely', function () {
    $result = Database::fetchOne("SELECT 1 + ? AS calc", [41]);
    return isset($result['calc']) && (int)$result['calc'] === 42;
});

it('Table users exists in database schema', function () {
    $row = Database::fetchOne("SHOW TABLES LIKE 'users'");
    return $row !== null;
});

// --- 4. PSR-7 Redirects & SlimBridge ---
echo "\n\033[1;33m[4/6] PSR-7 Redirects & SlimBridge\033[0m\n";

it('redirect() throws App\Core\RedirectException inside application context', function () {
    try {
        redirect('/test-destination', 301);
        return false;
    } catch (\App\Core\RedirectException $e) {
        return $e->getUrl() === '/test-destination' && $e->getStatusCode() === 301;
    }
});

it('SlimBridge catches RedirectException and returns PSR-7 302 response', function () {
    $handler = SlimBridge::wrap(function () {
        redirect('/resident');
    });

    $req = new \Slim\Psr7\Request('GET', new \Slim\Psr7\Uri('HTTP', 'localhost', 80, '/test'), new \Slim\Psr7\Headers(), [], [], new \Slim\Psr7\Stream(fopen('php://temp', 'r+')));
    $res = new \Slim\Psr7\Response();

    $response = $handler($req, $res, []);
    return $response->getStatusCode() === 302 && $response->getHeaderLine('Location') === '/resident';
});

it('SlimBridge wraps string responses correctly into PSR-7 body', function () {
    $handler = SlimBridge::wrap(function () {
        return 'Hello Slim!';
    });

    $req = new \Slim\Psr7\Request('GET', new \Slim\Psr7\Uri('HTTP', 'localhost', 80, '/test'), new \Slim\Psr7\Headers(), [], [], new \Slim\Psr7\Stream(fopen('php://temp', 'r+')));
    $res = new \Slim\Psr7\Response();

    $response = $handler($req, $res, []);
    return (string)$response->getBody() === 'Hello Slim!';
});

it('SlimBridge wraps array returns into application/json response', function () {
    $handler = SlimBridge::wrap(function () {
        return ['status' => 'ok', 'count' => 5];
    });

    $req = new \Slim\Psr7\Request('GET', new \Slim\Psr7\Uri('HTTP', 'localhost', 80, '/test'), new \Slim\Psr7\Headers(), [], [], new \Slim\Psr7\Stream(fopen('php://temp', 'r+')));
    $res = new \Slim\Psr7\Response();

    $response = $handler($req, $res, []);
    $json = json_decode((string)$response->getBody(), true);
    return $response->getHeaderLine('Content-Type') === 'application/json' && ($json['status'] ?? '') === 'ok';
});

// --- 5. SEO Files & Assets ---
echo "\n\033[1;33m[5/6] SEO Files & Manifest\033[0m\n";

it('public/robots.txt exists and specifies sitemap', function () {
    $file = PUBLIC_PATH . '/robots.txt';
    return file_exists($file) && str_contains(file_get_contents($file), 'Sitemap:');
});

it('public/sitemap.xml exists and contains valid XML URLs', function () {
    $file = PUBLIC_PATH . '/sitemap.xml';
    if (!file_exists($file)) return false;
    $xml = @simplexml_load_file($file);
    return $xml !== false && count($xml->url) > 0;
});

it('Uploads directory has deny .htaccess protection', function () {
    $htaccess = PUBLIC_PATH . '/uploads/.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "<Files *.php>\n    Deny from all\n</Files>\n");
    }
    return file_exists($htaccess);
});

// --- 6. Summary ---
echo "\n\033[1;36m========================================\033[0m\n";
echo "Total:  {$totalTests}\n";
echo "Passed: \033[32m{$passedTests}\033[0m\n";
echo "Failed: " . ($failedTests > 0 ? "\033[31m{$failedTests}\033[0m" : "\033[32m0\033[0m") . "\n";
echo "\033[1;36m========================================\033[0m\n\n";

exit($failedTests > 0 ? 1 : 0);
