<?php
/**
 * Database Configuration
 */

return [
    'driver' => 'mysql',
    'host' => getenv('DB_HOST') ?: (file_exists('/.dockerenv') ? 'db' : 'localhost'),
    'port' => (int)(getenv('DB_PORT') ?: 3306),
    'database' => getenv('DB_NAME') ?: (file_exists('/.dockerenv') ? 'db' : 'societyapp'),
    'username' => getenv('DB_USER') ?: (file_exists('/.dockerenv') ? 'db' : 'root'),
    'password' => getenv('DB_PASS') ?: (file_exists('/.dockerenv') ? 'db' : ''),
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
];
