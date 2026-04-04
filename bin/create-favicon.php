<?php
error_reporting(E_ALL & ~E_DEPRECATED);

$svgPath = __DIR__ . '/../public/assets/icons/logo.svg';
$icoPath = __DIR__ . '/../public/favicon.ico';
$pngPath = __DIR__ . '/../public/assets/icons/logo.png';

$svgContent = file_get_contents($svgPath);

$dom = new DOMDocument();
$dom->loadXML($svgContent);
$svg = $dom->getElementsByTagName('svg')->item(0);

$width = 512;
$height = 512;

$img = imagecreatetruecolor($width, $height);
$white = imagecolorallocate($img, 255, 255, 255);
$black = imagecolorallocate($img, 0, 0, 0);
imagefill($img, 0, 0, $white);

$cx = $width / 2;
$cy = $height / 2;
$r = min($width, $height) / 2 * 0.96;

imagefilledellipse($img, $cx, $cy, $r * 2, $r * 2, $white);

$innerR = $r * 0.7;
imagefilledellipse($img, $cx, $cy, $innerR * 2, $innerR * 2, $white);

$strokeWidth = max(2, $r * 0.08);
imagesetthickness($img, $strokeWidth);

$rectSize = $r * 0.75;
$rectLeft = $cx - $rectSize / 2;
$rectTop = $cy - $rectSize / 2;
imagerectangle($img, (int)$rectLeft, (int)$rectTop, (int)($rectLeft + $rectSize), (int)($rectTop + $rectSize), $black);

$hLineY1 = $cy - $rectSize * 0.25;
$hLineY2 = $cy + $rectSize * 0.25;
imageline($img, (int)$rectLeft, (int)$hLineY1, (int)($rectLeft + $rectSize), (int)$hLineY1, $black);
imageline($img, (int)$rectLeft, (int)$hLineY2, (int)($rectLeft + $rectSize), (int)$hLineY2, $black);

$vLineX1 = $cx - $rectSize * 0.25;
$vLineX2 = $cx + $rectSize * 0.25;
imageline($img, (int)$vLineX1, (int)$rectTop, (int)$vLineX1, (int)($rectTop + $rectSize), $black);
imageline($img, (int)$vLineX2, (int)$rectTop, (int)$vLineX2, (int)($rectTop + $rectSize), $black);

$pngFull = imagecreatetruecolor(512, 512);
imagecopy($pngFull, $img, 0, 0, 0, 0, 512, 512);
imagepng($pngFull, $pngPath);
imagedestroy($pngFull);

$sizes = [256, 128, 64, 48, 32, 16];
$ico = fopen($icoPath, 'wb');

$header = "\x00\x00\x01\x00" . pack('C', count($sizes)) . "\x00";
fwrite($ico, $header);

$dirEntries = '';
$imageData = '';
$offset = 6 + (count($sizes) * 16);

foreach ($sizes as $size) {
    $scaledImg = imagecreatetruecolor($size, $size);
    imagecopyresampled($scaledImg, $img, 0, 0, 0, 0, $size, $size, 512, 512);
    
    ob_start();
    imagepng($scaledImg, null, 0);
    $pngData = ob_get_clean();
    imagedestroy($scaledImg);
    
    $dirEntries .= pack('C', $size);
    $dirEntries .= pack('C', $size);
    $dirEntries .= "\x00\x00\x01\x00\x20\x00";
    $dirEntries .= pack('V', strlen($pngData));
    $dirEntries .= pack('V', $offset);
    
    $offset += strlen($pngData);
    $imageData .= $pngData;
}

fwrite($ico, $dirEntries);
fwrite($ico, $imageData);
fclose($ico);

imagedestroy($img);

echo "Created favicon.ico and logo.png from logo.svg\n";
