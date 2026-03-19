<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($pageTitle) ? $pageTitle . " - SocietyApp" : "SocietyApp"; ?></title>
    <!-- Use a relative path from the root. For deeper folders, we'll need a base path variable. -->
    <link href="<?php echo $basePath ?? ''; ?>assets/dist/output.css" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="bg-gray-50 text-gray-900 font-sans">
    <header class="bg-white shadow-sm sticky top-0 z-50">
        <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div class="flex items-center">
                <a href="<?php echo $basePath ?? ''; ?>index.php" class="text-2xl font-bold text-indigo-600 tracking-tight">SocietyApp</a>
            </div>
            <div class="hidden md:flex space-x-8 items-center">
                <a href="<?php echo $basePath ?? ''; ?>index.php#features" class="text-gray-600 hover:text-indigo-600 font-medium">Features</a>
                <a href="<?php echo $basePath ?? ''; ?>auth/login.php" class="text-gray-600 hover:text-indigo-600 font-medium">Login</a>
                <a href="<?php echo $basePath ?? ''; ?>auth/register.php" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition">Get Started</a>
            </div>
            <!-- Mobile Menu Toggle (Simplified) -->
            <div class="md:hidden">
                <button class="text-gray-600 hover:text-indigo-600 focus:outline-none">
                    <i data-lucide="menu" class="w-6 h-6"></i>
                </button>
            </div>
        </nav>
    </header>
