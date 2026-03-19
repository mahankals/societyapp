# Phase 2: Core Logic & Authentication

## Goals
- Establish a secure Database connection.
- Implement a robust authentication system supporting both traditional and Social (Google) login.
- Manage user sessions across the application.

## Tasks
1. **Database Integration**
   - Create `includes/db.php` using PDO for secure queries.
   - Define User schema (id, email, password_hash, google_id, role, created_at).

2. **Traditional Auth (`/auth`)**
   - `login.php`: Email/Password verification.
   - `register.php`: New user signup with validation.
   - `logout.php`: Session destruction.

3. **Google Authentication**
   - Integrate Google API Client Library.
   - Setup Google Cloud Console project and credentials.
   - Implement `google-callback.php` to handle OAuth tokens.
   - Allow "Sign in with Google" and "Sign up with Google".

4. **Security**
   - Password hashing with `password_hash()`.
   - CSRF protection for all forms.
   - Role-based access control (Admin vs. Resident).

5. **PWA Offline Prep**
   - Implement a basic "PIN Setup" during the first login for future offline access.
