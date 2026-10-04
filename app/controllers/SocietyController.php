<?php
/**
 * Society & Committee Controller
 * Manages housing societies, buildings, flats, member assignments,
 * join requests, and committee administration.
 */

require_once APP_PATH . '/core/Database.php';
require_once APP_PATH . '/core/Session.php';
require_once APP_PATH . '/core/helpers.php';

class SocietyController
{
    /**
     * Helper to verify committee access for current user
     */
    private function requireCommittee(): array
    {
        requireLogin();
        $userId = Session::get('user_id');
        $user = getUser();

        // System admin always has access
        if ($user && $user['role'] === 'admin') {
            $society = Database::fetchOne("SELECT * FROM societies ORDER BY id ASC LIMIT 1");
            return ['user' => $user, 'society' => $society, 'role' => 'admin'];
        }

        // Check if user is in committee role in society_members
        $membership = Database::fetchOne("
            SELECT sm.*, s.name as society_name, s.society_code, s.upi_id, s.payee_name
            FROM society_members sm
            JOIN societies s ON sm.society_id = s.id
            WHERE sm.user_id = ? AND sm.status = 'active'
              AND sm.role IN ('chairman', 'secretary', 'treasurer', 'committee')
            ORDER BY sm.id ASC LIMIT 1
        ", [$userId]);

        if (!$membership) {
            http_response_code(403);
            echo view('errors/403', [
                'basePath' => '/',
                'message' => 'Committee access required. You are not registered as a managing committee member.'
            ]);
            exit;
        }

        $society = Database::fetchOne("SELECT * FROM societies WHERE id = ?", [$membership['society_id']]);
        return ['user' => $user, 'society' => $society, 'membership' => $membership, 'role' => $membership['role']];
    }

    /**
     * Committee Dashboard
     */
    public function dashboard()
    {
        $auth = $this->requireCommittee();
        $society = $auth['society'];
        $user = $auth['user'];
        $societyId = (int)$society['id'];

        // Stats
        $totalFlats = Database::fetchOne("SELECT COUNT(*) as count FROM flats WHERE society_id = ?", [$societyId])['count'] ?? 0;
        $occupiedFlats = Database::fetchOne("SELECT COUNT(DISTINCT flat_id) as count FROM society_members WHERE society_id = ? AND status = 'active' AND flat_id IS NOT NULL", [$societyId])['count'] ?? 0;
        $pendingRequests = Database::fetchOne("SELECT COUNT(*) as count FROM society_members WHERE society_id = ? AND status = 'pending'", [$societyId])['count'] ?? 0;
        $totalMembers = Database::fetchOne("SELECT COUNT(DISTINCT user_id) as count FROM society_members WHERE society_id = ? AND status = 'active'", [$societyId])['count'] ?? 0;

        // Financial stats for this society
        $billsStats = Database::fetchOne("
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as totalCollected,
                COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount ELSE 0 END), 0) as totalPending,
                COALESCE(SUM(amount), 0) as totalBilled
            FROM maintenance_bills
            WHERE society_id = ?
        ", [$societyId]);

        // Recent pending join requests
        $recentRequests = Database::fetchAll("
            SELECT sm.*, u.name as user_name, u.email as user_email, u.phone as user_phone, f.flat_no, f.wing
            FROM society_members sm
            JOIN users u ON sm.user_id = u.id
            LEFT JOIN flats f ON sm.flat_id = f.id
            WHERE sm.society_id = ? AND sm.status = 'pending'
            ORDER BY sm.created_at DESC LIMIT 5
        ", [$societyId]);

        // Recent flats
        $flats = Database::fetchAll("
            SELECT f.*, 
                   u.name as member_name, 
                   sm.role as member_role,
                   sm.status as member_status
            FROM flats f
            LEFT JOIN society_members sm ON f.id = sm.flat_id AND sm.status = 'active'
            LEFT JOIN users u ON sm.user_id = u.id
            WHERE f.society_id = ?
            ORDER BY f.wing ASC, f.flat_no ASC
            LIMIT 10
        ", [$societyId]);

        echo view('committee/dashboard', [
            'basePath' => '/',
            'user' => $user,
            'society' => $society,
            'totalFlats' => $totalFlats,
            'occupiedFlats' => $occupiedFlats,
            'pendingRequests' => $pendingRequests,
            'totalMembers' => $totalMembers,
            'billsStats' => $billsStats,
            'recentRequests' => $recentRequests,
            'flats' => $flats,
            'flash' => Session::getFlash(),
            'shareUrl' => (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'societyapp.ddev.site') . '/join/' . $society['society_code'],
        ]);
    }

    /**
     * Manage Flats
     */
    public function flats()
    {
        $auth = $this->requireCommittee();
        $society = $auth['society'];
        $societyId = (int)$society['id'];

        $flats = Database::fetchAll("
            SELECT f.*, 
                   u.id as user_id,
                   u.name as member_name, 
                   u.email as member_email,
                   u.phone as member_phone,
                   sm.id as membership_id,
                   sm.role as member_role,
                   sm.status as member_status
            FROM flats f
            LEFT JOIN society_members sm ON f.id = sm.flat_id AND sm.status = 'active'
            LEFT JOIN users u ON sm.user_id = u.id
            WHERE f.society_id = ?
            ORDER BY f.wing ASC, f.flat_no ASC
        ", [$societyId]);

        echo view('committee/flats', [
            'basePath' => '/',
            'user' => $auth['user'],
            'society' => $society,
            'flats' => $flats,
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
        ]);
    }

    /**
     * Add new flat
     */
    public function addFlat()
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/committee/flats');
        }

        $flatNo = trim($_POST['flat_no'] ?? '');
        $wing = trim($_POST['wing'] ?? 'A');
        $floor = trim($_POST['floor'] ?? '');
        $area = (float)($_POST['area_sqft'] ?? 0);
        $type = trim($_POST['flat_type'] ?? '2BHK');

        if (empty($flatNo)) {
            Session::flash('error', 'Flat number is required.');
            redirect('/committee/flats');
        }

        $exists = Database::fetchOne("SELECT id FROM flats WHERE society_id = ? AND flat_no = ? AND wing = ?", [$societyId, $flatNo, $wing]);
        if ($exists) {
            Session::flash('error', "Flat {$wing}-{$flatNo} already exists in this society.");
            redirect('/committee/flats');
        }

        Database::insert('flats', [
            'society_id' => $societyId,
            'flat_no' => $flatNo,
            'wing' => $wing,
            'floor' => $floor,
            'area_sqft' => $area,
            'flat_type' => $type,
        ]);

        Session::flash('success', "Flat {$wing}-{$flatNo} added successfully.");
        redirect('/committee/flats');
    }

    /**
     * Delete flat
     */
    public function deleteFlat(int $id)
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        Database::delete('flats', 'id = ? AND society_id = ?', [$id, $societyId]);
        Session::flash('success', 'Flat removed successfully.');
        redirect('/committee/flats');
    }

    /**
     * Manage Members
     */
    public function members()
    {
        $auth = $this->requireCommittee();
        $society = $auth['society'];
        $societyId = (int)$society['id'];

        $members = Database::fetchAll("
            SELECT sm.*, 
                   u.name as member_name, 
                   u.email as member_email, 
                   u.phone as member_phone,
                   f.flat_no, f.wing, f.area_sqft
            FROM society_members sm
            JOIN users u ON sm.user_id = u.id
            LEFT JOIN flats f ON sm.flat_id = f.id
            WHERE sm.society_id = ?
            ORDER BY sm.status ASC, f.wing ASC, f.flat_no ASC
        ", [$societyId]);

        // Vacant flats for manual assignment dropdown
        $vacantFlats = Database::fetchAll("
            SELECT f.* FROM flats f
            LEFT JOIN society_members sm ON f.id = sm.flat_id AND sm.status = 'active'
            WHERE f.society_id = ? AND sm.id IS NULL
            ORDER BY f.wing ASC, f.flat_no ASC
        ", [$societyId]);

        echo view('committee/members', [
            'basePath' => '/',
            'user' => $auth['user'],
            'society' => $society,
            'members' => $members,
            'vacantFlats' => $vacantFlats,
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
        ]);
    }

    /**
     * Assign member to flat by email or mobile
     */
    public function assignMember()
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid token.');
            redirect('/committee/members');
        }

        $identifier = trim($_POST['user_identifier'] ?? '');
        $flatId = (int)($_POST['flat_id'] ?? 0);
        $role = trim($_POST['role'] ?? 'owner');

        if (empty($identifier) || empty($flatId)) {
            Session::flash('error', 'User email/mobile and flat selection are required.');
            redirect('/committee/members');
        }

        // Find user by email or phone
        $user = Database::fetchOne("SELECT id, name, email FROM users WHERE email = ? OR phone = ?", [$identifier, $identifier]);
        if (!$user) {
            Session::flash('error', "No user found with email or phone '{$identifier}'. They must create an account first.");
            redirect('/committee/members');
        }

        $userId = (int)$user['id'];

        // Assign or update
        $existing = Database::fetchOne("SELECT id FROM society_members WHERE society_id = ? AND user_id = ? AND flat_id = ?", [$societyId, $userId, $flatId]);
        if ($existing) {
            Database::update('society_members', ['role' => $role, 'status' => 'active'], 'id = ?', [$existing['id']]);
        } else {
            Database::insert('society_members', [
                'society_id' => $societyId,
                'flat_id' => $flatId,
                'user_id' => $userId,
                'role' => $role,
                'status' => 'active',
                'ownership_type' => $role === 'tenant' ? 'tenant' : 'owner',
                'approved_at' => date('Y-m-d H:i:s'),
                'approved_by' => Session::get('user_id'),
            ]);
        }

        Session::flash('success', "{$user['name']} has been successfully assigned to the flat.");
        redirect('/committee/members');
    }

    /**
     * Unlink member from flat
     */
    public function unlinkMember(int $id)
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        Database::update('society_members', ['status' => 'unlinked', 'flat_id' => null], 'id = ? AND society_id = ?', [$id, $societyId]);
        Session::flash('success', 'Member unlinked from flat.');
        redirect('/committee/members');
    }

    /**
     * Pending join requests
     */
    public function requests()
    {
        $auth = $this->requireCommittee();
        $society = $auth['society'];
        $societyId = (int)$society['id'];

        $requests = Database::fetchAll("
            SELECT sm.*, 
                   u.name as user_name, 
                   u.email as user_email, 
                   u.phone as user_phone,
                   f.flat_no, f.wing, f.area_sqft
            FROM society_members sm
            JOIN users u ON sm.user_id = u.id
            LEFT JOIN flats f ON sm.flat_id = f.id
            WHERE sm.society_id = ? AND sm.status = 'pending'
            ORDER BY sm.created_at ASC
        ", [$societyId]);

        echo view('committee/requests', [
            'basePath' => '/',
            'user' => $auth['user'],
            'society' => $society,
            'requests' => $requests,
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
        ]);
    }

    /**
     * Approve join request
     */
    public function approveRequest(int $id)
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        Database::update('society_members', [
            'status' => 'active',
            'approved_by' => Session::get('user_id'),
            'approved_at' => date('Y-m-d H:i:s'),
        ], 'id = ? AND society_id = ?', [$id, $societyId]);

        Session::flash('success', 'Join request approved.');
        redirect('/committee/requests');
    }

    /**
     * Reject join request
     */
    public function rejectRequest(int $id)
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        Database::update('society_members', [
            'status' => 'rejected'
        ], 'id = ? AND society_id = ?', [$id, $societyId]);

        Session::flash('success', 'Join request rejected.');
        redirect('/committee/requests');
    }

    /**
     * Public Share / Join Society Page
     */
    public function publicJoin(string $code)
    {
        $code = strtoupper(trim($code));
        $society = Database::fetchOne("SELECT * FROM societies WHERE society_code = ?", [$code]);

        if (!$society) {
            http_response_code(404);
            echo view('errors/404', [
                'basePath' => '/',
                'message' => 'Invalid society invite code. Please check your invitation link.'
            ]);
            exit;
        }

        // Available vacant flats
        $flats = Database::fetchAll("
            SELECT f.* FROM flats f
            LEFT JOIN society_members sm ON f.id = sm.flat_id AND sm.status = 'active'
            WHERE f.society_id = ? AND sm.id IS NULL
            ORDER BY f.wing ASC, f.flat_no ASC
        ", [$society['id']]);

        $user = getUser();

        echo view('pages/join', [
            'basePath' => '/',
            'society' => $society,
            'flats' => $flats,
            'user' => $user,
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
        ]);
    }

    /**
     * Handle Public Join Submission
     */
    public function handleJoin(string $code)
    {
        $code = strtoupper(trim($code));
        $society = Database::fetchOne("SELECT * FROM societies WHERE society_code = ?", [$code]);

        if (!$society) {
            redirect('/');
        }

        requireLogin();
        $userId = Session::get('user_id');
        $societyId = (int)$society['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid token.');
            redirect('/join/' . $code);
        }

        $flatId = (int)($_POST['flat_id'] ?? 0);
        $role = trim($_POST['role'] ?? 'owner');

        if (empty($flatId)) {
            Session::flash('error', 'Please select a flat to join.');
            redirect('/join/' . $code);
        }

        // Check if already requested or member
        $existing = Database::fetchOne("SELECT * FROM society_members WHERE society_id = ? AND user_id = ? AND flat_id = ?", [$societyId, $userId, $flatId]);
        if ($existing) {
            if ($existing['status'] === 'active') {
                Session::flash('info', 'You are already an active member of this flat.');
            } else {
                Session::flash('info', 'Your request to join this flat is currently pending committee approval.');
            }
            redirect('/tenant');
        }

        Database::insert('society_members', [
            'society_id' => $societyId,
            'flat_id' => $flatId,
            'user_id' => $userId,
            'role' => $role === 'tenant' ? 'tenant' : 'owner',
            'status' => 'pending',
            'ownership_type' => $role === 'tenant' ? 'tenant' : 'owner',
        ]);

        Session::flash('success', 'Your request to join has been sent to the managing committee for approval.');
        redirect('/tenant');
    }

    /**
     * Contribute / Add Society ("Contribute" page in Society Mitra)
     */
    public function contribute()
    {
        requireLogin();
        $user = getUser();

        echo view('pages/contribute', [
            'basePath' => '/',
            'user' => $user,
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
        ]);
    }

    /**
     * Handle Contribute / Add Society Submission
     */
    public function handleContribute()
    {
        requireLogin();
        $userId = Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid request token.');
            redirect('/society/contribute');
        }

        $name = trim($_POST['society_name'] ?? '');
        $city = trim($_POST['city'] ?? '');
        $address = trim($_POST['address'] ?? '');

        if (empty($name) || empty($city)) {
            Session::flash('error', 'Society name and city are required.');
            redirect('/society/contribute');
        }

        Database::insert('society_requests', [
            'user_id' => $userId,
            'society_name' => $name,
            'city' => $city,
            'address' => $address,
            'contact1_name' => trim($_POST['c1_name'] ?? ''),
            'contact1_phone' => trim($_POST['c1_phone'] ?? ''),
            'contact1_flat' => trim($_POST['c1_flat'] ?? ''),
            'contact2_name' => trim($_POST['c2_name'] ?? ''),
            'contact2_phone' => trim($_POST['c2_phone'] ?? ''),
            'contact2_flat' => trim($_POST['c2_flat'] ?? ''),
            'contact3_name' => trim($_POST['c3_name'] ?? ''),
            'contact3_phone' => trim($_POST['c3_phone'] ?? ''),
            'contact3_flat' => trim($_POST['c3_flat'] ?? ''),
            'contact4_name' => trim($_POST['c4_name'] ?? ''),
            'contact4_phone' => trim($_POST['c4_phone'] ?? ''),
            'contact4_flat' => trim($_POST['c4_flat'] ?? ''),
            'status' => 'pending',
        ]);

        Session::flash('success', 'Society proposal submitted successfully! Our team and committee will review your submission.');
        redirect('/tenant');
    }
}
