<?php
/**
 * Public Entry Point - Slim Framework 4 Front Controller
 * All web and API requests flow through this file.
 */

use Slim\Factory\AppFactory;
use Slim\Psr7\Response as SlimResponse;
use Psr\Http\Message\ServerRequestInterface;
use App\Middleware\SetupGuardMiddleware;

// Define directory constants
if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', dirname(__DIR__));
}
if (!defined('PUBLIC_PATH')) {
    define('PUBLIC_PATH', __DIR__);
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

// 1. Maintenance & Coming Soon Handler
require_once ROOT_PATH . '/maintenance.php';

// 2. Load Composer Autoloader
require_once ROOT_PATH . '/vendor/autoload.php';

// 3. Load Environment Variables via Dotenv
if (class_exists(\Dotenv\Dotenv::class) && file_exists(ROOT_PATH . '/.env')) {
    \Dotenv\Dotenv::createImmutable(ROOT_PATH)->safeLoad();
} else {
    // Lightweight fallback parser
    $envFile = ROOT_PATH . '/.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                [$key, $value] = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                    (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                    $value = substr($value, 1, -1);
                }
                putenv("{$key}={$value}");
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
            }
        }
    }
}

// 4. Load Core Framework Components
require_once APP_PATH . '/core/Database.php';
require_once APP_PATH . '/core/Session.php';
require_once APP_PATH . '/core/helpers.php';

// 5. Initialize & Validate Session
Session::init();
if (Session::isExpired()) {
    Session::destroy();
    Session::init();
}

// 6. Application Configuration
$appConfig = require CONFIG_PATH . '/app.php';
$isDebug = ($appConfig['app']['debug'] ?? false) === true;

// Cache-Control: dynamic pages must not be cached publicly
$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$isAsset = (bool)preg_match('/\.(css|js|png|jpg|jpeg|svg|gif|ico|webp|woff2?|ttf|map)$/i', $requestUri);
if (!$isAsset && !headers_sent()) {
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
}

// 7. Instantiate Slim 4 Application
$app = AppFactory::create();

// 8. Global Middlewares
$app->add(new SetupGuardMiddleware());
$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();

// 9. Error Handling Middleware
$errorMiddleware = $app->addErrorMiddleware($isDebug, true, true);

// Custom 404 Handler
$errorMiddleware->setErrorHandler(\Slim\Exception\HttpNotFoundException::class, function (
    ServerRequestInterface $request,
    Throwable $exception,
    bool $displayErrorDetails
) use ($isDebug) {
    $response = new SlimResponse();
    $path = $request->getUri()->getPath();
    $isJson = (strpos($path, '/api/') === 0)
        || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false);

    if ($isJson) {
        $payload = json_encode(['success' => false, 'error' => 'Resource not found', 'status' => 404]);
        $response->getBody()->write($payload);
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
    }

    $response->getBody()->write(view('errors/404', [
        'title' => 'Page Not Found',
        'currentRoute' => $path,
    ]));
    return $response->withStatus(404);
});

// Custom 500 / General Exception Handler
$errorMiddleware->setDefaultErrorHandler(function (
    ServerRequestInterface $request,
    Throwable $exception,
    bool $displayErrorDetails
) use ($isDebug) {
    error_log("Slim Application Error: " . $exception->getMessage() . " in " . $exception->getFile() . ":" . $exception->getLine() . "\n" . $exception->getTraceAsString());

    $response = new SlimResponse();
    $path = $request->getUri()->getPath();
    $isJson = (strpos($path, '/api/') === 0)
        || (strpos($path, '/auth/google-one-tap') === 0)
        || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false);

    if ($isJson) {
        $payload = json_encode([
            'success' => false,
            'error'   => $isDebug ? $exception->getMessage() : 'An unexpected server error occurred.',
            'status'  => 500,
        ]);
        $response->getBody()->write($payload);
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }

    if ($isDebug) {
        $html = "<!doctype html><html><head><title>500 Internal Server Error</title><style>body{background:#0b0f17;color:#f87171;font-family:monospace;padding:2rem;}pre{background:#111827;color:#e5e7eb;padding:1rem;border-radius:0.5rem;overflow-x:auto;}</style></head><body><h1>Server Error: " . htmlspecialchars($exception->getMessage()) . "</h1><p><b>Location:</b> " . htmlspecialchars($exception->getFile()) . ":" . $exception->getLine() . "</p><pre>" . htmlspecialchars($exception->getTraceAsString()) . "</pre></body></html>";
        $response->getBody()->write($html);
    } else {
        $response->getBody()->write(view('errors/500', [
            'error' => 'An unexpected server error occurred. Please try again later.',
        ]));
    }
    return $response->withStatus(500);
});

// 10. Register Route Groups
$registerApiRoutes = require ROOT_PATH . '/routes/api.php';
$registerApiRoutes($app);

$registerWebRoutes = require ROOT_PATH . '/routes/web.php';
$registerWebRoutes($app);

// 11. Run Slim Application
$app->run();
