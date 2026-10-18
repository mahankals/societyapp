<?php

use Slim\App;
use App\Core\SlimBridge;
use App\Middleware\AuthMiddleware;
use App\Middleware\AdminMiddleware;
use App\Middleware\GuestMiddleware;

/**
 * Web Routes Registration for Slim 4
 *
 * @param App $app
 */
return function (App $app) {
    // Instantiate controllers
    require_once APP_PATH . '/controllers/ResidentController.php';
    require_once APP_PATH . '/controllers/TenantController.php';
    require_once APP_PATH . '/controllers/AdminController.php';
    require_once APP_PATH . '/controllers/SetupController.php';
    require_once APP_PATH . '/controllers/SocietyController.php';

    $resident = new ResidentController();
    $tenant = $resident;
    $admin = new AdminController();
    $setup = new SetupController();
    $society = new SocietyController();

    $auth = new AuthMiddleware();
    $adminAuth = new AdminMiddleware();
    $guest = new GuestMiddleware();

    // ==================== Landing & Public Pages ====================

    $app->get('/', SlimBridge::wrap(function () {
        echo view('pages/index', [
            'basePath' => '/',
            'user' => getUser(),
        ]);
    }));

    $app->get('/contact', SlimBridge::wrap(function () {
        echo view('pages/contact', [
            'basePath' => '/',
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
            'user' => getUser(),
        ]);
    }));

    $app->post('/contact', SlimBridge::wrap(function () {
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/contact');
        }
        $name = trim($_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $subject = trim($_POST['subject'] ?? 'General Inquiry');
        $message = trim($_POST['message'] ?? '');

        if (empty($name) || (empty($email) && empty($phone)) || empty($message)) {
            Session::flash('error', 'Please fill in your name, contact information, and message.');
            redirect('/contact');
        }

        try {
            Database::insert('activity_logs', [
                'user_id' => Session::get('user_id'),
                'action' => 'contact_inquiry',
                'description' => "Contact inquiry from {$name} ({$email} / {$phone}): [{$subject}] {$message}",
            ]);
        } catch (\Throwable $e) {}

        $supportEmail = getSetting('support_email', 'support@societyapp.ddev.site');
        if (!empty($supportEmail)) {
            sendEmail(
                $supportEmail,
                "New Support Inquiry: [{$subject}] from {$name}",
                "<h3>New Support Inquiry</h3><p><b>Name:</b> " . htmlspecialchars($name) . "</p><p><b>Email:</b> " . htmlspecialchars($email) . "</p><p><b>Phone:</b> " . htmlspecialchars($phone) . "</p><p><b>Subject:</b> " . htmlspecialchars($subject) . "</p><p><b>Message:</b><br>" . nl2br(htmlspecialchars($message)) . "</p>"
            );
        }

        Session::flash('success', 'Thank you for reaching out! We have received your message and will get back to you shortly.');
        redirect($_SERVER['HTTP_REFERER'] ?? '/contact');
    }));

    // ==================== Authentication Routes ====================

    $app->get('/auth/login', SlimBridge::wrap(function () {
        $returnUrl = $_GET['return_url'] ?? Session::get('return_url', '');
        Session::forget('return_url');

        if (isMaintenanceModeActive()) {
            $referer = $_SERVER['HTTP_REFERER'] ?? '';
            $fromAdmin = (strpos($returnUrl, '/admin') === 0) || (strpos($referer, '/admin') !== false);
            if (!$fromAdmin) {
                redirect('/maintenance');
            }
        }

        echo view('auth/login', [
            'basePath' => '/',
            'csrfToken' => generateCSRFToken(),
            'googleClientId' => getSetting('google_client_id', ''),
            'returnUrl' => $returnUrl,
        ]);
    }))->add($guest);

    $app->get('/admin/login', SlimBridge::wrap(function () {
        Session::put('return_url', '/admin');
        redirect('/auth/login?return_url=' . urlencode('/admin'));
    }));

    $app->post('/auth/login', SlimBridge::wrap(function () {
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
            if (isMaintenanceModeActive() && $user['role'] !== 'admin') {
                Session::flash('error', 'The system is currently undergoing scheduled maintenance. Only system administrators can sign in at this time.');
                redirect('/maintenance');
            }
            loginUser($user['id'], $user['role'], $user['email']);
            Session::flash('success', 'Welcome back, ' . htmlspecialchars($user['name']) . '!');
            $redirectUrl = (!empty($returnUrl) && $returnUrl !== '/') ? $returnUrl : '/resident';
            redirect($redirectUrl);
        } else {
            Session::flash('error', 'Invalid email or password.');
            redirect('/auth/login');
        }
    }))->add($guest);

    $app->get('/auth/register', SlimBridge::wrap(function () {
        echo view('auth/register', [
            'basePath' => '/',
            'csrfToken' => generateCSRFToken(),
            'googleClientId' => getSetting('google_client_id', ''),
        ]);
    }))->add($guest);

    $app->post('/auth/register', SlimBridge::wrap(function () {
        $name = trim(filter_input(INPUT_POST, 'name', FILTER_SANITIZE_SPECIAL_CHARS));
        $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
        $password = $_POST['password'] ?? '';
        $phone = trim($_POST['phone'] ?? '');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token. Please try again.');
            redirect('/auth/register');
        }

        if (empty($name) || empty($email) || empty($password)) {
            Session::flash('error', 'Please fill in all required fields.');
            redirect('/auth/register');
        }

        if (strlen($password) < 6) {
            Session::flash('error', 'Password must be at least 6 characters long.');
            redirect('/auth/register');
        }

        $existing = Database::fetchOne("SELECT id FROM users WHERE email = ?", [$email]);
        if ($existing) {
            Session::flash('error', 'An account with this email address already exists.');
            redirect('/auth/register');
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $userId = Database::insert('users', [
            'name' => $name,
            'email' => $email,
            'password_hash' => $passwordHash,
            'phone' => $phone ?: null,
            'role' => 'resident',
            'user_type' => 'resident',
            'is_active' => 1,
            'email_verified_at' => date('Y-m-d H:i:s'),
        ]);

        if ($userId) {
            loginUser($userId, 'resident', $email);
            Session::flash('success', 'Registration successful! Welcome to SocietyApp.');
            redirect('/resident');
        } else {
            Session::flash('error', 'Registration failed. Please try again.');
            redirect('/auth/register');
        }
    }))->add($guest);

    $app->get('/auth/logout', SlimBridge::wrap(function () {
        logoutUser();
        redirect('/');
    }));

    $app->get('/auth/reset-password', SlimBridge::wrap(function () {
        $token = $_GET['token'] ?? '';
        $email = $_GET['email'] ?? '';
        echo view('auth/reset-password', [
            'basePath' => '/',
            'csrfToken' => generateCSRFToken(),
            'token' => $token,
            'email' => $email,
        ]);
    }));

    $app->post('/auth/reset-password', SlimBridge::wrap(function () {
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/auth/reset-password');
        }
        $token = trim($_POST['token'] ?? '');
        $email = trim(filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL));
        $password = $_POST['password'] ?? '';

        if (!empty($token) && !empty($password)) {
            if (strlen($password) < 6) {
                Session::flash('error', 'Password must be at least 6 characters.');
                redirect('/auth/reset-password?token=' . urlencode($token) . '&email=' . urlencode($email));
            }
            $record = Database::fetchOne(
                "SELECT * FROM password_reset_tokens WHERE token = ? AND email = ? AND expires_at > NOW()",
                [$token, $email]
            );
            if (!$record) {
                Session::flash('error', 'Invalid or expired password reset link.');
                redirect('/auth/reset-password');
            }
            Database::update('users', [
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            ], 'email = ?', [$email]);
            Database::delete('password_reset_tokens', 'email = ?', [$email]);
            Session::flash('success', 'Your password has been successfully reset. Please log in.');
            redirect('/auth/login');
        }

        if (!empty($email)) {
            $user = Database::fetchOne("SELECT id, name FROM users WHERE email = ? AND is_active = 1", [$email]);
            if ($user) {
                $rawToken = bin2hex(random_bytes(32));
                Database::delete('password_reset_tokens', 'email = ?', [$email]);
                Database::insert('password_reset_tokens', [
                    'email' => $email,
                    'token' => $rawToken,
                    'expires_at' => date('Y-m-d H:i:s', time() + 3600),
                ]);
                $resetUrl = (isset($_SERVER['HTTPS']) ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . '/auth/reset-password?token=' . urlencode($rawToken) . '&email=' . urlencode($email);
                sendEmail(
                    $email,
                    'Password Reset Request - SocietyApp',
                    "<h3>Password Reset</h3><p>Hello {$user['name']},</p><p>Click below to reset your password:</p><p><a href=\"{$resetUrl}\">{$resetUrl}</a></p><p>This link expires in 1 hour.</p>"
                );
            }
            Session::flash('success', 'If that email is registered, password reset instructions have been sent.');
            redirect('/auth/login');
        }

        Session::flash('error', 'Please provide a valid email address.');
        redirect('/auth/reset-password');
    }));

    $app->get('/auth/pin-setup', SlimBridge::wrap(function () {
        echo view('auth/pin-setup', [
            'basePath' => '/',
            'csrfToken' => generateCSRFToken(),
            'user' => getUser(),
        ]);
    }))->add($auth);

    $app->post('/auth/pin-setup', SlimBridge::wrap(function () {
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/auth/pin-setup');
        }
        $pin = trim($_POST['pin'] ?? '');
        if (!preg_match('/^\d{4,6}$/', $pin)) {
            Session::flash('error', 'PIN must be 4 to 6 digits.');
            redirect('/auth/pin-setup');
        }
        $pinHash = password_hash($pin, PASSWORD_DEFAULT, ['cost' => 8]);
        Database::update('users', ['pin_hash' => $pinHash], 'id = ?', [Session::get('user_id')]);
        Session::flash('success', 'PIN configured successfully!');
        $user = getUser();
        redirect(getUserRoleDashboardUrl($user));
    }))->add($auth);

    $app->get('/auth/google-callback', SlimBridge::wrap(function () {
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
            $tokenInfo = json_decode($tokenResponse, true);

            if (isset($tokenInfo['access_token'])) {
                $userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
                $ch = curl_init($userInfoUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $tokenInfo['access_token']]);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                $userResponse = curl_exec($ch);
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
                        Session::flash('success', 'Welcome back, ' . htmlspecialchars($existingUser['name']) . '!');
                    } else {
                        $userId = Database::insert('users', [
                            'email'             => $userInfo['email'],
                            'name'              => $userInfo['name'] ?? explode('@', $userInfo['email'])[0],
                            'google_id'         => $userInfo['id'],
                            'role'              => 'resident',
                            'email_verified_at' => date('Y-m-d H:i:s'),
                        ]);
                        loginUser($userId, 'resident', $userInfo['email']);
                        $existingUser = ['role' => 'resident'];
                    }

                    if (isMaintenanceModeActive() && ($existingUser['role'] ?? '') !== 'admin') {
                        Session::flash('error', 'The system is currently undergoing scheduled maintenance. Only system administrators can sign in at this time.');
                        redirect('/maintenance');
                    }

                    redirect(getUserRoleDashboardUrl($existingUser));
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
    }));

    $app->post('/auth/google-one-tap', SlimBridge::wrap(function () {
        header('Content-Type: application/json');
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true) ?: [];
        $idToken = trim($data['credential'] ?? ($_POST['credential'] ?? ''));
        $context = trim($data['context'] ?? ($_POST['context'] ?? ''));

        if (empty($idToken)) {
            echo json_encode(['success' => false, 'error' => 'No credential received from Google One Tap.']);
            exit;
        }

        $verifyUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken);
        $ch = curl_init($verifyUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($httpCode !== 200) {
            $verifyUrl = 'https://oauth2.googleapis.com/tokeninfo?access_token=' . urlencode($idToken);
            $ch = curl_init($verifyUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 8);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
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
            $redirectUrl = getUserRoleDashboardUrl($existingUser);
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
            'success'  => true,
            'redirect' => '/resident',
            'user'     => [
                'id'    => $userId,
                'name'  => $name,
                'email' => $email,
                'role'  => 'resident',
            ]
        ]);
        exit;
    }));

    // ==================== Setup Wizard ====================

    $app->get('/setup', SlimBridge::wrap([$setup, 'index']));
    $app->post('/setup/verify-key', SlimBridge::wrap([$setup, 'verifyKey']));
    $app->get('/setup/csrf-token', SlimBridge::wrap([$setup, 'getCsrfToken']));
    $app->post('/setup/test-db', SlimBridge::wrap([$setup, 'testDb']));
    $app->post('/setup/test-connection', SlimBridge::wrap([$setup, 'testConnection']));
    $app->post('/setup/test-email', SlimBridge::wrap([$setup, 'testEmail']));
    $app->post('/setup/test-google-sso', SlimBridge::wrap([$setup, 'testGoogleSso']));
    $app->post('/setup/save-step', SlimBridge::wrap([$setup, 'saveStep']));
    $app->post('/setup/install', SlimBridge::wrap([$setup, 'install']));

    // ==================== Public Join & Contribute ====================

    $app->get('/join/{code}', SlimBridge::wrap([$society, 'publicJoin']));
    $app->post('/join/{code}', SlimBridge::wrap([$society, 'handleJoin']));
    $app->get('/society/contribute/search-user', SlimBridge::wrap([$society, 'searchUserForContribution']));
    $app->get('/society/contribute', SlimBridge::wrap([$society, 'contribute']));
    $app->post('/society/contribute', SlimBridge::wrap([$society, 'handleContribute']));

    // ==================== Committee Routes ====================

    foreach (['/comitee', '/committee', '/committe'] as $cPrefix) {
        $app->get($cPrefix, SlimBridge::wrap([$society, 'dashboard']))->add($auth);
        $app->get($cPrefix . '/flats', SlimBridge::wrap([$society, 'flats']))->add($auth);
        $app->post($cPrefix . '/flats', SlimBridge::wrap([$society, 'addFlat']))->add($auth);
        $app->post($cPrefix . '/flats/add', SlimBridge::wrap([$society, 'addFlat']))->add($auth);
        $app->post($cPrefix . '/flats/{id}/update', SlimBridge::wrap([$society, 'updateFlat']))->add($auth);
        $app->post($cPrefix . '/flats/{id}/edit', SlimBridge::wrap([$society, 'updateFlat']))->add($auth);
        $app->post($cPrefix . '/flats/{id}/toggle-rent', SlimBridge::wrap([$society, 'toggleFlatRent']))->add($auth);
        $app->post($cPrefix . '/flats/{id}/delete', SlimBridge::wrap([$society, 'deleteFlat']))->add($auth);
        $app->get($cPrefix . '/members', SlimBridge::wrap([$society, 'members']))->add($auth);
        $app->post($cPrefix . '/members/assign', SlimBridge::wrap([$society, 'assignMember']))->add($auth);
        $app->post($cPrefix . '/members/{id}/role', SlimBridge::wrap([$society, 'updateMemberRole']))->add($auth);
        $app->post($cPrefix . '/members/{id}/unlink', SlimBridge::wrap([$society, 'unlinkMember']))->add($auth);
        $app->get($cPrefix . '/bills', SlimBridge::wrap([$society, 'bills']))->add($auth);
        $app->post($cPrefix . '/bills', SlimBridge::wrap([$society, 'createBill']))->add($auth);
        $app->post($cPrefix . '/bills/bulk-generate', SlimBridge::wrap([$society, 'bulkGenerateBills']))->add($auth);
        $app->post($cPrefix . '/bills/upi-settings', SlimBridge::wrap([$society, 'updateUpiSettings']))->add($auth);
        $app->post($cPrefix . '/bills/{id}/mark-paid', SlimBridge::wrap([$society, 'markBillPaid']))->add($auth);
        $app->post($cPrefix . '/receipts/{id}/approve', SlimBridge::wrap([$society, 'approveReceipt']))->add($auth);
        $app->post($cPrefix . '/receipts/{id}/reject', SlimBridge::wrap([$society, 'rejectReceipt']))->add($auth);
        $app->get($cPrefix . '/broadcast', SlimBridge::wrap([$society, 'broadcast']))->add($auth);
        $app->post($cPrefix . '/broadcast', SlimBridge::wrap([$society, 'sendBroadcast']))->add($auth);
        $app->get($cPrefix . '/notifications', SlimBridge::wrap([$society, 'broadcast']))->add($auth);
        $app->post($cPrefix . '/notifications', SlimBridge::wrap([$society, 'sendBroadcast']))->add($auth);

        // Expenses & Outflows
        $app->get($cPrefix . '/expenses', SlimBridge::wrap([$society, 'expenses']))->add($auth);
        $app->post($cPrefix . '/expenses', SlimBridge::wrap([$society, 'createExpense']))->add($auth);
        $app->post($cPrefix . '/expenses/create', SlimBridge::wrap([$society, 'createExpense']))->add($auth);
        $app->post($cPrefix . '/expenses/{id}/delete', SlimBridge::wrap([$society, 'deleteExpense']))->add($auth);
        $app->post($cPrefix . '/expenses/heads/create', SlimBridge::wrap([$society, 'createExpenseHead']))->add($auth);

        // Accounting & Ledger
        $app->get($cPrefix . '/accounting', SlimBridge::wrap([$society, 'accounting']))->add($auth);
        $app->post($cPrefix . '/accounting/heads/create', SlimBridge::wrap([$society, 'createAccountHead']))->add($auth);
        $app->post($cPrefix . '/accounting/opening-balances', SlimBridge::wrap([$society, 'updateOpeningBalances']))->add($auth);
        $app->post($cPrefix . '/donations/create', SlimBridge::wrap([$society, 'createDonation']))->add($auth);

        // Requests
        $app->get($cPrefix . '/requests', SlimBridge::wrap([$society, 'requests']))->add($auth);
        $app->post($cPrefix . '/requests/{id}/approve', SlimBridge::wrap([$society, 'approveRequest']))->add($auth);
        $app->post($cPrefix . '/requests/{id}/reject', SlimBridge::wrap([$society, 'rejectRequest']))->add($auth);
    }

    $app->get('/admin/committee', SlimBridge::wrap(function () { redirect('/comitee'); }))->add($auth);
    $app->get('/admin/commitee', SlimBridge::wrap(function () { redirect('/comitee'); }))->add($auth);

    // ==================== Resident & User Routes ====================

    $app->get('/resident', SlimBridge::wrap([$resident, 'index']))->add($auth);
    $app->get('/user/notification', SlimBridge::wrap([$resident, 'notifications']))->add($auth);
    $app->post('/user/notification/mark-read', SlimBridge::wrap([$resident, 'markNotificationsRead']))->add($auth);
    $app->post('/user/notification/{id}/read', SlimBridge::wrap([$resident, 'markSingleNotificationRead']))->add($auth);
    $app->post('/user/notification/{id}/toggle-read', SlimBridge::wrap([$resident, 'toggleNotificationRead']))->add($auth);
    $app->get('/resident/notifications', SlimBridge::wrap(function () { redirect('/user/notification'); }))->add($auth);
    $app->post('/resident/notifications/mark-read', SlimBridge::wrap([$resident, 'markNotificationsRead']))->add($auth);
    $app->post('/resident/notifications/{id}/read', SlimBridge::wrap([$resident, 'markSingleNotificationRead']))->add($auth);
    $app->get('/user/switch-society/{id}', SlimBridge::wrap([$resident, 'switchSociety']))->add($auth);

    $app->get('/user/profile', SlimBridge::wrap([$resident, 'profile']))->add($auth);
    $app->post('/user/profile', SlimBridge::wrap([$resident, 'updateProfile']))->add($auth);
    $app->post('/user/profile/password', SlimBridge::wrap([$resident, 'updatePassword']))->add($auth);
    $app->post('/user/profile/emergency', SlimBridge::wrap([$resident, 'updateEmergencyContact']))->add($auth);
    $app->post('/user/profile/pin', SlimBridge::wrap([$resident, 'updatePin']))->add($auth);
    $app->post('/user/profile/photo', SlimBridge::wrap([$resident, 'uploadPhoto']))->add($auth);
    $app->post('/user/profile/disconnect-google', SlimBridge::wrap([$resident, 'disconnectGoogle']))->add($auth);
    $app->get('/resident/profile', SlimBridge::wrap(function () { redirect('/user/profile'); }))->add($auth);
    $app->post('/resident/profile', SlimBridge::wrap([$resident, 'updateProfile']))->add($auth);
    $app->post('/resident/profile/photo', SlimBridge::wrap([$resident, 'uploadPhoto']))->add($auth);

    $app->get('/resident/documents', SlimBridge::wrap([$resident, 'documents']))->add($auth);
    $app->post('/resident/documents/upload', SlimBridge::wrap([$resident, 'uploadDocument']))->add($auth);
    $app->get('/resident/bills', SlimBridge::wrap([$resident, 'bills']))->add($auth);
    $app->post('/resident/bills/bulk-pay', SlimBridge::wrap([$resident, 'bulkRecordPayment']))->add($auth);
    $app->post('/resident/bills/{id}/pay', SlimBridge::wrap([$resident, 'recordPayment']))->add($auth);
    $app->get('/resident/receipts', SlimBridge::wrap([$resident, 'receipts']))->add($auth);
    $app->get('/resident/receipts/{id}', SlimBridge::wrap([$resident, 'viewReceipt']))->add($auth);
    $app->get('/resident/members', SlimBridge::wrap([$resident, 'members']))->add($auth);
    $app->get('/resident/directory', SlimBridge::wrap(function () { redirect('/resident/members'); }))->add($auth);
    $app->get('/resident/link-flat', SlimBridge::wrap([$resident, 'linkFlat']))->add($auth);
    $app->post('/resident/link-flat', SlimBridge::wrap([$resident, 'handleLinkFlat']))->add($auth);
    $app->post('/resident/flats/{id}/toggle-rent', SlimBridge::wrap([$resident, 'toggleFlatRent']))->add($auth);
    $app->post('/resident/flats/{id}/occupancy', SlimBridge::wrap([$resident, 'updateFlatOccupancy']))->add($auth);
    $app->get('/resident/requests', SlimBridge::wrap([$resident, 'requests']))->add($auth);
    $app->post('/resident/requests', SlimBridge::wrap([$resident, 'createRequest']))->add($auth);

    // Aliases and Redirects
    $app->any('/tenant', SlimBridge::wrap(function () { redirect('/resident'); }))->add($auth);
    $app->any('/tenant/{path:.+}', SlimBridge::wrap(function ($path) { redirect('/resident/' . $path); }))->add($auth);
    $app->any('/tenent', SlimBridge::wrap(function () { redirect('/resident'); }))->add($auth);
    $app->any('/tenent/{path:.+}', SlimBridge::wrap(function ($path) { redirect('/resident/' . $path); }))->add($auth);
    $app->any('/residential', SlimBridge::wrap(function () { redirect('/resident'); }))->add($auth);
    $app->any('/residential/{path:.+}', SlimBridge::wrap(function ($path) { redirect('/resident/' . $path); }))->add($auth);
    $app->any('/client', SlimBridge::wrap(function () {
        $user = getUser();
        redirect(getUserRoleDashboardUrl($user));
    }))->add($auth);
    $app->any('/client/{path:.+}', SlimBridge::wrap(function ($path) { redirect('/resident/' . $path); }))->add($auth);
    $app->get('/profile', SlimBridge::wrap(function () { redirect('/user/profile'); }))->add($auth);
    $app->get('/admin/profile', SlimBridge::wrap(function () { redirect('/user/profile'); }))->add($auth);

    // ==================== Super Admin Routes ====================

    $app->get('/admin', SlimBridge::wrap([$admin, 'index']))->add($adminAuth);
    $app->get('/admin/societies', SlimBridge::wrap([$admin, 'societies']))->add($adminAuth);
    $app->get('/admin/societies/pending', SlimBridge::wrap([$admin, 'pendingSocieties']))->add($adminAuth);
    $app->post('/admin/societies', SlimBridge::wrap([$admin, 'createSociety']))->add($adminAuth);
    $app->post('/admin/societies/{id}/toggle-status', SlimBridge::wrap([$admin, 'toggleSocietyStatus']))->add($adminAuth);
    $app->post('/admin/societies/{id}/update', SlimBridge::wrap([$admin, 'updateSociety']))->add($adminAuth);
    $app->post('/admin/societies/{id}/delete', SlimBridge::wrap([$admin, 'deleteSociety']))->add($adminAuth);
    $app->post('/admin/societies/requests/{id}/approve', SlimBridge::wrap([$admin, 'approveSocietyRequest']))->add($adminAuth);
    $app->post('/admin/societies/requests/{id}/reject', SlimBridge::wrap([$admin, 'rejectSocietyRequest']))->add($adminAuth);
    $app->get('/admin/users', SlimBridge::wrap([$admin, 'users']))->add($adminAuth);
    $app->get('/admin/users/{id}', SlimBridge::wrap([$admin, 'editUser']))->add($adminAuth);
    $app->post('/admin/users/{id}', SlimBridge::wrap([$admin, 'updateUser']))->add($adminAuth);
    $app->get('/admin/invitations', SlimBridge::wrap([$admin, 'invitations']))->add($adminAuth);
    $app->post('/admin/invitations', SlimBridge::wrap([$admin, 'sendInvitation']))->add($adminAuth);
    $app->get('/admin/settings', SlimBridge::wrap([$admin, 'settings']))->add($adminAuth);
    $app->post('/admin/settings', SlimBridge::wrap([$admin, 'updateSettings']))->add($adminAuth);
    $app->post('/admin/settings/toggle-maintenance', SlimBridge::wrap([$admin, 'toggleMaintenance']))->add($adminAuth);
    $app->post('/admin/settings/test-connection', SlimBridge::wrap([$admin, 'testConnection']))->add($adminAuth);
    $app->post('/admin/settings/test-email', SlimBridge::wrap([$admin, 'testEmail']))->add($adminAuth);
    $app->post('/admin/settings/test-db', SlimBridge::wrap([$admin, 'testDb']))->add($adminAuth);

    $app->get('/admin/bills', SlimBridge::wrap(function () { redirect('/comitee/bills'); }))->add($adminAuth);
    $app->get('/admin/notifications', SlimBridge::wrap(function () { redirect('/comitee/broadcast'); }))->add($adminAuth);
    $app->get('/admin/requests', SlimBridge::wrap(function () { redirect('/comitee/requests'); }))->add($adminAuth);
};
