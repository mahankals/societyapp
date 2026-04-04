# Phase 2: Core Logic & Authentication

## Goals
- Establish a secure Database connection.
- Implement a robust authentication system supporting both traditional and Social (Google) login.
- Manage user sessions across the application.

## Tasks
1. **[Completed] Database Integration**
   - Created `includes/db.php` using PDO for secure queries.
   - Created User schema in `includes/schema.sql` (id, email, password_hash, google_id, role, created_at).

2. **[Completed] Traditional Auth (`/auth`)**
   - Implemented Twig templates for `login.html.twig`, `register.html.twig`, and `reset-password.html.twig`.
   - `login.php`: Email/Password verification.
   - `register.php`: New user signup with validation.
   - `logout.php`: Session destruction.

3. **[Completed] Google Authentication**
   - Implemented `google-callback.php` to handle OAuth tokens.
   - Allow "Sign in with Google" and "Sign up with Google".

4. **[Completed] Security**
   - Password hashing with `password_hash()`.
   - CSRF protection for all forms.
   - Role-based access control (Admin vs. Resident).

5. **[Completed] PWA Offline Prep**
   - Implemented "PIN Setup" (`pin-setup.php`) during the first login for future offline access.
