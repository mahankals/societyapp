<?php
/**
 * Tenant / Resident Controller
 * Handles resident functionality: multi-flat summary, dues breakdown,
 * 1-click UPI payments, receipts ledger, resident directory, and profile.
 */

require_once APP_PATH . '/core/Database.php';
require_once APP_PATH . '/core/Session.php';
require_once APP_PATH . '/core/helpers.php';

class ResidentController
{
    public function index()
    {
        requireLogin();
        $user = getUser();
        $flash = Session::getFlash();
        $userId = (int)Session::get('user_id');
        $profile = $user;

        // 1. Fetch all flats linked to this resident (Society Mitra multi-society / multi-flat core)
        $myFlats = Database::fetchAll("
            SELECT sm.*, 
                   f.flat_no, f.wing, f.floor, f.area_sqft, f.flat_type,
                   s.id as society_id, s.name as society_name, s.society_code, s.upi_id, s.payee_name
            FROM society_members sm
            JOIN societies s ON sm.society_id = s.id
            LEFT JOIN flats f ON sm.flat_id = f.id
            WHERE sm.user_id = ? AND sm.status IN ('active', 'pending')
            ORDER BY sm.status ASC, s.name ASC
        ", [$userId]);

        // Check if user has any committee role
        $isCommittee = false;
        foreach ($myFlats as $mf) {
            if ($mf['status'] === 'active' && in_array($mf['role'], ['chairman', 'secretary', 'treasurer', 'committee'])) {
                $isCommittee = true;
                break;
            }
        }
        if ($user['role'] === 'admin') {
            $isCommittee = true;
        }

        // 2. Fetch outstanding dues & receipts
        $unpaidBills = Database::fetchOne("
            SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
            FROM maintenance_bills 
            WHERE user_id = ? AND status IN ('pending', 'overdue')
        ", [$userId]);

        $recentBills = Database::fetchAll("
            SELECT mb.*, s.name as society_name, s.upi_id, s.payee_name, f.flat_no, f.wing
            FROM maintenance_bills mb
            LEFT JOIN societies s ON mb.society_id = s.id
            LEFT JOIN flats f ON mb.flat_id = f.id
            WHERE mb.user_id = ?
            ORDER BY mb.created_at DESC LIMIT 5
        ", [$userId]);

        $recentReceipts = Database::fetchAll("
            SELECT t.*, s.name as society_name, f.flat_no, f.wing
            FROM transactions t
            LEFT JOIN societies s ON t.society_id = s.id
            LEFT JOIN flats f ON t.flat_id = f.id
            WHERE t.user_id = ?
            ORDER BY t.created_at DESC LIMIT 5
        ", [$userId]);

        $unreadCount = Database::fetchOne(
            "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
            [$userId]
        )['count'] ?? 0;

        $profileComplete = 0;
        if ($profile) {
            $fields = ['phone', 'address', 'apartment', 'emergency_contact_name', 'emergency_contact_phone'];
            $filled = 0;
            foreach ($fields as $field) {
                if (!empty($profile[$field])) $filled++;
            }
            $profileComplete = round(($filled / count($fields)) * 100);
        }

        echo view('resident/index', [
            'basePath' => '/',
            'user' => $user,
            'flash' => $flash,
            'myFlats' => $myFlats,
            'isCommittee' => $isCommittee,
            'unreadNotifications' => $unreadCount,
            'profile' => $profile,
            'unpaidBillsCount' => $unpaidBills['count'] ?? 0,
            'unpaidBillsTotal' => $unpaidBills['total'] ?? 0,
            'recentBills' => $recentBills,
            'recentReceipts' => $recentReceipts,
            'profileComplete' => $profileComplete,
            'currentRoute' => '/resident',
        ]);
    }

    /**
     * Maintenance Bills & UPI Pay
     */
    public function bills()
    {
        requireLogin();
        $user = getUser();
        $userId = (int)Session::get('user_id');

        $bills = Database::fetchAll("
            SELECT mb.*, 
                   s.name as society_name, s.upi_id, s.payee_name,
                   f.flat_no, f.wing
            FROM maintenance_bills mb
            LEFT JOIN societies s ON mb.society_id = s.id
            LEFT JOIN flats f ON mb.flat_id = f.id
            WHERE mb.user_id = ?
            ORDER BY mb.status ASC, mb.due_date DESC
        ", [$userId]);

        $profile = $user;

        echo view('resident/bills', [
            'basePath' => '/',
            'user' => $user,
            'bills' => $bills,
            'profile' => $profile,
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
            'currentRoute' => '/resident/bills',
        ]);
    }

    /**
     * Record Bill Payment (UPI reference or manual record)
     */
    public function recordPayment(int $billId)
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid token.');
            redirect('/resident/bills');
        }

        $bill = Database::fetchOne("SELECT * FROM maintenance_bills WHERE id = ? AND user_id = ?", [$billId, $userId]);
        if (!$bill) {
            Session::flash('error', 'Bill not found.');
            redirect('/resident/bills');
        }

        $method = trim($_POST['payment_method'] ?? 'upi');
        $txnRef = trim($_POST['transaction_ref'] ?? 'UPI-' . strtoupper(bin2hex(random_bytes(4))));

        // Update bill status
        Database::update('maintenance_bills', [
            'status' => 'paid',
            'paid_at' => date('Y-m-d H:i:s'),
            'payment_method' => $method,
            'transaction_id' => $txnRef,
        ], 'id = ?', [$billId]);

        // Generate formal receipt
        $receiptNo = 'REC-' . date('Y') . '-' . str_pad($billId, 5, '0', STR_PAD_LEFT);
        Database::insert('transactions', [
            'receipt_no' => $receiptNo,
            'society_id' => $bill['society_id'] ?: 1,
            'flat_id' => $bill['flat_id'],
            'user_id' => $userId,
            'bill_id' => $billId,
            'amount' => $bill['amount'],
            'payment_method' => $method,
            'transaction_ref' => $txnRef,
            'particulars' => $bill['title'] . ' (' . ($bill['particulars'] ?: $bill['month']) . ')',
            'payment_date' => date('Y-m-d'),
            'status' => 'completed',
        ]);

        Session::flash('success', "Payment recorded successfully! Receipt #{$receiptNo} generated.");
        redirect('/resident/receipts');
    }

    /**
     * Receipts Ledger
     */
    public function receipts()
    {
        requireLogin();
        $user = getUser();
        $userId = (int)Session::get('user_id');

        $receipts = Database::fetchAll("
            SELECT t.*, s.name as society_name, s.registration_no, s.address as society_address,
                   f.flat_no, f.wing
            FROM transactions t
            LEFT JOIN societies s ON t.society_id = s.id
            LEFT JOIN flats f ON t.flat_id = f.id
            WHERE t.user_id = ?
            ORDER BY t.payment_date DESC, t.id DESC
        ", [$userId]);

        $profile = $user;

        echo view('resident/receipts', [
            'basePath' => '/',
            'user' => $user,
            'receipts' => $receipts,
            'profile' => $profile,
            'flash' => Session::getFlash(),
            'currentRoute' => '/resident/receipts',
        ]);
    }

    /**
     * Printable Receipt Voucher
     */
    public function viewReceipt(int $id)
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        $receipt = Database::fetchOne("
            SELECT t.*, 
                   u.name as member_name, u.email as member_email, u.phone as member_phone,
                   s.name as society_name, s.registration_no, s.address as society_address, s.city as society_city, s.upi_id,
                   f.flat_no, f.wing, f.area_sqft
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            LEFT JOIN societies s ON t.society_id = s.id
            LEFT JOIN flats f ON t.flat_id = f.id
            WHERE t.id = ? AND (t.user_id = ? OR EXISTS (SELECT 1 FROM users WHERE id = ? AND role = 'admin'))
        ", [$id, $userId, $userId]);


        if (!$receipt) {
            http_response_code(404);
            echo view('errors/404', ['basePath' => '/', 'message' => 'Receipt not found.']);
            exit;
        }

        echo view('resident/receipt-view', [
            'basePath' => '/',
            'receipt' => $receipt,
        ]);
    }

    /**
     * Society Resident Directory (Contacts tab in Society Mitra)
     */
    public function directory()
    {
        requireLogin();
        $user = getUser();
        $userId = (int)Session::get('user_id');

        // Find primary society of resident
        $socMember = Database::fetchOne("SELECT society_id FROM society_members WHERE user_id = ? AND status = 'active' LIMIT 1", [$userId]);
        $societyId = $socMember ? (int)$socMember['society_id'] : (int)(Database::fetchOne("SELECT id FROM societies ORDER BY id ASC LIMIT 1")['id'] ?? 1);

        $society = Database::fetchOne("SELECT * FROM societies WHERE id = ?", [$societyId]);

        $search = trim($_GET['q'] ?? '');
        $params = [$societyId];
        $searchSql = "";
        if (!empty($search)) {
            $searchSql = "AND (u.name LIKE ? OR u.phone LIKE ? OR f.flat_no LIKE ? OR f.wing LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        $residents = Database::fetchAll("
            SELECT u.id as user_id, u.name, u.email, u.phone, u.profile_photo,
                   sm.role as member_role, sm.ownership_type,
                   f.flat_no, f.wing, f.floor
            FROM society_members sm
            JOIN users u ON sm.user_id = u.id
            LEFT JOIN flats f ON sm.flat_id = f.id
            WHERE sm.society_id = ? AND sm.status = 'active' {$searchSql}
            ORDER BY f.wing ASC, f.flat_no ASC, u.name ASC
        ", $params);

        echo view('resident/directory', [
            'basePath' => '/',
            'user' => $user,
            'society' => $society,
            'residents' => $residents,
            'search' => $search,
            'profile' => $user,
            'currentRoute' => '/resident/directory',
        ]);
    }

    /**
     * Link Flat / Request to join flat
     */
    public function linkFlat()
    {
        requireLogin();
        $user = getUser();
        $userId = (int)Session::get('user_id');

        $societies = Database::fetchAll("SELECT * FROM societies ORDER BY name ASC");

        $selectedSocietyId = (int)($_GET['society_id'] ?? ($societies[0]['id'] ?? 1));

        $vacantFlats = Database::fetchAll("
            SELECT f.* FROM flats f
            LEFT JOIN society_members sm ON f.id = sm.flat_id AND sm.status = 'active'
            WHERE f.society_id = ? AND sm.id IS NULL
            ORDER BY f.wing ASC, f.flat_no ASC
        ", [$selectedSocietyId]);

        echo view('resident/link-flat', [
            'basePath' => '/',
            'user' => $user,
            'societies' => $societies,
            'selectedSocietyId' => $selectedSocietyId,
            'vacantFlats' => $vacantFlats,
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
            'profile' => $user,
            'currentRoute' => '/resident/link-flat',
        ]);
    }

    /**
     * Handle Link Flat submission
     */
    public function handleLinkFlat()
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid token.');
            redirect('/resident/link-flat');
        }

        $societyId = (int)($_POST['society_id'] ?? 0);
        $flatId = (int)($_POST['flat_id'] ?? 0);
        $role = trim($_POST['role'] ?? 'owner');

        if (empty($societyId) || empty($flatId)) {
            Session::flash('error', 'Please select both society and flat.');
            redirect('/resident/link-flat');
        }

        $existing = Database::fetchOne("SELECT id, status FROM society_members WHERE society_id = ? AND flat_id = ? AND user_id = ?", [$societyId, $flatId, $userId]);
        if ($existing) {
            Session::flash('info', 'You already have a request or active membership for this flat.');
            redirect('/resident');
        }

        Database::insert('society_members', [
            'society_id' => $societyId,
            'flat_id' => $flatId,
            'user_id' => $userId,
            'role' => $role === 'tenant' ? 'tenant' : 'owner',
            'status' => 'pending',
            'ownership_type' => $role === 'tenant' ? 'tenant' : 'owner',
        ]);

        Session::flash('success', 'Your flat linking request has been submitted to the managing committee.');
        redirect('/resident');
    }

    /**
     * Profile Photo Upload with Crop
     */
    public function uploadPhoto()
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid token.');
            redirect('/resident/profile');
        }

        if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
            Session::flash('error', 'Please select a valid image file.');
            redirect('/resident/profile');
        }

        $file = $_FILES['photo'];
        $allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($file['type'], $allowed)) {
            Session::flash('error', 'Only JPG, PNG, or WEBP images are allowed.');
            redirect('/resident/profile');
        }

        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'avatar_' . $userId . '_' . time() . '.' . $ext;
        $dir = ROOT_PATH . '/public/uploads/profile/';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        if (move_uploaded_file($file['tmp_name'], $dir . $filename)) {
            $webPath = '/uploads/profile/' . $filename;
            Database::query("UPDATE users SET profile_photo = ? WHERE id = ?", [$webPath, $userId]);
            Session::flash('success', 'Profile photo updated successfully!');
        } else {
            Session::flash('error', 'Failed to save photo.');
        }

        redirect('/resident/profile');
    }

    public function notifications()
    {
        requireLogin();
        $user = getUser();
        $userId = (int)Session::get('user_id');

        $notifications = Database::fetchAll(
            "SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50",
            [$userId]
        );
        $profile = $user;

        echo view('resident/notifications', [
            'basePath' => '/',
            'user' => $user,
            'notifications' => $notifications,
            'csrfToken' => generateCSRFToken(),
            'profile' => $profile,
            'currentRoute' => '/resident/notifications',
        ]);
    }

    public function markNotificationsRead()
    {
        requireLogin();
        if (verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Database::update('notifications', ['is_read' => 1], 'user_id = ? AND is_read = 0', [Session::get('user_id')]);
        }
        redirect('/resident/notifications');
    }

    public function profile()
    {
        requireLogin();
        $user = getUser();
        $userId = (int)Session::get('user_id');
        $profile = $user;

        $myFlats = Database::fetchAll("
            SELECT sm.*, f.flat_no, f.wing, s.name as society_name
            FROM society_members sm
            JOIN societies s ON sm.society_id = s.id
            LEFT JOIN flats f ON sm.flat_id = f.id
            WHERE sm.user_id = ? AND sm.status = 'active'
        ", [$userId]);

        echo view('resident/profile', [
            'basePath' => '/',
            'user' => $user,
            'profile' => $profile,
            'myFlats' => $myFlats,
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
            'currentRoute' => '/resident/profile',
        ]);
    }

    public function updateProfile()
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid request.');
            redirect('/resident/profile');
        }

        $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $phone = filter_input(INPUT_POST, 'phone', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $address = filter_input(INPUT_POST, 'address', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $apartment = filter_input(INPUT_POST, 'apartment', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $emergency_name = filter_input(INPUT_POST, 'emergency_contact_name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $emergency_phone = filter_input(INPUT_POST, 'emergency_contact_phone', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        $userData = [
            'name' => $name,
            'phone' => $phone,
            'address' => $address,
            'apartment' => $apartment,
            'emergency_contact_name' => $emergency_name,
            'emergency_contact_phone' => $emergency_phone,
        ];

        Database::update('users', $userData, 'id = ?', [$userId]);

        Session::flash('success', 'Profile updated successfully!');
        redirect('/resident/profile');
    }

    public function documents()
    {
        requireLogin();
        $user = getUser();
        $userId = (int)Session::get('user_id');

        $documents = Database::fetchAll("SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC", [$userId]);
        $profile = $user;

        echo view('resident/documents', [
            'basePath' => '/',
            'user' => $user,
            'documents' => $documents,
            'csrfToken' => generateCSRFToken(),
            'profile' => $profile,
            'flash' => Session::getFlash(),
            'currentRoute' => '/resident/documents',
        ]);
    }

    public function uploadDocument()
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid request.');
            redirect('/resident/documents');
        }

        if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
            Session::flash('error', 'Please select a file to upload.');
            redirect('/resident/documents');
        }

        $file = $_FILES['document'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];

        if (!in_array($ext, $allowed)) {
            Session::flash('error', 'Invalid file type. Allowed: PDF, JPG, PNG, DOC');
            redirect('/resident/documents');
        }

        $filename = 'doc_' . $userId . '_' . time() . '.' . $ext;
        $uploadDir = ROOT_PATH . '/public/uploads/documents/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        if (move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            Database::insert('documents', [
                'user_id' => $userId,
                'name' => basename($file['name']),
                'file_path' => '/uploads/documents/' . $filename,
                'file_size' => $file['size'],
                'file_type' => $file['type'],
                'description' => filter_input(INPUT_POST, 'description', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?: 'Document',
            ]);
            Session::flash('success', 'Document uploaded successfully!');
        } else {
            Session::flash('error', 'Failed to upload document.');
        }

        redirect('/resident/documents');
    }

    public function requests()
    {
        requireLogin();
        $user = getUser();
        $userId = (int)Session::get('user_id');

        $requests = Database::fetchAll("SELECT * FROM service_requests WHERE user_id = ? ORDER BY created_at DESC", [$userId]);
        $profile = $user;

        echo view('resident/requests', [
            'basePath' => '/',
            'user' => $user,
            'requests' => $requests,
            'csrfToken' => generateCSRFToken(),
            'profile' => $profile,
            'flash' => Session::getFlash(),
            'currentRoute' => '/resident/requests',
        ]);
    }

    public function createRequest()
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid request.');
            redirect('/resident/requests');
        }

        $category = filter_input(INPUT_POST, 'category', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $description = filter_input(INPUT_POST, 'description', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $priority = filter_input(INPUT_POST, 'priority', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?: 'medium';

        if (empty($category) || empty($description)) {
            Session::flash('error', 'Please fill in all required fields.');
            redirect('/resident/requests');
        }

        Database::insert('service_requests', [
            'user_id' => $userId,
            'category' => $category,
            'description' => $description,
            'priority' => $priority,
            'status' => 'pending',
        ]);

        Session::flash('success', 'Service request submitted successfully!');
        redirect('/resident/requests');
    }
}
