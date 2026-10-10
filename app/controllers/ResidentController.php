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

        // Mobile number is mandatory for resident features
        if (empty($user['phone'])) {
            Session::flash('error', 'Please update your mobile number in your profile before proceeding.');
            redirect('/user/profile');
        }

        // 1. Fetch only active flats linked to this resident (omit pending/unlinked units)
        $myFlats = Database::fetchAll("
            SELECT sm.*, 
                   f.flat_no, f.wing, f.floor, f.area_sqft, f.flat_type, f.is_for_rent,
                   COALESCE(f.occupancy_status, 'self_occupied') as occupancy_status,
                   f.expected_rent, f.security_deposit, f.available_from, f.rental_notes,
                   f.tenant_name, f.tenant_phone, f.lease_end_date,
                   s.id as society_id, s.name as society_name, s.society_code, s.upi_id, s.payee_name
            FROM society_members sm
            JOIN societies s ON sm.society_id = s.id
            JOIN flats f ON sm.flat_id = f.id
            WHERE sm.user_id = ? AND sm.status = 'active'
            ORDER BY s.name ASC, f.wing ASC, f.flat_no ASC
        ", [$userId]);

        // Fetch rejected requests if any
        $rejectedFlats = Database::fetchAll("
            SELECT sm.*, 
                   COALESCE(sm.rejection_reason, sm.notes) as rejection_reason,
                   f.flat_no, f.wing,
                   s.name as society_name, s.society_code
            FROM society_members sm
            JOIN societies s ON sm.society_id = s.id
            LEFT JOIN flats f ON sm.flat_id = f.id
            WHERE sm.user_id = ? AND sm.status = 'rejected'
            ORDER BY sm.created_at DESC
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
            $fields = ['phone', 'emergency_contact_name', 'emergency_contact_phone'];
            $filled = 0;
            foreach ($fields as $field) {
                if (!empty($profile[$field])) $filled++;
            }
            $profileComplete = round(($filled / count($fields)) * 100);
        }

        $registeredTenants = Database::fetchAll("
            SELECT id, name, email, phone, user_type 
            FROM users 
            WHERE id != ? AND is_active = 1
            ORDER BY name ASC
        ", [$userId]);

        $isTenant = ($user['user_type'] === 'tenant');
        if (!$isTenant && !empty($myFlats)) {
            $allTenants = true;
            foreach ($myFlats as $mf) {
                if ($mf['status'] === 'active' && ($mf['role'] !== 'tenant' && $mf['ownership_type'] !== 'tenant')) {
                    $allTenants = false;
                    break;
                }
            }
            if ($allTenants && count($myFlats) > 0) {
                $isTenant = true;
            }
        }

        echo view('resident/index', [
            'basePath' => '/',
            'user' => $user,
            'flash' => $flash,
            'myFlats' => $myFlats,
            'isCommittee' => $isCommittee,
            'isTenant' => $isTenant,
            'registeredTenants' => $registeredTenants,
            'unreadNotifications' => $unreadCount,
            'profile' => $profile,
            'unpaidBillsCount' => $unpaidBills['count'] ?? 0,
            'unpaidBillsTotal' => $unpaidBills['total'] ?? 0,
            'recentBills' => $recentBills,
            'recentReceipts' => $recentReceipts,
            'rejectedFlats' => $rejectedFlats,
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
        if ($user['user_type'] === 'tenant') {
            Session::flash('error', 'Bills and dues are accessible only to flat owners.');
            redirect('/resident');
        }
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

        $pendingBills = array_values(array_filter($bills, function($b) { return $b['status'] === 'pending'; }));
        $totalPendingAmount = 0.0;
        foreach ($pendingBills as $pb) {
            $totalPendingAmount += (float)$pb['amount'];
        }

        echo view('resident/bills', [
            'basePath' => '/',
            'user' => $user,
            'bills' => $bills,
            'pendingBills' => $pendingBills,
            'totalPendingAmount' => $totalPendingAmount,
            'profile' => $profile,
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
            'currentRoute' => '/resident/bills',
        ]);
    }

    /**
     * Record Bill Payment (Send reference for committee confirmation)
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
        $txnRef = trim($_POST['transaction_ref'] ?? '');

        if (empty($txnRef)) {
            Session::flash('error', 'Please enter your UPI transaction reference / UTR number.');
            redirect('/resident/bills');
        }

        // Store transaction reference on bill while pending confirmation
        Database::update('maintenance_bills', [
            'payment_method' => $method,
            'transaction_id' => $txnRef,
        ], 'id = ?', [$billId]);

        // Generate formal receipt with pending confirmation status
        $receiptNo = 'REC-' . date('Y') . '-' . str_pad($billId, 5, '0', STR_PAD_LEFT);
        
        $existingTxn = Database::fetchOne("SELECT id FROM transactions WHERE bill_id = ? AND user_id = ?", [$billId, $userId]);
        if ($existingTxn) {
            Database::update('transactions', [
                'payment_method' => $method,
                'transaction_ref' => $txnRef,
                'payment_date' => date('Y-m-d'),
                'status' => 'pending',
                'remark' => null,
            ], 'id = ?', [$existingTxn['id']]);
        } else {
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
                'status' => 'pending',
            ]);
        }

        // Send notification to committee
        $flatInfo = Database::fetchOne("SELECT wing, flat_no FROM flats WHERE id = ?", [$bill['flat_id']]);
        $flatStr = $flatInfo ? "Flat {$flatInfo['wing']}-{$flatInfo['flat_no']}" : "Resident";
        $socId = (int)($bill['society_id'] ?: 1);
        $committeeUsers = Database::fetchAll("
            SELECT DISTINCT sm.user_id 
            FROM society_members sm 
            WHERE sm.society_id = ? 
              AND sm.role IN ('chairman', 'secretary', 'treasurer', 'committee') 
              AND sm.status = 'active'
        ", [$socId]);
        if (empty($committeeUsers)) {
            $committeeUsers = Database::fetchAll("SELECT id as user_id FROM users WHERE role = 'admin'");
        }
        foreach ($committeeUsers as $cu) {
            Database::insert('notifications', [
                'user_id' => (int)$cu['user_id'],
                'title' => 'Payment Confirmation Required',
                'message' => "{$flatStr} submitted UPI reference '{$txnRef}' for Bill #{$bill['bill_number']} (₹" . number_format($bill['amount'], 2) . "). Please verify and confirm receipt.",
                'type' => 'info',
                'action_url' => '/comitee/bills',
            ]);
        }

        Session::flash('success', "Payment reference {$txnRef} sent for committee confirmation! You can track approval status in Payment Receipts.");
        redirect('/resident/receipts');
    }

    /**
     * Bulk Bill Payment via UPI (Send reference for all pending bills)
     */
    public function bulkRecordPayment()
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid token.');
            redirect('/resident/bills');
        }

        $txnRef = trim($_POST['transaction_ref'] ?? '');
        if (empty($txnRef)) {
            Session::flash('error', 'Please enter your UPI transaction reference / UTR number.');
            redirect('/resident/bills');
        }

        $pendingBills = Database::fetchAll("SELECT * FROM maintenance_bills WHERE user_id = ? AND status = 'pending'", [$userId]);
        if (empty($pendingBills)) {
            Session::flash('info', 'No pending bills found to pay.');
            redirect('/resident/bills');
        }

        $totalPaid = 0.0;
        foreach ($pendingBills as $bill) {
            $totalPaid += (float)$bill['amount'];
            $receiptNo = 'REC-' . date('Y') . '-' . str_pad($bill['id'], 5, '0', STR_PAD_LEFT);

            Database::update('maintenance_bills', [
                'payment_method' => 'upi',
                'transaction_id' => $txnRef,
            ], 'id = ?', [$bill['id']]);

            $existingTxn = Database::fetchOne("SELECT id FROM transactions WHERE bill_id = ? AND user_id = ?", [$bill['id'], $userId]);
            if ($existingTxn) {
                Database::update('transactions', [
                    'payment_method' => 'upi',
                    'transaction_ref' => $txnRef,
                    'payment_date' => date('Y-m-d'),
                    'status' => 'pending',
                    'remark' => null,
                ], 'id = ?', [$existingTxn['id']]);
            } else {
                Database::insert('transactions', [
                    'receipt_no' => $receiptNo,
                    'society_id' => $bill['society_id'] ?: 1,
                    'flat_id' => $bill['flat_id'],
                    'user_id' => $userId,
                    'bill_id' => $bill['id'],
                    'amount' => $bill['amount'],
                    'payment_method' => 'upi',
                    'transaction_ref' => $txnRef,
                    'particulars' => $bill['title'] . ' (' . ($bill['particulars'] ?: $bill['month']) . ')',
                    'payment_date' => date('Y-m-d'),
                    'status' => 'pending',
                ]);
            }
        }

        $socIds = array_unique(array_filter(array_column($pendingBills, 'society_id')));
        if (empty($socIds)) $socIds = [1];
        foreach ($socIds as $sid) {
            $cUsers = Database::fetchAll("
                SELECT DISTINCT sm.user_id 
                FROM society_members sm 
                WHERE sm.society_id = ? 
                  AND sm.role IN ('chairman', 'secretary', 'treasurer', 'committee') 
                  AND sm.status = 'active'
            ", [$sid]);
            if (empty($cUsers)) {
                $cUsers = Database::fetchAll("SELECT id as user_id FROM users WHERE role = 'admin'");
            }
            foreach ($cUsers as $cu) {
                Database::insert('notifications', [
                    'user_id' => (int)$cu['user_id'],
                    'title' => 'Bulk Payment Confirmation Required',
                    'message' => "Resident submitted bulk UPI reference '{$txnRef}' for " . count($pendingBills) . " bills (Total: ₹" . number_format($totalPaid, 2) . "). Please review and confirm.",
                    'type' => 'info',
                    'action_url' => '/comitee/bills',
                ]);
            }
        }

        Session::flash('success', "Bulk payment reference sent for confirmation! " . count($pendingBills) . " bills totaling ₹" . number_format($totalPaid, 2) . " submitted to committee.");
        redirect('/resident/receipts');
    }

    /**
     * Receipts Ledger
     */
    public function receipts()
    {
        requireLogin();
        $user = getUser();
        if ($user['user_type'] === 'tenant') {
            Session::flash('error', 'Bills and receipts are accessible only to flat owners.');
            redirect('/resident');
        }
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
     * Resident Members (Contacts & Neighbors for linked society)
     */
    public function members()
    {
        requireLogin();
        $user = getUser();
        $userId = (int)Session::get('user_id');

        // Find all linked societies of resident
        $linkedSocieties = Database::fetchAll("
            SELECT DISTINCT s.* FROM societies s
            JOIN society_members sm ON s.id = sm.society_id
            WHERE sm.user_id = ? AND sm.status = 'active'
            ORDER BY s.name ASC
        ", [$userId]);

        if (empty($linkedSocieties)) {
            echo view('resident/members', [
                'basePath' => '/',
                'user' => $user,
                'society' => null,
                'linkedSocieties' => [],
                'selectedSocietyId' => 0,
                'members' => [],
                'search' => '',
                'profile' => $user,
                'currentRoute' => '/resident/members',
                'unlinked' => true,
            ]);
            return;
        }

        $validSocietyIds = array_column($linkedSocieties, 'id');
        $selectedSocietyId = (int)($_GET['society_id'] ?? $linkedSocieties[0]['id']);
        if (!in_array($selectedSocietyId, $validSocietyIds)) {
            $selectedSocietyId = (int)$linkedSocieties[0]['id'];
        }

        $society = Database::fetchOne("SELECT * FROM societies WHERE id = ?", [$selectedSocietyId]);

        $search = trim($_GET['q'] ?? '');
        $params = [$selectedSocietyId];
        $searchSql = "";
        if (!empty($search)) {
            $searchSql = "AND (u.name LIKE ? OR u.phone LIKE ? OR f.flat_no LIKE ? OR f.wing LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        // Details of members + tenants (allowed by owner: is_for_rent=1 OR approved_by IS NOT NULL)
        $members = Database::fetchAll("
            SELECT u.id as user_id, u.name, u.email, u.phone, u.profile_photo,
                   sm.role as member_role, sm.ownership_type,
                   f.id as flat_id, f.flat_no, f.wing, f.floor, f.is_for_rent,
                   s.name as society_name, s.city as society_city
            FROM society_members sm
            JOIN users u ON sm.user_id = u.id
            JOIN societies s ON sm.society_id = s.id
            LEFT JOIN flats f ON sm.flat_id = f.id
            WHERE sm.society_id = ? 
              AND sm.status = 'active'
              AND (
                  sm.role != 'tenant'
                  OR (sm.role = 'tenant' AND (f.is_for_rent = 1 OR sm.approved_by IS NOT NULL))
              )
              {$searchSql}
            ORDER BY f.wing ASC, CAST(f.flat_no AS UNSIGNED) ASC, f.flat_no ASC, u.name ASC
        ", $params);

        echo view('resident/members', [
            'basePath' => '/',
            'user' => $user,
            'society' => $society,
            'linkedSocieties' => $linkedSocieties,
            'selectedSocietyId' => $selectedSocietyId,
            'members' => $members,
            'search' => $search,
            'profile' => $user,
            'currentRoute' => '/resident/members',
            'unlinked' => false,
        ]);
    }

    /**
     * Legacy Directory redirect
     */
    public function directory()
    {
        redirect('/resident/members');
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

        // 1. For Owner: Unlinked flats of selected society (exclude any flats with an active or pending owner/resident/committee link)
        $unlinkedFlats = Database::fetchAll("
            SELECT f.* FROM flats f
            WHERE f.society_id = ?
              AND NOT EXISTS (
                  SELECT 1 FROM society_members sm 
                  WHERE sm.flat_id = f.id 
                    AND sm.status IN ('active', 'pending')
                    AND sm.role IN ('owner', 'resident', 'chairman', 'secretary', 'treasurer', 'committee')
              )
            ORDER BY f.wing ASC, CAST(f.flat_no AS UNSIGNED) ASC, f.flat_no ASC
        ", [$selectedSocietyId]);

        // 2. For Tenant: Flats available for rent in selected society (is_for_rent = 1 or occupancy_status = available_for_rent, and not occupied by an active tenant)
        $rentalFlats = Database::fetchAll("
            SELECT f.* FROM flats f
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

        echo view('resident/link-flat', [
            'basePath' => '/',
            'user' => $user,
            'societies' => $societies,
            'selectedSocietyId' => $selectedSocietyId,
            'unlinkedFlats' => $unlinkedFlats,
            'rentalFlats' => $rentalFlats,
            'vacantFlats' => $unlinkedFlats,
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

        if ($role === 'tenant') {
            $flat = Database::fetchOne("SELECT id, is_for_rent FROM flats WHERE id = ? AND society_id = ?", [$flatId, $societyId]);
            if (!$flat || empty($flat['is_for_rent'])) {
                Session::flash('error', 'This unit is not marked as available for rent. The owner must enable rent availability first.');
                redirect('/resident/link-flat?society_id=' . $societyId);
            }
        } else {
            $existingOwner = Database::fetchOne("
                SELECT id FROM society_members 
                WHERE society_id = ? AND flat_id = ? AND role = 'owner' AND status = 'active'
            ", [$societyId, $flatId]);
            if ($existingOwner) {
                Session::flash('error', 'This flat already has an active registered owner. Please contact the committee.');
                redirect('/resident/link-flat?society_id=' . $societyId);
            }
        }

        Database::insert('society_members', [
            'society_id' => $societyId,
            'flat_id' => $flatId,
            'user_id' => $userId,
            'role' => $role === 'tenant' ? 'tenant' : 'owner',
            'status' => 'pending',
            'ownership_type' => $role === 'tenant' ? 'tenant' : 'owner',
        ]);

        // Send notifications to society committee members
        try {
            $committeeMembers = Database::fetchAll("
                SELECT DISTINCT sm.user_id 
                FROM society_members sm 
                JOIN users u ON sm.user_id = u.id 
                WHERE sm.society_id = ? AND sm.status = 'active' 
                  AND (sm.role IN ('chairman', 'secretary', 'treasurer', 'committee') OR u.role = 'committee')
            ", [$societyId]);

            $flatInfo = Database::fetchOne("SELECT wing, flat_no FROM flats WHERE id = ?", [$flatId]);
            $flatLabel = ($flatInfo['wing'] ? $flatInfo['wing'] . '-' : '') . ($flatInfo['flat_no'] ?? '');
            $userObj = getUser();
            $requesterName = $userObj['name'] ?? 'A resident';

            foreach ($committeeMembers as $cm) {
                Database::insert('notifications', [
                    'user_id' => $cm['user_id'],
                    'title' => 'New Flat Linking Request',
                    'message' => "{$requesterName} requested to link unit {$flatLabel} as " . ($role === 'tenant' ? 'Tenant' : 'Owner') . ".",
                    'type' => 'flat_request',
                    'action_url' => '/comitee/requests',
                    'is_read' => 0,
                ]);
            }
        } catch (\Throwable $e) {
            error_log("Failed to create committee notifications for flat request: " . $e->getMessage());
        }

        Session::flash('success', 'Your flat linking request has been submitted to the managing committee.');
        redirect('/resident');
    }

    /**
     * Flat Owner toggle rent availability (legacy quick action)
     */
    public function toggleFlatRent(int $flatId)
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/resident');
        }

        // Verify the user is an active owner of this flat
        $membership = Database::fetchOne("
            SELECT sm.id, f.wing, f.flat_no, f.is_for_rent, f.occupancy_status 
            FROM society_members sm 
            JOIN flats f ON sm.flat_id = f.id 
            WHERE sm.flat_id = ? AND sm.user_id = ? AND (sm.ownership_type = 'owner' OR sm.role != 'tenant') AND sm.status = 'active'
        ", [$flatId, $userId]);

        if (!$membership) {
            Session::flash('error', 'Only the flat owner can toggle rent availability.');
            redirect('/resident');
        }

        $newStatus = ($membership['occupancy_status'] === 'available_for_rent' || $membership['is_for_rent']) ? 0 : 1;
        $newOccupancy = $newStatus ? 'available_for_rent' : 'self_occupied';

        Database::update('flats', [
            'is_for_rent' => $newStatus,
            'occupancy_status' => $newOccupancy
        ], 'id = ?', [$flatId]);

        Session::flash('success', "Unit {$membership['wing']}-{$membership['flat_no']} status updated to " . ($newStatus ? 'Available for Rent' : 'Self occupied') . ".");
        redirect('/resident');
    }

    /**
     * Update Flat Occupancy Status [Self occupied | Available for rent | Rented] with required parameters
     */
    public function updateFlatOccupancy(int $flatId)
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        $isAjax = (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') 
            || (isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json'));

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            if ($isAjax) {
                header('Content-Type: application/json');
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid security token. Please refresh the page and try again.']);
                exit;
            }
            Session::flash('error', 'Invalid security token.');
            redirect('/resident');
        }

        $membership = Database::fetchOne("
            SELECT sm.id, sm.society_id, f.wing, f.flat_no 
            FROM society_members sm 
            JOIN flats f ON sm.flat_id = f.id 
            WHERE sm.flat_id = ? AND sm.user_id = ? AND (sm.ownership_type = 'owner' OR sm.role != 'tenant') AND sm.status = 'active'
        ", [$flatId, $userId]);

        if (!$membership) {
            if ($isAjax) {
                header('Content-Type: application/json');
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Only the flat owner can update occupancy and rental status.']);
                exit;
            }
            Session::flash('error', 'Only the flat owner can update occupancy and rental status.');
            redirect('/resident');
        }

        $occupancy = trim($_POST['occupancy_status'] ?? 'self_occupied');
        if (!in_array($occupancy, ['self_occupied', 'available_for_rent', 'rented'])) {
            $occupancy = 'self_occupied';
        }

        $isForRent = ($occupancy === 'available_for_rent') ? 1 : 0;
        $expectedRent = !empty($_POST['expected_rent']) ? (float)$_POST['expected_rent'] : null;
        if ($occupancy === 'rented' && !empty($_POST['expected_rent_rented'])) {
            $expectedRent = (float)$_POST['expected_rent_rented'];
        }
        $securityDeposit = !empty($_POST['security_deposit']) ? (float)$_POST['security_deposit'] : null;
        $availableFrom = !empty($_POST['available_from']) ? trim($_POST['available_from']) : null;
        $rentalNotes = !empty($_POST['rental_notes']) ? trim($_POST['rental_notes']) : null;

        $tenantUserId = !empty($_POST['tenant_user_id']) ? (int)$_POST['tenant_user_id'] : null;
        $tenantName = !empty($_POST['tenant_name']) ? trim($_POST['tenant_name']) : null;
        $tenantPhone = !empty($_POST['tenant_phone']) ? trim($_POST['tenant_phone']) : null;
        $leaseEndDate = !empty($_POST['lease_end_date']) ? trim($_POST['lease_end_date']) : null;

        if ($tenantUserId) {
            $tUser = Database::fetchOne("SELECT id, name, phone, email, user_type FROM users WHERE id = ?", [$tenantUserId]);
            if ($tUser) {
                if (empty($tenantName)) $tenantName = $tUser['name'];
                if (empty($tenantPhone)) $tenantPhone = $tUser['phone'];
            }
        }

        Database::update('flats', [
            'occupancy_status' => $occupancy,
            'is_for_rent' => $isForRent,
            'expected_rent' => $expectedRent,
            'security_deposit' => $securityDeposit,
            'available_from' => $availableFrom,
            'rental_notes' => $rentalNotes,
            'tenant_name' => $tenantName,
            'tenant_phone' => $tenantPhone,
            'lease_end_date' => $leaseEndDate,
        ], 'id = ?', [$flatId]);

        if ($occupancy === 'rented') {
            if ($tenantUserId) {
                $existingTenantSm = Database::fetchOne("
                    SELECT id FROM society_members 
                    WHERE society_id = ? AND flat_id = ? AND user_id = ?
                ", [$membership['society_id'], $flatId, $tenantUserId]);

                if ($existingTenantSm) {
                    Database::update('society_members', [
                        'role' => 'tenant',
                        'ownership_type' => 'tenant',
                        'status' => 'active',
                        'approved_by' => $userId,
                        'approved_at' => date('Y-m-d H:i:s'),
                    ], 'id = ?', [$existingTenantSm['id']]);
                } else {
                    Database::insert('society_members', [
                        'society_id' => $membership['society_id'],
                        'flat_id' => $flatId,
                        'user_id' => $tenantUserId,
                        'role' => 'tenant',
                        'ownership_type' => 'tenant',
                        'status' => 'active',
                        'approved_by' => $userId,
                        'approved_at' => date('Y-m-d H:i:s'),
                    ]);
                }
                Database::query("UPDATE users SET user_type = 'tenant' WHERE id = ? AND user_type != 'admin'", [$tenantUserId]);
            }
        } else {
            Database::query("
                UPDATE society_members 
                SET status = 'unlinked' 
                WHERE flat_id = ? AND role = 'tenant' AND status = 'active'
            ", [$flatId]);
        }

        $labels = [
            'self_occupied' => 'Self occupied',
            'available_for_rent' => 'Available for rent',
            'rented' => 'Rented'
        ];

        if ($isAjax) {
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'message' => "Flat {$membership['wing']}-{$membership['flat_no']} status updated to {$labels[$occupancy]}."]);
            exit;
        }

        Session::flash('success', "Flat {$membership['wing']}-{$membership['flat_no']} status updated to {$labels[$occupancy]}.");
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
            redirect('/user/profile');
        }

        if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
            Session::flash('error', 'Please select a valid image file.');
            redirect('/user/profile');
        }

        $file = $_FILES['photo'];
        $allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($file['type'], $allowed)) {
            Session::flash('error', 'Only JPG, PNG, or WEBP images are allowed.');
            redirect('/user/profile');
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

        redirect('/user/profile');
    }

    public function notifications()
    {
        requireLogin();
        $user = getUser();
        $userId = (int)Session::get('user_id');

        $where = ["(user_id = ? OR (user_id IS NULL AND type = 'announcement'))"];
        $params = [$userId];

        // Proposal approvals show in Societies Management only, not in notification feed
        $where[] = "type != 'society_proposal'";

        $whereClause = implode(' AND ', $where);
        $notifications = Database::fetchAll(
            "SELECT * FROM notifications WHERE {$whereClause} ORDER BY created_at DESC LIMIT 50",
            $params
        );
        $profile = $user;

        echo view('resident/notifications', [
            'basePath' => '/',
            'user' => $user,
            'notifications' => $notifications,
            'csrfToken' => generateCSRFToken(),
            'profile' => $profile,
            'currentRoute' => '/user/notification',
        ]);
    }

    public function markNotificationsRead()
    {
        requireLogin();
        if (verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Database::update('notifications', ['is_read' => 1], '(user_id = ? OR user_id IS NULL) AND is_read = 0', [Session::get('user_id')]);
        }
        redirect('/user/notification');
    }

    public function toggleNotificationRead(int $id)
    {
        requireLogin();
        $userId = (int)Session::get('user_id');
        $notif = Database::fetchOne("SELECT id, is_read FROM notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL)", [$id, $userId]);
        $newStatus = 1;
        if ($notif) {
            $newStatus = $notif['is_read'] ? 0 : 1;
            Database::update('notifications', ['is_read' => $newStatus], 'id = ?', [$id]);
        }
        if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'is_read' => $newStatus]);
            exit;
        }
        redirect('/user/notification');
    }

    public function markSingleNotificationRead(int $id)
    {
        requireLogin();
        $userId = (int)Session::get('user_id');
        Database::update('notifications', ['is_read' => 1], 'id = ? AND (user_id = ? OR user_id IS NULL)', [$id, $userId]);
        if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
            header('Content-Type: application/json');
            echo json_encode(['success' => true]);
            exit;
        }
        redirect('/user/notification');
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
            'activeTab' => $_GET['tab'] ?? 'personal',
            'csrfToken' => generateCSRFToken(),
            'flash' => Session::getFlash(),
            'currentRoute' => '/user/profile',
        ]);
    }

    public function updateProfile()
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid request.');
            redirect('/user/profile');
        }

        $name = trim($_POST['name'] ?? '');
        $phone = trim($_POST['phone'] ?? '');

        if (empty($name)) {
            Session::flash('error', 'Full Name is required.');
            redirect('/user/profile');
        }

        $isWhatsapp = !empty($_POST['is_whatsapp']) ? 1 : 0;
        $rawPhone = preg_replace('/[^0-9]/', '', $phone);
        $formattedPhone = $rawPhone ? (strlen($rawPhone) === 10 ? '+91 ' . $rawPhone : '+' . $rawPhone) : null;

        $userData = [
            'name' => $name,
            'phone' => $formattedPhone,
            'is_whatsapp' => $isWhatsapp,
        ];

        Database::update('users', $userData, 'id = ?', [$userId]);

        Session::flash('success', 'Personal information updated successfully!');
        redirect('/user/profile');
    }

    public function updatePassword()
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/user/profile?tab=password');
        }

        $user = Database::fetchOne("SELECT password_hash FROM users WHERE id = ?", [$userId]);
        $currentPassword = $_POST['current_password'] ?? '';
        $newPassword = $_POST['new_password'] ?? '';
        $confirmPassword = $_POST['confirm_password'] ?? '';

        if (!empty($user['password_hash']) && !password_verify($currentPassword, $user['password_hash'])) {
            Session::flash('error', 'Current password is incorrect.');
            redirect('/user/profile?tab=password');
        }

        if (strlen($newPassword) < 6) {
            Session::flash('error', 'New password must be at least 6 characters.');
            redirect('/user/profile?tab=password');
        }

        if ($newPassword !== $confirmPassword) {
            Session::flash('error', 'New passwords do not match.');
            redirect('/user/profile?tab=password');
        }

        Database::update('users', ['password_hash' => password_hash($newPassword, PASSWORD_DEFAULT)], 'id = ?', [$userId]);
        Session::flash('success', 'Password updated successfully!');
        redirect('/user/profile?tab=password');
    }

    public function updateEmergencyContact()
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/user/profile?tab=emergency');
        }

        $name = trim($_POST['emergency_contact_name'] ?? '');
        $phone = trim($_POST['emergency_contact_phone'] ?? '');

        Database::update('users', [
            'emergency_contact_name' => $name ?: null,
            'emergency_contact_phone' => $phone ?: null,
        ], 'id = ?', [$userId]);

        Session::flash('success', 'Emergency contact saved successfully!');
        redirect('/user/profile?tab=emergency');
    }

    public function updatePin()
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/user/profile?tab=pin');
        }

        $pin = trim($_POST['pin'] ?? '');
        $confirmPin = trim($_POST['confirm_pin'] ?? '');

        if (!preg_match('/^[0-9]{4}$/', $pin)) {
            Session::flash('error', 'PIN must be exactly 4 digits.');
            redirect('/user/profile?tab=pin');
        }

        if ($pin !== $confirmPin) {
            Session::flash('error', 'PIN numbers do not match.');
            redirect('/user/profile?tab=pin');
        }

        Database::update('users', ['pin_hash' => password_hash($pin, PASSWORD_DEFAULT)], 'id = ?', [$userId]);
        Session::flash('success', 'Security PIN saved successfully!');
        redirect('/user/profile?tab=pin');
    }

    public function disconnectGoogle()
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            Session::flash('error', 'Invalid security token.');
            redirect('/user/profile?tab=accounts');
        }

        $user = getUser();
        if (empty($user['password_hash'])) {
            Session::flash('error', 'Please set an account password in "Change Password" before unlinking your Google account.');
            redirect('/user/profile?tab=password');
        }

        Database::query("UPDATE users SET google_id = NULL WHERE id = ?", [$userId]);
        Session::flash('success', 'Google account unlinked successfully.');
        redirect('/user/profile?tab=accounts');
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

    public function switchSociety(int $id): void
    {
        requireLogin();
        $userId = (int)Session::get('user_id');

        $member = Database::fetchOne("
            SELECT id FROM society_members 
            WHERE user_id = ? AND society_id = ? AND status = 'active'
            LIMIT 1
        ", [$userId, $id]);

        if ($member) {
            Session::put('active_society_id', $id);
            Session::flash('success', 'Switched society context.');
        } else {
            Session::flash('error', 'You are not an active member of this society.');
        }

        $referer = $_SERVER['HTTP_REFERER'] ?? '/resident';
        redirect($referer);
    }
}

