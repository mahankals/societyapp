<?php
/**
 * SocietyApp - Entry Point
 * 
 * Provides site branding, Open Graph metadata, and loads the maintenance / coming soon handler.
 * When the application is installed and maintenance mode is off, requests pass through to public/index.php.
 */

if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', __DIR__);
}

// Handle direct icon requests for WhatsApp crawler and social scrapers
$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
if ($uriPath === '/icon.png' || $uriPath === '/icon.php') {
    require_once ROOT_PATH . '/icon.php';
    exit;
}

// Site branding and Open Graph configuration for WhatsApp & Social Sharing
$siteConfig = [
    'title' => 'SocietyApp — Smart Residential Living Platform',
    'description' => 'SocietyApp is a modern, transparent, and intelligent digital living platform for residential housing communities. Our team is finalizing deployment setup.',
    'icon' => '/icon.php',
];

// Load maintenance & coming soon system
require_once ROOT_PATH . '/maintenance.php';
