-- SocietyApp Database Schema
-- Run this SQL to set up the database

CREATE DATABASE IF NOT EXISTS societyapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE societyapp;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    is_whatsapp TINYINT(1) DEFAULT 1,
    google_id VARCHAR(255) NULL UNIQUE,
    profile_photo VARCHAR(255) NULL,
    role ENUM('admin', 'committee', 'resident') DEFAULT 'resident',
    user_type ENUM('admin', 'resident', 'tenant') DEFAULT 'resident',
    address TEXT NULL,
    apartment VARCHAR(50) NULL,
    emergency_contact_name VARCHAR(100) NULL,
    emergency_contact_phone VARCHAR(20) NULL,
    date_of_birth DATE NULL,
    pin_hash VARCHAR(255) NULL,
    is_active TINYINT(1) DEFAULT 1,
    email_verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_google_id (google_id),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Housing Societies Table
CREATE TABLE IF NOT EXISTS societies (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    society_code VARCHAR(50) NOT NULL UNIQUE,
    registration_no VARCHAR(100) NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    pincode VARCHAR(20) NULL,
    upi_id VARCHAR(100) NULL,
    payee_name VARCHAR(100) NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_society_code (society_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Flats / Units Table
CREATE TABLE IF NOT EXISTS flats (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    society_id INT UNSIGNED NOT NULL,
    flat_no VARCHAR(50) NOT NULL,
    wing VARCHAR(20) NULL DEFAULT 'A',
    floor VARCHAR(20) NULL,
    area_sqft DECIMAL(8,2) DEFAULT 0.00,
    flat_type VARCHAR(50) DEFAULT '2BHK',
    is_for_rent TINYINT(1) DEFAULT 0,
    occupancy_status ENUM('self_occupied', 'available_for_rent', 'rented') DEFAULT 'self_occupied',
    expected_rent DECIMAL(10,2) NULL,
    security_deposit DECIMAL(10,2) NULL,
    available_from DATE NULL,
    rental_notes TEXT NULL,
    tenant_name VARCHAR(100) NULL,
    tenant_phone VARCHAR(20) NULL,
    lease_end_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
    INDEX idx_soc_flat (society_id, flat_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Society Members & Flat Assignments (Owner / Committee / Tenant)
CREATE TABLE IF NOT EXISTS society_members (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    society_id INT UNSIGNED NOT NULL,
    flat_id INT UNSIGNED NULL,
    user_id INT UNSIGNED NOT NULL,
    role ENUM('chairman', 'secretary', 'treasurer', 'committee', 'owner', 'tenant') DEFAULT 'owner',
    status ENUM('active', 'pending', 'rejected', 'unlinked') DEFAULT 'active',
    ownership_type ENUM('owner', 'tenant', 'family') DEFAULT 'owner',
    notes TEXT NULL,
    approved_by INT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
    FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_soc_user (society_id, user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment Transactions & Receipts Table
CREATE TABLE IF NOT EXISTS transactions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    receipt_no VARCHAR(50) NOT NULL UNIQUE,
    society_id INT UNSIGNED NOT NULL,
    flat_id INT UNSIGNED NULL,
    user_id INT UNSIGNED NOT NULL,
    bill_id INT UNSIGNED NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'upi',
    transaction_ref VARCHAR(100) NULL,
    particulars VARCHAR(255) NOT NULL,
    payment_date DATE NOT NULL,
    status ENUM('completed', 'pending', 'rejected', 'failed') DEFAULT 'completed',
    remark TEXT NULL,
    reviewed_by INT UNSIGNED NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_receipt_no (receipt_no),
    INDEX idx_user_trans (user_id),
    INDEX idx_soc_trans (society_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Society Requests ("Contribute / Add Society")
CREATE TABLE IF NOT EXISTS society_requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    society_name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NULL,
    pincode VARCHAR(20) NULL,
    address TEXT NULL,
    contact1_name VARCHAR(100) NULL,
    contact1_phone VARCHAR(20) NULL,
    contact1_flat VARCHAR(50) NULL,
    contact2_name VARCHAR(100) NULL,
    contact2_phone VARCHAR(20) NULL,
    contact2_flat VARCHAR(50) NULL,
    contact3_name VARCHAR(100) NULL,
    contact3_phone VARCHAR(20) NULL,
    contact3_flat VARCHAR(50) NULL,
    contact4_name VARCHAR(100) NULL,
    contact4_phone VARCHAR(20) NULL,
    contact4_flat VARCHAR(50) NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Application Settings (Google SSO, Email/SMTP, Branding)
CREATE TABLE IF NOT EXISTS settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NULL,
    setting_group VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key),
    INDEX idx_setting_group (setting_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions Table (for session tracking)
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    payload TEXT,
    last_activity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_last_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'success', 'error', 'announcement') DEFAULT 'info',
    action_url VARCHAR(255) NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NULL,
    file_size INT UNSIGNED NULL,
    description VARCHAR(500) NULL,
    is_verified TINYINT(1) DEFAULT 0,
    verified_by INT UNSIGNED NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_is_verified (is_verified),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Maintenance Bills
CREATE TABLE IF NOT EXISTS maintenance_bills (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    society_id INT UNSIGNED NULL,
    flat_id INT UNSIGNED NULL,
    bill_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(150) NULL DEFAULT 'Monthly Maintenance',
    particulars VARCHAR(255) NULL,
    amount DECIMAL(10,2) NOT NULL,
    month VARCHAR(7) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
    paid_at TIMESTAMP NULL,
    payment_method VARCHAR(50) NULL,
    transaction_id VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE SET NULL,
    FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_soc_bill (society_id),
    INDEX idx_status (status),
    INDEX idx_month (month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Service Requests
CREATE TABLE IF NOT EXISTS service_requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    assigned_to INT UNSIGNED NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Complaints
CREATE TABLE IF NOT EXISTS complaints (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    status ENUM('open', 'investigating', 'resolved', 'closed') DEFAULT 'open',
    resolution TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Events
CREATE TABLE IF NOT EXISTS events (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    event_date DATETIME NOT NULL,
    location VARCHAR(255) NULL,
    organizer_id INT UNSIGNED NOT NULL,
    is_public TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_event_date (event_date),
    INDEX idx_organizer_id (organizer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Account Heads (Chart of Accounts for Society)
CREATE TABLE IF NOT EXISTS account_heads (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    society_id INT UNSIGNED NOT NULL,
    code VARCHAR(50) NULL,
    name VARCHAR(150) NOT NULL,
    type ENUM('asset', 'liability', 'income', 'expense', 'equity') NOT NULL,
    opening_balance DECIMAL(12,2) DEFAULT 0.00,
    description TEXT NULL,
    is_system TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
    INDEX idx_soc_type (society_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expense Categories / Heads
CREATE TABLE IF NOT EXISTS expense_heads (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    society_id INT UNSIGNED NOT NULL,
    account_head_id INT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    budget_monthly DECIMAL(12,2) DEFAULT 0.00,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
    FOREIGN KEY (account_head_id) REFERENCES account_heads(id) ON DELETE CASCADE,
    INDEX idx_soc_exp_head (society_id, account_head_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Society Expenses / Outflows
CREATE TABLE IF NOT EXISTS expenses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    society_id INT UNSIGNED NOT NULL,
    expense_head_id INT UNSIGNED NOT NULL,
    voucher_no VARCHAR(50) NOT NULL,
    expense_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    paid_to VARCHAR(150) NOT NULL,
    payment_mode ENUM('cash', 'bank_transfer', 'upi', 'cheque') DEFAULT 'upi',
    paid_from_account_head_id INT UNSIGNED NULL,
    reference_no VARCHAR(100) NULL,
    notes TEXT NULL,
    created_by INT UNSIGNED NOT NULL,
    status ENUM('paid', 'pending', 'cancelled') DEFAULT 'paid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
    FOREIGN KEY (expense_head_id) REFERENCES expense_heads(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_soc_exp (society_id, expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Donations & External Contributions
CREATE TABLE IF NOT EXISTS donations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    society_id INT UNSIGNED NOT NULL,
    receipt_no VARCHAR(50) NOT NULL,
    donor_name VARCHAR(150) NOT NULL,
    donor_phone VARCHAR(50) NULL,
    donor_email VARCHAR(150) NULL,
    donor_pan VARCHAR(20) NULL,
    amount DECIMAL(12,2) NOT NULL,
    account_head_id INT UNSIGNED NULL,
    received_in_account_head_id INT UNSIGNED NULL,
    payment_mode ENUM('cash', 'bank_transfer', 'upi', 'cheque') DEFAULT 'upi',
    payment_date DATE NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_soc_don (society_id, payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

