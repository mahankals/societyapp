<?php
/**
 * Routes Configuration
 * All application routes are defined here.
 */

require_once APP_PATH . '/controllers/TenantController.php';
require_once APP_PATH . '/controllers/AdminController.php';
require_once APP_PATH . '/controllers/SetupController.php';
require_once APP_PATH . '/controllers/SocietyController.php';

$router = $router ?? new Router();
$tenant = new TenantController();
$admin = new AdminController();
$setup = new SetupController();
$society = new SocietyController();

// ==================== Middleware ====================

$router->middleware('guest', function() {
    if (isLoggedIn()) {
        redirect(Session::get('role') === 'admin' ? '/admin' : '/tenant');
    }
});

$router->middleware('auth', function() {
    requireLogin();
});

$router->middleware('admin', function() {
    requireAdmin();
});

// ==================== Landing & Auth ====================

$router->get('/', function() {
    echo view('pages/index', [
        'basePath' => '/',
        'user' => getUser(),
    ]);
});

$router->get('/auth/login', function() {
    $returnUrl = Session::get('return_url', '');
    Session::forget('return_url');
    echo view('auth/login', [
        'basePath' => '/',
        'csrfToken' => generateCSRFToken(),
        'googleClientId' => getSetting('google_client_id', ''),
        'returnUrl' => $returnUrl,
    ]);
}, ['guest']);

$router->post('/auth/login', function() {
    $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
    $password = $_POST['password'] ?? '';
    $returnUrl = $_POST['return_url'] ?? '';

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
        $redirectUrl = $returnUrl ?: ($user['role'] === 'admin' ? '/admin' : '/tenant');
        redirect($redirectUrl);
    } else {
        Session::flash('error', 'Invalid email or password.');
        redirect('/auth/login');
    }
});

$router->get('/auth/register', function() {
    echo view('auth/register', [
        'basePath' => '/',
        'csrfToken' => generateCSRFToken(),
        'googleClientId' => getSetting('google_client_id', ''),
    ]);
}, ['guest']);


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
}, ['guest']);

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
    $isSetupAdmin = (isset($_GET['state']) && $_GET['state'] === 'setup_admin');

    if (isset($_GET['error'])) {
        $err = htmlspecialchars($_GET['error_description'] ?? $_GET['error']);
        if ($isSetupAdmin) {
            $payload = json_encode(['type' => 'GOOGLE_SSO_ERROR', 'error' => $err]);
            echo "<!DOCTYPE html><html><head><title>Google Authentication Error</title></head><body style=\"background:#0b0f17;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;\"><div style=\"text-align:center;padding:20px;\"><h3 style=\"color:#f43f5e;\">Google Sign-In Error</h3><p>$err</p></div><script>if(window.opener){window.opener.postMessage($payload, window.location.origin);window.close();}else{alert('$err');window.close();}</script></body></html>";
            exit;
        }
        Session::flash('error', 'Google Sign-In error: ' . $err);
        redirect('/auth/login');
    }

    if (isset($_GET['code'])) {
        $clientId = getSetting('google_client_id', '');
        $clientSecret = getSetting('google_client_secret', '');
        $redirectUri = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/auth/google-callback';

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
                if ($isSetupAdmin) {
                    $payload = json_encode([
                        'type' => 'GOOGLE_SSO_SETUP',
                        'email' => $userInfo['email'],
                        'name' => $userInfo['name'] ?? '',
                        'google_id' => $userInfo['id'] ?? '',
                        'avatar' => $userInfo['picture'] ?? '',
                    ]);
                    echo "<!DOCTYPE html><html><head><title>Google Authentication</title></head><body style=\"background:#0b0f17;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;\"><div style=\"text-align:center;padding:20px;\"><h3 style=\"color:#10b981;\">Google Account Verified</h3><p>Connecting Google Account...</p></div><script>if(window.opener){window.opener.postMessage($payload, window.location.origin);window.close();}else{window.location.href='/setup?step=admin';}</script></body></html>";
                    exit;
                }

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

        if ($isSetupAdmin) {
            $err = htmlspecialchars($tokenInfo['error_description'] ?? $tokenInfo['error'] ?? 'Failed to exchange authorization token with Google.');
            $payload = json_encode(['type' => 'GOOGLE_SSO_ERROR', 'error' => $err]);
            echo "<!DOCTYPE html><html><head><title>Google Authentication Error</title></head><body style=\"background:#0b0f17;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;\"><div style=\"text-align:center;padding:20px;\"><h3 style=\"color:#f43f5e;\">OAuth Token Exchange Failed</h3><p>$err</p></div><script>if(window.opener){window.opener.postMessage($payload, window.location.origin);window.close();}else{alert('$err');window.close();}</script></body></html>";
            exit;
        }
    }

    Session::flash('error', 'Google authentication failed. Please try again.');
    redirect('/auth/login');
});

$router->post('/auth/google-one-tap', function() {
    header('Content-Type: application/json');

    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?: [];
    $idToken = trim($data['credential'] ?? ($_POST['credential'] ?? ''));
    $context = trim($data['context'] ?? ($_POST['context'] ?? ''));

    if (empty($idToken)) {
        echo json_encode(['success' => false, 'error' => 'No credential received from Google One Tap.']);
        exit;
    }

    // Verify Google token using Google's tokeninfo endpoint (try id_token first, fallback to access_token)
    $verifyUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken);
    $ch = curl_init($verifyUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        $verifyUrl = 'https://oauth2.googleapis.com/tokeninfo?access_token=' . urlencode($idToken);
        $ch = curl_init($verifyUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    }

    $payload = json_decode($response, true);
    if ($httpCode !== 200 || !is_array($payload) || empty($payload['email'])) {
        $errMsg = $payload['error_description'] ?? ($payload['error'] ?? 'Google token verification failed.');
        echo json_encode(['success' => false, 'error' => $errMsg]);
        exit;
    }

    $email = strtolower(trim($payload['email']));
    $name = trim($payload['name'] ?? '');
    if (empty($name)) {
        $given = trim($payload['given_name'] ?? '');
        $family = trim($payload['family_name'] ?? '');
        $name = trim("$given $family");
    }
    if (empty($name)) {
        $name = explode('@', $email)[0];
    }
    $googleId = (string)($payload['sub'] ?? '');
    $avatar = trim($payload['picture'] ?? '');

    // Setup Admin Context: Return user details to prefill admin form
    if ($context === 'setup_admin') {
        echo json_encode([
            'success' => true,
            'email' => $email,
            'name' => $name,
            'google_id' => $googleId,
            'picture' => $avatar,
        ]);
        exit;
    }

    // Standard Login / Registration flow
    $existingUser = Database::fetchOne(
        "SELECT id, email, name, role, pin_hash FROM users WHERE google_id = ? OR email = ?",
        [$googleId, $email]
    );

    if ($existingUser) {
        $updates = [];
        if (empty($existingUser['google_id'])) {
            $updates['google_id'] = $googleId;
        }
        if (!empty($avatar) && empty($existingUser['profile_photo'])) {
            $updates['profile_photo'] = $avatar;
        }
        if (!empty($updates)) {
            Database::update('users', $updates, 'id = ?', [$existingUser['id']]);
        }
        loginUser($existingUser['id'], $existingUser['role'], $existingUser['email']);
        $redirectUrl = ($existingUser['role'] === 'admin') ? '/admin' : '/tenant';
        if ($existingUser['pin_hash'] === null) {
            $redirectUrl = '/auth/pin-setup';
        }
        Session::flash('success', 'Welcome back, ' . htmlspecialchars($existingUser['name']) . '!');
        echo json_encode([
            'success' => true,
            'redirect' => $redirectUrl,
            'user' => [
                'id' => $existingUser['id'],
                'name' => $existingUser['name'],
                'email' => $existingUser['email'],
                'role' => $existingUser['role'],
            ]
        ]);
        exit;
    }

    // Auto-create resident user
    $userId = Database::insert('users', [
        'email' => $email,
        'name' => $name,
        'google_id' => $googleId,
        'profile_photo' => $avatar ?: null,
        'role' => 'resident',
        'is_active' => 1,
        'email_verified_at' => date('Y-m-d H:i:s'),
    ]);
    loginUser($userId, 'resident', $email);
    Session::flash('success', 'Welcome to Society App!');
    echo json_encode([
        'success' => true,
        'redirect' => '/auth/pin-setup',
        'user' => [
            'id' => $userId,
            'name' => $name,
            'email' => $email,
            'role' => 'resident',
        ]
    ]);
    exit;
});

// ==================== Setup Wizard ====================

$router->get('/setup', [$setup, 'index']);
$router->get('/setup/csrf-token', [$setup, 'getCsrfToken']);
$router->post('/setup/test-db', [$setup, 'testDb']);
$router->post('/setup/test-email', [$setup, 'testEmail']);
$router->post('/setup/test-google-sso', [$setup, 'testGoogleSso']);
$router->post('/setup/save-step', [$setup, 'saveStep']);
$router->post('/setup/install', [$setup, 'install']);

// ==================== Public Society Routes ====================

$router->get('/join/{code}', [$society, 'publicJoin']);
$router->post('/join/{code}', [$society, 'handleJoin']);
$router->get('/society/contribute', [$society, 'contribute']);
$router->post('/society/contribute', [$society, 'handleContribute']);

// ==================== Committee Routes ====================

$router->get('/committee', [$society, 'dashboard'], ['auth']);
$router->get('/commitee', function() { redirect('/committee'); }, ['auth']);
$router->get('/admin/committee', function() { redirect('/committee'); }, ['auth']);
$router->get('/admin/commitee', function() { redirect('/committee'); }, ['auth']);
$router->get('/committee/flats', [$society, 'flats'], ['auth']);
$router->post('/committee/flats', [$society, 'addFlat'], ['auth']);
$router->post('/committee/flats/add', [$society, 'addFlat'], ['auth']);
$router->post('/committee/flats/{id}/delete', [$society, 'deleteFlat'], ['auth']);
$router->get('/committee/members', [$society, 'members'], ['auth']);
$router->post('/committee/members/assign', [$society, 'assignMember'], ['auth']);
$router->post('/committee/members/{id}/unlink', [$society, 'unlinkMember'], ['auth']);
$router->get('/committee/requests', [$society, 'requests'], ['auth']);
$router->post('/committee/requests/{id}/approve', [$society, 'approveRequest'], ['auth']);
$router->post('/committee/requests/{id}/reject', [$society, 'rejectRequest'], ['auth']);

// ==================== Tenant Routes ====================

$router->get('/tenant', [$tenant, 'index'], ['auth']);
$router->get('/tenant/notifications', [$tenant, 'notifications'], ['auth']);
$router->post('/tenant/notifications/mark-read', [$tenant, 'markNotificationsRead'], ['auth']);
$router->get('/tenant/profile', [$tenant, 'profile'], ['auth']);
$router->post('/tenant/profile', [$tenant, 'updateProfile'], ['auth']);
$router->post('/tenant/profile/photo', [$tenant, 'uploadPhoto'], ['auth']);
$router->get('/tenant/documents', [$tenant, 'documents'], ['auth']);
$router->post('/tenant/documents/upload', [$tenant, 'uploadDocument'], ['auth']);
$router->get('/tenant/bills', [$tenant, 'bills'], ['auth']);
$router->post('/tenant/bills/{id}/pay', [$tenant, 'recordPayment'], ['auth']);
$router->get('/tenant/receipts', [$tenant, 'receipts'], ['auth']);
$router->get('/tenant/receipts/{id}', [$tenant, 'viewReceipt'], ['auth']);
$router->get('/tenant/directory', [$tenant, 'directory'], ['auth']);
$router->get('/tenant/link-flat', [$tenant, 'linkFlat'], ['auth']);
$router->post('/tenant/link-flat', [$tenant, 'handleLinkFlat'], ['auth']);
$router->get('/tenant/requests', [$tenant, 'requests'], ['auth']);
$router->post('/tenant/requests', [$tenant, 'createRequest'], ['auth']);

// ==================== Admin Routes ====================

$router->get('/admin', [$admin, 'index'], ['auth', 'admin']);
$router->get('/admin/users', [$admin, 'users'], ['auth', 'admin']);
$router->get('/admin/users/{id}', [$admin, 'editUser'], ['auth', 'admin']);
$router->post('/admin/users/{id}', [$admin, 'updateUser'], ['auth', 'admin']);
$router->get('/admin/invitations', [$admin, 'invitations'], ['auth', 'admin']);
$router->post('/admin/invitations', [$admin, 'sendInvitation'], ['auth', 'admin']);
$router->get('/admin/requests', [$admin, 'requests'], ['auth', 'admin']);
$router->post('/admin/requests/{id}', [$admin, 'updateRequest'], ['auth', 'admin']);
$router->get('/admin/bills', [$admin, 'bills'], ['auth', 'admin']);
$router->post('/admin/bills', [$admin, 'createBill'], ['auth', 'admin']);
$router->get('/admin/notifications', [$admin, 'notifications'], ['auth', 'admin']);
$router->post('/admin/notifications', [$admin, 'sendNotification'], ['auth', 'admin']);

// ==================== API Routes ====================

$router->get('/api/status', function() {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok', 'time' => date('c')]);
});

