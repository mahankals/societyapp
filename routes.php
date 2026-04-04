<?php
/**
 * Routes Configuration
 * All application routes are defined here.
 */

require_once APP_PATH . '/controllers/TenantController.php';
require_once APP_PATH . '/controllers/AdminController.php';

$router = new Router();
$tenant = new TenantController();
$admin = new AdminController();

// ==================== Landing & Auth ====================

$router->get('/', function() {
    echo view('pages/index', ['basePath' => '/']);
});

$router->get('/auth/login', function() {
    echo view('auth/login', [
        'basePath' => '/',
        'csrfToken' => generateCSRFToken(),
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
        redirect($user['role'] === 'admin' ? '/admin' : '/tenant');
    } else {
        Session::flash('error', 'Invalid email or password.');
        redirect('/auth/login');
    }
});

$router->get('/auth/register', function() {
    echo view('auth/register', [
        'basePath' => '/',
        'csrfToken' => generateCSRFToken(),
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
        redirect('/tenant');
    }
    echo view('auth/pin-setup', [
        'basePath' => '/',
        'csrfToken' => generateCSRFToken(),
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
    redirect('/tenant');
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

                redirect($existingUser['role'] === 'admin' ? '/admin' : '/tenant');
            }
        }
    }

    Session::flash('error', 'Google authentication failed. Please try again.');
    redirect('/auth/login');
});

// ==================== Tenant Routes ====================

$router->get('/tenant', [$tenant, 'index']);
$router->get('/tenant/notifications', [$tenant, 'notifications']);
$router->post('/tenant/notifications/mark-read', [$tenant, 'markNotificationsRead']);
$router->get('/tenant/profile', [$tenant, 'profile']);
$router->post('/tenant/profile', [$tenant, 'updateProfile']);
$router->get('/tenant/documents', [$tenant, 'documents']);
$router->get('/tenant/bills', [$tenant, 'bills']);
$router->get('/tenant/requests', [$tenant, 'requests']);
$router->post('/tenant/requests', [$tenant, 'createRequest']);

// ==================== Admin Routes ====================

$router->get('/admin', [$admin, 'index']);
$router->get('/admin/users', [$admin, 'users']);
$router->get('/admin/users/{id}', [$admin, 'editUser']);
$router->post('/admin/users/{id}', [$admin, 'updateUser']);
$router->get('/admin/invitations', [$admin, 'invitations']);
$router->post('/admin/invitations', [$admin, 'sendInvitation']);
$router->get('/admin/requests', [$admin, 'requests']);
$router->post('/admin/requests/{id}', [$admin, 'updateRequest']);
$router->get('/admin/bills', [$admin, 'bills']);
$router->post('/admin/bills', [$admin, 'createBill']);
$router->get('/admin/notifications', [$admin, 'notifications']);
$router->post('/admin/notifications', [$admin, 'sendNotification']);

// ==================== API Routes ====================

$router->get('/api/status', function() {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok', 'time' => date('c')]);
});
