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
            if (!$society) {
                $appName = getSetting('app_name', 'Society App') ?: 'Society App';
                $cleanName = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $appName));
                $code = 'SOC-' . (strlen($cleanName) >= 4 ? substr($cleanName, 0, 4) : 'MAIN') . '1';
                $societyId = Database::insert('societies', [
                    'name' => $appName,
                    'society_code' => $code,
                    'address' => 'Main Campus',
                    'city' => 'Metro',
                    'state' => 'State',
                ]);
                $society = Database::fetchOne("SELECT * FROM societies WHERE id = ?", [$societyId]);
            }
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

        // Real-time Society Balance Summary (In Hand & Deposits)
        $balanceSummary = $this->getSocietyBalanceSummary($societyId);

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
            'balanceSummary' => $balanceSummary,
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
            redirect('/comitee/flats');
        }

        $flatNo = trim($_POST['flat_no'] ?? '');
        $wing = trim($_POST['wing'] ?? 'A');
        $floor = trim($_POST['floor'] ?? '');
        $area = (float)($_POST['area_sqft'] ?? 0);
        $type = trim($_POST['flat_type'] ?? '2BHK');
        $isForRent = !empty($_POST['is_for_rent']) ? 1 : 0;
        $action = trim($_POST['action'] ?? 'save');

        if (empty($flatNo)) {
            Session::flash('error', 'Flat number is required.');
            redirect('/comitee/flats');
        }

        $exists = Database::fetchOne("SELECT id FROM flats WHERE society_id = ? AND flat_no = ? AND wing = ?", [$societyId, $flatNo, $wing]);
        if ($exists) {
            Session::flash('error', "Flat {$wing}-{$flatNo} already exists in this society.");
            redirect('/comitee/flats' . ($action === 'save_and_add_more' ? '?add_more=1' : ''));
        }

        Database::insert('flats', [
            'society_id' => $societyId,
            'flat_no' => $flatNo,
            'wing' => $wing,
            'floor' => $floor,
            'area_sqft' => $area,
            'flat_type' => $type,
            'is_for_rent' => $isForRent,
        ]);

        Session::flash('success', "Flat {$wing}-{$flatNo} added successfully.");

        if ($action === 'save_and_add_more') {
            $params = http_build_query([
                'add_more' => 1,
                'wing' => $wing,
                'floor' => $floor,
                'area_sqft' => $area,
                'flat_type' => $type,
            ]);
            redirect('/comitee/flats?' . $params);
        }

        redirect('/comitee/flats');
    }

    /**
     * Update existing flat
     */
    public function updateFlat(int $id)
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/flats');
        }

        $flat = Database::fetchOne("SELECT id FROM flats WHERE id = ? AND society_id = ?", [$id, $societyId]);
        if (!$flat) {
            Session::flash('error', 'Flat not found.');
            redirect('/comitee/flats');
        }

        $flatNo = trim($_POST['flat_no'] ?? '');
        $wing = trim($_POST['wing'] ?? 'A');
        $floor = trim($_POST['floor'] ?? '');
        $area = (float)($_POST['area_sqft'] ?? 0);
        $type = trim($_POST['flat_type'] ?? '2BHK');
        $isForRent = !empty($_POST['is_for_rent']) ? 1 : 0;

        if (empty($flatNo)) {
            Session::flash('error', 'Flat number is required.');
            redirect('/comitee/flats');
        }

        $exists = Database::fetchOne(
            "SELECT id FROM flats WHERE society_id = ? AND flat_no = ? AND wing = ? AND id != ?",
            [$societyId, $flatNo, $wing, $id]
        );
        if ($exists) {
            Session::flash('error', "Another flat with {$wing}-{$flatNo} already exists in this society.");
            redirect('/comitee/flats');
        }

        Database::update('flats', [
            'flat_no' => $flatNo,
            'wing' => $wing,
            'floor' => $floor,
            'area_sqft' => $area,
            'flat_type' => $type,
            'is_for_rent' => $isForRent,
        ], 'id = ? AND society_id = ?', [$id, $societyId]);

        Session::flash('success', "Flat {$wing}-{$flatNo} updated successfully.");
        redirect('/comitee/flats');
    }

    /**
     * Toggle flat rent availability
     */
    public function toggleFlatRent(int $id)
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/flats');
        }

        $flat = Database::fetchOne("SELECT id, wing, flat_no, is_for_rent FROM flats WHERE id = ? AND society_id = ?", [$id, $societyId]);
        if (!$flat) {
            Session::flash('error', 'Flat not found.');
            redirect('/comitee/flats');
        }

        $newStatus = $flat['is_for_rent'] ? 0 : 1;
        Database::update('flats', ['is_for_rent' => $newStatus], 'id = ? AND society_id = ?', [$id, $societyId]);

        Session::flash('success', "Flat {$flat['wing']}-{$flat['flat_no']} rental status updated to " . ($newStatus ? 'Available for Rent' : 'Not for Rent') . ".");
        redirect('/comitee/flats');
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
        redirect('/comitee/flats');
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

        // Available registered users for dropdown selection
        $availableUsers = Database::fetchAll("
            SELECT id, name, email, phone 
            FROM users 
            ORDER BY name ASC
        ");

        echo view('committee/members', [
            'basePath' => '/',
            'user' => $auth['user'],
            'society' => $society,
            'members' => $members,
            'vacantFlats' => $vacantFlats,
            'availableUsers' => $availableUsers,
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
        ]);
    }

    /**
     * Assign member to flat by user selection, email, or mobile
     */
    public function assignMember()
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token. Please refresh and try again.');
            redirect('/comitee/members');
        }

        $userId = (int)($_POST['user_id'] ?? 0);
        $identifier = trim($_POST['user_identifier'] ?? '');
        $memberNameInput = trim($_POST['member_name'] ?? '');
        $flatId = (int)($_POST['flat_id'] ?? 0);
        $role = trim($_POST['role'] ?? 'owner');

        if (empty($flatId)) {
            Session::flash('error', 'Please select a flat to assign.');
            redirect('/comitee/members');
        }

        $user = null;

        // 1. If user_id was chosen directly from dropdown
        if ($userId > 0) {
            $user = Database::fetchOne("SELECT id, name, email FROM users WHERE id = ?", [$userId]);
            if (!$user) {
                Session::flash('error', 'Selected user account does not exist.');
                redirect('/comitee/members');
            }
        } elseif (!empty($identifier) || !empty($memberNameInput)) {
            // 2. Either an identifier (email/phone) or manual member name was entered
            if (!empty($identifier)) {
                $user = Database::fetchOne(
                    "SELECT id, name, email FROM users WHERE email = ? OR phone = ?",
                    [$identifier, $identifier]
                );
            }

            // If user doesn't exist yet in the database, automatically create one so they can be assigned!
            if (!$user) {
                $isEmail = filter_var($identifier, FILTER_VALIDATE_EMAIL);
                $cleanDigits = preg_replace('/[^0-9]/', '', $identifier);
                $isPhone = strlen($cleanDigits) >= 7;

                $email = $isEmail ? strtolower($identifier) : null;
                $phone = $isPhone ? $identifier : null;

                // If identifier was neither a valid email nor a phone, it might be a name
                if (!$email && !$phone && empty($memberNameInput)) {
                    $memberNameInput = $identifier;
                }

                // If no email was provided, generate a unique system placeholder email
                if (!$email) {
                    if ($phone) {
                        $email = 'resident.' . $cleanDigits . '@society.local';
                    } else {
                        $cleanSlug = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $memberNameInput ?: 'resident'));
                        $email = $cleanSlug . '.' . time() . '@society.local';
                    }

                    $c = 1;
                    $baseEmail = $email;
                    while (Database::fetchOne("SELECT id FROM users WHERE email = ?", [$email])) {
                        $email = str_replace('@society.local', '.' . $c . '@society.local', $baseEmail);
                        $c++;
                    }
                }

                // Check if this email already exists in users
                $existingEmailUser = Database::fetchOne("SELECT id, name, email FROM users WHERE email = ?", [$email]);
                if ($existingEmailUser) {
                    $user = $existingEmailUser;
                    $userId = (int)$user['id'];
                } else {
                    $memberName = !empty($memberNameInput) ? $memberNameInput : ($isEmail ? explode('@', $identifier)[0] : 'Resident ' . ($phone ?: ''));
                    $memberName = ucwords(trim($memberName));

                    $newUserId = Database::insert('users', [
                        'name' => $memberName,
                        'email' => $email,
                        'phone' => $phone,
                        'role' => 'resident',
                        'password_hash' => null,
                        'is_active' => 1,
                        'created_at' => date('Y-m-d H:i:s'),
                    ]);

                    $userId = (int)$newUserId;
                    $user = [
                        'id' => $userId,
                        'name' => $memberName,
                        'email' => $email,
                    ];
                }
            } else {
                $userId = (int)$user['id'];
            }
        } else {
            Session::flash('error', 'Please select a registered user or enter member details.');
            redirect('/comitee/members');
        }

        // Assign or update flat assignment
        $existing = Database::fetchOne(
            "SELECT id FROM society_members WHERE society_id = ? AND user_id = ? AND flat_id = ?",
            [$societyId, $userId, $flatId]
        );

        if ($existing) {
            Database::update('society_members', [
                'role' => $role,
                'status' => 'active',
                'ownership_type' => $role === 'tenant' ? 'tenant' : 'owner'
            ], 'id = ?', [$existing['id']]);
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

        // Fetch flat info for rich message
        $flat = Database::fetchOne("SELECT wing, flat_no FROM flats WHERE id = ?", [$flatId]);
        $flatLabel = $flat ? "Flat {$flat['wing']}-{$flat['flat_no']}" : "the flat";

        Session::flash('success', "{$user['name']} has been successfully assigned to {$flatLabel}.");
        redirect('/comitee/members');
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
        redirect('/comitee/members');
    }

    /**
     * Update Committee Role for Society Member
     * Only flat owners can be assigned committee roles.
     */
    public function updateMemberRole(int $id)
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/members');
        }

        $membership = Database::fetchOne("
            SELECT sm.*, u.name as member_name 
            FROM society_members sm 
            JOIN users u ON sm.user_id = u.id 
            WHERE sm.id = ? AND sm.society_id = ?
        ", [$id, $societyId]);

        if (!$membership) {
            Session::flash('error', 'Member record not found.');
            redirect('/comitee/members');
        }

        $newRole = trim($_POST['role'] ?? 'owner');
        $validRoles = ['chairman', 'secretary', 'treasurer', 'committee', 'owner'];
        if (!in_array($newRole, $validRoles)) {
            $newRole = 'owner';
        }

        // Enforce rule: Only flat owners can be assigned committee roles!
        if (in_array($newRole, ['chairman', 'secretary', 'treasurer', 'committee'])) {
            if ($membership['ownership_type'] === 'tenant' || $membership['role'] === 'tenant') {
                Session::flash('error', 'Only flat owners can be assigned managing committee roles.');
                redirect('/comitee/members');
            }
        }

        Database::update('society_members', [
            'role' => $newRole,
        ], 'id = ?', [$id]);

        // Sync users table role
        if (in_array($newRole, ['chairman', 'secretary', 'treasurer', 'committee'])) {
            Database::query("UPDATE users SET role = 'committee' WHERE id = ? AND role = 'resident'", [$membership['user_id']]);
        } else {
            $otherPositions = Database::fetchOne("
                SELECT id FROM society_members 
                WHERE user_id = ? AND status = 'active' AND role IN ('chairman', 'secretary', 'treasurer', 'committee')
            ", [$membership['user_id']]);
            if (!$otherPositions) {
                Database::query("UPDATE users SET role = 'resident' WHERE id = ? AND role = 'committee'", [$membership['user_id']]);
            }
        }

        Session::flash('success', "Updated role for {$membership['member_name']} to " . ucfirst($newRole) . ".");
        redirect('/comitee/members');
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
        redirect('/comitee/requests');
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
        redirect('/comitee/requests');
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

        Session::flash('success', 'Your request to join has been sent to the managing committee for approval.');
        redirect('/resident');
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
            'state' => trim($_POST['state'] ?? 'Maharashtra'),
            'pincode' => trim($_POST['pincode'] ?? ''),
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
        redirect('/resident');
    }

    /**
     * Society Maintenance Bills (Committee Level)
     */
    public function bills()
    {
        $auth = $this->requireCommittee();
        $society = $auth['society'];
        $societyId = (int)$society['id'];

        $statusFilter = trim($_GET['status'] ?? '');
        $where = ['b.society_id = ?'];
        $params = [$societyId];

        if ($statusFilter === 'rejected') {
            $where[] = "(b.status = 'rejected' OR EXISTS (SELECT 1 FROM transactions t WHERE t.bill_id = b.id AND t.status = 'rejected'))";
        } elseif ($statusFilter !== '') {
            $where[] = 'b.status = ?';
            $params[] = $statusFilter;
        }

        $whereClause = 'WHERE ' . implode(' AND ', $where);

        $bills = Database::fetchAll("
            SELECT b.*, 
                   u.name as user_name, 
                   u.email as user_email, 
                   u.phone as user_phone, 
                   f.wing, 
                   f.flat_no,
                   f.area_sqft,
                   f.flat_type
            FROM maintenance_bills b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN flats f ON b.flat_id = f.id
            {$whereClause}
            ORDER BY b.created_at DESC
        ", $params);

        $stats = Database::fetchOne("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paidCount,
                SUM(CASE WHEN status IN ('pending', 'overdue') THEN 1 ELSE 0 END) as pendingCount,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paidAmount,
                COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount ELSE 0 END), 0) as pendingAmount,
                COALESCE(SUM(amount), 0) as totalAmount
            FROM maintenance_bills
            WHERE society_id = ?
        ", [$societyId]);

        $rejectedCount = (int)(Database::fetchOne("
            SELECT COUNT(DISTINCT b.id) as c 
            FROM maintenance_bills b
            LEFT JOIN transactions t ON t.bill_id = b.id
            WHERE b.society_id = ? AND (b.status = 'rejected' OR t.status = 'rejected')
        ", [$societyId])['c'] ?? 0);
        $stats['rejectedCount'] = $rejectedCount;

        // Occupied flats for bill creation
        $occupiedFlats = Database::fetchAll("
            SELECT f.id, f.wing, f.flat_no, f.area_sqft, f.flat_type,
                   u.id as user_id, u.name as member_name, u.email as member_email
            FROM flats f
            JOIN society_members sm ON f.id = sm.flat_id AND sm.status = 'active'
            JOIN users u ON sm.user_id = u.id
            WHERE f.society_id = ?
            ORDER BY f.wing ASC, f.flat_no ASC
        ", [$societyId]);

        $totalFlatsCount = (int)(Database::fetchOne("SELECT COUNT(*) as c FROM flats WHERE society_id = ?", [$societyId])['c'] ?? 0);
        $totalAllArea = (float)(Database::fetchOne("SELECT COALESCE(SUM(area_sqft), 0) as s FROM flats WHERE society_id = ?", [$societyId])['s'] ?? 0);

        $pendingConfirmations = Database::fetchAll("
            SELECT t.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
                   f.wing, f.flat_no, b.bill_number, b.title as bill_title
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            LEFT JOIN flats f ON t.flat_id = f.id
            LEFT JOIN maintenance_bills b ON t.bill_id = b.id
            WHERE t.society_id = ? AND t.status = 'pending'
            ORDER BY t.created_at DESC
        ", [$societyId]);

        echo view('committee/bills', [
            'basePath' => '/',
            'user' => $auth['user'],
            'society' => $society,
            'bills' => $bills,
            'stats' => $stats,
            'occupiedFlats' => $occupiedFlats,
            'totalFlatsCount' => $totalFlatsCount,
            'totalAllArea' => $totalAllArea,
            'statusFilter' => $statusFilter,
            'pendingConfirmations' => $pendingConfirmations,
            'pendingConfirmationsCount' => count($pendingConfirmations),
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
            'currentRoute' => '/comitee/bills',
        ]);
    }

    /**
     * Create Single Maintenance Bill
     */
    public function createBill()
    {
        $auth = $this->requireCommittee();
        $society = $auth['society'];
        $societyId = (int)$society['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/bills');
        }

        $flatId = (int)($_POST['flat_id'] ?? 0);
        $billingType = trim($_POST['billing_type'] ?? 'fixed'); // 'fixed' or 'per_sqft'
        $ratePerSqft = (float)($_POST['rate_per_sqft'] ?? 0);
        $amount = (float)($_POST['amount'] ?? 0);
        $month = trim($_POST['month'] ?? date('Y-m'));
        $dueDate = trim($_POST['due_date'] ?? date('Y-m-d', strtotime('+15 days')));
        $title = trim($_POST['title'] ?? 'Monthly Maintenance');
        $particulars = trim($_POST['particulars'] ?? '');

        if (empty($flatId) || empty($month) || empty($dueDate)) {
            Session::flash('error', 'Please fill all required bill fields.');
            redirect('/comitee/bills');
        }

        // Find active member assigned to this flat
        $member = Database::fetchOne("
            SELECT sm.user_id, f.wing, f.flat_no, f.area_sqft, f.flat_type
            FROM society_members sm
            JOIN flats f ON sm.flat_id = f.id
            WHERE sm.flat_id = ? AND sm.status = 'active' AND sm.society_id = ?
            LIMIT 1
        ", [$flatId, $societyId]);

        if (!$member) {
            Session::flash('error', 'Selected flat has no active member assigned.');
            redirect('/comitee/bills');
        }

        if ($billingType === 'per_sqft') {
            $area = (float)($member['area_sqft'] ?? 0);
            if ($ratePerSqft <= 0) {
                Session::flash('error', 'Please provide a valid rate per sq. ft.');
                redirect('/comitee/bills');
            }
            if ($area <= 0 && $amount <= 0) {
                Session::flash('error', 'This flat has 0 sq.ft recorded. Please update the flat area or use fixed amount.');
                redirect('/comitee/bills');
            }
            $amount = $amount > 0 ? $amount : round($area * $ratePerSqft, 2);
            if (empty($particulars)) {
                $particulars = "Maintenance: {$area} sq.ft @ ₹{$ratePerSqft}/sq.ft";
            }
        } else {
            if ($amount <= 0) {
                Session::flash('error', 'Please enter a valid bill amount.');
                redirect('/comitee/bills');
            }
        }

        $userId = (int)$member['user_id'];
        $socCodeClean = preg_replace('/[^a-zA-Z0-9]/', '', $society['society_code'] ?? 'SOC');
        $billNumber = 'MB-' . $socCodeClean . '-' . date('Ym') . '-' . $member['wing'] . $member['flat_no'] . '-' . rand(100, 999);

        Database::insert('maintenance_bills', [
            'society_id' => $societyId,
            'flat_id' => $flatId,
            'user_id' => $userId,
            'bill_number' => $billNumber,
            'title' => $title ?: 'Monthly Maintenance',
            'particulars' => $particulars ?: "Maintenance dues for {$member['wing']}-{$member['flat_no']}",
            'amount' => $amount,
            'month' => $month,
            'due_date' => $dueDate,
            'status' => 'pending',
        ]);

        Database::insert('activity_logs', [
            'user_id' => Session::get('user_id'),
            'action' => 'bill_created',
            'description' => "Created bill {$billNumber} for flat {$member['wing']}-{$member['flat_no']}",
        ]);

        Session::flash('success', "Maintenance bill {$billNumber} (₹" . number_format($amount, 2) . ") created successfully.");
        redirect('/comitee/bills');
    }

    /**
     * Bulk Generate Bills for All or Occupied Flats in Society
     * Supports Fixed Amount or Rate Multiplied by Sq. Ft.
     */
    public function bulkGenerateBills()
    {
        $auth = $this->requireCommittee();
        $society = $auth['society'];
        $societyId = (int)$society['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/bills');
        }

        $targetFlats = trim($_POST['target_flats'] ?? 'occupied'); // 'all' or 'occupied'
        $billingType = trim($_POST['billing_type'] ?? 'fixed'); // 'fixed' or 'per_sqft'
        $fixedAmount = (float)($_POST['amount'] ?? 0);
        $ratePerSqft = (float)($_POST['rate_per_sqft'] ?? 0);
        $minAmount = (float)($_POST['min_amount'] ?? 0);
        $month = trim($_POST['month'] ?? date('Y-m'));
        $dueDate = trim($_POST['due_date'] ?? date('Y-m-d', strtotime('+15 days')));
        $title = trim($_POST['title'] ?? 'Monthly Maintenance');

        if (empty($month) || empty($dueDate)) {
            Session::flash('error', 'Please provide a valid billing month and payment due date.');
            redirect('/comitee/bills');
        }

        if ($billingType === 'per_sqft' && $ratePerSqft <= 0) {
            Session::flash('error', 'Please provide a valid rate per sq. ft. (must be greater than 0).');
            redirect('/comitee/bills');
        } elseif ($billingType === 'fixed' && $fixedAmount <= 0) {
            Session::flash('error', 'Please provide a valid fixed maintenance amount.');
            redirect('/comitee/bills');
        }

        if ($targetFlats === 'all') {
            $flatsToBill = Database::fetchAll("
                SELECT f.id as flat_id, f.wing, f.flat_no, f.area_sqft,
                       (SELECT sm.user_id FROM society_members sm WHERE sm.flat_id = f.id AND sm.status = 'active' LIMIT 1) as user_id
                FROM flats f
                WHERE f.society_id = ?
                ORDER BY f.wing ASC, f.flat_no ASC
            ", [$societyId]);
        } else {
            $flatsToBill = Database::fetchAll("
                SELECT f.id as flat_id, f.wing, f.flat_no, f.area_sqft,
                       (SELECT sm.user_id FROM society_members sm WHERE sm.flat_id = f.id AND sm.status = 'active' LIMIT 1) as user_id
                FROM flats f
                WHERE f.society_id = ?
                  AND EXISTS (SELECT 1 FROM society_members sm WHERE sm.flat_id = f.id AND sm.status = 'active')
                ORDER BY f.wing ASC, f.flat_no ASC
            ", [$societyId]);
        }

        if (empty($flatsToBill)) {
            $msg = $targetFlats === 'all' ? 'No flats found in this society.' : 'No occupied flats found in this society.';
            Session::flash('error', $msg);
            redirect('/comitee/bills');
        }

        $socCodeClean = preg_replace('/[^a-zA-Z0-9]/', '', $society['society_code'] ?? 'SOC');
        $generated = 0;

        foreach ($flatsToBill as $fb) {
            // Check if already billed for this month
            $exists = Database::fetchOne("
                SELECT id FROM maintenance_bills 
                WHERE society_id = ? AND flat_id = ? AND month = ?
            ", [$societyId, $fb['flat_id'], $month]);

            if ($exists) {
                continue;
            }

            if ($billingType === 'per_sqft') {
                $area = (float)($fb['area_sqft'] ?? 0);
                if ($area > 0) {
                    $billAmount = round($area * $ratePerSqft, 2);
                    $particulars = "Maintenance for {$fb['wing']}-{$fb['flat_no']} ({$area} sq.ft @ ₹{$ratePerSqft}/sq.ft) - {$month}";
                } else {
                    $billAmount = $minAmount > 0 ? $minAmount : ($fixedAmount > 0 ? $fixedAmount : 1000.00);
                    $particulars = "Maintenance for {$fb['wing']}-{$fb['flat_no']} (Flat fallback rate) - {$month}";
                }
            } else {
                $billAmount = $fixedAmount;
                $particulars = "Maintenance for {$fb['wing']}-{$fb['flat_no']} ({$month})";
            }

            $billNumber = 'MB-' . $socCodeClean . '-' . date('Ym') . '-' . $fb['wing'] . $fb['flat_no'] . '-' . rand(100, 999);
            Database::insert('maintenance_bills', [
                'society_id' => $societyId,
                'flat_id' => $fb['flat_id'],
                'user_id' => !empty($fb['user_id']) ? (int)$fb['user_id'] : null,
                'bill_number' => $billNumber,
                'title' => $title,
                'particulars' => $particulars,
                'amount' => $billAmount,
                'month' => $month,
                'due_date' => $dueDate,
                'status' => 'pending',
            ]);
            $generated++;
        }

        $targetLabel = $targetFlats === 'all' ? 'all flats' : 'occupied flats';
        $typeLabel = $billingType === 'per_sqft' ? "calculated @ ₹{$ratePerSqft}/sq.ft" : "fixed amount ₹" . number_format($fixedAmount, 2);
        Session::flash('success', "Generated {$generated} maintenance bills for {$month} ({$targetLabel}, {$typeLabel}).");
        redirect('/comitee/bills');
    }

    /**
     * Mark Bill Paid with Mode, Date, Notes & Receipt generation
     */
    public function markBillPaid(int $id)
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/bills');
        }

        $bill = Database::fetchOne("
            SELECT b.*, u.name as user_name, u.email as user_email, f.flat_no, f.wing 
            FROM maintenance_bills b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN flats f ON b.flat_id = f.id
            WHERE b.id = ? AND b.society_id = ?
        ", [$id, $societyId]);

        if (!$bill) {
            Session::flash('error', 'Bill not found.');
            redirect('/comitee/bills');
        }

        $paymentDate = !empty($_POST['payment_date']) ? trim($_POST['payment_date']) : date('Y-m-d');
        $paymentMode = trim($_POST['payment_mode'] ?? 'cash');
        if (!in_array($paymentMode, ['cash', 'cheque', 'bank_transfer', 'upi'])) {
            $paymentMode = 'cash';
        }
        $refNotes = trim($_POST['reference_notes'] ?? '');
        $receiptNo = 'REC-' . date('Y') . '-' . str_pad($bill['id'], 5, '0', STR_PAD_LEFT);

        Database::update('maintenance_bills', [
            'status' => 'paid',
            'paid_at' => $paymentDate . ' ' . date('H:i:s'),
            'payment_method' => $paymentMode,
            'transaction_id' => $refNotes ?: ('OFFLINE-' . date('YmdHis')),
        ], 'id = ? AND society_id = ?', [$id, $societyId]);

        $existingTxn = Database::fetchOne("SELECT id FROM transactions WHERE bill_id = ?", [$id]);
        if ($existingTxn) {
            Database::update('transactions', [
                'receipt_no' => $receiptNo,
                'status' => 'completed',
                'payment_method' => $paymentMode,
                'payment_date' => $paymentDate,
                'transaction_ref' => $refNotes ?: ('OFFLINE-' . date('YmdHis')),
                'remark' => 'Marked paid by committee: ' . $refNotes,
                'reviewed_by' => (int)$auth['user']['id'],
                'reviewed_at' => date('Y-m-d H:i:s'),
            ], 'id = ?', [$existingTxn['id']]);
        } else {
            Database::insert('transactions', [
                'receipt_no' => $receiptNo,
                'society_id' => $societyId,
                'flat_id' => $bill['flat_id'],
                'user_id' => $bill['user_id'] ?: (int)$auth['user']['id'],
                'bill_id' => $bill['id'],
                'amount' => $bill['amount'],
                'payment_method' => $paymentMode,
                'transaction_ref' => $refNotes ?: ('OFFLINE-' . date('YmdHis')),
                'particulars' => $bill['title'] . ' (' . ($bill['particulars'] ?: $bill['month']) . ')',
                'payment_date' => $paymentDate,
                'status' => 'completed',
                'remark' => 'Settled via ' . strtoupper($paymentMode) . ($refNotes ? ': ' . $refNotes : ''),
                'reviewed_by' => (int)$auth['user']['id'],
                'reviewed_at' => date('Y-m-d H:i:s'),
            ]);
        }

        if (!empty($bill['user_id'])) {
            Database::insert('notifications', [
                'user_id' => $bill['user_id'],
                'title' => 'Payment Receipt Issued',
                'message' => "Payment of ₹" . number_format($bill['amount'], 2) . " for Bill #{$bill['bill_number']} marked paid via " . strtoupper($paymentMode) . ". Receipt {$receiptNo} generated.",
                'type' => 'success',
                'action_url' => '/resident/receipts',
            ]);
        }

        Session::flash('success', "Bill {$bill['bill_number']} marked paid. Receipt {$receiptNo} generated.");
        redirect('/comitee/bills');
    }

    /**
     * Update Society UPI Payment Configuration
     */
    public function updateUpiSettings()
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/bills');
        }

        $upiId = trim($_POST['upi_id'] ?? '');
        $payeeName = trim($_POST['payee_name'] ?? '');

        Database::update('societies', [
            'upi_id' => $upiId ?: null,
            'payee_name' => $payeeName ?: null,
        ], 'id = ?', [$societyId]);

        Session::flash('success', 'Society UPI Payment settings saved successfully.');
        redirect('/comitee/bills');
    }

    /**
     * Approve Resident Payment Receipt
     */
    public function approveReceipt(int $id)
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/bills');
        }

        $txn = Database::fetchOne("SELECT * FROM transactions WHERE id = ? AND society_id = ?", [$id, $societyId]);
        if (!$txn) {
            Session::flash('error', 'Transaction not found.');
            redirect('/comitee/bills');
        }

        Database::update('transactions', [
            'status' => 'completed',
            'reviewed_by' => (int)$auth['user']['id'],
            'reviewed_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [$id]);

        if ($txn['bill_id']) {
            Database::update('maintenance_bills', [
                'status' => 'paid',
                'paid_at' => date('Y-m-d H:i:s'),
                'payment_method' => $txn['payment_method'],
                'transaction_id' => $txn['transaction_ref'],
            ], 'id = ?', [$txn['bill_id']]);
        }

        Database::insert('notifications', [
            'user_id' => $txn['user_id'],
            'title' => 'Payment Confirmed',
            'message' => "Your payment of ₹{$txn['amount']} (Receipt {$txn['receipt_no']}) has been approved and confirmed by the committee.",
            'type' => 'success',
        ]);

        Session::flash('success', "Payment receipt {$txn['receipt_no']} confirmed and approved.");
        redirect('/comitee/bills');
    }

    /**
     * Reject Resident Payment Receipt
     */
    public function rejectReceipt(int $id)
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/bills');
        }

        $txn = Database::fetchOne("SELECT * FROM transactions WHERE id = ? AND society_id = ?", [$id, $societyId]);
        if (!$txn) {
            Session::flash('error', 'Transaction not found.');
            redirect('/comitee/bills');
        }

        $remark = trim($_POST['remark'] ?? 'Payment reference could not be verified in society bank account.');

        Database::update('transactions', [
            'status' => 'rejected',
            'remark' => $remark,
            'reviewed_by' => (int)$auth['user']['id'],
            'reviewed_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [$id]);

        Database::insert('notifications', [
            'user_id' => $txn['user_id'],
            'title' => 'Payment Confirmation Rejected',
            'message' => "Your payment confirmation request for Receipt {$txn['receipt_no']} was rejected by the committee. Remark: {$remark}",
            'type' => 'error',
        ]);

        Session::flash('success', "Payment receipt {$txn['receipt_no']} rejected with remark.");
        redirect('/comitee/bills');
    }

    /**
     * Society Broadcast / Notices (Committee Level)
     */
    public function broadcast()
    {
        $auth = $this->requireCommittee();
        $society = $auth['society'];
        $societyId = (int)$society['id'];

        $totalResidents = Database::fetchOne("
            SELECT COUNT(DISTINCT user_id) as count 
            FROM society_members 
            WHERE society_id = ? AND status = 'active'
        ", [$societyId])['count'] ?? 0;

        $recentBroadcasts = Database::fetchAll("
            SELECT n.title, n.message, n.type, n.created_at, COUNT(*) as sent_count
            FROM notifications n
            JOIN society_members sm ON n.user_id = sm.user_id AND sm.society_id = ?
            GROUP BY n.title, n.message, n.type, n.created_at
            ORDER BY n.created_at DESC
            LIMIT 10
        ", [$societyId]);

        echo view('committee/broadcast', [
            'basePath' => '/',
            'user' => $auth['user'],
            'society' => $society,
            'totalResidents' => $totalResidents,
            'recentBroadcasts' => $recentBroadcasts,
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
            'currentRoute' => '/comitee/broadcast',
        ]);
    }

    /**
     * Send Broadcast to All Society Residents
     */
    public function sendBroadcast()
    {
        $auth = $this->requireCommittee();
        $society = $auth['society'];
        $societyId = (int)$society['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/broadcast');
        }

        $title = trim($_POST['title'] ?? '');
        $message = trim($_POST['message'] ?? '');
        $type = trim($_POST['type'] ?? 'announcement');

        if (empty($title) || empty($message)) {
            Session::flash('error', 'Notice title and message are required.');
            redirect('/comitee/broadcast');
        }

        $residents = Database::fetchAll("
            SELECT DISTINCT user_id 
            FROM society_members 
            WHERE society_id = ? AND status = 'active'
        ", [$societyId]);

        if (empty($residents)) {
            Session::flash('error', 'No active residents found in this society to broadcast to.');
            redirect('/comitee/broadcast');
        }

        $sent = 0;
        foreach ($residents as $r) {
            Database::insert('notifications', [
                'user_id' => (int)$r['user_id'],
                'title' => $title,
                'message' => $message,
                'type' => $type,
                'is_read' => 0,
            ]);
            $sent++;
        }

        Database::insert('activity_logs', [
            'user_id' => Session::get('user_id'),
            'action' => 'committee_broadcast',
            'description' => "Broadcast: {$title} to {$sent} residents in {$society['name']}",
        ]);

        Session::flash('success', "Notice successfully broadcasted to {$sent} residents.");
        redirect('/comitee/broadcast');
    }

    /**
     * Ensure default Chart of Accounts and Expense Heads exist for this society
     */
    public function ensureDefaultAccountHeads(int $societyId): void
    {
        $existingCount = Database::fetchOne("SELECT COUNT(*) as count FROM account_heads WHERE society_id = ?", [$societyId])['count'] ?? 0;
        if ($existingCount > 0) {
            return;
        }

        // Standard Chart of Accounts
        $heads = [
            // Assets
            ['code' => 'AST-CASH', 'name' => 'Cash in Hand', 'type' => 'asset', 'desc' => 'Physical cash balance with society manager/treasurer'],
            ['code' => 'AST-BANK', 'name' => 'Bank Current Account / Deposits', 'type' => 'asset', 'desc' => 'Society operational bank account deposits'],
            ['code' => 'AST-FD', 'name' => 'Fixed Deposits (FD)', 'type' => 'asset', 'desc' => 'Bank fixed deposits and sinking fund investments'],
            // Income
            ['code' => 'INC-MAINT', 'name' => 'Maintenance Collections (Members)', 'type' => 'income', 'desc' => 'Monthly and periodic maintenance contributions from residents/owners'],
            ['code' => 'INC-DON', 'name' => 'Donations & Contributions (Donors)', 'type' => 'income', 'desc' => 'External donations, festival sponsorships, and amenity contributions'],
            ['code' => 'INC-PENALTY', 'name' => 'Late Fees & Penalties', 'type' => 'income', 'desc' => 'Interest and penalties charged for delayed payments'],
            ['code' => 'INC-OTHER', 'name' => 'Other Receipts', 'type' => 'income', 'desc' => 'Clubhouse bookings, move-in charges, and miscellaneous income'],
            // Expenses
            ['code' => 'EXP-SEC', 'name' => 'Security & Guard Charges', 'type' => 'expense', 'desc' => 'Security personnel salaries and surveillance costs'],
            ['code' => 'EXP-ELEC', 'name' => 'Common Area Electricity Charges', 'type' => 'expense', 'desc' => 'Common lighting, pump, and power expenses'],
            ['code' => 'EXP-WATER', 'name' => 'Water Supply & Tanker Charges', 'type' => 'expense', 'desc' => 'Municipal water bills and private tanker supply'],
            ['code' => 'EXP-REPAIR', 'name' => 'Repairs & Maintenance', 'type' => 'expense', 'desc' => 'Plumbing, electrical, painting, and civil repair outflows'],
            ['code' => 'EXP-LIFT', 'name' => 'Lift & Elevator AMC', 'type' => 'expense', 'desc' => 'Elevator maintenance contracts and spare parts'],
            ['code' => 'EXP-CLEAN', 'name' => 'Housekeeping & Waste Management', 'type' => 'expense', 'desc' => 'Sweepers, garbage disposal, cleaning consumables'],
            ['code' => 'EXP-ADMIN', 'name' => 'Administrative, Audit & Legal', 'type' => 'expense', 'desc' => 'Stationery, software licenses, auditor fees, printing'],
            ['code' => 'EXP-MISC', 'name' => 'Miscellaneous Expenses', 'type' => 'expense', 'desc' => 'Uncategorized daily petty cash outflows'],
            // Equity
            ['code' => 'EQ-RES', 'name' => 'General Reserve Fund', 'type' => 'equity', 'desc' => 'Accumulated society capital and reserve fund'],
        ];

        $insertedHeads = [];
        foreach ($heads as $h) {
            $id = Database::insert('account_heads', [
                'society_id' => $societyId,
                'code' => $h['code'],
                'name' => $h['name'],
                'type' => $h['type'],
                'description' => $h['desc'],
                'opening_balance' => 0.00,
                'is_system' => 1,
            ]);
            $insertedHeads[$h['code']] = (int)$id;
        }

        // Default Expense Heads linked to Expense A/C Heads
        $defaultExpenseHeads = [
            ['name' => 'Security Guard Agency Monthly', 'head_code' => 'EXP-SEC', 'budget' => 25000],
            ['name' => 'Common Area Electricity Bill', 'head_code' => 'EXP-ELEC', 'budget' => 12000],
            ['name' => 'Water Tanker Supply', 'head_code' => 'EXP-WATER', 'budget' => 8000],
            ['name' => 'Plumbing & Electrical Repair', 'head_code' => 'EXP-REPAIR', 'budget' => 5000],
            ['name' => 'Lift Maintenance AMC', 'head_code' => 'EXP-LIFT', 'budget' => 6000],
            ['name' => 'Housekeeping Staff & Materials', 'head_code' => 'EXP-CLEAN', 'budget' => 10000],
            ['name' => 'Stationery, Audit & App Charges', 'head_code' => 'EXP-ADMIN', 'budget' => 3000],
            ['name' => 'Miscellaneous Outflows', 'head_code' => 'EXP-MISC', 'budget' => 2000],
        ];

        foreach ($defaultExpenseHeads as $eh) {
            if (isset($insertedHeads[$eh['head_code']])) {
                Database::insert('expense_heads', [
                    'society_id' => $societyId,
                    'account_head_id' => $insertedHeads[$eh['head_code']],
                    'name' => $eh['name'],
                    'budget_monthly' => $eh['budget'],
                    'is_active' => 1,
                ]);
            }
        }
    }

    /**
     * Compute real-time society balance (In Hand & Deposits), income, and expenses
     */
    public function getSocietyBalanceSummary(int $societyId): array
    {
        $this->ensureDefaultAccountHeads($societyId);

        // Opening balances from asset account heads
        $openingCash = (float)(Database::fetchOne(
            "SELECT opening_balance FROM account_heads WHERE society_id = ? AND code = 'AST-CASH'",
            [$societyId]
        )['opening_balance'] ?? 0.00);

        $openingDeposits = (float)(Database::fetchOne(
            "SELECT COALESCE(SUM(opening_balance), 0) as total FROM account_heads WHERE society_id = ? AND code IN ('AST-BANK', 'AST-FD')",
            [$societyId]
        )['total'] ?? 0.00);

        // Member Collections from Maintenance Bills
        $cashBills = (float)(Database::fetchOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM maintenance_bills WHERE society_id = ? AND status = 'paid' AND payment_method = 'cash'",
            [$societyId]
        )['total'] ?? 0.00);

        $bankBills = (float)(Database::fetchOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM maintenance_bills WHERE society_id = ? AND status = 'paid' AND (payment_method != 'cash' OR payment_method IS NULL)",
            [$societyId]
        )['total'] ?? 0.00);

        $totalCollectedBills = $cashBills + $bankBills;

        $pendingMemberDues = (float)(Database::fetchOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM maintenance_bills WHERE society_id = ? AND status IN ('pending', 'overdue')",
            [$societyId]
        )['total'] ?? 0.00);

        // Donor Contributions & Donations
        $cashDonations = (float)(Database::fetchOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE society_id = ? AND payment_mode = 'cash'",
            [$societyId]
        )['total'] ?? 0.00);

        $bankDonations = (float)(Database::fetchOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE society_id = ? AND payment_mode != 'cash'",
            [$societyId]
        )['total'] ?? 0.00);

        $totalDonations = $cashDonations + $bankDonations;

        // Expenses / Outflows
        $cashExpenses = (float)(Database::fetchOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE society_id = ? AND status = 'paid' AND payment_mode = 'cash'",
            [$societyId]
        )['total'] ?? 0.00);

        $bankExpenses = (float)(Database::fetchOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE society_id = ? AND status = 'paid' AND payment_mode != 'cash'",
            [$societyId]
        )['total'] ?? 0.00);

        $totalExpenses = $cashExpenses + $bankExpenses;

        // Calculate Balances
        $inHand = ($openingCash + $cashBills + $cashDonations) - $cashExpenses;
        $deposits = ($openingDeposits + $bankBills + $bankDonations) - $bankExpenses;
        $totalBalance = $inHand + $deposits;

        $totalIncome = $totalCollectedBills + $totalDonations;
        $netSurplus = $totalIncome - $totalExpenses;
        $openingFund = $openingCash + $openingDeposits;

        return [
            'openingCash' => $openingCash,
            'openingDeposits' => $openingDeposits,
            'openingFund' => $openingFund,
            'inHand' => $inHand,
            'deposits' => $deposits,
            'totalBalance' => $totalBalance,
            'cashBills' => $cashBills,
            'bankBills' => $bankBills,
            'totalCollectedBills' => $totalCollectedBills,
            'pendingMemberDues' => $pendingMemberDues,
            'cashDonations' => $cashDonations,
            'bankDonations' => $bankDonations,
            'totalDonations' => $totalDonations,
            'cashExpenses' => $cashExpenses,
            'bankExpenses' => $bankExpenses,
            'totalExpenses' => $totalExpenses,
            'totalIncome' => $totalIncome,
            'netSurplus' => $netSurplus,
            'totalAssets' => $totalBalance + $pendingMemberDues,
            'totalLiabilitiesAndFund' => $openingFund + $netSurplus + $pendingMemberDues,
        ];
    }

    /**
     * Expenses Management Page
     */
    public function expenses()
    {
        $auth = $this->requireCommittee();
        $society = $auth['society'];
        $societyId = (int)$society['id'];

        $this->ensureDefaultAccountHeads($societyId);
        $balanceSummary = $this->getSocietyBalanceSummary($societyId);

        $selectedMonth = trim($_GET['month'] ?? '');
        $selectedHead = (int)($_GET['expense_head_id'] ?? 0);

        $sql = "
            SELECT e.*, 
                   eh.name as expense_head_name, 
                   ah.name as account_head_name, 
                   ah.code as account_head_code,
                   u.name as recorder_name
            FROM expenses e
            JOIN expense_heads eh ON e.expense_head_id = eh.id
            JOIN account_heads ah ON eh.account_head_id = ah.id
            LEFT JOIN users u ON e.created_by = u.id
            WHERE e.society_id = ?
        ";
        $params = [$societyId];

        if (!empty($selectedMonth)) {
            $sql .= " AND DATE_FORMAT(e.expense_date, '%Y-%m') = ?";
            $params[] = $selectedMonth;
        }

        if ($selectedHead > 0) {
            $sql .= " AND e.expense_head_id = ?";
            $params[] = $selectedHead;
        }

        $sql .= " ORDER BY e.expense_date DESC, e.id DESC";

        $expenses = Database::fetchAll($sql, $params);

        // Expense Heads with linked Account Head
        $expenseHeads = Database::fetchAll("
            SELECT eh.*, ah.name as account_head_name, ah.code as account_head_code
            FROM expense_heads eh
            JOIN account_heads ah ON eh.account_head_id = ah.id
            WHERE eh.society_id = ? AND eh.is_active = 1
            ORDER BY eh.name ASC
        ", [$societyId]);

        // Account Heads of type 'expense' for linking when adding a new Expense Head
        $accountHeads = Database::fetchAll("
            SELECT * FROM account_heads 
            WHERE society_id = ? AND type = 'expense' 
            ORDER BY name ASC
        ", [$societyId]);

        // Distinct months for filter
        $availableMonths = Database::fetchAll("
            SELECT DISTINCT DATE_FORMAT(expense_date, '%Y-%m') as month_str
            FROM expenses
            WHERE society_id = ?
            ORDER BY month_str DESC
        ", [$societyId]);

        echo view('committee/expenses', [
            'basePath' => '/',
            'user' => $auth['user'],
            'society' => $society,
            'expenses' => $expenses,
            'expenseHeads' => $expenseHeads,
            'accountHeads' => $accountHeads,
            'availableMonths' => $availableMonths,
            'selectedMonth' => $selectedMonth,
            'selectedHead' => $selectedHead,
            'balanceSummary' => $balanceSummary,
            'csrfToken' => generateCSRFToken(),
            'currentRoute' => '/comitee/expenses',
        ]);
    }

    /**
     * Record a new Expense
     */
    public function createExpense()
    {
        $auth = $this->requireCommittee();
        $society = $auth['society'];
        $societyId = (int)$society['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/expenses');
        }

        $expenseHeadId = (int)($_POST['expense_head_id'] ?? 0);
        $amount = (float)($_POST['amount'] ?? 0);
        $expenseDate = trim($_POST['expense_date'] ?? date('Y-m-d'));
        $paidTo = trim($_POST['paid_to'] ?? '');
        $paymentMode = trim($_POST['payment_mode'] ?? 'upi');
        $referenceNo = trim($_POST['reference_no'] ?? '');
        $notes = trim($_POST['notes'] ?? '');

        if ($expenseHeadId <= 0 || $amount <= 0 || empty($paidTo) || empty($expenseDate)) {
            Session::flash('error', 'Please fill in all required fields (Expense Head, Amount, Paid To, and Date).');
            redirect('/comitee/expenses');
        }

        // Voucher number auto-generation
        $monthPrefix = date('Ym', strtotime($expenseDate));
        $countThisMonth = Database::fetchOne("
            SELECT COUNT(*) as count FROM expenses 
            WHERE society_id = ? AND voucher_no LIKE ?
        ", [$societyId, "VCH-{$monthPrefix}-%"])['count'] ?? 0;
        $voucherNo = sprintf("VCH-%s-%04d", $monthPrefix, $countThisMonth + 1);

        Database::insert('expenses', [
            'society_id' => $societyId,
            'expense_head_id' => $expenseHeadId,
            'voucher_no' => $voucherNo,
            'expense_date' => $expenseDate,
            'amount' => $amount,
            'paid_to' => $paidTo,
            'payment_mode' => $paymentMode,
            'reference_no' => $referenceNo,
            'notes' => $notes,
            'created_by' => (int)Session::get('user_id'),
            'status' => 'paid',
        ]);

        Database::insert('activity_logs', [
            'user_id' => Session::get('user_id'),
            'action' => 'committee_expense_recorded',
            'description' => "Recorded expense {$voucherNo} of ₹{$amount} to {$paidTo}",
        ]);

        Session::flash('success', "Expense voucher {$voucherNo} of ₹" . number_format($amount, 2) . " recorded successfully.");
        redirect('/comitee/expenses');
    }

    /**
     * Delete an Expense
     */
    public function deleteExpense(int $id)
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/expenses');
        }

        $expense = Database::fetchOne("SELECT id, voucher_no, amount FROM expenses WHERE id = ? AND society_id = ?", [$id, $societyId]);
        if (!$expense) {
            Session::flash('error', 'Expense voucher not found.');
            redirect('/comitee/expenses');
        }

        Database::query("DELETE FROM expenses WHERE id = ? AND society_id = ?", [$id, $societyId]);

        Session::flash('success', "Expense voucher {$expense['voucher_no']} has been deleted.");
        redirect('/comitee/expenses');
    }

    /**
     * Add a new Expense Head connected to an Account Head
     */
    public function createExpenseHead()
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/expenses');
        }

        $name = trim($_POST['name'] ?? '');
        $accountHeadId = (int)($_POST['account_head_id'] ?? 0);
        $budgetMonthly = (float)($_POST['budget_monthly'] ?? 0);

        if (empty($name) || $accountHeadId <= 0) {
            Session::flash('error', 'Expense head name and connecting account head are required.');
            redirect('/comitee/expenses');
        }

        // Verify account head exists and belongs to society
        $acHead = Database::fetchOne("SELECT id, name FROM account_heads WHERE id = ? AND society_id = ?", [$accountHeadId, $societyId]);
        if (!$acHead) {
            Session::flash('error', 'Invalid connecting Account Head.');
            redirect('/comitee/expenses');
        }

        Database::insert('expense_heads', [
            'society_id' => $societyId,
            'account_head_id' => $accountHeadId,
            'name' => $name,
            'budget_monthly' => $budgetMonthly,
            'is_active' => 1,
        ]);

        Session::flash('success', "Expense Head '{$name}' created and connected to A/C Head '{$acHead['name']}'.");
        redirect('/comitee/expenses');
    }

    /**
     * Accounting Page: Balance Sheet, P&L Statement, and A/C Heads Ledger
     */
    public function accounting()
    {
        $auth = $this->requireCommittee();
        $society = $auth['society'];
        $societyId = (int)$society['id'];

        $this->ensureDefaultAccountHeads($societyId);
        $balanceSummary = $this->getSocietyBalanceSummary($societyId);

        // P&L Statement - Expense breakdown by Account Head
        $expenseAcHeads = Database::fetchAll("
            SELECT ah.id, ah.code, ah.name, ah.description,
                   COUNT(DISTINCT e.id) as vouchers_count,
                   COALESCE(SUM(e.amount), 0) as total_spent
            FROM account_heads ah
            LEFT JOIN expense_heads eh ON ah.id = eh.account_head_id
            LEFT JOIN expenses e ON eh.id = e.expense_head_id AND e.status = 'paid'
            WHERE ah.society_id = ? AND ah.type = 'expense'
            GROUP BY ah.id, ah.code, ah.name, ah.description
            ORDER BY total_spent DESC, ah.name ASC
        ", [$societyId]);

        // Detailed breakdown of expense heads under each account head
        $expenseHeadsBreakdown = Database::fetchAll("
            SELECT eh.id, eh.name, eh.account_head_id, eh.budget_monthly,
                   COALESCE(SUM(e.amount), 0) as total_spent,
                   COUNT(e.id) as voucher_count
            FROM expense_heads eh
            LEFT JOIN expenses e ON eh.id = e.expense_head_id AND e.status = 'paid'
            WHERE eh.society_id = ?
            GROUP BY eh.id, eh.name, eh.account_head_id, eh.budget_monthly
            ORDER BY total_spent DESC
        ", [$societyId]);

        // Group expense heads under account heads
        $expenseHeadsByAc = [];
        foreach ($expenseHeadsBreakdown as $eh) {
            $expenseHeadsByAc[$eh['account_head_id']][] = $eh;
        }

        // All Account Heads for Ledger overview
        $allAccountHeads = Database::fetchAll("
            SELECT ah.*,
                   CASE 
                       WHEN ah.type = 'expense' THEN (
                           SELECT COALESCE(SUM(e.amount), 0) 
                           FROM expenses e 
                           JOIN expense_heads eh ON e.expense_head_id = eh.id 
                           WHERE eh.account_head_id = ah.id AND e.status = 'paid'
                       )
                       WHEN ah.code = 'INC-MAINT' THEN (
                           SELECT COALESCE(SUM(mb.amount), 0) 
                           FROM maintenance_bills mb 
                           WHERE mb.society_id = ah.society_id AND mb.status = 'paid'
                       )
                       WHEN ah.code = 'INC-DON' THEN (
                           SELECT COALESCE(SUM(d.amount), 0) 
                           FROM donations d 
                           WHERE d.society_id = ah.society_id
                       )
                       ELSE 0
                   END as total_activity
            FROM account_heads ah
            WHERE ah.society_id = ?
            ORDER BY FIELD(ah.type, 'asset', 'income', 'expense', 'liability', 'equity'), ah.name ASC
        ", [$societyId]);

        // Recent Donations from Donors
        $donations = Database::fetchAll("
            SELECT d.*, u.name as recorder_name
            FROM donations d
            LEFT JOIN users u ON d.created_by = u.id
            WHERE d.society_id = ?
            ORDER BY d.payment_date DESC, d.id DESC
            LIMIT 20
        ", [$societyId]);

        // Member Maintenance Inflow Stats
        $membersCount = Database::fetchOne("
            SELECT COUNT(DISTINCT user_id) as count 
            FROM society_members 
            WHERE society_id = ? AND status = 'active'
        ", [$societyId])['count'] ?? 0;

        echo view('committee/accounting', [
            'basePath' => '/',
            'user' => $auth['user'],
            'society' => $society,
            'balanceSummary' => $balanceSummary,
            'expenseAcHeads' => $expenseAcHeads,
            'expenseHeadsByAc' => $expenseHeadsByAc,
            'allAccountHeads' => $allAccountHeads,
            'donations' => $donations,
            'membersCount' => $membersCount,
            'csrfToken' => generateCSRFToken(),
            'currentRoute' => '/comitee/accounting',
        ]);
    }

    /**
     * Add a new Account Head (Chart of Accounts)
     */
    public function createAccountHead()
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/accounting');
        }

        $name = trim($_POST['name'] ?? '');
        $type = trim($_POST['type'] ?? 'expense');
        $code = trim($_POST['code'] ?? '');
        $desc = trim($_POST['description'] ?? '');
        $openingBalance = (float)($_POST['opening_balance'] ?? 0);

        if (empty($name) || !in_array($type, ['asset', 'liability', 'income', 'expense', 'equity'])) {
            Session::flash('error', 'Valid account head name and type are required.');
            redirect('/comitee/accounting');
        }

        if (empty($code)) {
            $prefix = strtoupper(substr($type, 0, 3));
            $code = $prefix . '-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $name), 0, 6));
        }

        Database::insert('account_heads', [
            'society_id' => $societyId,
            'code' => $code,
            'name' => $name,
            'type' => $type,
            'opening_balance' => $openingBalance,
            'description' => $desc,
            'is_system' => 0,
        ]);

        Session::flash('success', "Account Head '{$name}' ({$type}) created successfully.");
        redirect('/comitee/accounting');
    }

    /**
     * Update Opening Balances for Cash in Hand & Bank Accounts
     */
    public function updateOpeningBalances()
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/accounting');
        }

        $cashOpening = (float)($_POST['cash_opening'] ?? 0);
        $bankOpening = (float)($_POST['bank_opening'] ?? 0);

        Database::update('account_heads', ['opening_balance' => $cashOpening], "society_id = ? AND code = 'AST-CASH'", [$societyId]);
        Database::update('account_heads', ['opening_balance' => $bankOpening], "society_id = ? AND code = 'AST-BANK'", [$societyId]);

        Session::flash('success', 'Opening balances updated successfully.');
        redirect('/comitee/accounting');
    }

    /**
     * Record a Donation from a Donor
     */
    public function createDonation()
    {
        $auth = $this->requireCommittee();
        $societyId = (int)$auth['society']['id'];

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/comitee/accounting');
        }

        $donorName = trim($_POST['donor_name'] ?? '');
        $amount = (float)($_POST['amount'] ?? 0);
        $paymentDate = trim($_POST['payment_date'] ?? date('Y-m-d'));
        $purpose = trim($_POST['purpose'] ?? 'General Society Contribution');
        $paymentMode = trim($_POST['payment_mode'] ?? 'upi');
        $donorPhone = trim($_POST['donor_phone'] ?? '');
        $donorEmail = trim($_POST['donor_email'] ?? '');
        $donorPan = trim($_POST['donor_pan'] ?? '');
        $notes = trim($_POST['notes'] ?? '');

        if (empty($donorName) || $amount <= 0 || empty($paymentDate)) {
            Session::flash('error', 'Please provide donor name, amount, and payment date.');
            redirect('/comitee/accounting');
        }

        // Generate receipt number
        $monthPrefix = date('Ym', strtotime($paymentDate));
        $countThisMonth = Database::fetchOne("
            SELECT COUNT(*) as count FROM donations 
            WHERE society_id = ? AND receipt_no LIKE ?
        ", [$societyId, "DON-{$monthPrefix}-%"])['count'] ?? 0;
        $receiptNo = sprintf("DON-%s-%04d", $monthPrefix, $countThisMonth + 1);

        Database::insert('donations', [
            'society_id' => $societyId,
            'receipt_no' => $receiptNo,
            'donor_name' => $donorName,
            'donor_phone' => $donorPhone,
            'donor_email' => $donorEmail,
            'donor_pan' => $donorPan,
            'amount' => $amount,
            'payment_mode' => $paymentMode,
            'payment_date' => $paymentDate,
            'purpose' => $purpose,
            'notes' => $notes,
            'created_by' => (int)Session::get('user_id'),
        ]);

        Database::insert('activity_logs', [
            'user_id' => Session::get('user_id'),
            'action' => 'committee_donation_recorded',
            'description' => "Recorded donation {$receiptNo} of ₹{$amount} from {$donorName}",
        ]);

        Session::flash('success', "Donation of ₹" . number_format($amount, 2) . " from {$donorName} recorded with receipt {$receiptNo}.");
        redirect('/comitee/accounting');
    }
}

