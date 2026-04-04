<?php
/**
 * Tenant Controller
 * Handles all tenant/user functionality
 */

require_once APP_PATH . '/core/Database.php';
require_once APP_PATH . '/core/Session.php';
require_once APP_PATH . '/core/helpers.php';

class TenantController
{
    public function index()
    {
        requireLogin();
        $user = getUser();
        $flash = Session::getFlash();
        
        $unreadCount = Database::fetchOne(
            "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
            [Session::get('user_id')]
        );
        
        $profile = Database::fetchOne(
            "SELECT * FROM user_profiles WHERE user_id = ?",
            [Session::get('user_id')]
        );
        
        echo view('tenant/index', [
            'basePath' => '/',
            'user' => $user,
            'flash' => $flash,
            'unreadNotifications' => $unreadCount['count'] ?? 0,
            'profile' => $profile,
            'currentRoute' => '/tenant',
        ]);
    }

    public function notifications()
    {
        requireLogin();
        $user = getUser();
        $notifications = Database::fetchAll(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            [Session::get('user_id')]
        );
        $profile = Database::fetchOne(
            "SELECT * FROM user_profiles WHERE user_id = ?",
            [Session::get('user_id')]
        );
        echo view('tenant/notifications', [
            'basePath' => '/',
            'user' => $user,
            'notifications' => $notifications,
            'csrfToken' => generateCSRFToken(),
            'profile' => $profile,
            'currentRoute' => '/tenant/notifications',
        ]);
    }

    public function markNotificationsRead()
    {
        requireLogin();
        if (verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Database::update(
                'notifications',
                ['is_read' => 1],
                'user_id = ? AND is_read = 0',
                [Session::get('user_id')]
            );
        }
        redirect('/tenant/notifications');
    }

    public function profile()
    {
        requireLogin();
        $user = getUser();
        $profile = Database::fetchOne(
            "SELECT * FROM user_profiles WHERE user_id = ?",
            [Session::get('user_id')]
        );
        echo view('tenant/profile', [
            'basePath' => '/',
            'user' => $user,
            'profile' => $profile,
            'csrfToken' => generateCSRFToken(),
            'currentRoute' => '/tenant/profile',
        ]);
    }

    public function updateProfile()
    {
        requireLogin();
        $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $phone = filter_input(INPUT_POST, 'phone', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $address = filter_input(INPUT_POST, 'address', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $apartment = filter_input(INPUT_POST, 'apartment', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $emergency_name = filter_input(INPUT_POST, 'emergency_contact_name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $emergency_phone = filter_input(INPUT_POST, 'emergency_contact_phone', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid request.');
            redirect('/tenant/profile');
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
        redirect('/tenant/profile');
    }

    public function documents()
    {
        requireLogin();
        $user = getUser();
        $documents = Database::fetchAll(
            "SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC",
            [Session::get('user_id')]
        );
        $profile = Database::fetchOne(
            "SELECT * FROM user_profiles WHERE user_id = ?",
            [Session::get('user_id')]
        );
        echo view('tenant/documents', [
            'basePath' => '/',
            'user' => $user,
            'documents' => $documents,
            'csrfToken' => generateCSRFToken(),
            'profile' => $profile,
            'currentRoute' => '/tenant/documents',
        ]);
    }

    public function bills()
    {
        requireLogin();
        $user = getUser();
        $bills = Database::fetchAll(
            "SELECT * FROM maintenance_bills WHERE user_id = ? ORDER BY created_at DESC",
            [Session::get('user_id')]
        );
        $profile = Database::fetchOne(
            "SELECT * FROM user_profiles WHERE user_id = ?",
            [Session::get('user_id')]
        );
        echo view('tenant/bills', [
            'basePath' => '/',
            'user' => $user,
            'bills' => $bills,
            'csrfToken' => generateCSRFToken(),
            'profile' => $profile,
            'currentRoute' => '/tenant/bills',
        ]);
    }

    public function requests()
    {
        requireLogin();
        $user = getUser();
        $requests = Database::fetchAll(
            "SELECT * FROM service_requests WHERE user_id = ? ORDER BY created_at DESC",
            [Session::get('user_id')]
        );
        $profile = Database::fetchOne(
            "SELECT * FROM user_profiles WHERE user_id = ?",
            [Session::get('user_id')]
        );
        echo view('tenant/requests', [
            'basePath' => '/',
            'user' => $user,
            'requests' => $requests,
            'csrfToken' => generateCSRFToken(),
            'profile' => $profile,
            'currentRoute' => '/tenant/requests',
        ]);
    }

    public function createRequest()
    {
        requireLogin();
        $category = filter_input(INPUT_POST, 'category', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $description = filter_input(INPUT_POST, 'description', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $priority = filter_input(INPUT_POST, 'priority', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?: 'medium';
        
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid request.');
            redirect('/tenant/requests');
        }
        
        if (empty($category) || empty($description)) {
            Session::flash('error', 'Please fill in all required fields.');
            redirect('/tenant/requests');
        }
        
        Database::insert('service_requests', [
            'user_id' => Session::get('user_id'),
            'category' => $category,
            'description' => $description,
            'priority' => $priority,
            'status' => 'pending',
        ]);
        
        Session::flash('success', 'Service request submitted successfully!');
        redirect('/tenant/requests');
    }
}
