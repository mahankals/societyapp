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
        
        echo view('admin/societies', [
            'basePath' => '/',
            'user' => $user,
            'societies' => $societies,
            'search' => $search,
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

    public function users()
    {
        requireAdmin();
        $user = getUser();
        
        $search = $_GET['search'] ?? '';
        $role = $_GET['role'] ?? '';
        $status = $_GET['status'] ?? '';
        
        $where = [];
        $params = [];
        
        if ($search) {
            $where[] = "(u.name LIKE ? OR u.email LIKE ? OR up.apartment LIKE ?)";
            $searchParam = "%{$search}%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        if ($role) {
            $where[] = "u.role = ?";
            $params[] = $role;
        }
        
        if ($status) {
            $where[] = "u.is_active = ?";
            $params[] = ($status === 'active') ? 1 : 0;
        }
        
        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $users = Database::fetchAll("SELECT * FROM users {$whereClause} ORDER BY created_at DESC", $params);
        
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
}
