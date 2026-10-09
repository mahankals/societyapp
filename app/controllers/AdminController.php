<?php
/**
 * Admin Controller
 * Handles all admin functionality
 */

require_once APP_PATH . '/core/Database.php';
require_once APP_PATH . '/core/Session.php';
require_once APP_PATH . '/core/helpers.php';

class AdminController
{
    public function index()
    {
        requireAdmin();
        $user = getUser();
        $flash = Session::getFlash();
        
        $stats = [
            'totalSocieties' => Database::fetchOne("SELECT COUNT(*) as count FROM societies")['count'] ?? 0,
            'totalUsers' => Database::fetchOne("SELECT COUNT(*) as count FROM users")['count'] ?? 0,
            'activeUsers' => Database::fetchOne("SELECT COUNT(*) as count FROM users WHERE is_active = 1")['count'] ?? 0,
            'totalFlats' => Database::fetchOne("SELECT COUNT(*) as count FROM flats")['count'] ?? 0,
        ];
        
        $recentSocieties = Database::fetchAll("
            SELECT s.*, 
                   (SELECT COUNT(*) FROM flats f WHERE f.society_id = s.id) as total_flats,
                   (SELECT COUNT(*) FROM society_members sm WHERE sm.society_id = s.id AND sm.status = 'active') as total_members
            FROM societies s 
            ORDER BY s.created_at DESC 
            LIMIT 5
        ");
        
        $recentUsers = Database::fetchAll("
            SELECT id, name, email, role, is_active, created_at 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 5
        ");
        
        $recentActivity = Database::fetchAll("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 8");
        
        echo view('admin/index', [
            'basePath' => '/',
            'user' => $user,
            'flash' => $flash,
            'stats' => $stats,
            'recentSocieties' => $recentSocieties,
            'recentUsers' => $recentUsers,
            'recentActivity' => $recentActivity,
            'profile' => getUserProfile(),
            'currentRoute' => '/admin',
        ]);
    }

    /**
     * Societies Management (Super Admin Platform Level)
     */
    public function societies()
    {
        requireAdmin();
        $user = getUser();
        $search = trim($_GET['search'] ?? '');
        
        $where = [];
        $params = [];
        if ($search !== '') {
            $where[] = "(s.name LIKE ? OR s.society_code LIKE ? OR s.city LIKE ?)";
            $pattern = "%{$search}%";
            $params = [$pattern, $pattern, $pattern];
        }
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        
        $societies = Database::fetchAll("
            SELECT s.*,
                   (SELECT COUNT(*) FROM flats f WHERE f.society_id = s.id) as total_flats,
                   (SELECT COUNT(*) FROM society_members sm WHERE sm.society_id = s.id AND sm.status = 'active') as total_members
            FROM societies s
            {$whereClause}
            ORDER BY s.created_at DESC
        ", $params);

        $pendingRequests = Database::fetchAll("
            SELECT sr.*, u.name as requester_name, u.email as requester_email, u.phone as requester_phone
            FROM society_requests sr
            LEFT JOIN users u ON sr.user_id = u.id
            WHERE sr.status = 'pending'
            ORDER BY sr.created_at DESC
        ");
        
        echo view('admin/societies', [
            'basePath' => '/',
            'user' => $user,
            'societies' => $societies,
            'search' => $search,
            'pendingRequests' => $pendingRequests,
            'pendingRequestsCount' => count($pendingRequests),
            'csrfToken' => generateCSRFToken(),
            'profile' => getUserProfile(),
            'flash' => Session::getFlash(),
            'currentRoute' => '/admin/societies',
        ]);
    }

    /**
     * Create New Society
     */
    public function createSociety()
    {
        requireAdmin();
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/admin/societies');
        }
        
        $name = trim($_POST['name'] ?? '');
        $code = strtoupper(trim($_POST['society_code'] ?? ''));
        $regNo = trim($_POST['registration_no'] ?? '');
        $address = trim($_POST['address'] ?? '');
        $city = trim($_POST['city'] ?? '');
        $state = trim($_POST['state'] ?? '');
        $pincode = trim($_POST['pincode'] ?? '');
        $upiId = trim($_POST['upi_id'] ?? '');
        $payeeName = trim($_POST['payee_name'] ?? '');
        
        if (empty($name)) {
            Session::flash('error', 'Society name is required.');
            redirect('/admin/societies');
        }
        
        // Auto-generate code if empty
        if (empty($code)) {
            $words = explode(' ', preg_replace('/[^a-zA-Z0-9\s]/', '', $name));
            $prefix = '';
            foreach ($words as $w) {
                if (!empty($w)) $prefix .= strtoupper(substr($w, 0, 1));
            }
            if (strlen($prefix) < 3) $prefix = strtoupper(substr($name, 0, 3));
            $code = 'SOC-' . substr($prefix, 0, 4) . '-' . rand(100, 999);
        }
        
        $existing = Database::fetchOne("SELECT id FROM societies WHERE society_code = ?", [$code]);
        if ($existing) {
            Session::flash('error', "Society code '{$code}' already exists. Please choose a unique code.");
            redirect('/admin/societies');
        }
        
        $societyId = Database::insert('societies', [
            'name' => $name,
            'society_code' => $code,
            'registration_no' => $regNo ?: null,
            'address' => $address ?: null,
            'city' => $city ?: null,
            'state' => $state ?: null,
            'pincode' => $pincode ?: null,
            'upi_id' => $upiId ?: null,
            'payee_name' => $payeeName ?: null,
        ]);
        
        Database::insert('activity_logs', [
            'user_id' => Session::get('user_id'),
            'action' => 'society_created',
            'description' => "Created society: {$name} ({$code})",
        ]);
        
        Session::flash('success', "Society '{$name}' created successfully with code: {$code}");
        redirect('/admin/societies');
    }

    /**
     * Update Society
     */
    public function updateSociety(int $id)
    {
        requireAdmin();
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/admin/societies');
        }
        
        $society = Database::fetchOne("SELECT id FROM societies WHERE id = ?", [$id]);
        if (!$society) {
            Session::flash('error', 'Society not found.');
            redirect('/admin/societies');
        }
        
        $name = trim($_POST['name'] ?? '');
        $code = strtoupper(trim($_POST['society_code'] ?? ''));
        $regNo = trim($_POST['registration_no'] ?? '');
        $address = trim($_POST['address'] ?? '');
        $city = trim($_POST['city'] ?? '');
        $state = trim($_POST['state'] ?? '');
        $pincode = trim($_POST['pincode'] ?? '');
        $upiId = trim($_POST['upi_id'] ?? '');
        $payeeName = trim($_POST['payee_name'] ?? '');
        
        if (empty($name) || empty($code)) {
            Session::flash('error', 'Society name and code are required.');
            redirect('/admin/societies');
        }
        
        $existing = Database::fetchOne("SELECT id FROM societies WHERE society_code = ? AND id != ?", [$code, $id]);
        if ($existing) {
            Session::flash('error', "Society code '{$code}' already exists on another society.");
            redirect('/admin/societies');
        }
        
        Database::update('societies', [
            'name' => $name,
            'society_code' => $code,
            'registration_no' => $regNo ?: null,
            'address' => $address ?: null,
            'city' => $city ?: null,
            'state' => $state ?: null,
            'pincode' => $pincode ?: null,
            'upi_id' => $upiId ?: null,
            'payee_name' => $payeeName ?: null,
        ], 'id = ?', [$id]);
        
        Database::insert('activity_logs', [
            'user_id' => Session::get('user_id'),
            'action' => 'society_updated',
            'description' => "Updated society ID: {$id} ({$name})",
        ]);
        
        Session::flash('success', "Society '{$name}' updated successfully.");
        redirect('/admin/societies');
    }

    /**
     * Delete Society
     */
    public function deleteSociety(int $id)
    {
        requireAdmin();
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/admin/societies');
        }
        
        $society = Database::fetchOne("SELECT id, name FROM societies WHERE id = ?", [$id]);
        if (!$society) {
            Session::flash('error', 'Society not found.');
            redirect('/admin/societies');
        }
        
        Database::delete('societies', 'id = ?', [$id]);
        
        Database::insert('activity_logs', [
            'user_id' => Session::get('user_id'),
            'action' => 'society_deleted',
            'description' => "Deleted society ID: {$id} ({$society['name']})",
        ]);
        
        Session::flash('success', "Society '{$society['name']}' deleted successfully.");
        redirect('/admin/societies');
    }

    /**
     * Toggle Society Enabled / Disabled Status
     */
    public function toggleSocietyStatus(int $id)
    {
        requireAdmin();
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/admin/societies');
        }

        $society = Database::fetchOne("SELECT id, name, is_active FROM societies WHERE id = ?", [$id]);
        if (!$society) {
            Session::flash('error', 'Society not found.');
            redirect('/admin/societies');
        }

        $newStatus = ($society['is_active'] ? 0 : 1);
        Database::update('societies', ['is_active' => $newStatus], 'id = ?', [$id]);

        $statusStr = $newStatus ? 'enabled' : 'disabled';
        Database::insert('activity_logs', [
            'user_id' => Session::get('user_id'),
            'action' => 'society_status_changed',
            'description' => ucfirst($statusStr) . " society: {$society['name']} (ID: {$id})",
        ]);

        Session::flash('success', "Society '{$society['name']}' has been {$statusStr}.");
        redirect('/admin/societies');
    }

    /**
     * Approve Society Proposal / Contribution Request
     */
    public function approveSocietyRequest(int $requestId)
    {
        requireAdmin();
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/admin/societies');
        }

        $req = Database::fetchOne("SELECT * FROM society_requests WHERE id = ? AND status = 'pending'", [$requestId]);
        if (!$req) {
            Session::flash('error', 'Pending society proposal not found.');
            redirect('/admin/societies');
        }

        // Generate unique society code
        $words = explode(' ', preg_replace('/[^a-zA-Z0-9\s]/', '', $req['society_name']));
        $prefix = '';
        foreach ($words as $w) {
            if (!empty($w)) $prefix .= strtoupper(substr($w, 0, 1));
        }
        if (strlen($prefix) < 3) $prefix = strtoupper(substr($req['society_name'], 0, 3));
        $code = 'SOC-' . substr($prefix, 0, 4) . '-' . rand(100, 999);

        // Ensure unique code
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

        // Link requester as initial committee chairman
        if (!empty($req['user_id']) && $societyId) {
            Database::insert('society_members', [
                'society_id' => $societyId,
                'user_id' => $req['user_id'],
                'role' => 'chairman',
                'status' => 'active',
                'ownership_type' => 'owner',
            ]);
            Database::query("UPDATE users SET role = 'committee' WHERE id = ? AND role = 'resident'", [$req['user_id']]);
        }

        // Mark request as approved
        Database::update('society_requests', ['status' => 'approved'], 'id = ?', [$requestId]);

        Database::insert('activity_logs', [
            'user_id' => Session::get('user_id'),
            'action' => 'society_request_approved',
            'description' => "Approved society proposal: {$req['society_name']} (Code: {$code})",
        ]);

        Session::flash('success', "Society '{$req['society_name']}' approved & registered with code {$code}!");
        redirect('/admin/societies');
    }

    /**
     * Reject Society Proposal
     */
    public function rejectSocietyRequest(int $requestId)
    {
        requireAdmin();
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/admin/societies');
        }

        $req = Database::fetchOne("SELECT * FROM society_requests WHERE id = ? AND status = 'pending'", [$requestId]);
        if (!$req) {
            Session::flash('error', 'Pending society proposal not found.');
            redirect('/admin/societies');
        }

        Database::update('society_requests', ['status' => 'rejected'], 'id = ?', [$requestId]);

        Database::insert('activity_logs', [
            'user_id' => Session::get('user_id'),
            'action' => 'society_request_rejected',
            'description' => "Rejected society proposal: {$req['society_name']}",
        ]);

        Session::flash('success', "Society proposal '{$req['society_name']}' rejected.");
        redirect('/admin/societies');
    }

    public function users()
    {
        requireAdmin();
        $user = getUser();
        
        $search = $_GET['search'] ?? '';
        $role = $_GET['role'] ?? '';
        $status = $_GET['status'] ?? '';
        
        $where = ["(u.role = 'admin' OR u.user_type = 'admin')"];
        $params = [];
        
        if ($search) {
            $where[] = "(u.name LIKE ? OR u.email LIKE ? OR u.apartment LIKE ?)";
            $searchParam = "%{$search}%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        if ($status) {
            $where[] = "u.is_active = ?";
            $params[] = ($status === 'active') ? 1 : 0;
        }
        
        $whereClause = 'WHERE ' . implode(' AND ', $where);
        $users = Database::fetchAll("SELECT u.* FROM users u {$whereClause} ORDER BY u.created_at DESC", $params);
        
        echo view('admin/users', [
            'basePath' => '/',
            'user' => $user,
            'users' => $users,
            'search' => $search,
            'role' => $role,
            'status' => $status,
            'profile' => getUserProfile(),
            'currentRoute' => '/admin/users',
        ]);
    }

    public function editUser($id)
    {
        requireAdmin();
        $targetUser = Database::fetchOne("SELECT * FROM users WHERE id = ?", [$id]);
        if (!$targetUser) {
            Session::flash('error', 'User not found.');
            redirect('/admin/users');
        }
        echo view('admin/user-edit', [
            'basePath' => '/',
            'user' => getUser(),
            'targetUser' => $targetUser,
            'csrfToken' => generateCSRFToken(),
            'profile' => getUserProfile(),
            'currentRoute' => '/admin/users',
        ]);
    }

    public function updateUser($id)
    {
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
    }

    public function invitations()
    {
        requireAdmin();
        $user = getUser();
        echo view('admin/invitations', [
            'basePath' => '/',
            'user' => $user,
            'csrfToken' => generateCSRFToken(),
            'profile' => getUserProfile(),
            'currentRoute' => '/admin/invitations',
        ]);
    }

    public function sendInvitation()
    {
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
    }

    public function requests()
    {
        requireAdmin();
        $user = getUser();
        
        $statusFilter = $_GET['status'] ?? '';
        $priorityFilter = $_GET['priority'] ?? '';
        
        $where = [];
        $params = [];
        
        if ($statusFilter) {
            $where[] = "r.status = ?";
            $params[] = $statusFilter;
        }
        
        if ($priorityFilter) {
            $where[] = "r.priority = ?";
            $params[] = $priorityFilter;
        }
        
        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $requests = Database::fetchAll("SELECT r.*, u.name as user_name, u.email as user_email FROM service_requests r LEFT JOIN users u ON r.user_id = u.id {$whereClause} ORDER BY r.created_at DESC", $params);
        
        echo view('admin/requests', [
            'basePath' => '/',
            'user' => $user,
            'requests' => $requests,
            'statusFilter' => $statusFilter,
            'priorityFilter' => $priorityFilter,
            'csrfToken' => generateCSRFToken(),
            'profile' => getUserProfile(),
            'currentRoute' => '/admin/requests',
        ]);
    }

    public function updateRequest($id)
    {
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
    }

    public function bills()
    {
        requireAdmin();
        $user = getUser();
        
        $statusFilter = $_GET['status'] ?? '';
        
        $where = [];
        $params = [];
        
        if ($statusFilter) {
            $where[] = "b.status = ?";
            $params[] = $statusFilter;
        }
        
        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $bills = Database::fetchAll("SELECT b.*, u.name as user_name, u.email as user_email FROM maintenance_bills b LEFT JOIN users u ON b.user_id = u.id {$whereClause} ORDER BY b.created_at DESC", $params);
        
        $stats = Database::fetchOne("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
                SUM(CASE WHEN status IN ('pending', 'overdue') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paidAmount,
                SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount ELSE 0 END) as pendingAmount
            FROM maintenance_bills
        ");
        
        echo view('admin/bills', [
            'basePath' => '/',
            'user' => $user,
            'bills' => $bills,
            'stats' => $stats,
            'statusFilter' => $statusFilter,
            'csrfToken' => generateCSRFToken(),
            'profile' => getUserProfile(),
            'currentRoute' => '/admin/bills',
        ]);
    }

    public function createBill()
    {
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
    }

    public function notifications()
    {
        requireAdmin();
        $user = getUser();
        echo view('admin/notifications', [
            'basePath' => '/',
            'user' => $user,
            'csrfToken' => generateCSRFToken(),
            'profile' => getUserProfile(),
            'currentRoute' => '/admin/notifications',
        ]);
    }

    public function sendNotification()
    {
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
    }

    /**
     * Admin System Settings & Maintenance Mode Management
     */
    public function settings()
    {
        requireAdmin();
        $user = getUser();
        $flash = Session::getFlash();

        $maintenanceDetails = getMaintenanceDetails();
        $isMaintenanceOn = isMaintenanceModeActive();

        // Load settings from database
        $settingsRows = Database::fetchAll("SELECT setting_key, setting_value, setting_group FROM settings");
        $settings = [];
        foreach ($settingsRows as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }

        // Server and environment diagnostics
        $diagnostics = [
            'phpVersion' => phpversion(),
            'serverSoftware' => $_SERVER['SERVER_SOFTWARE'] ?? 'Nginx / PHP-FPM',
            'envFileExists' => file_exists(ROOT_PATH . '/.env'),
            'maintenanceFileExists' => file_exists(ROOT_PATH . '/.maintenance'),
            'databaseVersion' => Database::fetchOne("SELECT VERSION() as v")['v'] ?? 'Unknown',
            'sessionLifetime' => (config('session.lifetime', 3600) / 60) . ' mins',
        ];

        $prerequisites = [
            'php' => ['name' => 'PHP Version >= 8.1', 'status' => version_compare(PHP_VERSION, '8.1.0', '>='), 'value' => PHP_VERSION],
            'pdo' => ['name' => 'PDO & MySQL Extension', 'status' => extension_loaded('pdo_mysql'), 'value' => extension_loaded('pdo_mysql') ? 'Enabled' : 'Missing'],
            'curl' => ['name' => 'cURL Extension', 'status' => extension_loaded('curl'), 'value' => extension_loaded('curl') ? 'Enabled' : 'Missing'],
            'mbstring' => ['name' => 'Mbstring Extension', 'status' => extension_loaded('mbstring'), 'value' => extension_loaded('mbstring') ? 'Enabled' : 'Missing'],
            'fileinfo' => ['name' => 'Fileinfo Extension', 'status' => extension_loaded('fileinfo'), 'value' => extension_loaded('fileinfo') ? 'Enabled' : 'Missing'],
            'writable' => ['name' => 'Storage Directory Writable', 'status' => is_writable(ROOT_PATH . '/storage'), 'value' => is_writable(ROOT_PATH . '/storage') ? 'Writable' : 'Not Writable'],
        ];

        $activeTab = $_GET['tab'] ?? 'prerequisites';
        $validTabs = ['prerequisites', 'database', 'branding', 'email', 'google', 'maintenance'];
        if (!in_array($activeTab, $validTabs, true)) {
            $activeTab = 'prerequisites';
        }

        echo view('admin/settings', [
            'basePath' => '/',
            'user' => $user,
            'flash' => $flash,
            'profile' => getUserProfile(),
            'currentRoute' => '/admin/settings',
            'csrfToken' => generateCSRFToken(),
            'isMaintenanceOn' => $isMaintenanceOn,
            'maintenance' => $maintenanceDetails,
            'settings' => $settings,
            'diagnostics' => $diagnostics,
            'prerequisites' => $prerequisites,
            'activeTab' => $activeTab,
            'dbConfig' => [
                'host' => DB_HOST,
                'port' => DB_PORT,
                'name' => DB_NAME,
                'user' => DB_USER,
            ],
        ]);
    }

    public function updateSettings()
    {
        requireAdmin();
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/admin/settings');
        }

        $user = getUser();
        $maintenanceFile = ROOT_PATH . '/.maintenance';

        // 1. Maintenance Mode Setting
        $enableMaintenance = isset($_POST['maintenance_enabled']) && $_POST['maintenance_enabled'] === '1';
        $maintenanceTitle = trim($_POST['maintenance_title'] ?? 'Scheduled System Maintenance');
        $maintenanceMessage = trim($_POST['maintenance_message'] ?? 'Our engineering team is performing scheduled improvements.');
        $maintenanceEstimatedEnd = trim($_POST['maintenance_estimated_end'] ?? '');
        $maintenanceBypassKey = trim($_POST['maintenance_bypass_key'] ?? '');

        if ($enableMaintenance) {
            $maintenanceData = [
                'enabled' => true,
                'title' => $maintenanceTitle,
                'headline' => $maintenanceTitle,
                'message' => $maintenanceMessage,
                'estimated_end' => $maintenanceEstimatedEnd,
                'bypass_key' => $maintenanceBypassKey,
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => $user['name'] ?? 'Admin',
            ];
            file_put_contents($maintenanceFile, json_encode($maintenanceData, JSON_PRETTY_PRINT));
            setSetting('maintenance_mode', '1', 'system');
        } else {
            if (file_exists($maintenanceFile)) {
                @unlink($maintenanceFile);
            }
            setSetting('maintenance_mode', '0', 'system');
        }

        // 2. Branding & App Settings
        if (isset($_POST['app_name'])) {
            setSetting('app_name', trim($_POST['app_name']), 'branding');
        }
        if (isset($_POST['app_desc'])) {
            setSetting('app_desc', trim($_POST['app_desc']), 'branding');
        }
        if (isset($_POST['support_email'])) {
            setSetting('support_email', trim($_POST['support_email']), 'general');
        }
        if (isset($_POST['default_theme'])) {
            setSetting('default_theme', trim($_POST['default_theme']), 'ui');
        }

        // 3. Email Settings
        if (isset($_POST['mail_host'])) {
            setSetting('mail_host', trim($_POST['mail_host']), 'email');
            setSetting('mail_port', trim($_POST['mail_port'] ?? '587'), 'email');
            setSetting('mail_username', trim($_POST['mail_username'] ?? ''), 'email');
            if (!empty($_POST['mail_password'])) {
                setSetting('mail_password', trim($_POST['mail_password']), 'email');
            }
            setSetting('mail_from_address', trim($_POST['mail_from_address'] ?? ''), 'email');
            setSetting('mail_from_name', trim($_POST['mail_from_name'] ?? ''), 'email');
        }

        // 4. Google Sign-In Settings
        if (isset($_POST['google_client_id'])) {
            setSetting('google_client_id', trim($_POST['google_client_id']), 'auth');
            if (!empty($_POST['google_client_secret'])) {
                setSetting('google_client_secret', trim($_POST['google_client_secret']), 'auth');
            }
            if (isset($_POST['google_redirect_uri'])) {
                setSetting('google_redirect_uri', trim($_POST['google_redirect_uri']), 'auth');
            }
        }

        Database::insert('activity_logs', [
            'user_id' => Session::get('user_id'),
            'action' => 'settings_updated',
            'description' => "Updated system configuration (Maintenance: " . ($enableMaintenance ? 'ON' : 'OFF') . ")",
        ]);

        $activeTab = $_POST['active_tab'] ?? 'prerequisites';
        $validTabs = ['prerequisites', 'database', 'branding', 'email', 'google', 'maintenance'];
        if (!in_array($activeTab, $validTabs, true)) {
            $activeTab = 'prerequisites';
        }

        Session::flash('success', 'System settings saved successfully!');
        redirect('/admin/settings?tab=' . urlencode($activeTab));
    }

    public function toggleMaintenance()
    {
        requireAdmin();
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/admin/settings?tab=maintenance');
        }

        $user = getUser();
        $maintenanceFile = ROOT_PATH . '/.maintenance';
        $currentState = isMaintenanceModeActive();
        $newState = !$currentState;

        if ($newState) {
            $currentData = getMaintenanceDetails();
            $currentData['enabled'] = true;
            $currentData['updated_at'] = date('Y-m-d H:i:s');
            $currentData['updated_by'] = $user['name'] ?? 'Admin';
            file_put_contents($maintenanceFile, json_encode($currentData, JSON_PRETTY_PRINT));
            setSetting('maintenance_mode', '1', 'system');
            Session::flash('success', 'Maintenance Mode activated! Only administrators can access the site.');
        } else {
            if (file_exists($maintenanceFile)) {
                @unlink($maintenanceFile);
            }
            setSetting('maintenance_mode', '0', 'system');
            Session::flash('success', 'Maintenance Mode disabled. Site is now live for all residents and visitors.');
        }

        Database::insert('activity_logs', [
            'user_id' => Session::get('user_id'),
            'action' => 'maintenance_toggled',
            'description' => "Maintenance mode toggled to " . ($newState ? 'ENABLED' : 'DISABLED'),
        ]);

        redirect('/admin/settings?tab=maintenance');
    }

    /**
     * Send live test email to verify SMTP configuration
     */
    public function testEmail()
    {
        requireAdmin();
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            echo json_encode(['success' => false, 'message' => 'Invalid security token.']);
            exit;
        }

        $recipient = trim($_POST['test_recipient_email'] ?? '');
        if (empty($recipient)) {
            $user = getUser();
            $recipient = $user['email'] ?? '';
        }

        $customConfig = [
            'mail_host' => trim($_POST['mail_host'] ?? ''),
            'mail_port' => trim($_POST['mail_port'] ?? '1025'),
            'mail_username' => trim($_POST['mail_username'] ?? ''),
            'mail_password' => trim($_POST['mail_password'] ?? ''),
            'mail_from_address' => trim($_POST['mail_from_address'] ?? ''),
            'mail_from_name' => trim($_POST['mail_from_name'] ?? ''),
        ];

        // If password field in form is blank, fallback to saved encrypted password in database
        if (empty($customConfig['mail_password'])) {
            $customConfig['mail_password'] = getSetting('mail_password', '');
        }

        $appName = getSetting('app_name', 'SocietyApp');
        $time = date('Y-m-d H:i:s T');
        $subject = "{$appName} — SMTP Configuration Test";

        $body = "
        <div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;\">
            <div style=\"border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px;\">
                <h2 style=\"color: #0f172a; margin: 0;\">✓ SMTP Test Message</h2>
                <p style=\"color: #64748b; font-size: 13px; margin: 4px 0 0;\">SocietyApp Email Subsystem Verification</p>
            </div>
            <p style=\"color: #334155; font-size: 14px; line-height: 1.6;\">
                Congratulations! If you are reading this email, your <strong>{$appName}</strong> outgoing mail configuration is operating correctly.
            </p>
            <div style=\"background: #f8fafc; border-radius: 12px; padding: 14px 18px; margin: 20px 0; border: 1px solid #e2e8f0; font-size: 13px;\">
                <p style=\"margin: 4px 0; color: #475569;\"><strong>SMTP Server:</strong> " . htmlspecialchars($customConfig['mail_host']) . ":" . htmlspecialchars((string)$customConfig['mail_port']) . "</p>
                <p style=\"margin: 4px 0; color: #475569;\"><strong>From Address:</strong> " . htmlspecialchars($customConfig['mail_from_address']) . "</p>
                <p style=\"margin: 4px 0; color: #475569;\"><strong>Sent At:</strong> {$time}</p>
            </div>
            <p style=\"color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;\">
                This is an automated test message initiated from the System Settings panel.
            </p>
        </div>";

        $result = sendEmail($recipient, $subject, $body, $customConfig);

        header('Content-Type: application/json');
        echo json_encode($result);
        exit;
    }

    /**
     * Live test database connection from settings panel
     */
    public function testDb()
    {
        requireAdmin();
        header('Content-Type: application/json');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            echo json_encode(['success' => false, 'error' => 'Invalid security token.']);
            exit;
        }

        $host = trim($_POST['db_host'] ?? DB_HOST);
        $port = (int)($_POST['db_port'] ?? DB_PORT);
        $name = trim($_POST['db_name'] ?? DB_NAME);
        $user = trim($_POST['db_user'] ?? DB_USER);
        $pass = $_POST['db_pass'] ?? DB_PASS;

        try {
            $dsn = "mysql:host={$host};port={$port};charset=utf8mb4";
            $pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 3,
            ]);

            $version = $pdo->query('SELECT VERSION()')->fetchColumn();
            $stmt = $pdo->query("SHOW DATABASES LIKE " . $pdo->quote($name));
            $dbExists = (bool)$stmt->fetch();

            echo json_encode([
                'success' => true,
                'message' => "✓ Database connection successful! Server: {$version}" . ($dbExists ? " (Database `{$name}` ready)" : " (Database `{$name}` will be created)"),
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
}

