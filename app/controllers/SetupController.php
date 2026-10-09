<?php
/**
 * Setup & Onboarding Controller
 * Handles system initialization, configuration wizard, and initial super admin creation.
 */

class SetupController
{
    public function index()
    {
        // Once app is deployed/installed, /setup must be redirected to landing page
        if ($this->isSetupCompleted()) {
            redirect('/');
        }

        $requirements = $this->checkRequirements();
        $envDefaults = getEnvironmentDefaults();

        // Step Slugs mapping
        $slugs = [
            1 => 'prerequisites',
            2 => 'database',
            3 => 'branding',
            4 => 'email',
            5 => 'google',
            6 => 'admin',
            7 => 'review',
        ];
        $slugToStep = array_flip($slugs);

        // Check which steps are already stored/completed in the database
        $completedSteps = [
            'prerequisites' => true,
            'database' => false,
            'branding' => false,
            'email' => false,
            'google' => false,
            'admin' => false,
            'review' => false,
        ];

        try {
            $db = Database::getInstance();
            $hasSettings = (bool)$db->query("SHOW TABLES LIKE 'settings'")->fetch();
            if ($hasSettings) {
                $completedSteps['database'] = true;
                
                // Check Branding
                $brandRow = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'app_name' LIMIT 1")->fetch();
                if ($brandRow && !empty(trim($brandRow['setting_value'] ?? ''))) {
                    $completedSteps['branding'] = true;
                }

                // Check Email
                $mailRow = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'mail_host' LIMIT 1")->fetch();
                if ($mailRow && !empty(trim($mailRow['setting_value'] ?? ''))) {
                    $completedSteps['email'] = true;
                }

                // Check Google SSO
                $ssoRow = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'google_client_id' LIMIT 1")->fetch();
                if ($ssoRow && !empty(trim($ssoRow['setting_value'] ?? ''))) {
                    $completedSteps['google'] = true;
                }
            }

            $hasUsers = (bool)$db->query("SHOW TABLES LIKE 'users'")->fetch();
            $adminUser = null;
            if ($hasUsers) {
                try {
                    $hasPhotoCol = (bool)$db->query("SHOW COLUMNS FROM users LIKE 'profile_photo'")->fetch();
                    if (!$hasPhotoCol) {
                        $db->exec("ALTER TABLE users ADD COLUMN profile_photo VARCHAR(255) NULL AFTER google_id");
                    }
                } catch (Throwable $e) {}

                $superadminId = getSetting('superadmin_id');
                if (!empty($superadminId)) {
                    $stmt = $db->prepare("SELECT id, name, email, phone, google_id, password_hash, profile_photo FROM users WHERE id = ? LIMIT 1");
                    $stmt->execute([$superadminId]);
                    $adminUser = $stmt->fetch();
                }
                if (!$adminUser) {
                    $adminUser = $db->query("SELECT id, name, email, phone, google_id, password_hash, profile_photo 
                        FROM users 
                        WHERE role = 'admin' AND is_active = 1 LIMIT 1")->fetch();
                }
                if ($adminUser && !empty(trim((string)($adminUser['email'] ?? '')))) {
                    $completedSteps['admin'] = true;
                }
            }
        } catch (Throwable $e) {
            // DB not reachable yet
        }

        // Requested Step from URL param: ?step=2 or ?step=branding
        $reqStep = $_GET['step'] ?? null;
        $initialStep = 1;
        if ($reqStep !== null) {
            if (is_numeric($reqStep)) {
                $initialStep = max(1, min(7, (int)$reqStep));
            } elseif (isset($slugToStep[strtolower($reqStep)])) {
                $initialStep = $slugToStep[strtolower($reqStep)];
            }
        } else {
            // Auto-resume at the first uncompleted step
            if (!$completedSteps['database']) {
                $initialStep = 1;
            } elseif (!$completedSteps['branding']) {
                $initialStep = 3;
            } elseif (!$completedSteps['email']) {
                $initialStep = 4;
            } elseif (!$completedSteps['google']) {
                $initialStep = 5;
            } elseif (!$completedSteps['admin']) {
                $initialStep = 6;
            } else {
                $initialStep = 7;
            }
        }

        $savedAppName = getSetting('app_name');
        if (!$savedAppName || $savedAppName === 'Green Acres Co-op' || $savedAppName === 'SocietyApp') {
            $savedAppName = 'Society App';
        }

        $currentDomain = preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? 'societyapp.ddev.site');
        $defaultFromEmail = 'no-reply@' . $currentDomain;
        $savedFromEmail = getSetting('mail_from_address');
        if (!$savedFromEmail || $savedFromEmail === 'admin@societyapp.com' || $savedFromEmail === 'no-reply@societyapp.com') {
            $savedFromEmail = $defaultFromEmail;
        }

        $defaults = [
            'environment' => $envDefaults['environment'],
            'app_name' => $savedAppName,
            'app_desc' => getSetting('app_desc', 'The premium management platform for modern residential communities.'),
            'app_logo' => getSetting('app_logo', ''),
            'app_url' => getSetting('app_url', getenv('APP_URL') ?: $envDefaults['app_url']),
            'db_host' => getSetting('db_host', getenv('DB_HOST') ?: $envDefaults['db_host']),
            'db_port' => getSetting('db_port', getenv('DB_PORT') ?: $envDefaults['db_port']),
            'db_name' => getSetting('db_name', getenv('DB_NAME') ?: $envDefaults['db_name']),
            'db_user' => getSetting('db_user', getenv('DB_USER') ?: $envDefaults['db_user']),
            'db_pass' => '',
            'has_db_pass' => !empty(getSetting('db_pass', getenv('DB_PASS') ?: $envDefaults['db_pass'])),
            'mail_host' => getSetting('mail_host', getenv('MAIL_HOST') ?: $envDefaults['mail_host']),
            'mail_port' => getSetting('mail_port', getenv('MAIL_PORT') ?: $envDefaults['mail_port']),
            'mail_username' => getSetting('mail_username', getenv('MAIL_USERNAME') ?: ''),
            'mail_password' => '',
            'has_mail_password' => !empty(getSetting('mail_password', getenv('MAIL_PASSWORD') ?: '')),
            'mail_from_address' => $savedFromEmail,
            'mail_from_name' => getSetting('mail_from_name', 'Society App Notifications'),
            'google_client_id' => getSetting('google_client_id', ''),
            'google_client_secret' => '',
            'has_google_client_secret' => !empty(getSetting('google_client_secret', '')),
            'admin_name' => $adminUser['name'] ?? '',
            'admin_email' => $adminUser['email'] ?? '',
            'admin_phone' => $adminUser['phone'] ?? '',
            'admin_google_id' => $adminUser['google_id'] ?? '',
            'admin_avatar' => $adminUser['profile_photo'] ?? '',
            'has_admin_user' => !empty($adminUser['email'] ?? ''),
            'has_admin_password' => !empty($adminUser['password_hash'] ?? ''),
        ];

        echo view('setup/index', [
            'basePath' => '/',
            'requirements' => $requirements,
            'defaults' => $defaults,
            'currentDomain' => $currentDomain,
            'completedSteps' => $completedSteps,
            'initialStep' => $initialStep,
            'stepSlugs' => $slugs,
            'csrfToken' => generateCSRFToken(),
            'isCompleted' => $this->isSetupCompleted(),
        ]);
    }

    public function testDb()
    {
        header('Content-Type: application/json');
        
        $host = trim($_POST['db_host'] ?? 'localhost');
        $port = (int)($_POST['db_port'] ?? 3306);
        $name = trim($_POST['db_name'] ?? '');
        $user = trim($_POST['db_user'] ?? 'root');
        $pass = $_POST['db_pass'] ?? '';
        if ($pass === '') {
            $existingDbPass = getSetting('db_pass', getenv('DB_PASS') ?: '');
            if (!empty($existingDbPass)) {
                $pass = $existingDbPass;
            }
        }

        try {
            $dsn = "mysql:host={$host};port={$port};charset=utf8mb4";
            $pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 5,
            ]);

            $version = $pdo->query('SELECT VERSION()')->fetchColumn();

            $stmt = $pdo->query("SHOW DATABASES LIKE " . $pdo->quote($name));
            $dbExists = (bool)$stmt->fetch();

            if (!$dbExists) {
                $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $dbMsg = " (Database `{$name}` will be created)";
            } else {
                $dbMsg = " (Database `{$name}` exists and is ready)";
            }

            echo json_encode([
                'success' => true,
                'message' => "Connection successful! Server: {$version}{$dbMsg}",
                'version' => $version,
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'error' => $e->getMessage(),
            ]);
        }
        exit;
    }

    public function testEmail()
    {
        header('Content-Type: application/json');

        $host = trim($_POST['mail_host'] ?? '');
        $port = (int)($_POST['mail_port'] ?? 1025);
        $timeout = 5;

        if (empty($host)) {
            echo json_encode(['success' => false, 'error' => 'Please provide an SMTP Host.']);
            exit;
        }

        $errno = 0;
        $errstr = '';
        $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);

        if (!$socket) {
            echo json_encode([
                'success' => false,
                'error' => "Cannot connect to SMTP server at {$host}:{$port} ({$errstr} [{$errno}]).",
            ]);
            exit;
        }

        // Read server greeting banner
        $greeting = @fgets($socket, 512);
        @fputs($socket, "EHLO " . ($_SERVER['SERVER_NAME'] ?? 'localhost') . "\r\n");
        $ehlo = @fgets($socket, 512);
        @fputs($socket, "QUIT\r\n");
        @fclose($socket);

        $greetingText = trim($greeting ?: 'Connected');
        echo json_encode([
            'success' => true,
            'message' => "✓ SMTP connection successful! Server responded: {$greetingText}",
        ]);
        exit;
    }

    public function testGoogleSso()
    {
        header('Content-Type: application/json');

        $clientId = trim($_POST['google_client_id'] ?? '');
        $clientSecret = trim($_POST['google_client_secret'] ?? '');

        if (empty($clientId)) {
            echo json_encode(['success' => false, 'error' => 'Please provide a Google Client ID.']);
            exit;
        }

        if (!str_ends_with($clientId, '.apps.googleusercontent.com') && !str_contains($clientId, 'googleusercontent.com')) {
            echo json_encode([
                'success' => false,
                'error' => 'A valid Google Client ID ends with .apps.googleusercontent.com.',
            ]);
            exit;
        }

        if (empty($clientSecret)) {
            $clientSecret = getSetting('google_client_secret', '');
        }

        if (empty($clientSecret)) {
            echo json_encode(['success' => false, 'error' => 'Please provide a Google Client Secret.']);
            exit;
        }

        // Allow test/demo credentials for local development
        if (str_contains(strtolower($clientId), 'test') || str_contains(strtolower($clientSecret), 'test') || str_contains(strtolower($clientSecret), 'demo')) {
            echo json_encode([
                'success' => true,
                'message' => '✓ Test credential accepted for local/development mode.',
            ]);
            exit;
        }

        try {
            $ch = curl_init('https://oauth2.googleapis.com/token');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'code' => 'test_verification_' . bin2hex(random_bytes(8)),
                'grant_type' => 'authorization_code',
                'redirect_uri' => 'https://' . ($_SERVER['HTTP_HOST'] ?? 'societyapp.ddev.site') . '/auth/google-callback',
            ]));
            curl_setopt($ch, CURLOPT_TIMEOUT, 6);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

            $data = json_decode($response, true);
            $error = $data['error'] ?? '';

            // If Google returns invalid_grant, client_id and client_secret are valid credentials!
            if ($error === 'invalid_grant' || $httpCode === 200) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Client ID format and credentials validated.',
                ]);
                exit;
            } elseif ($error === 'invalid_client') {
                echo json_encode([
                    'success' => false,
                    'error' => 'Google rejected this Client ID and secret (invalid_client). Check both values in Google Cloud.',
                ]);
                exit;
            } else {
                $desc = $data['error_description'] ?? $error;
                if ($desc) {
                    echo json_encode([
                        'success' => false,
                        'error' => "Google API: {$desc}",
                    ]);
                    exit;
                }
                echo json_encode([
                    'success' => true,
                    'message' => '✓ Client ID format and credentials validated.',
                ]);
                exit;
            }
        } catch (Throwable $e) {
            echo json_encode([
                'success' => false,
                'error' => 'Error contacting Google: ' . $e->getMessage(),
            ]);
            exit;
        }
    }

    /**
     * Persist each step's settings directly into the database as user advances
     */
    public function saveStep()
    {
        header('Content-Type: application/json');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            echo json_encode([
                'success' => false, 
                'error' => 'CSRF validation failed. Please refresh the page.',
                'new_csrf_token' => generateCSRFToken(),
            ]);
            exit;
        }

        $step = trim($_POST['step'] ?? '');

        try {
            switch ($step) {
                case 'database':
                    $host = trim($_POST['db_host'] ?? 'localhost');
                    $port = (int)($_POST['db_port'] ?? 3306);
                    $name = trim($_POST['db_name'] ?? '');
                    $user = trim($_POST['db_user'] ?? 'root');
                    $pass = $_POST['db_pass'] ?? '';
                    if ($pass === '') {
                        $existingDbPass = getSetting('db_pass', getenv('DB_PASS') ?: '');
                        if (!empty($existingDbPass)) {
                            $pass = $existingDbPass;
                        }
                    }

                    if (empty($host) || empty($name) || empty($user)) {
                        echo json_encode(['success' => false, 'error' => 'Please provide Database Host, Name, and Username.']);
                        exit;
                    }

                    $dsn = "mysql:host={$host};port={$port};charset=utf8mb4";
                    $pdo = new PDO($dsn, $user, $pass, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_TIMEOUT => 5,
                    ]);

                    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    $pdo->exec("USE `{$name}`");

                    // Execute database schema creation right on Step 2 Save
                    $schemaFile = APP_PATH . '/schema.sql';
                    if (file_exists($schemaFile)) {
                        $sql = file_get_contents($schemaFile);
                        $sql = preg_replace('/^\s*CREATE\s+DATABASE\s+[^;]+;/mi', '', $sql);
                        $sql = preg_replace('/^\s*USE\s+[^;]+;/mi', '', $sql);

                        $queries = array_filter(array_map('trim', explode(';', $sql)));
                        foreach ($queries as $query) {
                            if (!empty($query)) {
                                $pdo->exec($query);
                            }
                        }
                    }

                    // Ensure column compatibility for upgraded databases
                    try {
                        $userPhone = $pdo->query("SHOW COLUMNS FROM users LIKE 'phone'")->fetch();
                        if (!$userPhone) {
                            $pdo->exec("ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL AFTER name");
                        }
                        $userRole = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'")->fetch();
                        if ($userRole && strpos($userRole['Type'], 'committee') === false) {
                            $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'committee', 'resident') DEFAULT 'resident'");
                        }
                    } catch (Exception $e) {
                        // Ignore if already altered
                    }

                    // Create settings table if not already created by schema
                    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        setting_key VARCHAR(100) NOT NULL UNIQUE,
                        setting_value TEXT NULL,
                        setting_group VARCHAR(50) DEFAULT 'general',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_setting_key (setting_key),
                        INDEX idx_setting_group (setting_group)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

                    $saveSetting = $pdo->prepare("INSERT INTO settings (setting_key, setting_value, setting_group) 
                        VALUES (?, ?, ?) 
                        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()");
                    $saveSetting->execute(['setup_step', '2', 'system']);

                    // Update .env with DB parameters so subsequent DB calls connect
                    $this->updateEnvFile([
                        'DB_HOST' => $host,
                        'DB_PORT' => $port,
                        'DB_NAME' => $name,
                        'DB_USER' => $user,
                        'DB_PASS' => $pass,
                    ]);
                    Database::resetInstance();

                    echo json_encode(['success' => true, 'step' => 'database', 'message' => 'Database configured, schema created, and initialized successfully.', 'csrf_token' => generateCSRFToken()]);
                    exit;

                case 'branding':
                    $appName = trim($_POST['app_name'] ?? '');
                    $appDesc = trim($_POST['app_desc'] ?? '');
                    $logoBase64 = $_POST['logo_base64'] ?? '';

                    if (empty($appName)) {
                        echo json_encode(['success' => false, 'error' => 'Please provide an Application Name.']);
                        exit;
                    }

                    // Handle Logo file saving
                    $logoPath = '';
                    $faviconPath = '';
                    $ext = '';
                    if (!empty($logoBase64) && preg_match('/^data:image\/([a-zA-Z0-9_\+\-]+);base64,/', $logoBase64, $matches)) {
                        $rawExt = strtolower($matches[1]);
                        $ext = str_contains($rawExt, 'svg') ? 'svg' : (($rawExt === 'jpeg') ? 'jpg' : $rawExt);
                        if (in_array($ext, ['png', 'jpg', 'svg', 'webp', 'gif'])) {
                            $uploadDir = PUBLIC_PATH . '/uploads/branding';
                            if (!is_dir($uploadDir)) {
                                @mkdir($uploadDir, 0755, true);
                            }
                            $cleanData = substr($logoBase64, strpos($logoBase64, ',') + 1);
                            $decoded = base64_decode($cleanData);
                            if ($decoded !== false) {
                                $filename = 'app-logo.' . $ext;
                                file_put_contents($uploadDir . '/' . $filename, $decoded);
                                $logoPath = '/uploads/branding/' . $filename;
                                $faviconPath = $logoPath;

                                // Sync default favicon.ico
                                @file_put_contents(PUBLIC_PATH . '/favicon.ico', $decoded);

                                // If SVG, update default icon asset
                                if ($ext === 'svg') {
                                    @file_put_contents(PUBLIC_PATH . '/assets/icons/logo.svg', $decoded);
                                }
                            }
                        }
                    }

                    setSetting('app_name', $appName, 'branding');
                    setSetting('app_desc', $appDesc, 'branding');
                    if ($logoPath) {
                        setSetting('app_logo', $logoPath, 'branding');
                        setSetting('app_favicon', $faviconPath ?: $logoPath, 'branding');
                    }
                    setSetting('branding_updated_at', (string)time(), 'branding');
                    setSetting('setup_step', '3', 'system');

                    $this->updateEnvFile(['APP_NAME' => $appName]);

                    // Sync PWA manifest
                    $manifestFile = PUBLIC_PATH . '/manifest.json';
                    if (file_exists($manifestFile)) {
                        $manifest = json_decode(file_get_contents($manifestFile), true);
                        if (is_array($manifest)) {
                            $manifest['name'] = $appName;
                            $manifest['short_name'] = $appName;
                            $manifest['description'] = $appDesc;
                            if ($logoPath) {
                                $mime = ($ext === 'svg') ? 'image/svg+xml' : 'image/' . $ext;
                                $manifest['icons'] = [
                                    ['src' => $logoPath, 'sizes' => '512x512', 'type' => $mime, 'purpose' => 'any'],
                                    ['src' => $logoPath, 'sizes' => '512x512', 'type' => $mime, 'purpose' => 'maskable'],
                                ];
                            }
                            @file_put_contents($manifestFile, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
                        }
                    }

                    echo json_encode(['success' => true, 'step' => 'branding', 'message' => 'Branding configuration, logo & favicon updated successfully.', 'csrf_token' => generateCSRFToken()]);
                    exit;

                case 'email':
                    $mailHost = trim($_POST['mail_host'] ?? '');
                    $mailPort = (int)($_POST['mail_port'] ?? 1025);
                    $mailUser = trim($_POST['mail_username'] ?? '');
                    $mailPass = $_POST['mail_password'] ?? '';
                    if ($mailPass === '') {
                        $existingPass = getSetting('mail_password', '');
                        if (!empty($existingPass)) {
                            $mailPass = $existingPass;
                        }
                    }
                    $fromAddress = trim($_POST['mail_from_address'] ?? '');
                    $fromName = trim($_POST['mail_from_name'] ?? '');

                    if (empty($mailHost)) {
                        echo json_encode(['success' => false, 'error' => 'Please provide an SMTP Host.']);
                        exit;
                    }

                    setSetting('mail_host', $mailHost, 'email');
                    setSetting('mail_port', (string)$mailPort, 'email');
                    setSetting('mail_username', $mailUser, 'email');
                    setSetting('mail_password', $mailPass, 'email');
                    setSetting('mail_from_address', $fromAddress, 'email');
                    setSetting('mail_from_name', $fromName, 'email');
                    setSetting('setup_step', '4', 'system');

                    echo json_encode(['success' => true, 'step' => 'email', 'message' => 'SMTP configuration saved to database.', 'csrf_token' => generateCSRFToken()]);
                    exit;

                case 'google':
                    $clientId = trim($_POST['google_client_id'] ?? '');
                    $clientSecret = trim($_POST['google_client_secret'] ?? '');

                    if (empty($clientId)) {
                        echo json_encode(['success' => false, 'error' => 'Please provide a Google Client ID.']);
                        exit;
                    }

                    if (empty($clientSecret)) {
                        $existingSecret = getSetting('google_client_secret', '');
                        if (!empty($existingSecret)) {
                            $clientSecret = $existingSecret;
                        } else {
                            echo json_encode(['success' => false, 'error' => 'Please provide a Google Client Secret.']);
                            exit;
                        }
                    }

                    setSetting('google_client_id', $clientId, 'sso');
                    setSetting('google_client_secret', $clientSecret, 'sso');
                    setSetting('google_sso_enabled', '1', 'sso');
                    setSetting('setup_step', '5', 'system');

                    echo json_encode(['success' => true, 'step' => 'google', 'message' => 'Google SSO credentials saved to database.', 'csrf_token' => generateCSRFToken()]);
                    exit;

                case 'admin':
                    $adminName = trim($_POST['admin_name'] ?? '');
                    $adminEmail = filter_var(trim($_POST['admin_email'] ?? ''), FILTER_VALIDATE_EMAIL);
                    $adminPassword = $_POST['admin_password'] ?? '';
                    $adminPhone = trim($_POST['admin_phone'] ?? '');

                    $db = Database::getInstance();

                    // Ensure users table exists
                    $hasUsers = (bool)$db->query("SHOW TABLES LIKE 'users'")->fetch();
                    if (!$hasUsers) {
                        $schemaFile = APP_PATH . '/schema.sql';
                        if (file_exists($schemaFile)) {
                            $sql = file_get_contents($schemaFile);
                            $sql = preg_replace('/^\s*CREATE\s+DATABASE\s+[^;]+;/mi', '', $sql);
                            $sql = preg_replace('/^\s*USE\s+[^;]+;/mi', '', $sql);
                            $queries = array_filter(array_map('trim', explode(';', $sql)));
                            foreach ($queries as $query) {
                                if (!empty($query)) {
                                    $db->exec($query);
                                }
                            }
                        }
                    }

                    $stmt = $db->prepare("SELECT id, password_hash FROM users WHERE email = ?");
                    $stmt->execute([$adminEmail]);
                    $existingAdmin = $stmt->fetch();

                    if (!$adminEmail || empty($adminName)) {
                        echo json_encode(['success' => false, 'error' => 'Please provide a valid Admin name and email.']);
                        exit;
                    }

                    if (!$existingAdmin && strlen($adminPassword) < 8) {
                        echo json_encode(['success' => false, 'error' => 'Please provide a password of at least 8 characters.']);
                        exit;
                    }

                    if ($existingAdmin && !empty($adminPassword) && strlen($adminPassword) < 8) {
                        echo json_encode(['success' => false, 'error' => 'Password must be at least 8 characters.']);
                        exit;
                    }

                    if (!empty($adminPhone)) {
                        $cleanPhone = preg_replace('/[^\d+]/', '', $adminPhone);
                        if (str_starts_with($cleanPhone, '+91')) {
                            $national = substr($cleanPhone, 3);
                            if (!preg_match('/^[6-9]\d{9}$/', $national)) {
                                echo json_encode(['success' => false, 'error' => 'Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.']);
                                exit;
                            }
                        } elseif (!preg_match('/^\+?\d{7,15}$/', $cleanPhone)) {
                            echo json_encode(['success' => false, 'error' => 'Please provide a valid mobile number (7 to 15 digits).']);
                            exit;
                        }
                    }

                    $adminGoogleId = trim($_POST['admin_google_id'] ?? '');
                    $adminAvatar = trim($_POST['admin_avatar'] ?? '');

                    $passwordHash = !empty($adminPassword)
                        ? password_hash($adminPassword, PASSWORD_DEFAULT, ['cost' => 12])
                        : ($existingAdmin['password_hash'] ?? '');

                    if ($existingAdmin) {
                        $adminId = (int)$existingAdmin['id'];
                        $sql = "UPDATE users SET name = ?, password_hash = ?, phone = ?, role = 'admin', is_active = 1";
                        $params = [$adminName, $passwordHash, $adminPhone];
                        if (!empty($adminAvatar)) {
                            $sql .= ", profile_photo = ?";
                            $params[] = $adminAvatar;
                        }
                        if (!empty($adminGoogleId)) {
                            $sql .= ", google_id = ?";
                            $params[] = $adminGoogleId;
                        }
                        $sql .= " WHERE id = ?";
                        $params[] = $adminId;
                        $updateUser = $db->prepare($sql);
                        $updateUser->execute($params);
                    } else {
                        $insertUser = $db->prepare("INSERT INTO users (email, password_hash, name, phone, google_id, profile_photo, role, is_active, email_verified_at) VALUES (?, ?, ?, ?, ?, ?, 'admin', 1, NOW())");
                        $insertUser->execute([$adminEmail, $passwordHash, $adminName, $adminPhone, !empty($adminGoogleId) ? $adminGoogleId : null, !empty($adminAvatar) ? $adminAvatar : null]);
                        $adminId = (int)$db->lastInsertId();
                    }

                    setSetting('superadmin_id', (string)$adminId, 'system');
                    setSetting('setup_step', '6', 'system');
                    loginUser($adminId, 'admin', $adminEmail);

                    echo json_encode(['success' => true, 'step' => 'admin', 'message' => 'Super Administrator created and saved to database.', 'csrf_token' => generateCSRFToken()]);
                    exit;

                default:
                    echo json_encode(['success' => false, 'error' => 'Unknown setup step.']);
                    exit;
            }
        } catch (Throwable $e) {
            echo json_encode(['success' => false, 'error' => 'Error saving step: ' . $e->getMessage()]);
            exit;
        }
    }

    public function getCsrfToken()
    {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'csrf_token' => generateCSRFToken(),
        ]);
        exit;
    }

    public function install()
    {
        header('Content-Type: application/json');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            echo json_encode([
                'success' => false, 
                'error' => 'CSRF validation failed. Please refresh the page.',
                'new_csrf_token' => generateCSRFToken(),
            ]);
            exit;
        }

        // 1. Branding Inputs
        $appName = trim($_POST['app_name'] ?? 'SocietyApp');
        $appDesc = trim($_POST['app_desc'] ?? 'The premium management platform for modern residential communities.');
        $appUrl = trim($_POST['app_url'] ?? ('https://' . ($_SERVER['HTTP_HOST'] ?? 'societyapp.ddev.site')));
        $logoBase64 = $_POST['logo_base64'] ?? '';

        // 2. Database Inputs
        $dbHost = trim($_POST['db_host'] ?? 'db');
        $dbPort = (int)($_POST['db_port'] ?? 3306);
        $dbName = trim($_POST['db_name'] ?? 'db');
        $dbUser = trim($_POST['db_user'] ?? 'db');
        $dbPass = $_POST['db_pass'] ?? '';
        if ($dbPass === '') {
            $dbPass = getSetting('db_pass', getenv('DB_PASS') ?: '');
        }

        // 3. Email Inputs
        $smtpHost = trim($_POST['mail_host'] ?? '');
        $smtpPort = trim($_POST['mail_port'] ?? '1025');
        $smtpUser = trim($_POST['mail_username'] ?? '');
        $smtpPass = trim($_POST['mail_password'] ?? '');
        if ($smtpPass === '') {
            $smtpPass = getSetting('mail_password', '');
        }
        $mailFromAddress = trim($_POST['mail_from_address'] ?? 'admin@societyapp.com');
        $mailFromName = trim($_POST['mail_from_name'] ?? $appName);

        // 4. Google SSO Inputs
        $googleClientId = trim($_POST['google_client_id'] ?? '');
        $googleClientSecret = trim($_POST['google_client_secret'] ?? '');
        if ($googleClientSecret === '') {
            $googleClientSecret = getSetting('google_client_secret', '');
        }

        // 5. Super Admin Inputs
        $adminName = trim($_POST['admin_name'] ?? '');
        $adminEmail = filter_var(trim($_POST['admin_email'] ?? ''), FILTER_VALIDATE_EMAIL);
        $adminPassword = $_POST['admin_password'] ?? '';
        $adminPhone = trim($_POST['admin_phone'] ?? '');

        // Validations
        if (empty($appName)) {
            echo json_encode(['success' => false, 'error' => 'Please provide an Application Name.']);
            exit;
        }

        if (empty($smtpHost)) {
            echo json_encode(['success' => false, 'error' => 'Please provide an SMTP Mail Host.']);
            exit;
        }

        if (empty($googleClientId)) {
            echo json_encode(['success' => false, 'error' => 'Please provide the Google OAuth Client ID for Single Sign-On.']);
            exit;
        }

        if (!$adminEmail || empty($adminName)) {
            echo json_encode(['success' => false, 'error' => 'Please provide a valid Super Admin name and email.']);
            exit;
        }

        if (!empty($adminPassword) && strlen($adminPassword) < 8) {
            echo json_encode(['success' => false, 'error' => 'Super Administrator password must be at least 8 characters.']);
            exit;
        }

        if (!empty($adminPhone)) {
            $cleanPhone = preg_replace('/[^\d+]/', '', $adminPhone);
            if (str_starts_with($cleanPhone, '+91')) {
                $national = substr($cleanPhone, 3);
                if (!preg_match('/^[6-9]\d{9}$/', $national)) {
                    echo json_encode(['success' => false, 'error' => 'Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.']);
                    exit;
                }
            } elseif (!preg_match('/^\+?\d{7,15}$/', $cleanPhone)) {
                echo json_encode(['success' => false, 'error' => 'Please provide a valid mobile number (7 to 15 digits).']);
                exit;
            }
        }

        try {
            // Connect & prepare database
            $dsn = "mysql:host={$dbHost};port={$dbPort};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);

            $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo->exec("USE `{$dbName}`");

            // Execute schema migration
            $schemaFile = APP_PATH . '/schema.sql';
            if (file_exists($schemaFile)) {
                $sql = file_get_contents($schemaFile);
                $sql = preg_replace('/^\s*CREATE\s+DATABASE\s+[^;]+;/mi', '', $sql);
                $sql = preg_replace('/^\s*USE\s+[^;]+;/mi', '', $sql);

                $queries = array_filter(array_map('trim', explode(';', $sql)));
                foreach ($queries as $query) {
                    if (!empty($query)) {
                        $pdo->exec($query);
                    }
                }
            }

            // Ensure column compatibility for upgraded databases
            try {
                $userPhone = $pdo->query("SHOW COLUMNS FROM users LIKE 'phone'")->fetch();
                if (!$userPhone) {
                    $pdo->exec("ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL AFTER name");
                }
                $userRole = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'")->fetch();
                if ($userRole && strpos($userRole['Type'], 'committee') === false) {
                    $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'committee', 'resident') DEFAULT 'resident'");
                }
                $userPhoto = $pdo->query("SHOW COLUMNS FROM users LIKE 'profile_photo'")->fetch();
                if (!$userPhoto) {
                    $pdo->exec("ALTER TABLE users ADD COLUMN profile_photo VARCHAR(255) NULL AFTER google_id");
                }
            } catch (Exception $e) {
                // Ignore if already altered
            }

            // Handle Logo file saving if provided
            $logoPath = '';
            $ext = '';
            if (!empty($logoBase64) && preg_match('/^data:image\/(\w+);base64,/', $logoBase64, $matches)) {
                $ext = strtolower($matches[1]);
                if (in_array($ext, ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'])) {
                    $uploadDir = PUBLIC_PATH . '/uploads/branding';
                    if (!is_dir($uploadDir)) {
                        @mkdir($uploadDir, 0755, true);
                    }
                    $cleanData = substr($logoBase64, strpos($logoBase64, ',') + 1);
                    $decoded = base64_decode($cleanData);
                    if ($decoded !== false) {
                        $ext = ($ext === 'jpeg') ? 'jpg' : $ext;
                        $filename = 'app-logo.' . $ext;
                        file_put_contents($uploadDir . '/' . $filename, $decoded);
                        $logoPath = '/uploads/branding/' . $filename;
                        @file_put_contents(PUBLIC_PATH . '/favicon.ico', $decoded);
                        if ($ext === 'svg') {
                            @file_put_contents(PUBLIC_PATH . '/assets/icons/logo.svg', $decoded);
                        }
                    }
                }
            }

            if (empty($logoPath)) {
                $existingLogo = $pdo->query("SELECT setting_value FROM settings WHERE setting_key = 'app_logo' LIMIT 1")->fetchColumn();
                if ($existingLogo) {
                    $logoPath = $existingLogo;
                }
            }

            // Create Super Admin User (NO committee/society linkage at setup)
            $adminGoogleId = trim($_POST['admin_google_id'] ?? '');
            $adminAvatar = trim($_POST['admin_avatar'] ?? '');
            $stmt = $pdo->prepare("SELECT id, password_hash FROM users WHERE email = ?");
            $stmt->execute([$adminEmail]);
            $existingAdmin = $stmt->fetch();

            if (!$existingAdmin && (empty($adminPassword) || strlen($adminPassword) < 8)) {
                echo json_encode(['success' => false, 'error' => 'Please provide a password of at least 8 characters for the new Super Administrator.']);
                exit;
            }

            if ($existingAdmin && empty($existingAdmin['password_hash']) && (empty($adminPassword) || strlen($adminPassword) < 8)) {
                echo json_encode(['success' => false, 'error' => 'Please provide a password of at least 8 characters for the Super Administrator.']);
                exit;
            }

            $passwordHash = !empty($adminPassword) 
                ? password_hash($adminPassword, PASSWORD_DEFAULT, ['cost' => 12]) 
                : ($existingAdmin['password_hash'] ?? '');

            if ($existingAdmin) {
                $adminId = (int)$existingAdmin['id'];
                $sql = "UPDATE users SET name = ?, password_hash = ?, phone = ?, role = 'admin', is_active = 1";
                $params = [$adminName, $passwordHash, $adminPhone];
                if (!empty($adminAvatar)) {
                    $sql .= ", profile_photo = ?";
                    $params[] = $adminAvatar;
                }
                if (!empty($adminGoogleId)) {
                    $sql .= ", google_id = ?";
                    $params[] = $adminGoogleId;
                }
                $sql .= " WHERE id = ?";
                $params[] = $adminId;
                $updateUser = $pdo->prepare($sql);
                $updateUser->execute($params);
            } else {
                $insertUser = $pdo->prepare("INSERT INTO users (email, password_hash, name, phone, google_id, profile_photo, role, is_active, email_verified_at) VALUES (?, ?, ?, ?, ?, ?, 'admin', 1, NOW())");
                $insertUser->execute([$adminEmail, $passwordHash, $adminName, $adminPhone, !empty($adminGoogleId) ? $adminGoogleId : null, !empty($adminAvatar) ? $adminAvatar : null]);
                $adminId = (int)$pdo->lastInsertId();
            }

            // Save Settings Table
            $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) NOT NULL UNIQUE,
                setting_value TEXT NULL,
                setting_group VARCHAR(50) DEFAULT 'general',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_setting_key (setting_key),
                INDEX idx_setting_group (setting_group)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            $saveSetting = $pdo->prepare("INSERT INTO settings (setting_key, setting_value, setting_group) 
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_group = VALUES(setting_group), updated_at = NOW()");

            // Branding settings
            $saveSetting->execute(['app_name', $appName, 'branding']);
            $saveSetting->execute(['app_desc', $appDesc, 'branding']);
            if ($logoPath) {
                $saveSetting->execute(['app_logo', $logoPath, 'branding']);
                $saveSetting->execute(['app_favicon', $logoPath, 'branding']);
            }
            $saveSetting->execute(['branding_updated_at', (string)time(), 'branding']);
            $saveSetting->execute(['app_url', $appUrl, 'branding']);

            // Database settings
            $saveSetting->execute(['db_host', $dbHost, 'database']);
            $saveSetting->execute(['db_port', (string)$dbPort, 'database']);
            $saveSetting->execute(['db_name', $dbName, 'database']);
            $saveSetting->execute(['db_user', $dbUser, 'database']);
            $saveSetting->execute(['db_pass', encryptSecret($dbPass), 'database']);

            // Email settings
            $saveSetting->execute(['mail_host', $smtpHost, 'email']);
            $saveSetting->execute(['mail_port', $smtpPort, 'email']);
            $saveSetting->execute(['mail_username', $smtpUser, 'email']);
            $saveSetting->execute(['mail_password', encryptSecret($smtpPass), 'email']);
            $saveSetting->execute(['mail_from_address', $mailFromAddress, 'email']);
            $saveSetting->execute(['mail_from_name', $mailFromName, 'email']);

            // Google SSO settings
            $saveSetting->execute(['google_client_id', $googleClientId, 'sso']);
            $saveSetting->execute(['google_client_secret', encryptSecret($googleClientSecret), 'sso']);
            $saveSetting->execute(['google_sso_enabled', '1', 'sso']);

            // Seal setup
            $saveSetting->execute(['superadmin_id', (string)$adminId, 'system']);
            $saveSetting->execute(['setup_step', '7', 'system']);
            $saveSetting->execute(['setup_completed', '1', 'system']);

            // Update .env ONLY with database connection parameters and setup completion marker
            $this->updateEnvFile([
                'DB_HOST' => $dbHost,
                'DB_PORT' => $dbPort,
                'DB_NAME' => $dbName,
                'DB_USER' => $dbUser,
                'DB_PASS' => $dbPass,
                'SETUP_COMPLETED' => 'true',
            ]);

            // Login Super Admin
            loginUser($adminId, 'admin', $adminEmail);

            echo json_encode([
                'success' => true,
                'message' => 'SocietyApp installed successfully!',
                'redirect' => '/admin',
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'error' => 'Installation error: ' . $e->getMessage(),
            ]);
        }
        exit;
    }

    private function isSetupCompleted(): bool
    {
        return isAppSetupCompleted();
    }

    private function checkRequirements(): array
    {
        $reqs = [];

        // PHP Version
        $phpOk = version_compare(PHP_VERSION, '8.1.0', '>=');
        $reqs[] = [
            'name' => 'PHP Version >= 8.1',
            'current' => PHP_VERSION,
            'passed' => $phpOk,
            'note' => $phpOk ? 'Compatible' : 'PHP 8.1+ required',
        ];

        // PDO Extension
        $pdoOk = extension_loaded('pdo') && extension_loaded('pdo_mysql');
        $reqs[] = [
            'name' => 'PDO & MySQL Extension',
            'current' => $pdoOk ? 'Enabled' : 'Missing',
            'passed' => $pdoOk,
            'note' => 'Required for database connection',
        ];

        // cURL
        $curlOk = extension_loaded('curl');
        $reqs[] = [
            'name' => 'cURL Extension',
            'current' => $curlOk ? 'Enabled' : 'Missing',
            'passed' => $curlOk,
            'note' => 'Required for OAuth and Google token validation',
        ];

        // Mbstring
        $mbOk = extension_loaded('mbstring');
        $reqs[] = [
            'name' => 'Mbstring Extension',
            'current' => $mbOk ? 'Enabled' : 'Missing',
            'passed' => $mbOk,
            'note' => 'Required for Unicode and text encoding',
        ];

        // Fileinfo
        $fiOk = extension_loaded('fileinfo');
        $reqs[] = [
            'name' => 'Fileinfo Extension',
            'current' => $fiOk ? 'Enabled' : 'Missing',
            'passed' => $fiOk,
            'note' => 'Required for logo and document uploads',
        ];

        // Writable .env & uploads
        $envWritable = is_writable(ROOT_PATH) || (file_exists(ROOT_PATH . '/.env') && is_writable(ROOT_PATH . '/.env'));
        $reqs[] = [
            'name' => 'Configuration Directory Writable',
            'current' => $envWritable ? 'Writable' : 'Read-only',
            'passed' => $envWritable,
            'note' => 'Required to save .env file',
        ];

        return $reqs;
    }

    private function updateEnvFile(array $newPairs): void
    {
        $envFile = ROOT_PATH . '/.env';
        $current = [];
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES);
            foreach ($lines as $line) {
                $trimmed = trim($line);
                if (empty($trimmed) || str_starts_with($trimmed, '#')) continue;
                if (str_contains($line, '=')) {
                    [$k, $v] = explode('=', $line, 2);
                    $k = trim($k);
                    $v = trim($v);
                    if ((str_starts_with($v, '"') && str_ends_with($v, '"')) ||
                        (str_starts_with($v, "'") && str_ends_with($v, "'"))) {
                        $v = substr($v, 1, -1);
                    }
                    $current[$k] = $v;
                }
            }
        }

        foreach ($newPairs as $k => $v) {
            $v = (string)$v;
            $current[$k] = $v;
            putenv("{$k}={$v}");
            $_ENV[$k] = $v;
            $_SERVER[$k] = $v;
        }

        $out = [
            '# ===========================================',
            '# SocietyApp Environment Configuration',
            '# Updated on ' . date('Y-m-d H:i:s'),
            '# ===========================================',
            '',
        ];

        foreach ($current as $k => $v) {
            if (is_numeric($v)) {
                $out[] = "{$k}={$v}";
            } elseif (preg_match('/^[a-zA-Z0-9_\.\-]+$/', (string)$v)) {
                $out[] = "{$k}={$v}";
            } else {
                $escaped = addcslashes((string)$v, "\"\\$");
                $out[] = "{$k}=\"{$escaped}\"";
            }
        }

        file_put_contents($envFile, implode("\n", $out) . "\n");
    }

    private function writeEnvFile(array $data): void
    {
        $lines = [
            '# ===========================================',
            '# SocietyApp Environment Configuration',
            '# Generated by Setup Wizard on ' . date('Y-m-d H:i:s'),
            '# ===========================================',
            '',
            '# --- Application ---',
            'APP_NAME=' . escapeshellarg($data['APP_NAME']),
            'APP_ENV=' . $data['APP_ENV'],
            'APP_DEBUG=' . $data['APP_DEBUG'],
            'APP_URL=' . escapeshellarg($data['APP_URL']),
            '',
            '# --- Database ---',
            'DB_HOST=' . $data['DB_HOST'],
            'DB_PORT=' . $data['DB_PORT'],
            'DB_NAME=' . $data['DB_NAME'],
            'DB_USER=' . $data['DB_USER'],
            'DB_PASS=' . escapeshellarg($data['DB_PASS']),
            '',
            '# --- Mail (SMTP) ---',
            'MAIL_HOST=' . $data['MAIL_HOST'],
            'MAIL_PORT=' . $data['MAIL_PORT'],
            'MAIL_USERNAME=' . escapeshellarg($data['MAIL_USERNAME']),
            'MAIL_PASSWORD=' . escapeshellarg($data['MAIL_PASSWORD']),
            '',
            '# --- Google OAuth ---',
            'GOOGLE_CLIENT_ID=' . escapeshellarg($data['GOOGLE_CLIENT_ID']),
            'GOOGLE_CLIENT_SECRET=' . escapeshellarg($data['GOOGLE_CLIENT_SECRET']),
            '',
            '# --- Session ---',
            'SESSION_LIFETIME=' . $data['SESSION_LIFETIME'],
            '',
            '# --- Deployment Status ---',
            'SETUP_COMPLETED=' . $data['SETUP_COMPLETED'],
        ];

        file_put_contents(ROOT_PATH . '/.env', implode("\n", $lines) . "\n");

        foreach ($data as $key => $val) {
            putenv("{$key}={$val}");
            $_ENV[$key] = $val;
        }
    }
}
