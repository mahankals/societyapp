# Phase 4: Admin Panel

## Goals
- Provide administrators with tools to manage the society, users, and communications.
- Implement the "Email Request" system for user onboarding.

## Tasks
1. **Admin Dashboard (`/admin/index.php`)**
   - Overview statistics (Total users, pending requests, recent notifications).

2. **User Management**
   - List, edit, and deactivate user accounts.
   - Role assignment.

3. **Email Request System**
   - Integrate PHPMailer for reliable email delivery.
   - Create a "Send Invitation" interface.
   - Generate unique, time-limited registration links for users.
   - Track status of sent requests (Sent, Opened, Registered).

4. **Society Management**
   - Manage society details (Name, Address, Rules).
   - Broadcast global notifications to all residents.

5. **Security**
   - Ensure only users with `admin` role can access this directory.
   - Log all administrative actions for auditing.
