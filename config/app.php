<?php
/**
 * Application Configuration
 */

return [
    'app' => [
        'name' => 'SocietyApp',
        'env' => getenv('APP_ENV') ?: 'development',
        'debug' => (getenv('APP_DEBUG') ?: 'true') === 'true',
        'url' => getenv('APP_URL') ?: 'http://societyapp.localhost.test',
        'timezone' => 'Asia/Kolkata',
    ],
    'session' => [
        'name' => 'SOCIETYAPP_SESSION',
        'lifetime' => (int)(getenv('SESSION_LIFETIME') ?: 3600),
    ],
];
