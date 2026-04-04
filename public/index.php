<?php
/**
 * Public Entry Point
 * All requests go through this file.
 */

// Define paths
if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', __DIR__ . '/..');
}
if (!defined('PUBLIC_PATH')) {
    define('PUBLIC_PATH', __DIR__);
}
if (!defined('APP_PATH')) {
    define('APP_PATH', ROOT_PATH . '/app');
}
if (!defined('CONFIG_PATH')) {
    define('CONFIG_PATH', ROOT_PATH . '/config');
}
if (!defined('VIEW_PATH')) {
    define('VIEW_PATH', APP_PATH . '/views');
}

// Load environment
$envFile = ROOT_PATH . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            [$key, $value] = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}

// Load Composer
require_once ROOT_PATH . '/vendor/autoload.php';

// Load Core
require_once APP_PATH . '/core/Database.php';
require_once APP_PATH . '/core/Session.php';
require_once APP_PATH . '/core/Router.php';
require_once APP_PATH . '/core/helpers.php';

// Initialize Session
Session::init();

// Check session expiry
if (Session::isExpired()) {
    Session::destroy();
    Session::init();
}

// Load Config
$appConfig = require CONFIG_PATH . '/app.php';

// Create Router
$router = new Router();

// Middleware
$router->middleware('guest', function() {
    if (isLoggedIn()) {
        redirect(isAdmin() ? '/admin' : '/client');
    }
});

$router->middleware('auth', function() {
    requireLogin();
});

$router->middleware('admin', function() {
    requireAdmin();
});

// ==================== Routes ====================

// Landing
$router->get('/', function() {
    echo view('pages/index', [
        'basePath' => '/',
    ]);
});

// Auth Routes (guest only)
$router->get('/auth/login', function() {
    echo view('auth/login', [
        'basePath' => '/',
        'csrfToken' => generateCSRFToken(),
        'error' => null,
        'success' => null,
        'googleClientId' => getenv('GOOGLE_CLIENT_ID') ?: 'YOUR_GOOGLE_CLIENT_ID',
    ]);
});

$router->post('/auth/login', function() {
    $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
    $password = $_POST['password'] ?? '';

    if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        Session::flash('error', 'Invalid request. Please try again.');
        redirect('/auth/login');
    }

    if (empty($email) || empty($password)) {
        Session::flash('error', 'Please fill in all fields.');
        redirect('/auth/login');
    }

    $user = Database::fetchOne(
        "SELECT id, email, password_hash, name, role, pin_hash FROM users WHERE email = ? AND is_active = 1",
        [$email]
    );

    if ($user && password_verify($password, $user['password_hash'])) {
        loginUser($user['id'], $user['role'], $user['email']);
        if ($user['pin_hash'] === null) {
            redirect('/auth/pin-setup');
        }
        Session::flash('success', 'Welcome back, ' . htmlspecialchars($user['name']) . '!');
        redirect($user['role'] === 'admin' ? '/admin' : '/client');
    } else {
        Session::flash('error', 'Invalid email or password.');
        redirect('/auth/login');
    }
});

$router->get('/auth/register', function() {
    echo view('auth/register', [
        'basePath' => '/',
        'csrfToken' => generateCSRFToken(),
        'error' => null,
        'success' => null,
        'name' => '',
        'email' => '',
        'googleClientId' => getenv('GOOGLE_CLIENT_ID') ?: 'YOUR_GOOGLE_CLIENT_ID',
    ]);
});

$router->post('/auth/register', function() {
    $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';

    if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        Session::flash('error', 'Invalid request. Please try again.');
        redirect('/auth/register');
    }

    if (empty($name) || empty($email) || empty($password)) {
        Session::flash('error', 'Please fill in all fields.');
        redirect('/auth/register');
    }

    if (strlen($name) < 2) {
        Session::flash('error', 'Name must be at least 2 characters.');
        redirect('/auth/register');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        Session::flash('error', 'Please enter a valid email address.');
        redirect('/auth/register');
    }

    if (strlen($password) < 8) {
        Session::flash('error', 'Password must be at least 8 characters.');
        redirect('/auth/register');
    }

    if ($password !== $confirmPassword) {
        Session::flash('error', 'Passwords do not match.');
        redirect('/auth/register');
    }

    $existing = Database::fetchOne("SELECT id FROM users WHERE email = ?", [$email]);
    if ($existing) {
        Session::flash('error', 'An account with this email already exists.');
        redirect('/auth/register');
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT, ['cost' => 12]);
    Database::insert('users', [
        'email' => $email,
        'password_hash' => $passwordHash,
        'name' => $name,
        'role' => 'resident',
    ]);

    Session::flash('success', 'Account created successfully! Please sign in.');
    redirect('/auth/login');
});

$router->get('/auth/logout', function() {
    logoutUser();
    Session::flash('success', 'You have been signed out successfully.');
    redirect('/auth/login');
});

$router->get('/auth/reset-password', function() {
    echo view('auth/reset-password', [
        'basePath' => '/',
        'csrfToken' => generateCSRFToken(),
        'error' => null,
        'success' => null,
    ]);
});

$router->post('/auth/reset-password', function() {
    $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);

    if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        Session::flash('error', 'Invalid request. Please try again.');
        redirect('/auth/reset-password');
    }

    if (empty($email)) {
        Session::flash('error', 'Please enter your email address.');
        redirect('/auth/reset-password');
    }

    $user = Database::fetchOne("SELECT id, email, name FROM users WHERE email = ?", [$email]);
    if ($user) {
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));
        Database::insert('password_reset_tokens', [
            'user_id' => $user['id'],
            'token' => password_hash($token, PASSWORD_DEFAULT),
            'expires_at' => $expiresAt,
        ]);
        $resetLink = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/auth/reset-password?token=' . $token;
        error_log("Password reset link for {$user['email']}: {$resetLink}");
    }

    Session::flash('success', 'If an account with that email exists, we have sent password reset instructions.');
    redirect('/auth/reset-password');
});

$router->get('/auth/pin-setup', function() {
    requireLogin();
    $user = getUser();
    if ($user && $user['pin_hash'] !== null) {
        redirect('/client');
    }
    echo view('auth/pin-setup', [
        'basePath' => '/',
        'csrfToken' => generateCSRFToken(),
        'error' => null,
        'userName' => $user['name'] ?? 'User',
    ]);
});

$router->post('/auth/pin-setup', function() {
    requireLogin();
    $pin = $_POST['pin'] ?? '';
    $confirmPin = $_POST['confirm_pin'] ?? '';

    if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        Session::flash('error', 'Invalid request. Please try again.');
        redirect('/auth/pin-setup');
    }

    if (!preg_match('/^\d{4,6}$/', $pin)) {
        Session::flash('error', 'PIN must be 4 to 6 digits.');
        redirect('/auth/pin-setup');
    }

    if ($pin !== $confirmPin) {
        Session::flash('error', 'PINs do not match.');
        redirect('/auth/pin-setup');
    }

    $pinHash = password_hash($pin, PASSWORD_DEFAULT, ['cost' => 8]);
    Database::update('users', ['pin_hash' => $pinHash], 'id = ?', [Session::get('user_id')]);

    Session::flash('success', 'PIN set up successfully! You can now use offline access.');
    redirect('/client');
});

$router->get('/auth/google-callback', function() {
    if (isset($_GET['code'])) {
        $clientId = getenv('GOOGLE_CLIENT_ID') ?: 'YOUR_GOOGLE_CLIENT_ID';
        $clientSecret = getenv('GOOGLE_CLIENT_SECRET') ?: 'YOUR_GOOGLE_CLIENT_SECRET';
        $redirectUri = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/auth/google-callback';

        $tokenUrl = 'https://oauth2.googleapis.com/token';
        $tokenData = [
            'code' => $_GET['code'],
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'grant_type' => 'authorization_code',
        ];

        $ch = curl_init($tokenUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($tokenData));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $tokenResponse = curl_exec($ch);
        curl_close($ch);

        $tokenInfo = json_decode($tokenResponse, true);

        if (isset($tokenInfo['access_token'])) {
            $userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
            $ch = curl_init($userInfoUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $tokenInfo['access_token']]);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $userResponse = curl_exec($ch);
            curl_close($ch);

            $userInfo = json_decode($userResponse, true);

            if (isset($userInfo['email'])) {
                $existingUser = Database::fetchOne(
                    "SELECT id, email, name, role, pin_hash FROM users WHERE google_id = ? OR email = ?",
                    [$userInfo['id'], $userInfo['email']]
                );

                if ($existingUser) {
                    if ($existingUser['google_id'] === null) {
                        Database::update('users', ['google_id' => $userInfo['id']], 'id = ?', [$existingUser['id']]);
                    }
                    loginUser($existingUser['id'], $existingUser['role'], $existingUser['email']);
                    if ($existingUser['pin_hash'] === null) {
                        redirect('/auth/pin-setup');
                    }
                    Session::flash('success', 'Welcome back, ' . htmlspecialchars($existingUser['name']) . '!');
                } else {
                    $userId = Database::insert('users', [
                        'email' => $userInfo['email'],
                        'name' => $userInfo['name'] ?? explode('@', $userInfo['email'])[0],
                        'google_id' => $userInfo['id'],
                        'role' => 'resident',
                        'email_verified_at' => date('Y-m-d H:i:s'),
                    ]);
                    loginUser($userId, 'resident', $userInfo['email']);
                    redirect('/auth/pin-setup');
                }

                redirect($existingUser['role'] === 'admin' ? '/admin' : '/client');
            }
        }
    }

    Session::flash('error', 'Google authentication failed. Please try again.');
    redirect('/auth/login');
});

// Client Routes (auth required)
$router->get('/client', function() {
    requireLogin();
    $user = getUser();
    $flash = Session::getFlash();
    
    $unreadCount = Database::fetchOne(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
        [Session::get('user_id')]
    );
    
    echo view('client/index', [
        'basePath' => '/',
        'user' => $user,
        'flash' => $flash,
        'unreadNotifications' => $unreadCount['count'] ?? 0,
    ]);
});

$router->get('/client/notifications', function() {
    requireLogin();
    $user = getUser();
    $notifications = Database::fetchAll(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        [Session::get('user_id')]
    );
    echo view('client/notifications', [
        'basePath' => '/',
        'user' => $user,
        'notifications' => $notifications,
        'csrfToken' => generateCSRFToken(),
    ]);
});

$router->post('/client/notifications/mark-read', function() {
    requireLogin();
    if (verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        Database::update(
            'notifications',
            ['is_read' => 1],
            'user_id = ? AND is_read = 0',
            [Session::get('user_id')]
        );
    }
    redirect('/client/notifications');
});

$router->get('/client/profile', function() {
    requireLogin();
    $user = getUser();
    $profile = Database::fetchOne(
        "SELECT * FROM user_profiles WHERE user_id = ?",
        [Session::get('user_id')]
    );
    echo view('client/profile', [
        'basePath' => '/',
        'user' => $user,
        'profile' => $profile,
        'csrfToken' => generateCSRFToken(),
    ]);
});

$router->post('/client/profile', function() {
    requireLogin();
    $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $phone = filter_input(INPUT_POST, 'phone', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $address = filter_input(INPUT_POST, 'address', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $apartment = filter_input(INPUT_POST, 'apartment', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $emergency_name = filter_input(INPUT_POST, 'emergency_contact_name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $emergency_phone = filter_input(INPUT_POST, 'emergency_contact_phone', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    
    if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        Session::flash('error', 'Invalid request.');
        redirect('/client/profile');
    }
    
    $profileData = [
        'phone' => $phone,
        'address' => $address,
        'apartment' => $apartment,
        'emergency_contact_name' => $emergency_name,
        'emergency_contact_phone' => $emergency_phone,
    ];
    
    $existing = Database::fetchOne("SELECT id FROM user_profiles WHERE user_id = ?", [Session::get('user_id')]);
    
    if ($existing) {
        Database::update('user_profiles', $profileData, 'user_id = ?', [Session::get('user_id')]);
    } else {
        $profileData['user_id'] = Session::get('user_id');
        Database::insert('user_profiles', $profileData);
    }
    
    Database::update('users', ['name' => $name], 'id = ?', [Session::get('user_id')]);
    
    Session::flash('success', 'Profile updated successfully!');
    redirect('/client/profile');
});

$router->get('/client/documents', function() {
    requireLogin();
    $user = getUser();
    $documents = Database::fetchAll(
        "SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC",
        [Session::get('user_id')]
    );
    echo view('client/documents', [
        'basePath' => '/',
        'user' => $user,
        'documents' => $documents,
        'csrfToken' => generateCSRFToken(),
    ]);
});

$router->get('/client/bills', function() {
    requireLogin();
    $user = getUser();
    $bills = Database::fetchAll(
        "SELECT * FROM maintenance_bills WHERE user_id = ? ORDER BY created_at DESC",
        [Session::get('user_id')]
    );
    echo view('client/bills', [
        'basePath' => '/',
        'user' => $user,
        'bills' => $bills,
        'csrfToken' => generateCSRFToken(),
    ]);
});

$router->get('/client/requests', function() {
    requireLogin();
    $user = getUser();
    $requests = Database::fetchAll(
        "SELECT * FROM service_requests WHERE user_id = ? ORDER BY created_at DESC",
        [Session::get('user_id')]
    );
    echo view('client/requests', [
        'basePath' => '/',
        'user' => $user,
        'requests' => $requests,
        'csrfToken' => generateCSRFToken(),
    ]);
});

$router->post('/client/requests', function() {
    requireLogin();
    $category = filter_input(INPUT_POST, 'category', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $description = filter_input(INPUT_POST, 'description', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $priority = filter_input(INPUT_POST, 'priority', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?: 'medium';
    
    if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        Session::flash('error', 'Invalid request.');
        redirect('/client/requests');
    }
    
    if (empty($category) || empty($description)) {
        Session::flash('error', 'Please fill in all required fields.');
        redirect('/client/requests');
    }
    
    Database::insert('service_requests', [
        'user_id' => Session::get('user_id'),
        'category' => $category,
        'description' => $description,
        'priority' => $priority,
        'status' => 'pending',
    ]);
    
    Session::flash('success', 'Service request submitted successfully!');
    redirect('/client/requests');
});

// ==================== Admin Routes (admin required) ====================
$router->get('/admin', function() {
    requireAdmin();
    $user = getUser();
    $flash = Session::getFlash();
    
    $stats = [
        'totalUsers' => Database::fetchOne("SELECT COUNT(*) as count FROM users")['count'] ?? 0,
        'activeUsers' => Database::fetchOne("SELECT COUNT(*) as count FROM users WHERE is_active = 1")['count'] ?? 0,
        'pendingRequests' => Database::fetchOne("SELECT COUNT(*) as count FROM service_requests WHERE status = 'pending'")['count'] ?? 0,
        'unpaidBills' => Database::fetchOne("SELECT COUNT(*) as count FROM maintenance_bills WHERE status = 'pending' OR status = 'overdue'")['count'] ?? 0,
    ];
    
    $recentActivity = Database::fetchAll("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10");
    $recentRequests = Database::fetchAll("SELECT r.*, u.name as user_name FROM service_requests r LEFT JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC LIMIT 5");
    
    echo view('admin/index', [
        'basePath' => '/',
        'user' => $user,
        'flash' => $flash,
        'stats' => $stats,
        'recentActivity' => $recentActivity,
        'recentRequests' => $recentRequests,
    ]);
});

$router->get('/admin/users', function() {
    requireAdmin();
    $user = getUser();
    $users = Database::fetchAll("SELECT u.*, up.phone, up.apartment FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id ORDER BY u.created_at DESC");
    echo view('admin/users', [
        'basePath' => '/',
        'user' => $user,
        'users' => $users,
    ]);
});

$router->get('/admin/users/{id}', function($id) {
    requireAdmin();
    $targetUser = Database::fetchOne("SELECT u.*, up.phone, up.address, up.apartment, up.emergency_contact_name, up.emergency_contact_phone FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?", [$id]);
    if (!$targetUser) {
        Session::flash('error', 'User not found.');
        redirect('/admin/users');
    }
    echo view('admin/user-edit', [
        'basePath' => '/',
        'user' => getUser(),
        'targetUser' => $targetUser,
        'csrfToken' => generateCSRFToken(),
    ]);
});

$router->post('/admin/users/{id}', function($id) {
    requireAdmin();
    $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $role = filter_input(INPUT_POST, 'role', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $isActive = isset($_POST['is_active']) ? 1 : 0;
    
    if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        Session::flash('error', 'Invalid request.');
        redirect('/admin/users/' . $id);
    }
    
    Database::update('users', [
        'name' => $name,
        'role' => $role,
        'is_active' => $isActive,
    ], 'id = ?', [$id]);
    
    Database::insert('activity_logs', [
        'user_id' => Session::get('user_id'),
        'action' => 'user_updated',
        'description' => "Updated user ID: {$id}",
    ]);
    
    Session::flash('success', 'User updated successfully!');
    redirect('/admin/users');
});

$router->get('/admin/invitations', function() {
    requireAdmin();
    $user = getUser();
    echo view('admin/invitations', [
        'basePath' => '/',
        'user' => $user,
        'csrfToken' => generateCSRFToken(),
    ]);
});

$router->post('/admin/invitations', function() {
    requireAdmin();
    $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
    $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    
    if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        Session::flash('error', 'Invalid request.');
        redirect('/admin/invitations');
    }
    
    if (empty($email) || empty($name)) {
        Session::flash('error', 'Email and name are required.');
        redirect('/admin/invitations');
    }
    
    $existing = Database::fetchOne("SELECT id FROM users WHERE email = ?", [$email]);
    if ($existing) {
        Session::flash('error', 'User with this email already exists.');
        redirect('/admin/invitations');
    }
    
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+7 days'));
    
    Database::insert('password_reset_tokens', [
        'user_id' => 0,
        'token' => password_hash($token, PASSWORD_DEFAULT),
        'expires_at' => $expiresAt,
    ]);
    
    $inviteLink = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/auth/register?invite=' . $token;
    
    error_log("INVITE: {$name} <{$email}> - {$inviteLink}");
    
    Session::flash('success', "Invitation sent! Link: {$inviteLink}");
    redirect('/admin/invitations');
});

$router->get('/admin/requests', function() {
    requireAdmin();
    $user = getUser();
    $requests = Database::fetchAll("SELECT r.*, u.name as user_name, u.email as user_email FROM service_requests r LEFT JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC");
    echo view('admin/requests', [
        'basePath' => '/',
        'user' => $user,
        'requests' => $requests,
        'csrfToken' => generateCSRFToken(),
    ]);
});

$router->post('/admin/requests/{id}', function($id) {
    requireAdmin();
    $status = filter_input(INPUT_POST, 'status', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $assignedTo = filter_input(INPUT_POST, 'assigned_to', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    
    if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        Session::flash('error', 'Invalid request.');
        redirect('/admin/requests');
    }
    
    $updateData = ['status' => $status];
    if ($assignedTo) {
        $updateData['assigned_to'] = $assignedTo;
    }
    if ($status === 'completed') {
        $updateData['resolved_at'] = date('Y-m-d H:i:s');
    }
    
    Database::update('service_requests', $updateData, 'id = ?', [$id]);
    
    Database::insert('activity_logs', [
        'user_id' => Session::get('user_id'),
        'action' => 'request_updated',
        'description' => "Updated request #{$id} to status: {$status}",
    ]);
    
    Session::flash('success', 'Request updated successfully!');
    redirect('/admin/requests');
});

$router->get('/admin/bills', function() {
    requireAdmin();
    $user = getUser();
    $bills = Database::fetchAll("SELECT b.*, u.name as user_name, u.email as user_email FROM maintenance_bills b LEFT JOIN users u ON b.user_id = u.id ORDER BY b.created_at DESC");
    echo view('admin/bills', [
        'basePath' => '/',
        'user' => $user,
        'bills' => $bills,
        'csrfToken' => generateCSRFToken(),
    ]);
});

$router->post('/admin/bills', function() {
    requireAdmin();
    $userId = filter_input(INPUT_POST, 'user_id', FILTER_SANITIZE_NUMBER_INT);
    $amount = filter_input(INPUT_POST, 'amount', FILTER_SANITIZE_NUMBER_FLOAT);
    $month = filter_input(INPUT_POST, 'month', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $dueDate = filter_input(INPUT_POST, 'due_date', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    
    if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        Session::flash('error', 'Invalid request.');
        redirect('/admin/bills');
    }
    
    if (empty($userId) || empty($amount) || empty($month) || empty($dueDate)) {
        Session::flash('error', 'All fields are required.');
        redirect('/admin/bills');
    }
    
    $billNumber = 'MB-' . date('Ym') . '-' . str_pad($userId, 4, '0', STR_PAD_LEFT);
    
    Database::insert('maintenance_bills', [
        'user_id' => $userId,
        'bill_number' => $billNumber,
        'amount' => $amount,
        'month' => $month,
        'due_date' => $dueDate,
        'status' => 'pending',
    ]);
    
    Database::insert('activity_logs', [
        'user_id' => Session::get('user_id'),
        'action' => 'bill_created',
        'description' => "Created bill {$billNumber} for user ID: {$userId}",
    ]);
    
    Session::flash('success', 'Bill created successfully!');
    redirect('/admin/bills');
});

$router->get('/admin/notifications', function() {
    requireAdmin();
    $user = getUser();
    echo view('admin/notifications', [
        'basePath' => '/',
        'user' => $user,
        'csrfToken' => generateCSRFToken(),
    ]);
});

$router->post('/admin/notifications', function() {
    requireAdmin();
    $title = filter_input(INPUT_POST, 'title', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $message = filter_input(INPUT_POST, 'message', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $type = filter_input(INPUT_POST, 'type', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?: 'info';
    $targetAll = isset($_POST['target_all']);
    
    if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        Session::flash('error', 'Invalid request.');
        redirect('/admin/notifications');
    }
    
    if (empty($title) || empty($message)) {
        Session::flash('error', 'Title and message are required.');
        redirect('/admin/notifications');
    }
    
    if ($targetAll) {
        $users = Database::fetchAll("SELECT id FROM users WHERE is_active = 1");
        foreach ($users as $u) {
            Database::insert('notifications', [
                'user_id' => $u['id'],
                'title' => $title,
                'message' => $message,
                'type' => $type,
            ]);
        }
    } else {
        Database::insert('notifications', [
            'user_id' => Session::get('user_id'),
            'title' => $title,
            'message' => $message,
            'type' => $type,
        ]);
    }
    
    Database::insert('activity_logs', [
        'user_id' => Session::get('user_id'),
        'action' => 'notification_sent',
        'description' => $targetAll ? "Broadcast notification: {$title}" : "Sent notification: {$title}",
    ]);
    
    Session::flash('success', 'Notification sent successfully!');
    redirect('/admin/notifications');
});

// API Routes
$router->get('/api/status', function() {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok', 'time' => date('c')]);
});

// ==================== Error Handler ====================

set_exception_handler(function($e) {
    $config = require CONFIG_PATH . '/app.php';
    if ($config['app']['debug']) {
        echo "<pre>{$e}</pre>";
    } else {
        http_response_code(500);
        $loader = new \Twig\Loader\FilesystemLoader(VIEW_PATH);
        $twig = new \Twig\Environment($loader, ['debug' => false]);
        echo $twig->render('errors/500.html.twig');
    }
});

set_error_handler(function($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new \ErrorException($message, 0, $severity, $file, $line);
});

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        $loader = new \Twig\Loader\FilesystemLoader(VIEW_PATH);
        $twig = new \Twig\Environment($loader, ['debug' => false]);
        echo $twig->render('errors/500.html.twig');
    }
});

// ==================== Dispatch ====================

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptName = dirname($_SERVER['SCRIPT_NAME']);
$route = str_replace($scriptName, '', $requestUri);
$route = rtrim($route, '/');
if ($route === '') {
    $route = '/';
}

$router->dispatch($route, $_SERVER['REQUEST_METHOD']);
