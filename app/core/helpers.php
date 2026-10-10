<?php
if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', dirname(__DIR__, 2));
}

/**
 * Auth Helper Functions
 */

function isLoggedIn(): bool {
    return Session::has('user_id') && !empty(Session::get('user_id'));
}

function isAdmin(): bool {
    return Session::get('role') === 'admin';
}

function requireLogin(): void {
    if (!isLoggedIn()) {
        $currentUrl = $_SERVER['REQUEST_URI'] ?? '/';
        if (!empty($currentUrl) && $currentUrl !== '/') {
            Session::put('return_url', $currentUrl);
            redirect('/auth/login?return_url=' . urlencode($currentUrl));
        }
        redirect('/auth/login');
    }
}

function requireAdmin(): void {
    requireLogin();
    if (!isAdmin()) {
        http_response_code(403);
        $loader = new \Twig\Loader\FilesystemLoader(__DIR__ . '/../views');
        $twig = new \Twig\Environment($loader, ['debug' => true]);
        echo $twig->render('errors/403.html.twig');
        exit;
    }
}

function getUser(): ?array {
    if (!isLoggedIn()) {
        return null;
    }
    try {
        $user = Database::fetchOne(
            "SELECT * FROM users WHERE id = ?",
            [Session::get('user_id')]
        );
        if (!$user) {
            Session::forget('user_id');
            Session::forget('role');
            Session::forget('email');
            return null;
        }
        return $user;
    } catch (\Throwable $e) {
        return null;
    }
}

function getUserProfile(): ?array {
    return getUser();
}

function loginUser(int $userId, string $role, string $email): void {
    Session::put('user_id', $userId);
    Session::put('role', $role);
    Session::put('email', $email);
    Session::put('last_activity', time());
    Session::put('login_time', time());
    session_regenerate_id(true);
}

function logoutUser(): void {
    Session::destroy();
}

function redirect(string $url): void {
    header('Location: ' . $url);
    exit;
}

function sanitize($data) {
    if (is_array($data)) {
        return array_map('sanitize', $data);
    }
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

function generateCSRFToken(): string {
    if (!Session::has('csrf_token')) {
        Session::put('csrf_token', bin2hex(random_bytes(32)));
    }
    return Session::get('csrf_token');
}

function verifyCSRFToken(?string $token = null): bool {
    if ($token === null || $token === '') {
        $token = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    }
    return !empty($token) && Session::has('csrf_token') && hash_equals((string)Session::get('csrf_token'), (string)$token);
}

function getUserCapabilities(?int $userId = null): array {
    if (!$userId && isLoggedIn()) {
        $userId = (int)Session::get('user_id');
    }
    if (!$userId) {
        return [
            'isAdmin' => false,
            'isCommittee' => false,
            'isResident' => false,
        ];
    }
    try {
        $user = Database::fetchOne("SELECT id, role FROM users WHERE id = ?", [$userId]);
        if (!$user) {
            return [
                'isAdmin' => false,
                'isCommittee' => false,
                'isResident' => false,
            ];
        }

        $isAdmin = ($user['role'] === 'admin');

        // Check committee status:
        // User has committee capability if role is 'committee' in users table OR active in society_members with committee role
        $isCommittee = ($user['role'] === 'committee');
        if (!$isCommittee) {
            $commMem = Database::fetchOne("
                SELECT id FROM society_members 
                WHERE user_id = ? AND role IN ('chairman', 'secretary', 'treasurer', 'president', 'committee') AND status = 'active'
                LIMIT 1
            ", [$userId]);
            $isCommittee = (bool)$commMem;
        }

        // Check resident status:
        // A user whose primary role is 'resident' is a resident.
        // For admin users, they are a resident if they have an active resident record or assigned flat in society_members.
        $isResident = false;
        if ($user['role'] === 'resident') {
            $isResident = true;
        } else {
            $resMem = Database::fetchOne("
                SELECT id FROM society_members 
                WHERE user_id = ? AND status = 'active' AND (flat_id IS NOT NULL OR role IN ('owner', 'tenant', 'family'))
                LIMIT 1
            ", [$userId]);
            $isResident = (bool)$resMem;
        }

        return [
            'isAdmin' => $isAdmin,
            'isCommittee' => $isCommittee,
            'isResident' => $isResident,
        ];
    } catch (Throwable $e) {
        return [
            'isAdmin' => false,
            'isCommittee' => false,
            'isResident' => false,
        ];
    }
}

function isCommitteeMember(?int $userId = null): bool {
    $caps = getUserCapabilities($userId);
    return $caps['isCommittee'];
}

function getUserRoleDashboardUrl(?array $user = null): string {
    return '/resident';
}

function view(string $name, array $data = []): string {
    $config = require __DIR__ . '/../../config/app.php';
    $loader = new \Twig\Loader\FilesystemLoader(__DIR__ . '/../views');
    $twig = new \Twig\Environment($loader, [
        'debug' => $config['app']['debug'],
        'strict_variables' => false,
    ]);

    $data['appConfig'] = $config;

    // Flash messages support
    if (!isset($data['flash']) && Session::has('flash')) {
        $data['flash'] = Session::getFlash();
    }
    if (isset($data['flash']) && is_array($data['flash']) && isset($data['flash']['type'], $data['flash']['message'])) {
        $data['flash'][$data['flash']['type']] = $data['flash']['message'];
    }
    if (!isset($data['error']) && isset($data['flash']) && ($data['flash']['type'] ?? '') === 'error') {
        $data['error'] = $data['flash']['message'];
    }

    // Dynamic Application Branding (Logo, Favicon, Name, Description)
    $brandingVersion = getSetting('branding_updated_at', '1');
    $appName = getSetting('app_name', getenv('APP_NAME') ?: ($config['app']['name'] ?? 'SocietyApp'));
    $appLogoRaw = getSetting('app_logo', '');
    $appFaviconRaw = getSetting('app_favicon', $appLogoRaw ?: '/assets/icons/logo.svg');

    $appLogo = !empty($appLogoRaw) ? ($appLogoRaw . '?v=' . $brandingVersion) : '/assets/icons/logo.svg';
    $appFavicon = !empty($appFaviconRaw) ? ($appFaviconRaw . '?v=' . $brandingVersion) : '/assets/icons/logo.svg';
    $appDesc = getSetting('app_desc', 'The premium management platform for modern residential communities.');

    $data['appName'] = $data['appName'] ?? $appName;
    $data['appLogo'] = $data['appLogo'] ?? $appLogo;
    $data['appFavicon'] = $data['appFavicon'] ?? $appFavicon;
    $data['appDesc'] = $data['appDesc'] ?? $appDesc;

    if (isLoggedIn() || isset($data['user'])) {
        if (!isset($data['user'])) {
            $data['user'] = getUser();
        }
        if (!$data['user']) {
            $data['user'] = null;
            $data['profile'] = null;
            $data['userCaps'] = [
                'isAdmin' => false,
                'isCommittee' => false,
                'isResident' => false,
            ];
            $data['isCommittee'] = false;
        } else {
            if (!isset($data['profile'])) {
                $data['profile'] = getUserProfile();
            }
            if (!isset($data['userCaps'])) {
                $userId = isset($data['user']['id']) ? (int)$data['user']['id'] : null;
                $data['userCaps'] = getUserCapabilities($userId);
            }
            if (!isset($data['isCommittee'])) {
                $data['isCommittee'] = $data['userCaps']['isCommittee'];
            }

            // Fetch unread count & latest notifications for navbar dropdown
            $nUserId = isset($data['user']['id']) ? (int)$data['user']['id'] : null;
            if ($nUserId) {
                try {
                    if (!isset($data['unreadNotifications'])) {
                        $unreadRow = Database::fetchOne("
                            SELECT COUNT(*) as cnt 
                            FROM notifications 
                            WHERE (user_id = ? OR (user_id IS NULL AND type = 'announcement')) AND is_read = 0 AND type != 'society_proposal'
                        ", [$nUserId]);
                        $data['unreadNotifications'] = (int)($unreadRow['cnt'] ?? 0);
                    }
                    if (!isset($data['latestNotifications'])) {
                        $data['latestNotifications'] = Database::fetchAll("
                            SELECT id, title, message, type, is_read, action_url, created_at 
                            FROM notifications 
                            WHERE (user_id = ? OR (user_id IS NULL AND type = 'announcement')) AND is_read = 0 AND type != 'society_proposal' 
                            ORDER BY created_at DESC 
                            LIMIT 5
                        ", [$nUserId]);
                    }

                    if (!isset($data['userSocieties'])) {
                        $data['userSocieties'] = Database::fetchAll("
                            SELECT DISTINCT s.id, s.name, s.society_code, s.city, sm.role, f.wing, f.flat_no
                            FROM society_members sm
                            JOIN societies s ON sm.society_id = s.id
                            LEFT JOIN flats f ON sm.flat_id = f.id
                            WHERE sm.user_id = ? AND sm.status = 'active'
                            ORDER BY s.name ASC
                        ", [$nUserId]);
                    }
                    $activeSocId = Session::get('active_society_id');
                    if (!$activeSocId && !empty($data['userSocieties'])) {
                        $activeSocId = (int)$data['userSocieties'][0]['id'];
                        Session::put('active_society_id', $activeSocId);
                    }
                    $data['activeSocietyId'] = $activeSocId;
                    $data['activeSociety'] = null;
                    if (!empty($data['userSocieties'])) {
                        foreach ($data['userSocieties'] as $us) {
                            if ((int)$us['id'] === (int)$activeSocId) {
                                $data['activeSociety'] = $us;
                                break;
                            }
                        }
                        if (!$data['activeSociety']) {
                            $data['activeSociety'] = $data['userSocieties'][0];
                            $data['activeSocietyId'] = (int)$data['userSocieties'][0]['id'];
                        }
                    }
                } catch (\Throwable $e) {
                    $data['unreadNotifications'] = $data['unreadNotifications'] ?? 0;
                    $data['latestNotifications'] = $data['latestNotifications'] ?? [];
                    $data['userSocieties'] = $data['userSocieties'] ?? [];
                    $data['activeSociety'] = $data['activeSociety'] ?? null;
                    $data['activeSocietyId'] = $data['activeSocietyId'] ?? null;
                }
            }
        }
    } else {
        if (!isset($data['userCaps'])) {
            $data['userCaps'] = [
                'isAdmin' => false,
                'isCommittee' => false,
                'isResident' => false,
            ];
        }
    }
    if (!isset($data['currentRoute'])) {
        $data['currentRoute'] = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    }

    // Auto-versioning for assets — uses file mtime so browser cache-busts on every CSS/JS change
    if (!isset($data['cssVersion'])) {
        $cssFile = PUBLIC_PATH . '/assets/dist/output.css';
        $data['cssVersion'] = file_exists($cssFile) ? filemtime($cssFile) : 6;
    }

    $viewDir = __DIR__ . '/../views';
    if (!file_exists($viewDir . '/' . $name . '.html.twig')) {
        if (str_starts_with($name, 'tenant/')) {
            $alt = 'resident/' . substr($name, 7);
            if (file_exists($viewDir . '/' . $alt . '.html.twig')) {
                $name = $alt;
            }
        } elseif (str_starts_with($name, 'resident/')) {
            $alt = 'tenant/' . substr($name, 9);
            if (file_exists($viewDir . '/' . $alt . '.html.twig')) {
                $name = $alt;
            }
        }
    }

    return $twig->render($name . '.html.twig', $data);
}


function isAppSetupCompleted(): bool {
    try {
        $db = Database::getInstance();

        // 1. Check if required tables exist
        $tables = $db->query("SHOW TABLES LIKE 'settings'")->fetch();
        if (!$tables) return false;

        $userTable = $db->query("SHOW TABLES LIKE 'users'")->fetch();
        if (!$userTable) return false;

        $socTable = $db->query("SHOW TABLES LIKE 'societies'")->fetch();
        if (!$socTable) return false;

        // 2. Check active admin user exists in database
        $admin = $db->query("SELECT id, email FROM users WHERE role = 'admin' AND is_active = 1 LIMIT 1")->fetch();
        if (!$admin || empty(trim((string)($admin['email'] ?? '')))) {
            return false;
        }

        // 3. Check Google SSO setting exists and is non-empty in database
        $sso = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'google_client_id' LIMIT 1")->fetch();
        if (!$sso || empty(trim((string)($sso['setting_value'] ?? '')))) {
            return false;
        }

        // 4. Check Email setting exists and is non-empty in database
        $email = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'mail_host' LIMIT 1")->fetch();
        if (!$email || empty(trim((string)($email['setting_value'] ?? '')))) {
            return false;
        }

        // 5. If all core requirements (database tables, active super admin, Google SSO, and email) exist in the database, setup is complete!
        $setupDone = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'setup_completed' LIMIT 1")->fetch();
        if (!$setupDone || ($setupDone['setting_value'] !== '1' && $setupDone['setting_value'] !== 'true')) {
            $db->exec("INSERT INTO settings (setting_key, setting_value, setting_group) VALUES ('setup_completed', '1', 'system') ON DUPLICATE KEY UPDATE setting_value = '1'");
        }

        return true;
    } catch (Throwable $e) {
        return false;
    }
}

/**
 * Application encryption key & AES-256 secret vault
 */
function getAppEncryptionKey(): string {
    $key = getenv('APP_KEY');
    if (!empty($key)) {
        return $key;
    }
    $envFile = ROOT_PATH . '/.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (str_starts_with(trim($line), 'APP_KEY=')) {
                $val = trim(substr(trim($line), 8), " \t\n\r\0\x0B\"'");
                if (!empty($val)) {
                    putenv("APP_KEY={$val}");
                    $_ENV['APP_KEY'] = $val;
                    return $val;
                }
            }
        }
    }
    // Generate secure 32-byte hex key if not found
    $newKey = bin2hex(random_bytes(32));
    if (file_exists($envFile)) {
        file_put_contents($envFile, "\nAPP_KEY=\"{$newKey}\"\n", FILE_APPEND);
    }
    putenv("APP_KEY={$newKey}");
    $_ENV['APP_KEY'] = $newKey;
    return $newKey;
}

function encryptSecret(?string $plain): string {
    if ($plain === null || $plain === '') {
        return '';
    }
    // If already encrypted, return as is
    if (str_starts_with($plain, 'enc:')) {
        return $plain;
    }
    $key = hash('sha256', getAppEncryptionKey(), true);
    $iv = random_bytes(16);
    $cipherText = openssl_encrypt($plain, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
    if ($cipherText === false) {
        return $plain;
    }
    return 'enc:' . base64_encode($iv . $cipherText);
}

function decryptSecret(?string $cipher): string {
    if ($cipher === null || $cipher === '') {
        return '';
    }
    if (!str_starts_with($cipher, 'enc:')) {
        // Plaintext fallback (legacy or pre-encryption data)
        return $cipher;
    }
    $raw = base64_decode(substr($cipher, 4));
    if ($raw === false || strlen($raw) < 17) {
        return '';
    }
    $iv = substr($raw, 0, 16);
    $cipherText = substr($raw, 16);
    $key = hash('sha256', getAppEncryptionKey(), true);
    $decrypted = openssl_decrypt($cipherText, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
    return $decrypted !== false ? $decrypted : '';
}

const ENCRYPTED_SETTING_KEYS = ['google_client_secret', 'mail_password', 'db_pass'];

function getSetting(string $key, ?string $default = null): ?string {
    try {
        $db = Database::getInstance();
        $hasSettings = (bool)$db->query("SHOW TABLES LIKE 'settings'")->fetch();
        if ($hasSettings) {
            // Database is the ONLY trusted source of settings
            $row = Database::fetchOne("SELECT setting_value FROM settings WHERE setting_key = ?", [$key]);
            if ($row) {
                if ($row['setting_value'] !== null && $row['setting_value'] !== '') {
                    $val = $row['setting_value'];
                    if (in_array($key, ENCRYPTED_SETTING_KEYS, true)) {
                        return decryptSecret($val);
                    }
                    return $val;
                }
                return $default;
            }
            // Key does not exist in database settings table -> return default (NEVER fallback to .env)
            return $default;
        }
    } catch (Throwable $e) {
        // Fallback to env only when database is unavailable (e.g. initial prefill in setup)
    }

    $envVal = getenv(strtoupper($key));
    if ($envVal !== false && $envVal !== '') {
        if (in_array($key, ENCRYPTED_SETTING_KEYS, true)) {
            return decryptSecret($envVal);
        }
        return $envVal;
    }
    return $default;
}

function setSetting(string $key, ?string $value, string $group = 'general'): void {
    try {
        if ($value !== null && $value !== '' && in_array($key, ENCRYPTED_SETTING_KEYS, true)) {
            $value = encryptSecret($value);
        }
        $existing = Database::fetchOne("SELECT id FROM settings WHERE setting_key = ?", [$key]);
        if ($existing) {
            Database::update('settings', [
                'setting_value' => $value,
                'setting_group' => $group,
                'updated_at' => date('Y-m-d H:i:s'),
            ], 'id = ?', [$existing['id']]);
        } else {
            Database::insert('settings', [
                'setting_key' => $key,
                'setting_value' => $value,
                'setting_group' => $group,
            ]);
        }
    } catch (Throwable $e) {
        error_log("Failed to save setting {$key}: " . $e->getMessage());
    }
}

function asset(string $path): string {
    return '/assets/' . ltrim($path, '/');
}

/**
 * Detect runtime environment: 'ddev', 'docker', 'local', or 'production' (shared hosting)
 */
function detectEnvironment(): string {
    if (!empty(getenv('IS_DDEV_PROJECT')) || !empty(getenv('DDEV_PROJECT'))) {
        return 'ddev';
    }
    if (file_exists('/.dockerenv') || !empty(getenv('DOCKER_CONTAINER'))) {
        return 'docker';
    }
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $cleanHost = parse_url('http://' . $host, PHP_URL_HOST) ?? 'localhost';
    if (in_array($cleanHost, ['localhost', '127.0.0.1', '::1']) || str_ends_with($cleanHost, '.local') || str_ends_with($cleanHost, '.test')) {
        return 'local';
    }
    return 'production';
}

/**
 * Returns intelligent defaults for DB, Mail, and URL depending on detected runtime environment
 */
function getEnvironmentDefaults(): array {
    $env = detectEnvironment();
    $host = $_SERVER['HTTP_HOST'] ?? 'societyapp.ddev.site';
    $domain = preg_replace('/:\d+$/', '', $host);
    $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https://' : 'http://';
    $defaultMailFrom = 'no-reply@' . $domain;

    switch ($env) {
        case 'ddev':
            return [
                'environment' => 'ddev',
                'app_url' => getenv('DDEV_PRIMARY_URL') ?: ($scheme . $host),
                'db_host' => 'db',
                'db_port' => '3306',
                'db_name' => 'db',
                'db_user' => 'db',
                'db_pass' => 'db',
                'mail_host' => '127.0.0.1',
                'mail_port' => '1025',
                'mail_from_address' => $defaultMailFrom,
                'mail_from_name' => 'Society App Notifications',
            ];

        case 'docker':
            // Standard / Generic Docker Compose
            $dbHost = getenv('DB_HOST') ?: getenv('MYSQL_HOST') ?: 'db';
            $mailHost = getenv('MAIL_HOST') ?: (gethostbyname('mailpit') !== 'mailpit' ? 'mailpit' : (gethostbyname('mailhog') !== 'mailhog' ? 'mailhog' : '127.0.0.1'));
            return [
                'environment' => 'docker',
                'app_url' => getenv('APP_URL') ?: ($scheme . $host),
                'db_host' => $dbHost,
                'db_port' => (string)(getenv('DB_PORT') ?: 3306),
                'db_name' => getenv('DB_NAME') ?: getenv('MYSQL_DATABASE') ?: 'societyapp',
                'db_user' => getenv('DB_USER') ?: getenv('MYSQL_USER') ?: 'root',
                'db_pass' => getenv('DB_PASS') ?: getenv('MYSQL_PASSWORD') ?: '',
                'mail_host' => $mailHost,
                'mail_port' => (string)(getenv('MAIL_PORT') ?: 1025),
                'mail_from_address' => getenv('MAIL_FROM_ADDRESS') ?: $defaultMailFrom,
                'mail_from_name' => 'Society App Notifications',
            ];

        case 'local':
            // XAMPP, WAMP, native PHP server
            return [
                'environment' => 'local',
                'app_url' => $scheme . $host,
                'db_host' => '127.0.0.1',
                'db_port' => '3306',
                'db_name' => 'societyapp',
                'db_user' => 'root',
                'db_pass' => '',
                'mail_host' => '127.0.0.1',
                'mail_port' => '1025',
                'mail_from_address' => $defaultMailFrom,
                'mail_from_name' => 'Society App Notifications',
            ];

        case 'production':
        default:
            // Shared Hosting (cPanel / Plesk) or Production VPS
            return [
                'environment' => 'production',
                'app_url' => $scheme . $host,
                'db_host' => 'localhost',
                'db_port' => '3306',
                'db_name' => '', // Clean placeholder: requires real cPanel database
                'db_user' => '', // Clean placeholder: requires real cPanel user
                'db_pass' => '',
                'mail_host' => '', // Clean placeholder: requires real SMTP server
                'mail_port' => '587',
                'mail_from_address' => '',
                'mail_from_name' => 'SocietyApp Notifications',
            ];
    }
}

/**
 * Check if maintenance mode is active
 */
function isMaintenanceModeActive(): bool {
    $maintenanceFile = (defined('ROOT_PATH') ? ROOT_PATH : dirname(__DIR__, 2)) . '/.maintenance';
    if (file_exists($maintenanceFile)) {
        return true;
    }
    $envVal = getenv('MAINTENANCE_MODE');
    if ($envVal === 'true' || $envVal === '1') {
        return true;
    }
    return false;
}

/**
 * Get maintenance mode details
 */
function getMaintenanceDetails(): array {
    $maintenanceFile = (defined('ROOT_PATH') ? ROOT_PATH : dirname(__DIR__, 2)) . '/.maintenance';
    if (file_exists($maintenanceFile)) {
        $data = json_decode(@file_get_contents($maintenanceFile), true);
        if (is_array($data)) {
            return $data;
        }
    }
    return [
        'enabled' => isMaintenanceModeActive(),
        'title' => 'Scheduled System Maintenance',
        'message' => 'Our engineering team is performing scheduled infrastructure improvements and database optimizations. Normal operations will resume shortly.',
        'estimated_end' => '',
        'bypass_key' => '',
    ];
}

/**
 * Get configuration value using dot notation (e.g. 'session.lifetime')
 */
function config(string $key, mixed $default = null): mixed {
    static $configs = [];
    $parts = explode('.', $key);
    $file = $parts[0];
    
    if (!isset($configs[$file])) {
        $configPath = (defined('CONFIG_PATH') ? CONFIG_PATH : (defined('ROOT_PATH') ? ROOT_PATH . '/config' : dirname(__DIR__, 2) . '/config')) . '/' . $file . '.php';
        if (file_exists($configPath)) {
            $configs[$file] = require $configPath;
        } else {
            $configs[$file] = [];
        }
    }
    
    $value = $configs[$file];
    for ($i = 1; $i < count($parts); $i++) {
        if (!is_array($value) || !array_key_exists($parts[$i], $value)) {
            return $default;
        }
        $value = $value[$parts[$i]];
    }
    return $value;
}

/**
 * Send an email via SMTP socket connection with TLS/AUTH support
 *
 * @param string $to Recipient email
 * @param string $subject Email subject
 * @param string $htmlBody HTML content
 * @param array $customConfig Optional custom SMTP settings
 * @return array ['success' => bool, 'message' => string, 'details' => string]
 */
function sendEmail(string $to, string $subject, string $htmlBody, array $customConfig = []): array {
    $mailHost = $customConfig['mail_host'] ?? getSetting('mail_host', '127.0.0.1');
    $mailPort = (int)($customConfig['mail_port'] ?? getSetting('mail_port', '1025'));
    $mailUsername = $customConfig['mail_username'] ?? getSetting('mail_username', '');
    $mailPassword = $customConfig['mail_password'] ?? getSetting('mail_password', '');
    $mailFromAddress = $customConfig['mail_from_address'] ?? getSetting('mail_from_address', 'no-reply@societyapp.ddev.site');
    $mailFromName = $customConfig['mail_from_name'] ?? getSetting('mail_from_name', 'SocietyApp Notifications');

    if (empty($to) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'message' => 'Please provide a valid recipient email address.'];
    }

    if (empty($mailHost)) {
        return ['success' => false, 'message' => 'SMTP Host is not configured.'];
    }

    $timeout = 8;
    $errno = 0;
    $errstr = '';

    // Handle SSL/TLS connection prefix
    $connectionHost = $mailHost;
    if ($mailPort === 465) {
        $connectionHost = 'ssl://' . $mailHost;
    }

    $socket = @fsockopen($connectionHost, $mailPort, $errno, $errstr, $timeout);
    if (!$socket) {
        return [
            'success' => false,
            'message' => "Cannot connect to SMTP server at {$mailHost}:{$mailPort}. {$errstr} ({$errno})",
        ];
    }

    stream_set_timeout($socket, $timeout);

    $readResponse = function($sock) {
        $data = '';
        while ($str = @fgets($sock, 515)) {
            $data .= $str;
            if (strlen($str) >= 4 && substr($str, 3, 1) === ' ') {
                break;
            }
        }
        return $data;
    };

    $sendCommand = function($sock, $cmd, $expectedCode = 250) use ($readResponse) {
        @fputs($sock, $cmd . "\r\n");
        $res = $readResponse($sock);
        $code = (int)substr($res, 0, 3);
        if ($expectedCode && $code !== $expectedCode) {
            return [false, $res];
        }
        return [true, $res];
    };

    // 1. Initial Greeting
    $banner = $readResponse($socket);
    if ((int)substr($banner, 0, 3) !== 220) {
        @fclose($socket);
        return ['success' => false, 'message' => "Invalid greeting from SMTP server: {$banner}"];
    }

    // 2. EHLO
    $heloDomain = $_SERVER['SERVER_NAME'] ?? 'localhost';
    [$ok, $ehloRes] = $sendCommand($socket, "EHLO {$heloDomain}", 250);
    if (!$ok) {
        [$ok, $ehloRes] = $sendCommand($socket, "HELO {$heloDomain}", 250);
        if (!$ok) {
            @fclose($socket);
            return ['success' => false, 'message' => "EHLO/HELO rejected by server: {$ehloRes}"];
        }
    }

    // 3. STARTTLS if port 587 and server supports STARTTLS
    if ($mailPort === 587 && stripos($ehloRes, 'STARTTLS') !== false) {
        [$tlsOk, $tlsRes] = $sendCommand($socket, "STARTTLS", 220);
        if ($tlsOk) {
            $cryptoOk = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT);
            if ($cryptoOk) {
                // Re-send EHLO over TLS
                $sendCommand($socket, "EHLO {$heloDomain}", 250);
            }
        }
    }

    // 4. AUTH LOGIN if credentials provided
    if (!empty($mailUsername) && !empty($mailPassword)) {
        [$authOk, $authRes] = $sendCommand($socket, "AUTH LOGIN", 334);
        if ($authOk) {
            [$uOk, $uRes] = $sendCommand($socket, base64_encode($mailUsername), 334);
            if (!$uOk) {
                @fclose($socket);
                return ['success' => false, 'message' => "SMTP Username rejected: {$uRes}"];
            }
            [$pOk, $pRes] = $sendCommand($socket, base64_encode($mailPassword), 235);
            if (!$pOk) {
                @fclose($socket);
                return ['success' => false, 'message' => "SMTP Authentication failed (invalid credentials): {$pRes}"];
            }
        }
    }

    // 5. MAIL FROM
    $cleanFrom = trim($mailFromAddress ?: 'no-reply@societyapp.ddev.site');
    [$fromOk, $fromRes] = $sendCommand($socket, "MAIL FROM: <{$cleanFrom}>", 250);
    if (!$fromOk) {
        @fclose($socket);
        return ['success' => false, 'message' => "MAIL FROM rejected: {$fromRes}"];
    }

    // 6. RCPT TO
    [$toOk, $toRes] = $sendCommand($socket, "RCPT TO: <{$to}>", 250);
    if (!$toOk) {
        @fclose($socket);
        return ['success' => false, 'message' => "Recipient <{$to}> rejected by SMTP server: {$toRes}"];
    }

    // 7. DATA
    [$dataOk, $dataRes] = $sendCommand($socket, "DATA", 354);
    if (!$dataOk) {
        @fclose($socket);
        return ['success' => false, 'message' => "DATA command rejected: {$dataRes}"];
    }

    // Build Email Headers & Body
    $date = date('r');
    $msgId = '<' . md5(uniqid(microtime(), true)) . '@' . ($heloDomain ?: 'societyapp') . '>';
    $cleanFromName = preg_replace('/[^\w\s\.-]/', '', $mailFromName ?: 'SocietyApp');
    
    $headers = [
        "Date: {$date}",
        "Message-ID: {$msgId}",
        "From: =?UTF-8?B?" . base64_encode($cleanFromName) . "?= <{$cleanFrom}>",
        "To: <{$to}>",
        "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=",
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: 8bit",
        "X-Mailer: SocietyApp-Mailer/1.0",
    ];

    $payload = implode("\r\n", $headers) . "\r\n\r\n" . $htmlBody . "\r\n.\r\n";
    @fputs($socket, $payload);
    $sendRes = $readResponse($socket);
    $sendCode = (int)substr($sendRes, 0, 3);

    // QUIT
    @fputs($socket, "QUIT\r\n");
    @fclose($socket);

    if ($sendCode === 250) {
        return [
            'success' => true,
            'message' => "Test email successfully delivered to {$to}!",
            'details' => trim($sendRes),
        ];
    }

    return [
        'success' => false,
        'message' => "Failed to deliver email body: {$sendRes}",
    ];
}

/**
 * Test SMTP connection and socket handshake/authentication without dispatching email
 *
 * @param array $customConfig Optional custom SMTP settings
 * @return array ['success' => bool, 'message' => string, 'error' => string]
 */
function testSmtpConnection(array $customConfig = []): array {
    $mailHost = $customConfig['mail_host'] ?? $customConfig['host'] ?? getSetting('mail_host', '127.0.0.1');
    $mailPort = (int)($customConfig['mail_port'] ?? $customConfig['port'] ?? getSetting('mail_port', '1025'));
    $mailUsername = $customConfig['mail_username'] ?? $customConfig['username'] ?? getSetting('mail_username', '');
    $mailPassword = $customConfig['mail_password'] ?? $customConfig['password'] ?? getSetting('mail_password', '');

    if (empty($mailHost)) {
        return [
            'success' => false,
            'message' => '',
            'error' => 'SMTP Host is not configured.',
        ];
    }

    $timeout = 8;
    $errno = 0;
    $errstr = '';

    // Handle SSL on 465
    $connectionHost = $mailHost;
    if ($mailPort === 465) {
        $connectionHost = 'ssl://' . $mailHost;
    }

    $socket = @fsockopen($connectionHost, $mailPort, $errno, $errstr, $timeout);
    if (!$socket) {
        return [
            'success' => false,
            'message' => '',
            'error' => "Cannot connect to SMTP server at {$mailHost}:{$mailPort}. {$errstr} ({$errno})",
        ];
    }

    stream_set_timeout($socket, $timeout);

    $readResponse = function($sock) {
        $data = '';
        while ($str = @fgets($sock, 515)) {
            $data .= $str;
            if (strlen($str) >= 4 && substr($str, 3, 1) === ' ') {
                break;
            }
        }
        return $data;
    };

    $sendCommand = function($sock, $cmd, $expectedCode = 250) use ($readResponse) {
        @fputs($sock, $cmd . "\r\n");
        $res = $readResponse($sock);
        $code = (int)substr($res, 0, 3);
        if ($expectedCode && $code !== $expectedCode) {
            return [false, $res];
        }
        return [true, $res];
    };

    // 1. Initial Greeting
    $banner = $readResponse($socket);
    if ((int)substr($banner, 0, 3) !== 220) {
        @fputs($socket, "QUIT\r\n");
        @fclose($socket);
        return [
            'success' => false,
            'message' => '',
            'error' => "Invalid greeting from SMTP server: " . trim($banner),
        ];
    }

    // 2. EHLO
    $heloDomain = $_SERVER['SERVER_NAME'] ?? 'localhost';
    [$ok, $ehloRes] = $sendCommand($socket, "EHLO {$heloDomain}", 250);
    if (!$ok) {
        [$ok, $ehloRes] = $sendCommand($socket, "HELO {$heloDomain}", 250);
        if (!$ok) {
            @fputs($socket, "QUIT\r\n");
            @fclose($socket);
            return [
                'success' => false,
                'message' => '',
                'error' => "EHLO/HELO rejected by server: " . trim($ehloRes),
            ];
        }
    }

    // 3. STARTTLS if port 587 and server supports STARTTLS
    if ($mailPort === 587 && stripos($ehloRes, 'STARTTLS') !== false) {
        [$tlsOk, $tlsRes] = $sendCommand($socket, "STARTTLS", 220);
        if ($tlsOk) {
            $cryptoOk = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT);
            if ($cryptoOk) {
                // Re-send EHLO over TLS
                $sendCommand($socket, "EHLO {$heloDomain}", 250);
            }
        }
    }

    // 4. AUTH LOGIN if credentials provided
    if (!empty($mailUsername) && !empty($mailPassword)) {
        [$authOk, $authRes] = $sendCommand($socket, "AUTH LOGIN", 334);
        if ($authOk) {
            [$uOk, $uRes] = $sendCommand($socket, base64_encode($mailUsername), 334);
            if (!$uOk) {
                @fputs($socket, "QUIT\r\n");
                @fclose($socket);
                return [
                    'success' => false,
                    'message' => '',
                    'error' => "SMTP Username rejected: " . trim($uRes),
                ];
            }
            [$pOk, $pRes] = $sendCommand($socket, base64_encode($mailPassword), 235);
            if (!$pOk) {
                @fputs($socket, "QUIT\r\n");
                @fclose($socket);
                return [
                    'success' => false,
                    'message' => '',
                    'error' => "SMTP Authentication failed (invalid credentials): " . trim($pRes),
                ];
            }
        }
    }

    // 5. QUIT
    @fputs($socket, "QUIT\r\n");
    @fclose($socket);

    return [
        'success' => true,
        'message' => "SMTP connection and handshake verified successfully! ({$mailHost}:{$mailPort})",
        'error' => '',
    ];
}
