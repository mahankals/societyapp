<?php
/**
 * Public Entry Point
 * All requests go through this file.
 */

// Define paths
if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', __DIR__ . '/..');
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

// Load environment
$envFile = ROOT_PATH . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            [$key, $value] = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}

// Load Composer
require_once ROOT_PATH . '/vendor/autoload.php';

// Load Core
require_once APP_PATH . '/core/Database.php';
require_once APP_PATH . '/core/Session.php';
require_once APP_PATH . '/core/Router.php';
require_once APP_PATH . '/core/helpers.php';

// Initialize Session
Session::init();

// Check session expiry
if (Session::isExpired()) {
    Session::destroy();
    Session::init();
}

// Load Config
$appConfig = require CONFIG_PATH . '/app.php';

// Create Router
$router = new Router();

// Middleware
$router->middleware('guest', function() {
    if (isLoggedIn()) {
        redirect(isAdmin() ? '/admin' : '/tenant');
    }
});

$router->middleware('auth', function() {
    requireLogin();
});

$router->middleware('admin', function() {
    requireAdmin();
});

// ==================== Load Routes ====================

require_once ROOT_PATH . '/routes.php';

// ==================== Error Handler ====================

set_exception_handler(function($e) {
    $config = require CONFIG_PATH . '/app.php';
    if ($config['app']['debug']) {
        echo "<pre>{$e}</pre>";
    } else {
        http_response_code(500);
        $loader = new \Twig\Loader\FilesystemLoader(VIEW_PATH);
        $twig = new \Twig\Environment($loader, ['debug' => false]);
        echo $twig->render('errors/500.html.twig');
    }
});

set_error_handler(function($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new \ErrorException($message, 0, $severity, $file, $line);
});

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        $loader = new \Twig\Loader\FilesystemLoader(VIEW_PATH);
        $twig = new \Twig\Environment($loader, ['debug' => false]);
        echo $twig->render('errors/500.html.twig');
    }
});

// ==================== Dispatch ====================

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptName = dirname($_SERVER['SCRIPT_NAME']);
$route = str_replace($scriptName, '', $requestUri);
$route = rtrim($route, '/');
if ($route === '') {
    $route = '/';
}

$router->dispatch($route, $_SERVER['REQUEST_METHOD']);
