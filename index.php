<?php
/**
 * SocietyApp Central Router
 */

require_once __DIR__ . '/vendor/autoload.php';

// Initialize Twig
$loader = new \Twig\Loader\FilesystemLoader(__DIR__ . '/templates');
$twig = new \Twig\Environment($loader, [
    // 'cache' => __DIR__ . '/cache', // Enable in production
    'debug' => true,
]);

// Basic Routing Logic
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptName = dirname($_SERVER['SCRIPT_NAME']);
$route = str_replace($scriptName, '', $requestUri);
$route = trim($route, '/');

// Configuration: Allowed Routes
$routes = [
    ''       => 'index.html.twig',       // Landing Page
    'auth'   => 'auth/login.php',        // Handled by sub-files for now or specific logic
    'admin'  => 'admin/index.php',
    'client' => 'client/index.php',
];

// Helper to determine base path for assets
$depth = count(array_filter(explode('/', $route)));
$basePath = str_repeat('../', $depth) ?: './';

// Route Handling
if ($route === '') {
    // Render Landing Page
    echo $twig->render('index.html.twig', [
        'basePath' => $basePath,
    ]);
} elseif (preg_match('/^auth(\/.*)?$/', $route)) {
    // For now, redirect to the actual file or handle logic
    // This allows /auth, /auth/login, etc.
    include_once __DIR__ . '/auth/index.php'; 
} elseif (preg_match('/^admin(\/.*)?$/', $route)) {
    include_once __DIR__ . '/admin/index.php';
} elseif (preg_match('/^client(\/.*)?$/', $route)) {
    include_once __DIR__ . '/client/index.php';
} elseif (preg_match('/^api(\/.*)?$/', $route)) {
    include_once __DIR__ . '/api/index.php';
} else {
    // 404 Not Found
    http_response_code(404);
    echo "<h1>404 Not Found</h1>";
    echo "The route '" . htmlspecialchars($route) . "' is not configured.";
}
