<?php
$pngPath = __DIR__ . '/../public/assets/icons/logo.png';
$icoPath = __DIR__ . '/../public/favicon.ico';

$width = 512;
$height = 512;
$scale = $width / 24;

$img = imagecreatetruecolor($width, $height);
$white = imagecolorallocate($img, 255, 255, 255);
$black = imagecolorallocate($img, 0, 0, 0);
imagefill($img, 0, 0, $white);

$cx = 12 * $scale;
$cy = 12 * $scale;
$r = 11 * $scale;

imagefilledellipse($img, (int)$cx, (int)$cy, (int)($r * 2), (int)($r * 2), $white);
imagesetthickness($img, 6);
imageellipse($img, (int)$cx, (int)$cy, (int)($r * 2), (int)($r * 2), $black);

$tx = 3.5 * $scale;
$ty = 3.5 * $scale;
$tScale = 0.7 * $scale;
$th = 3;

imagesetthickness($img, $th);
imageline($img, (int)($tx + 10*$tScale), (int)($ty + 8*$tScale), (int)($tx + 14*$tScale), (int)($ty + 8*$tScale), $black);
imageline($img, (int)($tx + 10*$tScale), (int)($ty + 12*$tScale), (int)($tx + 14*$tScale), (int)($ty + 12*$tScale), $black);
imageline($img, (int)($tx + 14*$tScale), (int)($ty + 21*$tScale), (int)($tx + 14*$tScale), (int)($ty + 18*$tScale), $black);
imageline($img, (int)($tx + 4*$tScale), (int)($ty + 10*$tScale), (int)($tx + 20*$tScale), (int)($ty + 10*$tScale), $black);
imageline($img, (int)($tx + 6*$tScale), (int)($ty + 21*$tScale), (int)($tx + 6*$tScale), (int)($ty + 5*$tScale), $black);
imageline($img, (int)($tx + 6*$tScale), (int)($ty + 5*$tScale), (int)($tx + 14*$tScale), (int)($ty + 5*$tScale), $black);
imageline($img, (int)($tx + 14*$tScale), (int)($ty + 5*$tScale), (int)($tx + 14*$tScale), (int)($ty + 21*$tScale), $black);

imagepng($img, $pngPath, 0);
imagedestroy($img);

$sizes = [256, 128, 64, 48, 32, 16];
$ico = fopen($icoPath, 'wb');
$header = "\x00\x00\x01\x00" . pack('C', count($sizes)) . "\x00";
fwrite($ico, $header);

$dirEntries = '';
$imageData = '';
$offset = 6 + (count($sizes) * 16);

foreach ($sizes as $size) {
    $scaledImg = imagecreatetruecolor($size, $size);
    $baseImg = imagecreatefrompng($pngPath);
    imagecopyresampled($scaledImg, $baseImg, 0, 0, 0, 0, $size, $size, 512, 512);
    imagedestroy($baseImg);
    ob_start();
    imagepng($scaledImg, null, 0);
    $pngData = ob_get_clean();
    imagedestroy($scaledImg);
    $dirEntries .= pack('C', $size) . pack('C', $size) . "\x00\x00\x01\x00\x20\x00" . pack('V', strlen($pngData)) . pack('V', $offset);
    $offset += strlen($pngData);
    $imageData .= $pngData;
}

fwrite($ico, $dirEntries);
fwrite($ico, $imageData);
fclose($ico);

echo "Done\n";
