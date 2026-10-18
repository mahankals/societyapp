<?php

namespace App\Controllers;

use Database;
use Session;

class ApiController
{
    /**
     * Helper to return standard JSON structure
     */
    public static function json(array $data, int $statusCode = 200): array
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * GET /api/bootstrap
     * Fast, all-in-one bootstrap endpoint for the React SPA.
     */
    public function bootstrap(): void
    {
        $user = getUser();
        $capabilities = getUserCapabilities($user ? (int)$user['id'] : null);
        $userSocieties = [];
        $activeSociety = null;
        $unreadNotifications = 0;
        $latestNotifications = [];

        if ($user) {
            $userSocieties = getUserSocieties((int)$user['id']);
            $activeSocietyId = Session::get('active_society_id');
            if ($activeSocietyId) {
                foreach ($userSocieties as $s) {
                    if ((int)$s['id'] === (int)$activeSocietyId) {
                        $activeSociety = $s;
                        break;
                    }
                }
            }
            if (!$activeSociety && !empty($userSocieties)) {
                $activeSociety = $userSocieties[0];
                Session::put('active_society_id', (int)$activeSociety['id']);
            }
            if (!$activeSociety && $user['role'] === 'admin') {
                $activeSociety = Database::fetchOne("SELECT * FROM societies ORDER BY id ASC LIMIT 1");
                if ($activeSociety) {
                    Session::put('active_society_id', (int)$activeSociety['id']);
                }
            }

            try {
                $unreadRow = Database::fetchOne("SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0", [(int)$user['id']]);
                $unreadNotifications = (int)($unreadRow['cnt'] ?? 0);

                $latestNotifications = Database::fetchAll("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5", [(int)$user['id']]);
            } catch (\Throwable $e) {}
        }

        $appConfig = [
            'appName' => getSetting('app_name', 'SocietyApp') ?: 'SocietyApp',
            'appLogo' => getSetting('app_logo', '/assets/icons/logo.svg') ?: '/assets/icons/logo.svg',
            'supportEmail' => getSetting('support_email', 'support@societyapp.ddev.site'),
            'maintenanceMode' => isMaintenanceModeActive(),
            'isSetupCompleted' => isAppSetupCompleted(),
            'googleClientId' => getSetting('google_client_id', ''),
        ];

        self::json([
            'success' => true,
            'csrfToken' => generateCSRFToken(),
            'user' => $user ? [
                'id' => (int)$user['id'],
                'name' => $user['name'] ?? '',
                'email' => $user['email'] ?? '',
                'phone' => $user['phone'] ?? '',
                'role' => $user['role'] ?? 'resident',
                'profile_photo' => $user['profile_photo'] ?? null,
            ] : null,
            'capabilities' => $capabilities,
            'userSocieties' => array_map(function($s) {
                return [
                    'id' => (int)$s['id'],
                    'name' => $s['name'],
                    'city' => $s['city'] ?? '',
                    'flat_no' => $s['flat_no'] ?? null,
                    'wing' => $s['wing'] ?? null,
                    'role' => $s['role'] ?? 'resident',
                ];
            }, $userSocieties),
            'activeSociety' => $activeSociety ? [
                'id' => (int)$activeSociety['id'],
                'name' => $activeSociety['name'],
                'city' => $activeSociety['city'] ?? '',
                'address' => $activeSociety['address'] ?? '',
                'society_code' => $activeSociety['society_code'] ?? '',
            ] : null,
            'unreadNotifications' => $unreadNotifications,
            'latestNotifications' => $latestNotifications,
            'appConfig' => $appConfig,
        ]);
    }

    /**
     * POST /api/auth/login
     */
    public function login(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $login = trim($input['login'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($login) || empty($password)) {
            self::json(['success' => false, 'error' => 'Please provide both username/email and password.'], 400);
        }

        $user = Database::fetchOne(
            "SELECT * FROM users WHERE email = ? OR phone = ? OR name = ? LIMIT 1",
            [$login, $login, $login]
        );

        $passwordHash = $user['password_hash'] ?? $user['password'] ?? '';
        if (!$user || !password_verify($password, $passwordHash)) {
            self::json(['success' => false, 'error' => 'Invalid email/phone or password.'], 401);
        }

        if (isset($user['is_active']) && (int)$user['is_active'] === 0) {
            self::json(['success' => false, 'error' => 'Your account is inactive. Please contact support.'], 403);
        }

        loginUser((int)$user['id'], $user['role'], $user['email']);
        $remember = !empty($input['remember']);
        \Session::setRememberMe($remember);

        self::json([
            'success' => true,
            'message' => 'Logged in successfully.',
            'user' => [
                'id' => (int)$user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
            ],
            'redirect' => $user['role'] === 'admin' ? '/admin' : '/resident',
        ]);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(): void
    {
        logoutUser();
        self::json(['success' => true, 'message' => 'Logged out successfully.']);
    }

    /**
     * POST /api/auth/register
     */
    public function register(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $name = trim($input['name'] ?? '');
        $email = trim(strtolower($input['email'] ?? ''));
        $phone = trim($input['phone'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($name) || empty($email) || empty($password)) {
            self::json(['success' => false, 'error' => 'Name, email, and password are required.'], 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            self::json(['success' => false, 'error' => 'Invalid email address.'], 400);
        }

        $existing = Database::fetchOne("SELECT id FROM users WHERE email = ?", [$email]);
        if ($existing) {
            self::json(['success' => false, 'error' => 'An account with this email already exists.'], 409);
        }

        $userId = Database::insert('users', [
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'role' => 'resident',
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        loginUser((int)$userId, 'resident', $email);

        self::json([
            'success' => true,
            'message' => 'Registration successful.',
            'user' => ['id' => $userId, 'name' => $name, 'email' => $email, 'role' => 'resident'],
            'redirect' => '/resident',
        ], 201);
    }

    /**
     * POST /api/user/switch-society
     */
    public function switchSociety(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $societyId = (int)($input['society_id'] ?? 0);

        if (!$societyId) {
            self::json(['success' => false, 'error' => 'Invalid society ID.'], 400);
        }

        Session::put('active_society_id', $societyId);
        self::json(['success' => true, 'active_society_id' => $societyId]);
    }

    /**
     * GET /api/admin/dashboard
     */
    public function adminDashboard(): void
    {
        if (!isAdmin()) {
            self::json(['success' => false, 'error' => 'Admin access required.'], 403);
        }

        $totalSocieties = (int)(Database::fetchOne("SELECT COUNT(*) as c FROM societies")['c'] ?? 0);
        $pendingSocieties = (int)(Database::fetchOne("SELECT COUNT(*) as c FROM society_proposals WHERE status = 'pending'")['c'] ?? 0);
        $totalUsers = (int)(Database::fetchOne("SELECT COUNT(*) as c FROM users")['c'] ?? 0);
        $activeMembers = (int)(Database::fetchOne("SELECT COUNT(*) as c FROM users WHERE is_active = 1")['c'] ?? 0);
        
        $societies = Database::fetchAll("SELECT s.*, (SELECT COUNT(*) FROM flats f WHERE f.society_id = s.id) as flats_count FROM societies s ORDER BY s.id DESC LIMIT 10");
        $recentUsers = Database::fetchAll("SELECT id, name, email, phone, role, is_active, created_at FROM users ORDER BY id DESC LIMIT 5");

        self::json([
            'success' => true,
            'stats' => [
                'totalSocieties' => $totalSocieties,
                'pendingSocieties' => $pendingSocieties,
                'totalUsers' => $totalUsers,
                'activeMembers' => $activeMembers,
            ],
            'societies' => $societies,
            'recentUsers' => $recentUsers,
        ]);
    }

    /**
     * GET /api/admin/societies
     */
    public function adminSocieties(): void
    {
        if (!isAdmin()) {
            self::json(['success' => false, 'error' => 'Admin access required.'], 403);
        }
        $societies = Database::fetchAll("SELECT s.*, (SELECT COUNT(*) FROM flats f WHERE f.society_id = s.id) as flats_count FROM societies s ORDER BY s.id DESC");
        self::json(['success' => true, 'societies' => $societies]);
    }

    /**
     * GET /api/admin/societies/pending
     */
    public function adminPendingSocieties(): void
    {
        if (!isAdmin()) {
            self::json(['success' => false, 'error' => 'Admin access required.'], 403);
        }
        $pending = Database::fetchAll("SELECT p.*, u.name as submitter_name, u.email as submitter_email, u.phone as submitter_phone FROM society_proposals p LEFT JOIN users u ON p.user_id = u.id WHERE p.status = 'pending' ORDER BY p.id DESC");
        self::json(['success' => true, 'pending' => $pending]);
    }

    /**
     * GET /api/admin/users
     */
    public function adminUsers(): void
    {
        if (!isAdmin()) {
            self::json(['success' => false, 'error' => 'Admin access required.'], 403);
        }
        $users = Database::fetchAll("SELECT id, name, email, phone, role, is_active, created_at FROM users ORDER BY id DESC");
        self::json(['success' => true, 'users' => $users]);
    }

    /**
     * GET /api/admin/invitations
     */
    public function adminInvitations(): void
    {
        if (!isAdmin()) {
            self::json(['success' => false, 'error' => 'Admin access required.'], 403);
        }
        $invitations = Database::fetchAll("SELECT i.*, s.name as society_name FROM invitations i LEFT JOIN societies s ON i.society_id = s.id ORDER BY i.id DESC");
        self::json(['success' => true, 'invitations' => $invitations]);
    }

    /**
     * GET /api/admin/settings
     */
    public function adminSettings(): void
    {
        if (!isAdmin()) {
            self::json(['success' => false, 'error' => 'Admin access required.'], 403);
        }
        $settings = Database::fetchAll("SELECT setting_key, setting_value FROM settings");
        $map = [];
        foreach ($settings as $s) {
            $map[$s['setting_key']] = $s['setting_value'];
        }
        self::json(['success' => true, 'settings' => $map]);
    }

    /**
     * GET /api/resident/dashboard
     */
    public function residentDashboard(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $userId = (int)$user['id'];
        $flats = Database::fetchAll(
            "SELECT fm.*, f.wing, f.flat_no, f.floor, s.name as society_name, s.city, s.address 
             FROM flat_members fm 
             JOIN flats f ON fm.flat_id = f.id 
             JOIN societies s ON f.society_id = s.id 
             WHERE fm.user_id = ? AND fm.status = 'active'",
            [$userId]
        );

        $pendingDues = Database::fetchAll(
            "SELECT b.*, f.wing, f.flat_no, s.name as society_name 
             FROM bills b 
             JOIN flats f ON b.flat_id = f.id 
             JOIN societies s ON f.society_id = s.id 
             JOIN flat_members fm ON fm.flat_id = f.id 
             WHERE fm.user_id = ? AND b.status IN ('unpaid', 'partially_paid') 
             ORDER BY b.due_date ASC",
            [$userId]
        );

        $totalDueAmount = array_reduce($pendingDues, function($carry, $item) {
            return $carry + (float)($item['amount'] ?? 0);
        }, 0);

        self::json([
            'success' => true,
            'flats' => $flats,
            'pendingDues' => $pendingDues,
            'totalDueAmount' => $totalDueAmount,
        ]);
    }

    /**
     * GET /api/resident/bills
     */
    public function residentBills(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }
        $userId = (int)$user['id'];
        $bills = Database::fetchAll(
            "SELECT b.*, f.wing, f.flat_no, s.name as society_name, s.upi_id, s.upi_name
             FROM bills b 
             JOIN flats f ON b.flat_id = f.id 
             JOIN societies s ON f.society_id = s.id 
             JOIN flat_members fm ON fm.flat_id = f.id 
             WHERE fm.user_id = ? 
             ORDER BY b.due_date DESC",
            [$userId]
        );
        self::json(['success' => true, 'bills' => $bills]);
    }

    /**
     * GET /api/resident/receipts
     */
    public function residentReceipts(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }
        $userId = (int)$user['id'];
        $receipts = Database::fetchAll(
            "SELECT p.*, b.title as bill_title, f.wing, f.flat_no, s.name as society_name 
             FROM payments p 
             LEFT JOIN bills b ON p.bill_id = b.id 
             LEFT JOIN flats f ON b.flat_id = f.id 
             LEFT JOIN societies s ON f.society_id = s.id 
             WHERE p.user_id = ? 
             ORDER BY p.payment_date DESC",
            [$userId]
        );
        self::json(['success' => true, 'receipts' => $receipts]);
    }

    /**
     * GET /api/resident/members
     */
    public function residentMembers(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }
        $activeSocId = Session::get('active_society_id');
        $members = [];
        if ($activeSocId) {
            $members = Database::fetchAll(
                "SELECT u.id, u.name, u.phone, u.email, fm.role, f.wing, f.flat_no 
                 FROM flat_members fm 
                 JOIN users u ON fm.user_id = u.id 
                 JOIN flats f ON fm.flat_id = f.id 
                 WHERE f.society_id = ? AND fm.status = 'active' 
                 ORDER BY f.wing ASC, f.flat_no ASC",
                [(int)$activeSocId]
            );
        }
        self::json(['success' => true, 'members' => $members]);
    }

    /**
     * GET /api/committee/dashboard
     */
    public function committeeDashboard(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }
        $activeSocId = Session::get('active_society_id');
        $society = $activeSocId ? Database::fetchOne("SELECT * FROM societies WHERE id = ?", [(int)$activeSocId]) : null;

        $flatsCount = $activeSocId ? (int)(Database::fetchOne("SELECT COUNT(*) as c FROM flats WHERE society_id = ?", [(int)$activeSocId])['c'] ?? 0) : 0;
        $membersCount = $activeSocId ? (int)(Database::fetchOne("SELECT COUNT(DISTINCT fm.user_id) as c FROM flat_members fm JOIN flats f ON fm.flat_id = f.id WHERE f.society_id = ? AND fm.status = 'active'", [(int)$activeSocId])['c'] ?? 0) : 0;
        $pendingRequests = $activeSocId ? (int)(Database::fetchOne("SELECT COUNT(*) as c FROM flat_members fm JOIN flats f ON fm.flat_id = f.id WHERE f.society_id = ? AND fm.status = 'pending'", [(int)$activeSocId])['c'] ?? 0) : 0;

        self::json([
            'success' => true,
            'society' => $society,
            'stats' => [
                'flatsCount' => $flatsCount,
                'membersCount' => $membersCount,
                'pendingRequests' => $pendingRequests,
            ],
        ]);
    }

    /**
     * GET /api/committee/flats
     */
    public function committeeFlats(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }
        $activeSocId = Session::get('active_society_id');
        $flats = [];
        if ($activeSocId) {
            $flats = Database::fetchAll(
                "SELECT f.*, 
                 (SELECT u.name FROM flat_members fm JOIN users u ON fm.user_id = u.id WHERE fm.flat_id = f.id AND fm.role = 'owner' AND fm.status = 'active' LIMIT 1) as owner_name,
                 (SELECT u.name FROM flat_members fm JOIN users u ON fm.user_id = u.id WHERE fm.flat_id = f.id AND fm.role = 'tenant' AND fm.status = 'active' LIMIT 1) as tenant_name
                 FROM flats f WHERE f.society_id = ? ORDER BY f.wing ASC, f.flat_no ASC",
                [(int)$activeSocId]
            );
        }
        self::json(['success' => true, 'flats' => $flats]);
    }

    /**
     * GET /api/notifications
     */
    public function notifications(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }
        $notifications = Database::fetchAll(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            [(int)$user['id']]
        );
        self::json(['success' => true, 'notifications' => $notifications]);
    }

    /**
     * POST /api/notifications/mark-read
     */
    public function markNotificationsRead(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }
        Database::query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [(int)$user['id']]);
        self::json(['success' => true]);
    }

    /**
     * GET /api/profile
     */
    public function profile(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }
        self::json([
            'success' => true,
            'user' => [
                'id' => (int)$user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'phone' => $user['phone'] ?? '',
                'role' => $user['role'],
                'profile_photo' => $user['profile_photo'] ?? null,
                'status' => $user['status'] ?? 'active',
                'created_at' => $user['created_at'] ?? '',
            ]
        ]);
    }

    /**
     * POST /api/profile
     */
    public function updateProfile(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $name = trim($input['name'] ?? $user['name']);
        $phone = trim($input['phone'] ?? ($user['phone'] ?? ''));

        Database::update('users', [
            'name' => $name,
            'phone' => $phone,
        ], 'id = ?', [(int)$user['id']]);

        self::json(['success' => true, 'message' => 'Profile updated successfully.']);
    }
}
