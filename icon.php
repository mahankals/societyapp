<?php
/**
 * SocietyApp - Icon Endpoint for Social Media Sharing (WhatsApp / Facebook / Twitter)
 */

header('Content-Type: image/png');
header('Cache-Control: public, max-age=604800');

$iconFile = __DIR__ . '/icon.png';
if (!file_exists($iconFile) && defined('ROOT_PATH')) {
    $iconFile = ROOT_PATH . '/icon.png';
}

if (file_exists($iconFile)) {
    header('Content-Length: ' . filesize($iconFile));
    readfile($iconFile);
}
exit;
