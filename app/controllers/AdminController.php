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
            'profile' => getUserProfile(),
            'currentRoute' => '/admin',
        ]);
    }

    public function users()
    {
        requireAdmin();
        $user = getUser();
        $users = Database::fetchAll("SELECT u.*, up.phone, up.apartment FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id ORDER BY u.created_at DESC");
        echo view('admin/users', [
            'basePath' => '/',
            'user' => $user,
            'users' => $users,
            'profile' => getUserProfile(),
            'currentRoute' => '/admin/users',
        ]);
    }

    public function editUser($id)
    {
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
        $requests = Database::fetchAll("SELECT r.*, u.name as user_name, u.email as user_email FROM service_requests r LEFT JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC");
        echo view('admin/requests', [
            'basePath' => '/',
            'user' => $user,
            'requests' => $requests,
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
        $bills = Database::fetchAll("SELECT b.*, u.name as user_name, u.email as user_email FROM maintenance_bills b LEFT JOIN users u ON b.user_id = u.id ORDER BY b.created_at DESC");
        echo view('admin/bills', [
            'basePath' => '/',
            'user' => $user,
            'bills' => $bills,
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
