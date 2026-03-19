<?php
require_once __DIR__ . '/vendor/autoload.php';

$loader = new \Twig\Loader\FilesystemLoader(__DIR__ . '/templates');
$twig = new \Twig\Environment($loader, [
    // 'cache' => __DIR__ . '/cache', // Enable in production
    'debug' => true,
]);

echo $twig->render('index.html.twig', [
    'basePath' => './',
]);
