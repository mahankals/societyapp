#!/usr/bin/env php
<?php
$svg = file_get_contents(__DIR__ . '/../public/assets/icons/logo.svg');

$img = imagecreatetruecolor(32, 32);
$green = imagecolorallocate($img, 16, 185, 129);
$white = imagecolorallocate($img, 255, 255, 255);
$dark = imagecolorallocate($img, 5, 150, 105);
imagefill($img, 0, 0, $green);
imagefilledellipse($img, 16, 16, 30, 30, $green);
imagerectangle($img, 11, 11, 21, 21, $white);

ob_start();
imagepng($img);
$pngData = ob_get_clean();
imagedestroy($img);

$icoHeader = chr(0) . chr(0) . chr(1) . chr(0) . chr(1) . chr(0);
$icoHeader .= chr(32) . chr(32) . chr(0) . chr(0) . chr(1) . chr(0) . chr(32) . chr(0);
$icoHeader .= pack('V', 0);
$icoHeader .= pack('V', 22);

$ico = $icoHeader . $pngData;
file_put_contents(__DIR__ . '/../public/favicon.ico', $ico);
file_put_contents(__DIR__ . '/../public/favicon.png', $pngData);

echo "Created favicon.ico and favicon.png from SVG\n";
