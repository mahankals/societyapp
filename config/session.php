<?php
/**
 * Session Configuration
 */

return [
    'name' => 'SOCIETYAPP_SESSION',
    'lifetime' => (int)(getenv('SESSION_LIFETIME') ?: 3600),
];
