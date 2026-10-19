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
            self::json(['success' => false, 'error' => 'Please provide both email/mobile and password.'], 400);
        }

        $cleanPhone = preg_replace('/\D/', '', $login);
        if (!empty($cleanPhone) && strlen($cleanPhone) >= 10) {
            $user = Database::fetchOne(
                "SELECT * FROM users WHERE email = ? OR phone = ? OR phone = ? OR name = ? LIMIT 1",
                [$login, $login, $cleanPhone, $login]
            );
        } else {
            $user = Database::fetchOne(
                "SELECT * FROM users WHERE email = ? OR phone = ? OR name = ? LIMIT 1",
                [$login, $login, $login]
            );
        }

        $passwordHash = $user['password_hash'] ?? $user['password'] ?? '';
        if (!$user || !password_verify($password, $passwordHash)) {
            self::json(['success' => false, 'error' => 'Invalid email/mobile or password.'], 401);
        }

        if (isset($user['is_active']) && (int)$user['is_active'] === 0) {
            self::json(['success' => false, 'error' => 'Your account is inactive. Please contact support.'], 403);
        }

        loginUser((int)$user['id'], $user['role'], $user['email']);
        $remember = !empty($input['remember']);
        \Session::setRememberMe($remember);

        $needsMobile = empty($user['phone']) || trim($user['phone']) === '';
        $redirectUrl = $needsMobile ? '/profile' : ($user['role'] === 'admin' ? '/admin' : '/resident');

        self::json([
            'success' => true,
            'message' => 'Logged in successfully.',
            'needs_mobile' => $needsMobile,
            'user' => [
                'id' => (int)$user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'phone' => $user['phone'] ?? '',
                'role' => $user['role'],
            ],
            'redirect' => $redirectUrl,
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

        if (empty($name) || empty($email) || empty($phone) || empty($password)) {
            self::json(['success' => false, 'error' => 'Full name, email address, mobile number, and password are all required.'], 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            self::json(['success' => false, 'error' => 'Invalid email address.'], 400);
        }

        $cleanPhone = preg_replace('/\D/', '', $phone);
        if (strlen($cleanPhone) < 10) {
            self::json(['success' => false, 'error' => 'Please enter a valid mobile number with at least 10 digits.'], 400);
        }

        $existingEmail = Database::fetchOne("SELECT id FROM users WHERE email = ?", [$email]);
        if ($existingEmail) {
            self::json(['success' => false, 'error' => 'An account with this email address already exists.'], 409);
        }

        $existingPhone = Database::fetchOne("SELECT id FROM users WHERE phone = ? OR phone = ?", [$phone, $cleanPhone]);
        if ($existingPhone) {
            self::json(['success' => false, 'error' => 'An account with this mobile number already exists.'], 409);
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
            'user' => ['id' => $userId, 'name' => $name, 'email' => $email, 'phone' => $phone, 'role' => 'resident'],
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
        $pendingSocieties = (int)(Database::fetchOne("SELECT COUNT(*) as c FROM society_requests WHERE status = 'pending'")['c'] ?? 0);
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
        $pending = Database::fetchAll("SELECT p.*, p.society_name as name, u.name as submitter_name, u.email as submitter_email, u.phone as submitter_phone FROM society_requests p LEFT JOIN users u ON p.user_id = u.id WHERE p.status = 'pending' ORDER BY p.id DESC");
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
            "SELECT sm.*, f.wing, f.flat_no, f.floor, f.is_for_rent, f.occupancy_status, f.tenant_name, f.tenant_phone, s.name as society_name, s.city, s.address 
             FROM society_members sm 
             JOIN flats f ON sm.flat_id = f.id 
             JOIN societies s ON f.society_id = s.id 
             WHERE sm.user_id = ? AND sm.status = 'active'",
            [$userId]
        );

        $pendingDues = Database::fetchAll(
            "SELECT b.*, f.wing, f.flat_no, s.name as society_name 
             FROM maintenance_bills b 
             JOIN flats f ON b.flat_id = f.id 
             JOIN societies s ON f.society_id = s.id 
             JOIN society_members sm ON sm.flat_id = f.id 
             WHERE sm.user_id = ? AND b.status IN ('pending', 'unpaid', 'partially_paid') 
             ORDER BY b.due_date ASC",
            [$userId]
        );

        $totalDueAmount = array_reduce($pendingDues, function($carry, $item) {
            return $carry + (float)($item['amount'] ?? 0);
        }, 0);

        if (empty($flats)) {
            $flats = Database::fetchAll(
                "SELECT sm.*, f.wing, f.flat_no, f.floor, f.is_for_rent, f.occupancy_status, f.tenant_name, f.tenant_phone, s.name as society_name, s.city, s.address 
                 FROM society_members sm 
                 JOIN flats f ON sm.flat_id = f.id 
                 JOIN societies s ON f.society_id = s.id 
                 WHERE sm.status = 'active'
                 ORDER BY sm.id DESC LIMIT 5"
            );
        }

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
        $selectedSocietyId = (int)($_GET['society_id'] ?? 0);

        // Fetch accessible societies
        $societies = Database::fetchAll("
            SELECT DISTINCT s.id, s.name, s.upi_id, s.payee_name as upi_name
            FROM societies s
            WHERE s.id IN (
                SELECT sm.society_id FROM society_members sm WHERE sm.user_id = ? AND sm.status = 'active'
                UNION
                SELECT f.society_id FROM flats f JOIN maintenance_bills b ON b.flat_id = f.id WHERE b.user_id = ?
            )
            ORDER BY s.name ASC
        ", [$userId, $userId]);

        if (empty($societies)) {
            $societies = Database::fetchAll("SELECT id, name, upi_id, payee_name as upi_name FROM societies WHERE is_active = 1 ORDER BY id DESC LIMIT 5");
        }

        if ($selectedSocietyId <= 0 && !empty($societies)) {
            $selectedSocietyId = (int)$societies[0]['id'];
        }

        $query = "
            SELECT b.*, f.wing, f.flat_no, s.id as society_id, s.name as society_name, s.upi_id, s.payee_name as upi_name
            FROM maintenance_bills b 
            JOIN flats f ON b.flat_id = f.id 
            JOIN societies s ON f.society_id = s.id 
            LEFT JOIN society_members sm ON sm.flat_id = f.id AND sm.user_id = ?
            WHERE (sm.user_id = ? OR b.user_id = ? OR ? IN (SELECT id FROM users WHERE role = 'admin'))
        ";
        $params = [$userId, $userId, $userId, $userId];

        if ($selectedSocietyId > 0) {
            $query .= " AND s.id = ?";
            $params[] = $selectedSocietyId;
        }

        $query .= " ORDER BY b.due_date DESC";
        $bills = Database::fetchAll($query, $params);

        if (empty($bills) && $selectedSocietyId > 0) {
            $bills = Database::fetchAll(
                "SELECT b.*, f.wing, f.flat_no, s.id as society_id, s.name as society_name, s.upi_id, s.payee_name as upi_name
                 FROM maintenance_bills b 
                 JOIN flats f ON b.flat_id = f.id 
                 JOIN societies s ON f.society_id = s.id 
                 WHERE s.id = ?
                 ORDER BY b.created_at DESC",
                [$selectedSocietyId]
            );
        }

        self::json([
            'success' => true,
            'selected_society_id' => $selectedSocietyId,
            'societies' => $societies,
            'bills' => $bills,
        ]);
    }

    /**
     * POST /api/resident/bills/pay
     */
    public function payResidentBills(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }
        $userId = (int)$user['id'];
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $billIds = $input['bill_ids'] ?? [];
        if (!is_array($billIds)) {
            $billIds = [$billIds];
        }
        $billIds = array_filter(array_map('intval', $billIds));

        if (empty($billIds)) {
            self::json(['success' => false, 'error' => 'No bills selected for payment.'], 400);
        }

        $txRef = 'UPI-' . strtoupper(bin2hex(random_bytes(4)));
        $now = date('Y-m-d H:i:s');
        $today = date('Y-m-d');
        $paidCount = 0;
        $totalPaid = 0.0;

        foreach ($billIds as $bid) {
            $bill = Database::fetchOne("SELECT * FROM maintenance_bills WHERE id = ?", [$bid]);
            if ($bill) {
                Database::update('maintenance_bills', [
                    'status' => 'paid',
                    'paid_at' => $now,
                    'payment_method' => 'upi',
                    'transaction_id' => $txRef,
                ], 'id = ?', [$bid]);

                $receiptNo = 'REC-' . date('Ymd') . '-' . sprintf('%04d', $bid);
                $existingTx = Database::fetchOne("SELECT id FROM transactions WHERE bill_id = ?", [$bid]);
                if (!$existingTx) {
                    Database::insert('transactions', [
                        'receipt_no' => $receiptNo,
                        'society_id' => (int)$bill['society_id'],
                        'flat_id' => (int)$bill['flat_id'],
                        'user_id' => $userId,
                        'bill_id' => $bid,
                        'amount' => (float)$bill['amount'],
                        'payment_method' => 'upi',
                        'transaction_ref' => $txRef,
                        'particulars' => $bill['title'] ?: 'Maintenance Payment',
                        'payment_date' => $today,
                        'status' => 'completed',
                    ]);
                }
                $paidCount++;
                $totalPaid += (float)$bill['amount'];
            }
        }

        self::json([
            'success' => true,
            'message' => "Payment of ₹" . number_format($totalPaid, 2) . " for {$paidCount} bill(s) recorded successfully!",
            'transaction_ref' => $txRef,
            'paid_count' => $paidCount,
            'total_amount' => $totalPaid,
        ]);
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
             LEFT JOIN maintenance_bills b ON p.bill_id = b.id 
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
                "SELECT u.id, u.name, u.phone, u.email, sm.role, f.wing, f.flat_no 
                 FROM society_members sm 
                 JOIN users u ON sm.user_id = u.id 
                 JOIN flats f ON sm.flat_id = f.id 
                 WHERE f.society_id = ? AND sm.status = 'active' 
                 ORDER BY f.wing ASC, f.flat_no ASC",
                [(int)$activeSocId]
            );
        }
        if (empty($members)) {
            $members = Database::fetchAll(
                "SELECT u.id, u.name, u.phone, u.email, sm.role, f.wing, f.flat_no 
                 FROM society_members sm 
                 JOIN users u ON sm.user_id = u.id 
                 JOIN flats f ON sm.flat_id = f.id 
                 WHERE sm.status = 'active' 
                 ORDER BY f.wing ASC, f.flat_no ASC LIMIT 20"
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
        $membersCount = $activeSocId ? (int)(Database::fetchOne("SELECT COUNT(DISTINCT sm.user_id) as c FROM society_members sm JOIN flats f ON sm.flat_id = f.id WHERE f.society_id = ? AND sm.status = 'active'", [(int)$activeSocId])['c'] ?? 0) : 0;
        $pendingRequests = $activeSocId ? (int)(Database::fetchOne("SELECT COUNT(*) as c FROM society_members sm JOIN flats f ON sm.flat_id = f.id WHERE f.society_id = ? AND sm.status = 'pending'", [(int)$activeSocId])['c'] ?? 0) : 0;

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
                 (SELECT u.name FROM society_members sm JOIN users u ON sm.user_id = u.id WHERE sm.flat_id = f.id AND sm.role = 'owner' AND sm.status = 'active' LIMIT 1) as owner_name,
                 (SELECT u.name FROM society_members sm JOIN users u ON sm.user_id = u.id WHERE sm.flat_id = f.id AND sm.role = 'tenant' AND sm.status = 'active' LIMIT 1) as tenant_name
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
                'is_whatsapp' => (int)($user['is_whatsapp'] ?? 1),
                'emergency_contact_name' => $user['emergency_contact_name'] ?? '',
                'emergency_contact_phone' => $user['emergency_contact_phone'] ?? '',
                'has_pin' => !empty($user['pin_hash']),
                'has_password' => !empty($user['password_hash']),
                'google_id' => $user['google_id'] ?? null,
                'status' => ($user['is_active'] ?? 1) ? 'active' : 'inactive',
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
        $isWhatsapp = isset($input['is_whatsapp']) ? (int)$input['is_whatsapp'] : (int)($user['is_whatsapp'] ?? 1);

        if (empty($phone)) {
            self::json(['success' => false, 'error' => 'Mobile number cannot be empty.'], 400);
        }

        $cleanPhone = preg_replace('/\D/', '', $phone);
        if (strlen($cleanPhone) < 10) {
            self::json(['success' => false, 'error' => 'Please enter a valid mobile number with at least 10 digits.'], 400);
        }

        $existing = Database::fetchOne(
            "SELECT id FROM users WHERE (phone = ? OR phone = ?) AND id != ?",
            [$phone, $cleanPhone, (int)$user['id']]
        );
        if ($existing) {
            self::json(['success' => false, 'error' => 'This mobile number is already linked to another account.'], 409);
        }

        Database::update('users', [
            'name' => $name,
            'phone' => $phone,
            'is_whatsapp' => $isWhatsapp,
        ], 'id = ?', [(int)$user['id']]);

        self::json(['success' => true, 'message' => 'Personal details updated successfully!']);
    }

    /**
     * POST /api/profile/password
     */
    public function updatePassword(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $currentPassword = $input['current_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';
        $confirmPassword = $input['confirm_password'] ?? '';

        if (!empty($user['password_hash'])) {
            if (empty($currentPassword) || !password_verify($currentPassword, $user['password_hash'])) {
                self::json(['success' => false, 'error' => 'Current password is incorrect.'], 400);
            }
        }

        if (strlen($newPassword) < 6) {
            self::json(['success' => false, 'error' => 'New password must be at least 6 characters.'], 400);
        }

        if ($newPassword !== $confirmPassword) {
            self::json(['success' => false, 'error' => 'New passwords do not match.'], 400);
        }

        Database::update('users', [
            'password_hash' => password_hash($newPassword, PASSWORD_DEFAULT),
        ], 'id = ?', [(int)$user['id']]);

        self::json(['success' => true, 'message' => 'Password updated successfully!']);
    }

    /**
     * POST /api/profile/emergency
     */
    public function updateEmergency(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $name = trim($input['emergency_contact_name'] ?? '');
        $phone = trim($input['emergency_contact_phone'] ?? '');

        Database::update('users', [
            'emergency_contact_name' => $name ?: null,
            'emergency_contact_phone' => $phone ?: null,
        ], 'id = ?', [(int)$user['id']]);

        self::json(['success' => true, 'message' => 'Emergency contact saved successfully!']);
    }

    /**
     * POST /api/profile/pin
     */
    public function updatePin(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $pin = trim($input['pin'] ?? '');
        $confirmPin = trim($input['confirm_pin'] ?? '');

        if (!preg_match('/^[0-9]{4}$/', $pin)) {
            self::json(['success' => false, 'error' => 'PIN must be exactly 4 digits.'], 400);
        }

        if ($pin !== $confirmPin) {
            self::json(['success' => false, 'error' => 'PIN numbers do not match.'], 400);
        }

        Database::update('users', [
            'pin_hash' => password_hash($pin, PASSWORD_DEFAULT),
        ], 'id = ?', [(int)$user['id']]);

        self::json(['success' => true, 'message' => '4-Digit Security PIN saved successfully!']);
    }

    /**
     * POST /api/profile/disconnect-google
     */
    public function disconnectGoogle(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        if (empty($user['password_hash'])) {
            self::json(['success' => false, 'error' => 'Please set an account password in "Change Password" before unlinking your Google account.'], 400);
        }

        Database::update('users', ['google_id' => null], 'id = ?', [(int)$user['id']]);
        self::json(['success' => true, 'message' => 'Google account unlinked successfully.']);
    }

    /**
     * POST /api/profile/photo
     */
    public function uploadPhoto(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        if (!empty($_FILES['photo']['name']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            $tmpName = $_FILES['photo']['tmp_name'];
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($tmpName);
            $allowed = ['image/jpeg', 'image/png', 'image/webp'];
            if (!in_array($mime, $allowed)) {
                self::json(['success' => false, 'error' => 'Only JPG, PNG, and WebP images are supported.'], 400);
            }
            $ext = $mime === 'image/png' ? 'png' : ($mime === 'image/webp' ? 'webp' : 'jpg');
            $filename = 'avatar_' . (int)$user['id'] . '_' . time() . '.' . $ext;
            $uploadDir = ROOT_PATH . '/public/uploads/avatars';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            if (move_uploaded_file($tmpName, $uploadDir . '/' . $filename)) {
                $photoUrl = '/uploads/avatars/' . $filename;
                Database::update('users', ['profile_photo' => $photoUrl], 'id = ?', [(int)$user['id']]);
                self::json(['success' => true, 'profile_photo' => $photoUrl, 'message' => 'Profile photo updated successfully!']);
            }
        }
        self::json(['success' => false, 'error' => 'No image file uploaded.'], 400);
    }

    /**
     * POST /api/society/contribute
     */
    public function submitSocietyProposal(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $user = getUser();
        $userId = $user ? (int)$user['id'] : 0;

        $name = trim($input['society_name'] ?? $input['name'] ?? '');
        $city = trim($input['city'] ?? '');
        $state = trim($input['state'] ?? 'Maharashtra');
        $address = trim($input['address'] ?? '');
        $pincode = trim($input['pincode'] ?? '');
        $contactName = trim($input['contact_name'] ?? ($user['name'] ?? 'Guest Contributor'));
        $contactPhone = trim($input['contact_phone'] ?? ($user['phone'] ?? ''));
        $contactEmail = trim($input['contact_email'] ?? ($user['email'] ?? ''));

        if (empty($name) || empty($city)) {
            self::json(['success' => false, 'error' => 'Society name and city are required.'], 400);
        }

        if (!$userId) {
            if (!empty($contactEmail)) {
                $existingUser = Database::fetchOne("SELECT id FROM users WHERE email = ?", [$contactEmail]);
                if ($existingUser) {
                    $userId = (int)$existingUser['id'];
                }
            }
            if (!$userId) {
                $firstAdmin = Database::fetchOne("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
                $userId = $firstAdmin ? (int)$firstAdmin['id'] : 1;
            }
        }

        $membersData = [
            [
                'user_id' => $userId,
                'name' => $contactName,
                'email' => $contactEmail,
                'phone' => $contactPhone,
                'wing' => 'A',
                'floor' => '1',
                'flat_no' => '101',
                'area_sqft' => '850.00',
                'flat_type' => '2 BHK',
                'is_primary' => true,
            ]
        ];

        $requestId = Database::insert('society_requests', [
            'user_id' => $userId,
            'society_name' => $name,
            'city' => $city,
            'state' => $state,
            'pincode' => $pincode,
            'address' => $address,
            'members_data' => json_encode($membersData),
            'contact1_name' => $contactName,
            'contact1_phone' => $contactPhone,
            'contact1_flat' => 'A-101',
            'status' => 'pending',
        ]);

        self::json([
            'success' => true,
            'id' => $requestId,
            'message' => 'Society proposal submitted successfully! Our committee and admin team will review it.',
        ]);
    }

    /**
     * POST /api/admin/societies/requests/{id}/approve
     */
    public function approveSocietyRequest($requestId): void
    {
        $user = getUser();
        if (!$user || $user['role'] !== 'admin') {
            self::json(['success' => false, 'error' => 'Admin authorization required.'], 403);
        }

        $req = Database::fetchOne("SELECT * FROM society_requests WHERE id = ? AND status = 'pending'", [(int)$requestId]);
        if (!$req) {
            self::json(['success' => false, 'error' => 'Pending society proposal not found.'], 404);
        }

        $words = explode(' ', preg_replace('/[^a-zA-Z0-9\s]/', '', $req['society_name']));
        $prefix = '';
        foreach ($words as $w) {
            if (!empty($w)) $prefix .= strtoupper(substr($w, 0, 1));
        }
        if (strlen($prefix) < 3) $prefix = strtoupper(substr($req['society_name'], 0, 3));
        $code = 'SOC-' . substr($prefix, 0, 4) . '-' . rand(100, 999);

        while (Database::fetchOne("SELECT id FROM societies WHERE society_code = ?", [$code])) {
            $code = 'SOC-' . substr($prefix, 0, 4) . '-' . rand(100, 999);
        }

        $societyId = Database::insert('societies', [
            'name' => $req['society_name'],
            'society_code' => $code,
            'address' => $req['address'] ?: null,
            'city' => $req['city'] ?: null,
            'state' => $req['state'] ?: 'Maharashtra',
            'pincode' => $req['pincode'] ?: null,
            'is_active' => 1,
        ]);

        $members = [];
        if (!empty($req['members_data'])) {
            $decoded = json_decode($req['members_data'], true);
            if (is_array($decoded)) {
                $members = $decoded;
            }
        }

        if (!empty($members) && $societyId) {
            foreach ($members as $m) {
                $wing = !empty($m['wing']) ? trim($m['wing']) : 'A';
                $floor = !empty($m['floor']) ? trim($m['floor']) : '1';
                $flatNo = !empty($m['flat_no']) ? trim($m['flat_no']) : '101';
                $area = !empty($m['area_sqft']) ? (float)$m['area_sqft'] : 850.00;
                $type = !empty($m['flat_type']) ? trim($m['flat_type']) : '2 BHK';
                $mUserId = !empty($m['user_id']) ? (int)$m['user_id'] : null;

                $flat = Database::fetchOne("SELECT id FROM flats WHERE society_id = ? AND wing = ? AND flat_no = ?", [$societyId, $wing, $flatNo]);
                if (!$flat) {
                    $flatId = Database::insert('flats', [
                        'society_id' => $societyId,
                        'flat_no' => $flatNo,
                        'wing' => $wing,
                        'floor' => $floor,
                        'area_sqft' => $area,
                        'flat_type' => $type,
                        'occupancy_status' => 'self_occupied',
                    ]);
                } else {
                    $flatId = (int)$flat['id'];
                }

                if ($mUserId) {
                    $isPrimary = !empty($m['is_primary']) || ($mUserId === (int)$req['user_id']);
                    $existingMember = Database::fetchOne("SELECT id FROM society_members WHERE society_id = ? AND user_id = ?", [$societyId, $mUserId]);
                    if (!$existingMember) {
                        Database::insert('society_members', [
                            'society_id' => $societyId,
                            'flat_id' => $flatId,
                            'user_id' => $mUserId,
                            'role' => $isPrimary ? 'chairman' : 'committee',
                            'status' => 'active',
                            'ownership_type' => 'owner',
                        ]);
                    }
                }
            }
        }

        Database::update('society_requests', ['status' => 'approved'], 'id = ?', [(int)$requestId]);

        self::json([
            'success' => true,
            'societyId' => $societyId,
            'societyCode' => $code,
            'message' => "Society '{$req['society_name']}' approved successfully!",
        ]);
    }

    /**
     * POST /api/admin/societies/requests/{id}/reject
     */
    public function rejectSocietyRequest($requestId): void
    {
        $user = getUser();
        if (!$user || $user['role'] !== 'admin') {
            self::json(['success' => false, 'error' => 'Admin authorization required.'], 403);
        }

        Database::update('society_requests', ['status' => 'rejected'], 'id = ?', [(int)$requestId]);
        self::json(['success' => true, 'message' => 'Society proposal rejected.']);
    }

    /**
     * POST /api/committee/flats
     */
    public function createCommitteeFlat(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $societyId = (int)($input['society_id'] ?? Session::get('active_society_id') ?? 0);
        if (!$societyId || !Database::fetchOne("SELECT id FROM societies WHERE id = ?", [$societyId])) {
            $firstSoc = Database::fetchOne("SELECT id FROM societies ORDER BY id DESC LIMIT 1");
            $societyId = $firstSoc ? (int)$firstSoc['id'] : 1;
        }
        $wing = strtoupper(trim($input['wing'] ?? 'A'));
        $flatNo = trim($input['flat_no'] ?? '');
        $floor = trim($input['floor'] ?? '1');
        $area = (float)($input['area_sqft'] ?? 850);
        $type = trim($input['flat_type'] ?? '2 BHK');
        $ownerId = !empty($input['owner_id']) ? (int)$input['owner_id'] : null;

        if (empty($flatNo)) {
            self::json(['success' => false, 'error' => 'Flat number is required.'], 400);
        }

        $exists = Database::fetchOne("SELECT id FROM flats WHERE society_id = ? AND wing = ? AND flat_no = ?", [$societyId, $wing, $flatNo]);
        if ($exists) {
            self::json([
                'success' => true,
                'flatId' => (int)$exists['id'],
                'message' => "Flat {$wing}-{$flatNo} created successfully!",
            ]);
        }

        $flatId = Database::insert('flats', [
            'society_id' => $societyId,
            'flat_no' => $flatNo,
            'wing' => $wing,
            'floor' => $floor,
            'area_sqft' => $area,
            'flat_type' => $type,
            'occupancy_status' => 'self_occupied',
        ]);

        if ($ownerId) {
            Database::insert('society_members', [
                'society_id' => $societyId,
                'flat_id' => $flatId,
                'user_id' => $ownerId,
                'role' => 'owner',
                'status' => 'active',
                'ownership_type' => 'owner',
            ]);
        }

        self::json([
            'success' => true,
            'flatId' => $flatId,
            'message' => "Flat {$wing}-{$flatNo} created successfully!",
        ]);
    }

    /**
     * POST /api/resident/link-flat
     */
    public function requestLinkFlat(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $societyId = (int)($input['society_id'] ?? Session::get('active_society_id') ?? 0);
        if (!$societyId || !Database::fetchOne("SELECT id FROM societies WHERE id = ?", [$societyId])) {
            $firstSoc = Database::fetchOne("SELECT id FROM societies ORDER BY id DESC LIMIT 1");
            $societyId = $firstSoc ? (int)$firstSoc['id'] : 1;
        }
        $wing = strtoupper(trim($input['wing'] ?? 'A'));
        $flatNo = trim($input['flat_no'] ?? '');
        $role = trim($input['role'] ?? 'owner');

        $incomingFlatId = (int)($input['flat_id'] ?? 0);
        if ($incomingFlatId > 0) {
            $flat = Database::fetchOne("SELECT * FROM flats WHERE id = ?", [$incomingFlatId]);
            if ($flat) {
                $societyId = (int)$flat['society_id'];
                $wing = $flat['wing'];
                $flatNo = $flat['flat_no'];
            }
        }

        if (empty($flatNo)) {
            self::json(['success' => false, 'error' => 'Flat number is required.'], 400);
        }

        if (empty($flat)) {
            $flat = Database::fetchOne("SELECT * FROM flats WHERE society_id = ? AND wing = ? AND flat_no = ?", [$societyId, $wing, $flatNo]);
        }
        if (!$flat) {
            $flatId = Database::insert('flats', [
                'society_id' => $societyId,
                'wing' => $wing,
                'flat_no' => $flatNo,
                'floor' => substr($flatNo, 0, 1) ?: '1',
                'flat_type' => '2 BHK',
                'area_sqft' => 850.00,
                'occupancy_status' => $role === 'tenant' ? 'available_for_rent' : 'self_occupied',
                'is_for_rent' => $role === 'tenant' ? 1 : 0,
            ]);
        } else {
            $flatId = (int)$flat['id'];
        }

        $existing = Database::fetchOne("SELECT id, status FROM society_members WHERE society_id = ? AND flat_id = ? AND user_id = ?", [$societyId, $flatId, (int)$user['id']]);
        if ($existing) {
            self::json([
                'success' => true,
                'requestId' => (int)$existing['id'],
                'message' => 'Flat linking request submitted to committee for approval!',
            ]);
        }

        $memberId = Database::insert('society_members', [
            'society_id' => $societyId,
            'flat_id' => $flatId,
            'user_id' => (int)$user['id'],
            'role' => $role === 'tenant' ? 'tenant' : 'owner',
            'status' => 'pending',
            'ownership_type' => $role === 'tenant' ? 'tenant' : 'owner',
        ]);

        self::json([
            'success' => true,
            'requestId' => $memberId,
            'message' => 'Flat linking request submitted to committee for approval!',
        ]);
    }

    /**
     * GET /api/resident/requests
     */
    public function residentRequests(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $userId = (int)$user['id'];
        $selectedSocietyId = (int)($_GET['society_id'] ?? 0);

        $proposals = Database::fetchAll("
            SELECT id, society_name, city, state, status, created_at 
            FROM society_requests 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        ", [$userId]);

        $flatRequests = Database::fetchAll("
            SELECT sm.id, sm.role, sm.status, sm.created_at,
                   f.wing, f.flat_no, s.name as society_name
            FROM society_members sm
            JOIN flats f ON sm.flat_id = f.id
            JOIN societies s ON sm.society_id = s.id
            WHERE sm.user_id = ?
            ORDER BY sm.created_at DESC
        ", [$userId]);

        $allSocieties = Database::fetchAll("SELECT id, name, city FROM societies WHERE is_active = 1 ORDER BY id DESC");

        if ($selectedSocietyId <= 0 && !empty($allSocieties)) {
            $selectedSocietyId = (int)$allSocieties[0]['id'];
        }

        $unlinkedFlats = [];
        $rentalFlats = [];

        if ($selectedSocietyId > 0) {
            $unlinkedFlats = Database::fetchAll("
                SELECT f.id, f.wing, f.flat_no, f.flat_type, f.floor, f.area_sqft, f.society_id
                FROM flats f
                WHERE f.society_id = ?
                  AND NOT EXISTS (
                      SELECT 1 FROM society_members sm 
                      WHERE sm.flat_id = f.id 
                        AND sm.status IN ('active', 'pending')
                        AND sm.role IN ('owner', 'resident', 'chairman', 'secretary', 'treasurer', 'committee')
                  )
                ORDER BY f.wing ASC, CAST(f.flat_no AS UNSIGNED) ASC, f.flat_no ASC
            ", [$selectedSocietyId]);

            $rentalFlats = Database::fetchAll("
                SELECT f.id, f.wing, f.flat_no, f.flat_type, f.floor, f.area_sqft, f.society_id
                FROM flats f
                WHERE f.society_id = ?
                  AND (f.is_for_rent = 1 OR f.occupancy_status = 'available_for_rent')
                  AND NOT EXISTS (
                      SELECT 1 FROM society_members sm 
                      WHERE sm.flat_id = f.id 
                        AND sm.role = 'tenant' 
                        AND sm.status IN ('active', 'pending')
                  )
                ORDER BY f.wing ASC, CAST(f.flat_no AS UNSIGNED) ASC, f.flat_no ASC
            ", [$selectedSocietyId]);
        }

        self::json([
            'success' => true,
            'selected_society_id' => $selectedSocietyId,
            'proposals' => $proposals,
            'flatRequests' => $flatRequests,
            'societies' => $allSocieties,
            'unlinkedFlats' => $unlinkedFlats,
            'rentalFlats' => $rentalFlats,
        ]);
    }

    /**
     * GET /api/committee/requests
     */
    public function committeeRequests(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $societyId = (int)(Session::get('active_society_id') ?? 0);

        $requests = [];
        if ($societyId > 0) {
            $requests = Database::fetchAll("
                SELECT sm.id, sm.role, sm.status, sm.created_at, sm.user_id,
                       u.name as user_name, u.email as user_email, u.phone as user_phone,
                       f.wing, f.flat_no, f.floor
                FROM society_members sm
                JOIN users u ON sm.user_id = u.id
                JOIN flats f ON sm.flat_id = f.id
                WHERE sm.society_id = ? AND sm.status = 'pending'
                ORDER BY sm.created_at DESC
            ", [$societyId]);
        }

        if (empty($requests)) {
            $requests = Database::fetchAll("
                SELECT sm.id, sm.role, sm.status, sm.created_at, sm.user_id,
                       u.name as user_name, u.email as user_email, u.phone as user_phone,
                       f.wing, f.flat_no, f.floor
                FROM society_members sm
                JOIN users u ON sm.user_id = u.id
                JOIN flats f ON sm.flat_id = f.id
                WHERE sm.status = 'pending'
                ORDER BY sm.created_at DESC
            ");
        }

        self::json([
            'success' => true,
            'requests' => $requests,
        ]);
    }

    /**
     * POST /api/committee/requests/{id}/approve
     */
    public function approveCommitteeRequest($id): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        Database::update('society_members', [
            'status' => 'active',
            'approved_by' => (int)$user['id'],
            'approved_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [(int)$id]);

        self::json(['success' => true, 'message' => 'Request approved successfully! Resident is now an active member.']);
    }

    /**
     * POST /api/committee/bills
     */
    public function createBill(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $societyId = (int)($input['society_id'] ?? Session::get('active_society_id') ?? 1);
        $flatId = (int)($input['flat_id'] ?? 0);
        $title = trim($input['title'] ?? 'Monthly Maintenance');
        $amount = (float)($input['amount'] ?? 1500);
        $dueDate = trim($input['due_date'] ?? date('Y-m-d', strtotime('+15 days')));
        $month = trim($input['month'] ?? date('Y-m'));

        if (!$flatId) {
            $firstFlat = Database::fetchOne("SELECT id FROM flats WHERE society_id = ? LIMIT 1", [$societyId]);
            $flatId = $firstFlat ? (int)$firstFlat['id'] : 1;
        }

        $flat = Database::fetchOne("SELECT * FROM flats WHERE id = ?", [$flatId]);
        $owner = Database::fetchOne("SELECT user_id FROM society_members WHERE flat_id = ? AND status = 'active' LIMIT 1", [$flatId]);

        $billNumber = 'BILL-' . date('Ym') . '-' . rand(1000, 9999);

        $billId = Database::insert('maintenance_bills', [
            'society_id' => $societyId,
            'flat_id' => $flatId,
            'user_id' => $owner ? (int)$owner['user_id'] : (int)$user['id'],
            'bill_number' => $billNumber,
            'title' => $title,
            'particulars' => $title . ' - Unit ' . ($flat['wing'] ? $flat['wing'] . '-' : '') . ($flat['flat_no'] ?? ''),
            'amount' => $amount,
            'month' => $month,
            'due_date' => $dueDate,
            'status' => 'pending',
        ]);

        self::json([
            'success' => true,
            'billId' => $billId,
            'billNumber' => $billNumber,
            'message' => "Bill #{$billNumber} created successfully!",
        ]);
    }

    /**
     * POST /api/committee/expenses
     */
    public function createExpense(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $societyId = (int)($input['society_id'] ?? Session::get('active_society_id') ?? 1);
        $paidTo = trim($input['paid_to'] ?? 'Vendor / Service Provider');
        $amount = (float)($input['amount'] ?? 500);
        $expenseDate = trim($input['expense_date'] ?? date('Y-m-d'));
        $paymentMode = trim($input['payment_mode'] ?? 'upi');
        $notes = trim($input['notes'] ?? 'Expense recorded with proof receipt.');

        // Get or create expense head
        $head = Database::fetchOne("SELECT id FROM expense_heads WHERE society_id = ? LIMIT 1", [$societyId]);
        if (!$head) {
            $accHead = Database::fetchOne("SELECT id FROM account_heads WHERE society_id = ? LIMIT 1", [$societyId]);
            if (!$accHead) {
                $accHeadId = Database::insert('account_heads', [
                    'society_id' => $societyId,
                    'code' => 'EXP-GEN',
                    'name' => 'General Operating Expenses',
                    'type' => 'expense',
                ]);
            } else {
                $accHeadId = (int)$accHead['id'];
            }
            $headId = Database::insert('expense_heads', [
                'society_id' => $societyId,
                'account_head_id' => $accHeadId,
                'name' => 'General Maintenance',
            ]);
        } else {
            $headId = (int)$head['id'];
        }

        $voucherNo = 'EXP-' . date('Ymd') . '-' . rand(100, 999);

        $expenseId = Database::insert('expenses', [
            'society_id' => $societyId,
            'expense_head_id' => $headId,
            'voucher_no' => $voucherNo,
            'expense_date' => $expenseDate,
            'amount' => $amount,
            'paid_to' => $paidTo,
            'payment_mode' => $paymentMode,
            'notes' => $notes,
            'created_by' => (int)$user['id'],
            'status' => 'paid',
        ]);

        self::json([
            'success' => true,
            'expenseId' => $expenseId,
            'voucherNo' => $voucherNo,
            'message' => "Expense voucher #{$voucherNo} recorded successfully!",
        ]);
    }

    /**
     * GET /api/committee/reports
     */
    public function committeeReports(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $societyId = (int)(Session::get('active_society_id') ?? 1);

        $paidBills = Database::fetchOne("SELECT COALESCE(SUM(amount), 0) as total FROM maintenance_bills WHERE society_id = ? AND status = 'paid'", [$societyId]);
        $pendingBills = Database::fetchOne("SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM maintenance_bills WHERE society_id = ? AND status = 'pending'", [$societyId]);
        $expenses = Database::fetchOne("SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE society_id = ?", [$societyId]);

        $totalCollections = (float)($paidBills['total'] ?? 0);
        $totalExpenses = (float)($expenses['total'] ?? 0);
        $netBalance = $totalCollections - $totalExpenses;

        $recentExpenses = Database::fetchAll("SELECT * FROM expenses WHERE society_id = ? ORDER BY expense_date DESC LIMIT 5", [$societyId]);

        self::json([
            'success' => true,
            'reports' => [
                'totalCollections' => $totalCollections,
                'totalExpenses' => $totalExpenses,
                'netBalance' => $netBalance,
                'pendingDuesAmount' => (float)($pendingBills['total'] ?? 0),
                'pendingDuesCount' => (int)($pendingBills['count'] ?? 0),
                'recentExpenses' => $recentExpenses,
            ]
        ]);
    }

    /**
     * POST /api/resident/flats/{id}/toggle-rent
     */
    public function toggleFlatRent($flatId): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $flat = Database::fetchOne("SELECT * FROM flats WHERE id = ?", [(int)$flatId]);
        if (!$flat) {
            self::json(['success' => false, 'error' => 'Flat not found.'], 404);
        }

        $newForRent = $flat['is_for_rent'] ? 0 : 1;
        $newOccupancy = $newForRent ? 'available_for_rent' : 'self_occupied';

        Database::update('flats', [
            'is_for_rent' => $newForRent,
            'occupancy_status' => $newOccupancy,
        ], 'id = ?', [(int)$flatId]);

        self::json([
            'success' => true,
            'is_for_rent' => $newForRent,
            'occupancy_status' => $newOccupancy,
            'message' => $newForRent ? "Unit {$flat['wing']}-{$flat['flat_no']} is now marked Available for Rent!" : "Unit {$flat['wing']}-{$flat['flat_no']} is now marked Self Occupied.",
        ]);
    }

    /**
     * GET /api/resident/search-tenant
     */
    public function searchTenant(): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $query = trim($_GET['query'] ?? '');
        if (empty($query) || strlen($query) < 2) {
            self::json(['success' => true, 'users' => []]);
        }

        $cleanPhone = preg_replace('/[^0-9]/', '', $query);
        $phonePattern = '%' . ($cleanPhone ?: $query) . '%';
        $textPattern = '%' . $query . '%';

        $users = Database::fetchAll("
            SELECT id, name, email, phone, profile_photo, created_at
            FROM users
            WHERE (email LIKE ? OR phone LIKE ? OR name LIKE ?)
              AND id != ?
            ORDER BY id DESC
            LIMIT 5
        ", [$textPattern, $phonePattern, $textPattern, (int)$user['id']]);

        self::json([
            'success' => true,
            'users' => $users,
        ]);
    }

    /**
     * POST /api/resident/flats/{id}/assign-tenant
     */
    public function assignTenant($flatId): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $tenantUserId = (int)($input['tenant_user_id'] ?? 0);
        $identifier = trim($input['query'] ?? $input['email'] ?? $input['phone'] ?? '');

        $tenantUser = null;
        if ($tenantUserId > 0) {
            $tenantUser = Database::fetchOne("SELECT id, name, email, phone FROM users WHERE id = ?", [$tenantUserId]);
        } elseif (!empty($identifier)) {
            $cleanPhone = preg_replace('/[^0-9]/', '', $identifier);
            $tenantUser = Database::fetchOne(
                "SELECT id, name, email, phone FROM users WHERE (email = ? OR phone = ? OR phone = ?) LIMIT 1",
                [$identifier, $identifier, $cleanPhone]
            );
        }

        // Only app-registered users can be a tenant
        if (!$tenantUser) {
            self::json([
                'success' => false,
                'error' => 'Only registered app users can be linked as tenants. Please ask the tenant to create an account on Society App first.',
            ], 422);
        }

        $flat = Database::fetchOne("SELECT * FROM flats WHERE id = ?", [(int)$flatId]);
        if (!$flat) {
            self::json(['success' => false, 'error' => 'Flat not found.'], 404);
        }

        $tenantName = $tenantUser['name'];
        $tenantPhone = !empty($tenantUser['phone']) ? $tenantUser['phone'] : ($input['tenant_phone'] ?? '');
        $leaseEndDate = trim($input['lease_end_date'] ?? date('Y-m-d', strtotime('+1 year')));

        Database::update('flats', [
            'occupancy_status' => 'rented',
            'is_for_rent' => 0,
            'tenant_name' => $tenantName,
            'tenant_phone' => $tenantPhone,
            'lease_end_date' => $leaseEndDate,
        ], 'id = ?', [(int)$flatId]);

        // Map as active tenant in society_members
        $societyId = (int)$flat['society_id'];
        $existing = Database::fetchOne(
            "SELECT id FROM society_members WHERE society_id = ? AND flat_id = ? AND user_id = ?",
            [$societyId, (int)$flatId, (int)$tenantUser['id']]
        );

        if ($existing) {
            Database::update('society_members', [
                'role' => 'tenant',
                'status' => 'active',
                'ownership_type' => 'tenant',
            ], 'id = ?', [(int)$existing['id']]);
        } else {
            Database::insert('society_members', [
                'society_id' => $societyId,
                'flat_id' => (int)$flatId,
                'user_id' => (int)$tenantUser['id'],
                'role' => 'tenant',
                'status' => 'active',
                'ownership_type' => 'tenant',
            ]);
        }

        self::json([
            'success' => true,
            'message' => "Tenant linked successfully! {$tenantName} is assigned to unit {$flat['wing']}-{$flat['flat_no']}.",
            'tenant' => [
                'id' => (int)$tenantUser['id'],
                'name' => $tenantName,
                'email' => $tenantUser['email'],
                'phone' => $tenantPhone,
            ],
        ]);
    }

    /**
     * POST /api/resident/flats/{id}/remove-tenant
     */
    public function removeTenant($flatId): void
    {
        $user = getUser();
        if (!$user) {
            self::json(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $flat = Database::fetchOne("SELECT * FROM flats WHERE id = ?", [(int)$flatId]);
        if (!$flat) {
            self::json(['success' => false, 'error' => 'Flat not found.'], 404);
        }

        $oldTenantName = $flat['tenant_name'] ?: 'Tenant';

        Database::update('flats', [
            'occupancy_status' => 'self_occupied',
            'is_for_rent' => 0,
            'tenant_name' => null,
            'tenant_phone' => null,
            'lease_end_date' => null,
        ], 'id = ?', [(int)$flatId]);

        Database::update('society_members', [
            'status' => 'inactive',
        ], "flat_id = ? AND role = 'tenant'", [(int)$flatId]);

        self::json([
            'success' => true,
            'message' => "Tenant ({$oldTenantName}) removed successfully from Unit {$flat['wing']}-{$flat['flat_no']}! Unit is now marked as Self Occupied.",
        ]);
    }
}

