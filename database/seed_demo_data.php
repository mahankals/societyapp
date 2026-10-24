<?php
/**
 * SocietyApp Comprehensive Demo Data Seeder
 * Populates realistic data across all modules so no table is empty.
 */

define('ROOT_PATH', dirname(__DIR__));
define('APP_PATH', ROOT_PATH . '/app');
require_once ROOT_PATH . '/vendor/autoload.php';
require_once APP_PATH . '/core/Database.php';
require_once APP_PATH . '/core/helpers.php';

$db = Database::getInstance();

echo "Seeding comprehensive demo data for SocietyApp...\n";

// 1. Ensure Societies exist
$db->exec("
INSERT INTO societies (id, name, society_code, registration_no, address, city, state, pincode, upi_id, payee_name, is_active)
VALUES 
(1, 'Green Valley Heights CHS', 'GVH-PUN-01', 'MAH/PUN/2021/1042', 'Survey No 45/2, Baner Road', 'Pune', 'Maharashtra', '411045', 'society@upi', 'Green Valley CHS', 1),
(2, 'Silver Oak Cooperative Housing Society', 'SOAK-MUM-02', 'MAH/MUM/2019/8821', 'Plot 12, Sector 15, Vashi', 'Navi Mumbai', 'Maharashtra', '400703', 'silveroak@upi', 'Silver Oak Housing Society', 1),
(3, 'Gokuldham Residency', 'GOKUL-PUN-03', 'MAH/PUN/2023/3312', 'Kalyani Nagar, Near Joggers Park', 'Pune', 'Maharashtra', '411006', 'gokuldham@okaxis', 'Gokuldham CHS', 1)
ON DUPLICATE KEY UPDATE 
name=VALUES(name), society_code=VALUES(society_code), city=VALUES(city), state=VALUES(state), pincode=VALUES(pincode), upi_id=VALUES(upi_id), payee_name=VALUES(payee_name), is_active=1;
");

// 2. Ensure Users exist
$passwordHash = password_hash('password123', PASSWORD_DEFAULT);

$users = [
    [1, 'atulmahankal@gmail.com', 'Atul Mahankal', '9876543210', 'admin', 'resident'],
    [2, 'supriyamahankal@gmail.com', 'Supriya Mahankal', '9876543211', 'committee', 'resident'],
    [3, 'rahul.sharma@example.com', 'Rahul Sharma (Treasurer)', '9876543212', 'committee', 'resident'],
    [4, 'priya.patel@example.com', 'Priya Patel', '9876543213', 'resident', 'resident'],
    [5, 'vikram.singh@example.com', 'Vikram Singh (Tenant)', '9876543214', 'resident', 'tenant'],
    [6, 'neha.deshmukh@example.com', 'Neha Deshmukh', '9876543215', 'resident', 'resident'],
    [7, 'amit.joshi@example.com', 'Amit Joshi', '9876543216', 'resident', 'resident'],
    [8, 'sunita.verma@example.com', 'Sunita Verma', '9876543217', 'resident', 'resident'],
];

foreach ($users as $u) {
    $existing = Database::fetchOne("SELECT id FROM users WHERE email = ?", [$u[1]]);
    if ($existing) {
        Database::update('users', [
            'name' => $u[2],
            'phone' => $u[3],
            'role' => $u[4],
            'user_type' => $u[5],
            'is_active' => 1,
        ], 'id = ?', [$existing['id']]);
    } else {
        Database::insert('users', [
            'id' => $u[0],
            'email' => $u[1],
            'password_hash' => $passwordHash,
            'name' => $u[2],
            'phone' => $u[3],
            'role' => $u[4],
            'user_type' => $u[5],
            'is_active' => 1,
        ]);
    }
}

// 3. Populate Flats for Society 1 and 2
$db->exec("DELETE FROM flats WHERE society_id IN (1, 2, 3);");

$flats = [
    // Society 1
    [1, '101', 'A', '1', 950.00, '2BHK', 0, 'self_occupied', NULL, NULL, NULL, NULL, NULL, NULL, NULL],
    [1, '102', 'A', '1', 950.00, '2BHK', 0, 'self_occupied', NULL, NULL, NULL, NULL, NULL, NULL, NULL],
    [1, '103', 'A', '1', 1250.00, '3BHK', 1, 'rented', 28000.00, 75000.00, '2026-01-01', 'Family tenant', 'Vikram Singh', '9876543214', '2027-01-01'],
    [1, '104', 'A', '1', 650.00, '1BHK', 1, 'available_for_rent', 16000.00, 45000.00, '2026-11-01', 'Furnished with AC & Geyser', NULL, NULL, NULL],
    [1, '201', 'B', '2', 1100.00, '2.5BHK', 0, 'self_occupied', NULL, NULL, NULL, NULL, NULL, NULL, NULL],
    [1, '202', 'B', '2', 1100.00, '2.5BHK', 0, 'self_occupied', NULL, NULL, NULL, NULL, NULL, NULL, NULL],
    [1, '203', 'B', '2', 1400.00, '3BHK', 1, 'available_for_rent', 32000.00, 90000.00, '2026-11-15', 'Spacious garden view flat', NULL, NULL, NULL],
    [1, '301', 'C', '3', 950.00, '2BHK', 0, 'self_occupied', NULL, NULL, NULL, NULL, NULL, NULL, NULL],
    [1, '302', 'C', '3', 950.00, '2BHK', 0, 'self_occupied', NULL, NULL, NULL, NULL, NULL, NULL, NULL],
    [1, '303', 'C', '3', 1200.00, '3BHK', 0, 'self_occupied', NULL, NULL, NULL, NULL, NULL, NULL, NULL],
    // Unlinked flat for testing /resident/link-flat
    [1, '401', 'C', '4', 980.00, '2BHK', 0, 'self_occupied', NULL, NULL, NULL, NULL, NULL, NULL, NULL],
    [1, '402', 'C', '4', 1150.00, '3BHK', 1, 'available_for_rent', 25000.00, 60000.00, '2026-12-01', 'Available from December', NULL, NULL, NULL],
    
    // Society 2
    [2, '101', 'Wing 1', '1', 850.00, '2BHK', 0, 'self_occupied', NULL, NULL, NULL, NULL, NULL, NULL, NULL],
    [2, '102', 'Wing 1', '1', 1050.00, '3BHK', 1, 'available_for_rent', 22000.00, 50000.00, '2026-11-01', 'Freshly painted', NULL, NULL, NULL],
];

foreach ($flats as $f) {
    Database::insert('flats', [
        'society_id' => $f[0],
        'flat_no' => $f[1],
        'wing' => $f[2],
        'floor' => $f[3],
        'area_sqft' => $f[4],
        'flat_type' => $f[5],
        'is_for_rent' => $f[6],
        'occupancy_status' => $f[7],
        'expected_rent' => $f[8],
        'security_deposit' => $f[9],
        'available_from' => $f[10],
        'rental_notes' => $f[11],
        'tenant_name' => $f[12],
        'tenant_phone' => $f[13],
        'lease_end_date' => $f[14],
    ]);
}

$f101 = Database::fetchOne("SELECT id FROM flats WHERE society_id = 1 AND flat_no = '101' AND wing = 'A'")['id'];
$f102 = Database::fetchOne("SELECT id FROM flats WHERE society_id = 1 AND flat_no = '102' AND wing = 'A'")['id'];
$f103 = Database::fetchOne("SELECT id FROM flats WHERE society_id = 1 AND flat_no = '103' AND wing = 'A'")['id'];
$f201 = Database::fetchOne("SELECT id FROM flats WHERE society_id = 1 AND flat_no = '201' AND wing = 'B'")['id'];
$f202 = Database::fetchOne("SELECT id FROM flats WHERE society_id = 1 AND flat_no = '202' AND wing = 'B'")['id'];
$f301 = Database::fetchOne("SELECT id FROM flats WHERE society_id = 1 AND flat_no = '301' AND wing = 'C'")['id'];

// 4. Society Memberships
$db->exec("DELETE FROM society_members WHERE society_id IN (1, 2, 3);");

$memberships = [
    // User 1 (Atul) - Chairman of Society 1, Flat A-101
    [1, $f101, 1, 'chairman', 'active', 'owner', 'Founding chairman'],
    // User 2 (Supriya) - Secretary of Society 1, Flat A-102
    [1, $f102, 2, 'secretary', 'active', 'owner', 'Secretary'],
    // User 3 (Rahul) - Treasurer of Society 1, Flat B-201
    [1, $f201, 3, 'treasurer', 'active', 'owner', 'Treasurer'],
    // User 4 (Priya) - Owner of Flat B-202
    [1, $f202, 4, 'owner', 'active', 'owner', 'Resident member'],
    // User 5 (Vikram) - Tenant of Flat A-103
    [1, $f103, 5, 'tenant', 'active', 'tenant', 'Verified tenant'],
    // User 6 (Neha) - Owner of Flat C-301
    [1, $f301, 6, 'owner', 'active', 'owner', 'Resident member'],
    // User 7 (Amit) - Pending Request for Flat C-302
    [1, Database::fetchOne("SELECT id FROM flats WHERE society_id = 1 AND flat_no = '302'")['id'], 7, 'owner', 'pending', 'owner', 'Submitted ownership deed'],
    // User 8 (Sunita) - Rejected request for Flat C-303
    [1, Database::fetchOne("SELECT id FROM flats WHERE society_id = 1 AND flat_no = '303'")['id'], 8, 'owner', 'rejected', 'owner', 'Documents incomplete - please upload registered index 2'],
];

foreach ($memberships as $m) {
    Database::insert('society_members', [
        'society_id' => $m[0],
        'flat_id' => $m[1],
        'user_id' => $m[2],
        'role' => $m[3],
        'status' => $m[4],
        'ownership_type' => $m[5],
        'notes' => $m[6],
        'rejection_reason' => ($m[4] === 'rejected') ? $m[6] : NULL,
        'approved_by' => ($m[4] === 'active') ? 1 : NULL,
        'approved_at' => ($m[4] === 'active') ? date('Y-m-d H:i:s') : NULL,
    ]);
}

// 5. Maintenance Bills
$db->exec("DELETE FROM maintenance_bills WHERE society_id IN (1, 2);");

$currentMonth = date('Y-m');
$prevMonth1 = date('Y-m', strtotime('-1 month'));
$prevMonth2 = date('Y-m', strtotime('-2 months'));

$bills = [
    // User 1 bills
    [1, 1, $f101, 'BILL-2026-10-001', 'Monthly Maintenance - October 2026', 'Maintenance charges + Water & Sinking fund', 2850.00, $currentMonth, date('Y-m-25'), 'pending', NULL, NULL, NULL],
    [1, 1, $f101, 'BILL-2026-09-001', 'Monthly Maintenance - September 2026', 'Maintenance charges + Water & Sinking fund', 2850.00, $prevMonth1, date('Y-m-25', strtotime('-1 month')), 'paid', date('Y-m-10 14:30:00', strtotime('-1 month')), 'upi', 'UPI-TXN-902184'],
    [1, 1, $f101, 'BILL-2026-08-001', 'Monthly Maintenance - August 2026', 'Maintenance charges + Water & Sinking fund', 2850.00, $prevMonth2, date('Y-m-25', strtotime('-2 months')), 'paid', date('Y-m-08 11:15:00', strtotime('-2 months')), 'upi', 'UPI-TXN-874211'],
    
    // User 2 bills
    [2, 1, $f102, 'BILL-2026-10-002', 'Monthly Maintenance - October 2026', 'Maintenance charges', 2850.00, $currentMonth, date('Y-m-25'), 'pending', NULL, NULL, NULL],
    [2, 1, $f102, 'BILL-2026-09-002', 'Monthly Maintenance - September 2026', 'Maintenance charges', 2850.00, $prevMonth1, date('Y-m-25', strtotime('-1 month')), 'paid', date('Y-m-12 10:00:00', strtotime('-1 month')), 'upi', 'UPI-TXN-904512'],
    
    // User 4 bills (Overdue)
    [4, 1, $f202, 'BILL-2026-10-004', 'Monthly Maintenance - October 2026', 'Maintenance charges', 3300.00, $currentMonth, date('Y-m-25'), 'pending', NULL, NULL, NULL],
    [4, 1, $f202, 'BILL-2026-09-004', 'Monthly Maintenance - September 2026', 'Maintenance charges + Late Fee', 3300.00, $prevMonth1, date('Y-m-25', strtotime('-1 month')), 'overdue', NULL, NULL, NULL],
    
    // User 6 bills
    [6, 1, $f301, 'BILL-2026-10-006', 'Monthly Maintenance - October 2026', 'Maintenance charges', 2850.00, $currentMonth, date('Y-m-25'), 'paid', date('Y-m-05 09:20:00'), 'upi', 'UPI-TXN-998812'],
];

foreach ($bills as $b) {
    Database::insert('maintenance_bills', [
        'user_id' => $b[0],
        'society_id' => $b[1],
        'flat_id' => $b[2],
        'bill_number' => $b[3],
        'title' => $b[4],
        'particulars' => $b[5],
        'amount' => $b[6],
        'month' => $b[7],
        'due_date' => $b[8],
        'status' => $b[9],
        'paid_at' => $b[10],
        'payment_method' => $b[11],
        'transaction_id' => $b[12],
    ]);
}

// 6. Transactions & Payment Receipts
$db->exec("DELETE FROM transactions WHERE society_id IN (1, 2);");

$transactions = [
    ['RCP-2026-09-001', 1, $f101, 1, 2850.00, 'upi', 'UPI-TXN-902184', 'September 2026 Maintenance Bill', date('Y-m-10', strtotime('-1 month')), 'completed', 'Verified by Treasurer', 3],
    ['RCP-2026-08-001', 1, $f101, 1, 2850.00, 'upi', 'UPI-TXN-874211', 'August 2026 Maintenance Bill', date('Y-m-08', strtotime('-2 months')), 'completed', 'Verified by Treasurer', 3],
    ['RCP-2026-09-002', 1, $f102, 2, 2850.00, 'upi', 'UPI-TXN-904512', 'September 2026 Maintenance Bill', date('Y-m-12', strtotime('-1 month')), 'completed', 'Verified by Treasurer', 3],
    ['RCP-2026-10-006', 1, $f301, 6, 2850.00, 'upi', 'UPI-TXN-998812', 'October 2026 Maintenance Bill', date('Y-m-05'), 'completed', 'Automated UPI reconciliation', 1],
    ['RCP-2026-10-007', 1, $f202, 4, 3300.00, 'upi', 'UPI-TXN-991144', 'Advance Sinking Fund Contribution', date('Y-m-18'), 'pending', 'Under committee verification', NULL],
    ['RCP-2026-10-008', 1, $f103, 5, 500.00, 'cash', 'CASH-REC-102', 'Clubhouse Badminton Court Booking', date('Y-m-20'), 'completed', 'Received in society office', 2],
];

foreach ($transactions as $t) {
    Database::insert('transactions', [
        'receipt_no' => $t[0],
        'society_id' => $t[1],
        'flat_id' => $t[2],
        'user_id' => $t[3],
        'amount' => $t[4],
        'payment_method' => $t[5],
        'transaction_ref' => $t[6],
        'particulars' => $t[7],
        'payment_date' => $t[8],
        'status' => $t[9],
        'remark' => $t[10],
        'reviewed_by' => $t[11],
        'reviewed_at' => ($t[9] === 'completed') ? date('Y-m-d H:i:s') : NULL,
    ]);
}

// 7. Complaints
$db->exec("DELETE FROM complaints;");

$complaints = [
    [1, 'Intermittent Elevator Stoppage in Wing B', 'Passenger elevator stops between 2nd and 3rd floor intermittently. Urgent inspection needed.', 'Maintenance', 'investigating', 'AMC engineer technician booked for Tuesday 11 AM inspection.'],
    [4, 'Water Seepage Near Basement Parking Bay 14', 'Noticeable water dripping from ceiling above parking slot 14.', 'Infrastructure', 'open', NULL],
    [6, 'Flickering Streetlight on East Gate Pathway', 'Lamp post #4 near children play area is flickering constantly at night.', 'Electrical', 'resolved', 'LED fixture and starter replaced by facility electrician.'],
    [2, 'Garbage Collection Delay on 3rd Floor', 'Housekeeping staff missed dry waste pickup on Saturday.', 'Housekeeping', 'closed', 'Housekeeping supervisor warned, pickup completed.'],
];

foreach ($complaints as $c) {
    Database::insert('complaints', [
        'user_id' => $c[0],
        'title' => $c[1],
        'description' => $c[2],
        'category' => $c[3],
        'status' => $c[4],
        'resolution' => $c[5],
    ]);
}

// 8. Service Requests
$db->exec("DELETE FROM service_requests;");

$requests = [
    [1, 'Plumbing & Tap Aerator Repair', 'Kitchen main sink faucet leaking water when main valve is opened.', 'medium', 'in_progress', 3],
    [2, 'Intercom Unit Handset Replacement', 'Intercom audio is not transmitting clearly to main gate security.', 'low', 'pending', NULL],
    [5, 'RFID Vehicle Sticker Issue', 'New resident car sticker request for slot A-103.', 'high', 'completed', 2],
    [4, 'Clubhouse Hall Booking for Birthday', 'Requesting community hall for 4 hours on Saturday evening.', 'urgent', 'completed', 1],
];

foreach ($requests as $r) {
    Database::insert('service_requests', [
        'user_id' => $r[0],
        'category' => $r[1],
        'description' => $r[2],
        'priority' => $r[3],
        'status' => $r[4],
        'assigned_to' => $r[5],
        'resolved_at' => ($r[4] === 'completed') ? date('Y-m-d H:i:s') : NULL,
    ]);
}

// 9. Documents
$db->exec("DELETE FROM documents;");

$docs = [
    [1, 'Society Registered Bye-Laws & Constitution', '/uploads/documents/society_byelaws_2026.pdf', 'pdf', 2450000, 'Official cooperative housing society bye-laws registered with Registrar.', 1, 1],
    [1, 'Annual General Meeting (AGM) Minutes 2026', '/uploads/documents/agm_minutes_2026.pdf', 'pdf', 850000, 'Approved minutes of meeting held on August 15, 2026.', 1, 1],
    [1, 'Statutory Financial Audit Report FY 2025-26', '/uploads/documents/audit_report_2025_2026.pdf', 'pdf', 1420000, 'Audited financial statements and auditor balance sheet report.', 1, 1],
    [1, 'Building Comprehensive Fire Safety NOC', '/uploads/documents/fire_safety_noc_2026.pdf', 'pdf', 620000, 'Fire safety system compliance certificate valid till Dec 2027.', 1, 1],
    [1, 'Structural Stability & Lift Inspection Certificate', '/uploads/documents/lift_stability_cert.pdf', 'pdf', 410000, 'Elevator safety inspector compliance certificate.', 1, 1],
];

foreach ($docs as $d) {
    Database::insert('documents', [
        'user_id' => $d[0],
        'name' => $d[1],
        'file_path' => $d[2],
        'file_type' => $d[3],
        'file_size' => $d[4],
        'description' => $d[5],
        'is_verified' => $d[6],
        'verified_by' => $d[7],
        'verified_at' => date('Y-m-d H:i:s'),
    ]);
}

// 10. Notifications
$db->exec("DELETE FROM notifications;");

$notifications = [
    [NULL, 'Annual Diwali Cultural Night & Dinner', 'Join us on Sunday 27th October at 7:00 PM in the central garden lawn for cultural performances and community dinner.', 'announcement', '/resident'],
    [NULL, 'Quarterly Overhead Water Tank Cleaning', 'Water supply will be suspended on Wednesday between 10:00 AM and 2:00 PM for scheduled tank sanitization.', 'warning', '/resident'],
    [1, 'Maintenance Bill Generated for October 2026', 'Your maintenance invoice of ₹2,850.00 for Flat A-101 has been generated. Due date: 25th Oct.', 'info', '/resident/bills'],
    [1, 'Payment Confirmation: September Maintenance', 'Payment receipt RCP-2026-09-001 of ₹2,850.00 has been verified and added to your ledger.', 'success', '/resident/receipts'],
    [1, 'New Flat Linking Request from Amit Joshi', 'Amit Joshi requested flat ownership linking for Unit C-302. Review in committee portal.', 'info', '/comitee/members'],
    [2, 'Committee Meeting Scheduled for Friday', 'Monthly managing committee review meeting at society office at 8:30 PM.', 'announcement', '/comitee'],
];

foreach ($notifications as $n) {
    Database::insert('notifications', [
        'user_id' => $n[0],
        'title' => $n[1],
        'message' => $n[2],
        'type' => $n[3],
        'action_url' => $n[4],
        'is_read' => 0,
    ]);
}

// 11. Society Requests (Contribute Proposals for Admin)
$db->exec("DELETE FROM society_requests;");

$proposals = [
    [1, 'Sunrise Heights Cooperative Housing Society', 'Pune', 'Maharashtra', '411038', 'Kothrud, Near MIT College Road', 'Manoj Kulkarni', '9822011223', 'A-101', 'Anjali Joshi', '9822011224', 'A-102', 'Suresh Shinde', '9822011225', 'B-201', 'Deepak More', '9822011226', 'B-202', 'pending', NULL],
    [4, 'Palm Grove Residents Welfare Society', 'Mumbai', 'Maharashtra', '400053', 'Andheri West, Lokhandwala Complex', 'Rajesh Khanna', '9819001122', '101', 'Sunita Rao', '9819001123', '102', 'Pooja Mehta', '9819001124', '201', 'Karan Johar', '9819001125', '202', 'approved', NULL],
    [6, 'Royal Orchid Society', 'Nashik', 'Maharashtra', '422005', 'Gangapur Road, Near Horizon Hospital', 'Sanjay Patil', '9422001122', 'A-1', 'Nitin Gadgil', '9422001123', 'A-2', NULL, NULL, NULL, NULL, NULL, NULL, 'rejected', 'At least 4 founding committee members are required for onboarding proposal.'],
];

foreach ($proposals as $p) {
    Database::insert('society_requests', [
        'user_id' => $p[0],
        'society_name' => $p[1],
        'city' => $p[2],
        'state' => $p[3],
        'pincode' => $p[4],
        'address' => $p[5],
        'contact1_name' => $p[6],
        'contact1_phone' => $p[7],
        'contact1_flat' => $p[8],
        'contact2_name' => $p[9],
        'contact2_phone' => $p[10],
        'contact2_flat' => $p[11],
        'contact3_name' => $p[12],
        'contact3_phone' => $p[13],
        'contact3_flat' => $p[14],
        'contact4_name' => $p[15],
        'contact4_phone' => $p[16],
        'contact4_flat' => $p[17],
        'status' => $p[18],
        'rejection_reason' => $p[19],
    ]);
}

// 12. Account Heads & Accounting for Society 1
$db->exec("DELETE FROM account_heads WHERE society_id = 1;");

$heads = [
    ['1001', 'Bank Current Account (HDFC Bank)', 'asset', 485200.00, 'Primary operating account', 1],
    ['1002', 'Sinking Fund Fixed Deposit (SBI)', 'asset', 1250000.00, 'Statutory long-term reserve FD', 1],
    ['2001', 'Vendor Payables', 'liability', 18500.00, 'Outstanding contractor bills', 1],
    ['3001', 'Member Maintenance Collections', 'income', 0.00, 'Monthly maintenance revenue', 1],
    ['3002', 'Clubhouse & Facility Hall Charges', 'income', 0.00, 'Rental charges for event halls', 0],
    ['4001', 'Security Personnel Services', 'expense', 0.00, 'Round-the-clock guard staff', 1],
    ['4002', 'Elevator Maintenance AMC', 'expense', 0.00, 'Schindler Lift annual service', 1],
    ['4003', 'Common Area Electricity Charges', 'expense', 0.00, 'MSEDCL monthly power tariff', 1],
];

foreach ($heads as $h) {
    Database::insert('account_heads', [
        'society_id' => 1,
        'code' => $h[0],
        'name' => $h[1],
        'type' => $h[2],
        'opening_balance' => $h[3],
        'description' => $h[4],
        'is_system' => $h[5],
    ]);
}

$secHead = Database::fetchOne("SELECT id FROM account_heads WHERE society_id = 1 AND code = '4001'")['id'];
$liftHead = Database::fetchOne("SELECT id FROM account_heads WHERE society_id = 1 AND code = '4002'")['id'];
$elecHead = Database::fetchOne("SELECT id FROM account_heads WHERE society_id = 1 AND code = '4003'")['id'];

$db->exec("DELETE FROM expense_heads WHERE society_id = 1;");

Database::insert('expense_heads', ['society_id' => 1, 'account_head_id' => $secHead, 'name' => 'Monthly Security Agency Charges', 'budget_monthly' => 45000.00]);
Database::insert('expense_heads', ['society_id' => 1, 'account_head_id' => $liftHead, 'name' => 'Lift Quarterly AMC Fee', 'budget_monthly' => 12000.00]);
Database::insert('expense_heads', ['society_id' => 1, 'account_head_id' => $elecHead, 'name' => 'Campus Electricity & Pumps', 'budget_monthly' => 22000.00]);

$eHead1 = Database::fetchOne("SELECT id FROM expense_heads WHERE society_id = 1 AND name LIKE '%Security%'")['id'];
$eHead2 = Database::fetchOne("SELECT id FROM expense_heads WHERE society_id = 1 AND name LIKE '%Lift%'")['id'];
$eHead3 = Database::fetchOne("SELECT id FROM expense_heads WHERE society_id = 1 AND name LIKE '%Electricity%'")['id'];

$db->exec("DELETE FROM expenses WHERE society_id = 1;");

$expenses = [
    [$eHead1, 'VOUCH-2026-10-01', date('Y-m-05'), 45000.00, 'Eagle Eye Security Services Pvt Ltd', 'bank_transfer', 'NEFT-SEC-998822', 'Payment for 4 security guards - Oct', 1],
    [$eHead2, 'VOUCH-2026-09-02', date('Y-m-15', strtotime('-1 month')), 36000.00, 'Schindler India Elevators Ltd', 'bank_transfer', 'NEFT-LIFT-776655', 'Q3 AMC comprehensive contract', 1],
    [$eHead3, 'VOUCH-2026-09-03', date('Y-m-22', strtotime('-1 month')), 18450.00, 'Maharashtra State Electricity Distribution', 'upi', 'UPI-MSEDCL-8899', 'Water pump and common garden lights', 1],
];

foreach ($expenses as $e) {
    Database::insert('expenses', [
        'society_id' => 1,
        'expense_head_id' => $e[0],
        'voucher_no' => $e[1],
        'expense_date' => $e[2],
        'amount' => $e[3],
        'paid_to' => $e[4],
        'payment_mode' => $e[5],
        'reference_no' => $e[6],
        'notes' => $e[7],
        'created_by' => $e[8],
        'status' => 'paid',
    ]);
}

// 13. Donations
$db->exec("DELETE FROM donations WHERE society_id = 1;");

$donations = [
    ['DON-2026-001', 'Ramesh Chandra Parekh', '9822114455', 'ramesh.parekh@example.com', 'ABCDE1234F', 15000.00, 'upi', date('Y-m-12'), 'Contribution for Society Ganesh Festival celebration', 'Voluntary resident contribution', 1],
    ['DON-2026-002', 'Dr. Meena Swaminathan', '9822336677', 'meena.s@example.com', 'PQRS5678K', 25000.00, 'bank_transfer', date('Y-m-18'), 'Solar Rooftop Initiative Seed Fund', 'Donation for energy sustainability initiative', 1],
];

foreach ($donations as $don) {
    Database::insert('donations', [
        'society_id' => 1,
        'receipt_no' => $don[0],
        'donor_name' => $don[1],
        'donor_phone' => $don[2],
        'donor_email' => $don[3],
        'donor_pan' => $don[4],
        'amount' => $don[5],
        'payment_mode' => $don[6],
        'payment_date' => $don[7],
        'purpose' => $don[8],
        'notes' => $don[9],
        'created_by' => $don[10],
    ]);
}

// 14. Events
$db->exec("DELETE FROM events;");

$events = [
    ['Annual General Body Meeting (AGM 2026)', 'Statutory annual general meeting to review FY2026 audited accounts and appoint managing committee.', date('Y-m-28 10:00:00'), 'Society Community Hall & Zoom', 1, 1],
    ['Diwali Cultural Festival & Potluck', 'Diwali celebration with musical performances, rangoli contest, and community buffet.', date('Y-m-30 18:30:00'), 'Central Garden Lawn', 2, 1],
    ['Free Health & Eye Checkup Camp', 'Organized in collaboration with Apollo Clinic for all society residents and staff.', date('Y-m-15 09:00:00', strtotime('+1 month')), 'Society Clubhouse', 1, 1],
];

foreach ($events as $ev) {
    Database::insert('events', [
        'title' => $ev[0],
        'description' => $ev[1],
        'event_date' => $ev[2],
        'location' => $ev[3],
        'organizer_id' => $ev[4],
        'is_public' => $ev[5],
    ]);
}

echo "Demo data seeding completed successfully!\n";
