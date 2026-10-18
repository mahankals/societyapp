# Migration Audit: SocietyApp PHP to Slim 4 + Twig + React + Vite

**Date:** 2026-10-10  
**Author:** Antigravity Migration Architect  
**Project:** SocietyApp  
**Target Architecture:** Slim Framework 4 + Twig 3 + React (Client-side interactive islands) + Vite + Shared-Hosting Compatible

---

## 1. Existing Architecture & Entry Points

### 1.1 Architecture Overview
The current SocietyApp is an MVC-structured PHP application designed for residential society management.
- **PHP Version Target:** PHP 8.2+ (configured in DDEV with PHP 8.5, production targets shared hosting with PHP 8.2 or newer).
- **Core Engine:** Custom lightweight micro-framework:
  - `app/core/Database.php`: Singleton PDO wrapper with prepared query execution.
  - `app/core/Session.php`: Custom session manager handling cookie security, custom session storage (`storage/sessions`), timeout expiration, and flash messaging.
  - `app/core/Router.php`: Custom regex-based route dispatcher supporting GET, POST, ANY, and named middleware.
  - `app/core/helpers.php`: Global helper functions for Twig template rendering, authentication checks, CSRF validation, and raw SMTP socket dispatching.
- **Rendering Layer:** Twig 3.20 template engine (`app/views/`) rendering HTML with Tailwind CSS v4 utility classes and Lucide icons.
- **Frontend Layer:** Tailwind CSS v4 (built via `@tailwindcss/cli`), vanilla JavaScript components (`public/assets/js/dropdown.js`, `offline.js`), Service Worker (`sw.js`), and Web App Manifest (`manifest.json`).

### 1.2 Entry Points
1. **Public Web Entry Point:** `public/index.php`
   - Primary front controller when web server DocumentRoot is configured to `public/`.
   - Handles environment configuration loading (`.env`), session initialization, setup wizard redirect guard (`isAppSetupCompleted()`), router initialization, route registration, and dispatching.
2. **Root Fallback Entry Point:** `index.php`
   - Handles shared hosting environments where DocumentRoot cannot be set to `public/`.
   - Intercepts crawler/icon requests (`/icon.png`, `/icon.php`), executes maintenance checks, and passes through to `public/index.php`.
3. **Maintenance Guard:** `maintenance.php`
   - Standalone maintenance and setup interceptor with dark glassmorphism UI.
4. **CLI Entry Point:** `console`
   - Executable PHP script for command-line migrations (`php console migrate`) and creating administrative users (`php console add-admin`).
5. **Apache Configuration:**
   - Root `.htaccess`: Protects sensitive folders (`app`, `config`, `vendor`, `docs`, `.git`) and rewrites non-asset requests to `public/index.php`.
   - `public/.htaccess`: Handles direct asset serving, PWA asset rewrites, and routes all dynamic requests to `index.php`.

---

## 2. Feature and Route Inventory

| HTTP Method | Route URI | Handler | Auth / Access | Purpose / Feature |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | Closure | Public | Landing page with hero, features, impact stats |
| **GET** | `/contact` | Closure | Public | Contact support page |
| **POST** | `/contact` | Closure | Public | Submit contact inquiry & email dispatch |
| **GET** | `/join/{code}` | `SocietyController@publicJoin` | Public | Public society invite link / join form |
| **POST** | `/join/{code}` | `SocietyController@handleJoin` | Public | Process resident join request |
| **GET** | `/society/contribute` | `SocietyController@contribute` | Public | Public society fund contribution page |
| **POST** | `/society/contribute` | `SocietyController@handleContribute` | Public | Record contribution transaction |
| **GET** | `/society/contribute/search-user`| `SocietyController@searchUserForContribution` | Public | AJAX resident search for contributions |
| **GET** | `/auth/login` | Closure | Guest | Resident & committee login screen |
| **POST** | `/auth/login` | Closure | Guest | Authenticate user credentials & create session |
| **GET** | `/admin/login` | Closure | Guest | Direct administrator login view |
| **GET** | `/auth/register` | Closure | Guest | Resident account registration |
| **POST** | `/auth/register` | Closure | Guest | Process new user registration |
| **GET** | `/auth/logout` | Closure | Public | Destroy session and redirect to login |
| **GET** | `/auth/reset-password` | Closure | Public | Password reset request form & token validation |
| **POST** | `/auth/reset-password` | Closure | Public | Reset password verification and update |
| **GET** | `/auth/pin-setup` | Closure | Auth | Fast PIN setup view |
| **POST** | `/auth/pin-setup` | Closure | Auth | Save hashed fast PIN |
| **GET** | `/auth/google-callback` | Closure | Public | Google OAuth 2.0 authorization code callback |
| **POST** | `/auth/google-one-tap` | Closure | Public | Google One Tap credential JWT verification |
| **GET** | `/setup` | `SetupController@index` | Setup / Admin | Multi-step interactive installation wizard |
| **POST** | `/setup/verify-key` | `SetupController@verifyKey` | Public | Setup access key verification |
| **GET** | `/setup/csrf-token` | `SetupController@getCsrfToken` | Public | Dynamic CSRF token retrieval for wizard |
| **POST** | `/setup/test-db` | `SetupController@testDb` | Public | Live database connection verification |
| **POST** | `/setup/test-connection` | `SetupController@testConnection` | Public | SMTP socket handshake & auth test |
| **POST** | `/setup/test-email` | `SetupController@testEmail` | Public | Send test email dispatch verification |
| **POST** | `/setup/test-google-sso` | `SetupController@testGoogleSso` | Public | Google OAuth client configuration test |
| **POST** | `/setup/save-step` | `SetupController@saveStep` | Public | Save wizard step data to `.env` |
| **POST** | `/setup/install` | `SetupController@install` | Public | Run schema migrations & finalize setup |
| **GET** | `/resident` | `ResidentController@index` | Auth | Resident dashboard (flats, pending bills, notices) |
| **GET** | `/resident/bills` | `ResidentController@bills` | Auth | View maintenance invoices & payment history |
| **POST** | `/resident/bills/{id}/pay` | `ResidentController@recordPayment` | Auth | Submit bill payment receipt / UPI proof |
| **POST** | `/resident/bills/bulk-pay` | `ResidentController@bulkRecordPayment` | Auth | Bulk payment submission for multiple bills |
| **GET** | `/resident/receipts` | `ResidentController@receipts` | Auth | View payment receipts & verification status |
| **GET** | `/resident/receipts/{id}` | `ResidentController@viewReceipt` | Auth | Detailed printable payment receipt |
| **GET** | `/resident/members` | `ResidentController@members` | Auth | Society resident directory & committee contacts |
| **GET** | `/resident/link-flat` | `ResidentController@linkFlat` | Auth | Request linkage to a society flat/unit |
| **POST** | `/resident/link-flat` | `ResidentController@handleLinkFlat`| Auth | Submit flat linkage request |
| **POST** | `/resident/flats/{id}/toggle-rent` | `ResidentController@toggleFlatRent` | Auth | Toggle owner's flat availability for rent |
| **POST** | `/resident/flats/{id}/occupancy` | `ResidentController@updateFlatOccupancy` | Auth | Update tenant details and occupancy status |
| **GET** | `/resident/requests` | `ResidentController@requests` | Auth | Service requests & maintenance complaints |
| **POST** | `/resident/requests` | `ResidentController@createRequest` | Auth | Create service or repair ticket |
| **GET** | `/resident/documents` | `ResidentController@documents` | Auth | Community documents repository |
| **POST** | `/resident/documents/upload` | `ResidentController@uploadDocument` | Auth | Upload society agreement or flat document |
| **GET** | `/user/profile` | `ResidentController@profile` | Auth | User profile and emergency settings |
| **POST** | `/user/profile` | `ResidentController@updateProfile` | Auth | Update user details & contact info |
| **POST** | `/user/profile/password` | `ResidentController@updatePassword`| Auth | Change account password |
| **POST** | `/user/profile/emergency` | `ResidentController@updateEmergencyContact`| Auth | Update emergency contact details |
| **POST** | `/user/profile/pin` | `ResidentController@updatePin` | Auth | Update quick unlock PIN |
| **POST** | `/user/profile/photo` | `ResidentController@uploadPhoto` | Auth | Upload user avatar |
| **POST** | `/user/profile/disconnect-google` | `ResidentController@disconnectGoogle` | Auth | Unlink Google OAuth account |
| **GET** | `/user/notification` | `ResidentController@notifications` | Auth | User notifications center |
| **POST** | `/user/notification/mark-read` | `ResidentController@markNotificationsRead` | Auth | Mark all notifications as read |
| **POST** | `/user/notification/{id}/read` | `ResidentController@markSingleNotificationRead` | Auth | Mark single notification as read |
| **POST** | `/user/notification/{id}/toggle-read` | `ResidentController@toggleNotificationRead` | Auth | Toggle notification read status |
| **GET** | `/user/switch-society/{id}` | `ResidentController@switchSociety` | Auth | Switch active society context for multi-flat user |
| **GET** | `/comitee` (and `/committee`, `/committe`) | `SocietyController@dashboard` | Auth (Committee) | Society committee analytics dashboard |
| **GET** | `/comitee/flats` | `SocietyController@flats` | Auth (Committee) | Manage society wings, floors, and flats |
| **POST** | `/comitee/flats` | `SocietyController@addFlat` | Auth (Committee) | Add new flat unit |
| **POST** | `/comitee/flats/{id}/update` | `SocietyController@updateFlat` | Auth (Committee) | Update flat details |
| **POST** | `/comitee/flats/{id}/delete` | `SocietyController@deleteFlat` | Auth (Committee) | Remove flat unit |
| **GET** | `/comitee/members` | `SocietyController@members` | Auth (Committee) | Society roster & resident approvals |
| **POST** | `/comitee/members/assign` | `SocietyController@assignMember` | Auth (Committee) | Assign resident to flat |
| **POST** | `/comitee/members/{id}/role` | `SocietyController@updateMemberRole` | Auth (Committee) | Update committee role (Secretary, Treasurer, etc.) |
| **POST** | `/comitee/members/{id}/unlink` | `SocietyController@unlinkMember` | Auth (Committee) | Unlink member from flat |
| **GET** | `/comitee/bills` | `SocietyController@bills` | Auth (Committee) | Maintenance billing manager |
| **POST** | `/comitee/bills` | `SocietyController@createBill` | Auth (Committee) | Generate single maintenance bill |
| **POST** | `/comitee/bills/bulk-generate` | `SocietyController@bulkGenerateBills` | Auth (Committee) | Batch generate recurring monthly bills |
| **POST** | `/comitee/bills/upi-settings` | `SocietyController@updateUpiSettings` | Auth (Committee) | Configure society UPI VPA & payee name |
| **POST** | `/comitee/bills/{id}/mark-paid` | `SocietyController@markBillPaid` | Auth (Committee) | Manually record cash/cheque payment |
| **POST** | `/comitee/receipts/{id}/approve` | `SocietyController@approveReceipt` | Auth (Committee) | Approve resident payment proof |
| **POST** | `/comitee/receipts/{id}/reject` | `SocietyController@rejectReceipt` | Auth (Committee) | Reject resident payment proof |
| **GET** | `/comitee/broadcast` | `SocietyController@broadcast` | Auth (Committee) | Broadcast notice composer |
| **POST** | `/comitee/broadcast` | `SocietyController@sendBroadcast` | Auth (Committee) | Dispatch broadcast email & notification |
| **GET** | `/comitee/expenses` | `SocietyController@expenses` | Auth (Committee) | Expenditure register & heads |
| **POST** | `/comitee/expenses` | `SocietyController@createExpense` | Auth (Committee) | Record society expense outflow |
| **POST** | `/comitee/expenses/{id}/delete` | `SocietyController@deleteExpense` | Auth (Committee) | Delete expense record |
| **POST** | `/comitee/expenses/heads/create` | `SocietyController@createExpenseHead` | Auth (Committee) | Create expense category head |
| **GET** | `/comitee/accounting` | `SocietyController@accounting` | Auth (Committee) | Financial ledger, opening balance & balance sheet |
| **POST** | `/comitee/accounting/heads/create` | `SocietyController@createAccountHead` | Auth (Committee) | Create chart of account head |
| **POST** | `/comitee/accounting/opening-balances` | `SocietyController@updateOpeningBalances` | Auth (Committee) | Save opening balances |
| **POST** | `/comitee/donations/create` | `SocietyController@createDonation` | Auth (Committee) | Record festival/charity donation inflow |
| **GET** | `/comitee/requests` | `SocietyController@requests` | Auth (Committee) | Manage resident maintenance tickets |
| **POST** | `/comitee/requests/{id}/approve` | `SocietyController@approveRequest` | Auth (Committee) | Mark service request resolved |
| **POST** | `/comitee/requests/{id}/reject` | `SocietyController@rejectRequest` | Auth (Committee) | Close/reject service request |
| **GET** | `/admin` | `AdminController@index` | Auth (Admin) | Platform super-admin dashboard |
| **GET** | `/admin/societies` | `AdminController@societies` | Auth (Admin) | Manage all registered societies |
| **GET** | `/admin/societies/pending` | `AdminController@pendingSocieties` | Auth (Admin) | Approve/reject pending society registrations |
| **POST** | `/admin/societies` | `AdminController@createSociety` | Auth (Admin) | Provision new society |
| **POST** | `/admin/societies/{id}/toggle-status` | `AdminController@toggleSocietyStatus`| Auth (Admin) | Suspend or activate society |
| **POST** | `/admin/societies/{id}/update` | `AdminController@updateSociety` | Auth (Admin) | Edit society metadata |
| **POST** | `/admin/societies/{id}/delete` | `AdminController@deleteSociety` | Auth (Admin) | Delete society |
| **POST** | `/admin/societies/requests/{id}/approve` | `AdminController@approveSocietyRequest` | Auth (Admin) | Approve society creation request |
| **POST** | `/admin/societies/requests/{id}/reject` | `AdminController@rejectSocietyRequest` | Auth (Admin) | Reject society creation request |
| **GET** | `/admin/users` | `AdminController@users` | Auth (Admin) | User list & role management |
| **GET** | `/admin/users/{id}` | `AdminController@editUser` | Auth (Admin) | Edit user profile and role |
| **POST** | `/admin/users/{id}` | `AdminController@updateUser` | Auth (Admin) | Update user details |
| **GET** | `/admin/invitations` | `AdminController@invitations` | Auth (Admin) | Manage committee invitations |
| **POST** | `/admin/invitations` | `AdminController@sendInvitation` | Auth (Admin) | Send invitation email |
| **GET** | `/admin/settings` | `AdminController@settings` | Auth (Admin) | Platform settings (branding, SMTP, SSO) |
| **POST** | `/admin/settings` | `AdminController@updateSettings` | Auth (Admin) | Save platform settings & branding assets |
| **POST** | `/admin/settings/toggle-maintenance` | `AdminController@toggleMaintenance`| Auth (Admin) | Toggle maintenance mode |
| **POST** | `/admin/settings/test-connection` | `AdminController@testConnection` | Auth (Admin) | Live SMTP socket connection handshake test |
| **POST** | `/admin/settings/test-email` | `AdminController@testEmail` | Auth (Admin) | Dispatch test email from settings |
| **POST** | `/admin/settings/test-db` | `AdminController@testDb` | Auth (Admin) | Test database credentials |
| **GET** | `/api/status` | Closure | Public | Healthcheck and timestamp JSON |

---

## 3. Database and Integration Dependencies

### 3.1 Database Architecture
- **Engine:** MySQL 8.0+ / MariaDB 10.11+
- **Driver:** PHP PDO MySQL with `utf8mb4_unicode_ci` collation and emulation disabled (`PDO::ATTR_EMULATE_PREPARES => false`).
- **Tables (20 Total):**
  1. `users`: Credentials (`password_hash`, `pin_hash`), Google OAuth IDs (`google_id`), roles (`admin`, `committee`, `resident`), profile data.
  2. `societies`: Society entity records, registration code, address, UPI ID and payee configuration.
  3. `flats`: Society unit numbers, wings, floors, square footage, occupancy and rental details.
  4. `society_members`: Relational mapping of users to societies and flats with roles (`chairman`, `secretary`, `treasurer`, `committee`, `owner`, `tenant`).
  5. `transactions`: Payment ledger records for maintenance bills and contributions with proof attachment paths.
  6. `society_requests`: Society onboarding requests.
  7. `settings`: Key-value configuration store for platform-wide settings (branding, SMTP, Google SSO, support contacts).
  8. `password_reset_tokens`: Hashed password reset tokens with timestamps.
  9. `user_sessions`: Persisted user session records.
  10. `activity_logs`: Audit trail for security actions and system modifications.
  11. `notifications`: In-app notification messages per user.
  12. `documents`: Uploaded society bylaws, minutes, and documents.
  13. `maintenance_bills`: Monthly maintenance invoices with due dates, amounts, and statuses.
  14. `service_requests`: Resident tickets for plumbing, electrical, and facility complaints.
  15. `complaints`: Society grievance records.
  16. `events`: Community calendar entries.
  17. `account_heads`: Accounting ledger heads.
  18. `expense_heads`: Categorized expense heads.
  19. `expenses`: Society expense ledger entries.
  20. `donations`: Festival and community fund donations.

### 3.2 External Integrations
1. **Google OAuth 2.0 & Google One Tap:** Handled via Google API token endpoints using `file_get_contents` or `curl`.
2. **SMTP Socket Engine:** Implemented in `app/core/helpers.php` (`testSmtpConnection()` and `sendEmail()`) via native PHP stream sockets (`stream_socket_client()`) supporting direct SSL on port 465 and STARTTLS on port 587. Does not require external PHPMailer or Symphony Mailer packages.
3. **UPI Payment Gateway:** Generates RFC-compliant `upi://pay` deep links and QR codes for resident instant payments via Google Pay, PhonePe, Paytm, and BHIM.
4. **Twig 3 Templating:** Rendering engine with automatic HTML escaping and template inheritance.
5. **PWA Offline Service Worker:** `sw.js` and `offline.html` providing progressive web application capabilities.

---

## 4. Security and Performance Concerns

1. **Routing and Middleware Separation:**
   - The current custom `Router.php` is functional but lacks standard PSR-7/PSR-15 request encapsulation, standardized error handling pipelines, and route grouping mechanisms.
   - Refactoring to **Slim 4** introduces robust PSR-7/PSR-15 middleware architecture, streamlined routing groups, clean dependency injection, and reliable status code handling.
2. **CSRF Protection:**
   - Currently, CSRF tokens are manually checked in select POST routes (`verifyCSRFToken($_POST['csrf_token'] ?? '')`).
   - Slim PSR-15 middleware will provide consistent validation on state-changing requests while exempting specific external webhooks/callbacks if necessary.
3. **Template Escaping and XSS Prevention:**
   - Twig's default auto-escaping (`{{ variable }}`) is active.
   - Any raw HTML rendering (e.g. `|raw` for sanitized emails or branding icons) will be verified and documented.
4. **Session Security:**
   - Session cookies already enforce `HttpOnly`, `SameSite=Lax`, and dynamic `Secure` under HTTPS.
   - Expiration and garbage collection are synchronized to `SESSION_LIFETIME`.
5. **Asset Pipeline:**
   - Currently, Tailwind CSS builds a single `output.css` and JavaScript is directly loaded from `public/assets/js/`.
   - Incorporating **Vite** will compile modern JavaScript modules, provide cache-busted hashed filenames with a `manifest.json`, and bundle CSS for optimal client-side performance.
   - Shared hosting constraints: Vite and npm will run locally during development; only the compiled build (`public/dist` / `public/assets`) and manifest will be deployed to production, ensuring **zero Node.js dependency in production**.
6. **File Upload Hardening:**
   - Uploads to `public/uploads/` (profile photos, receipts, documents) must enforce MIME type allowlisting, unique random filenames, and execution prevention (`.htaccess` directive disabling PHP script execution in the uploads folder).

---

## 5. Target Architecture & Proposed Migration Steps

### Target Directory Layout:
```text
societyapp/
├── app/
│   ├── Controllers/
│   │   ├── AdminController.php
│   │   ├── ResidentController.php
│   │   ├── SocietyController.php
│   │   ├── SetupController.php
│   │   └── ApiController.php
│   ├── Services/
│   │   ├── AuthService.php
│   │   ├── SmtpService.php
│   │   └── ViteAssetService.php
│   ├── Middleware/
│   │   ├── AuthMiddleware.php
│   │   ├── AdminMiddleware.php
│   │   ├── GuestMiddleware.php
│   │   └── SetupGuardMiddleware.php
│   ├── Core/
│   │   ├── Database.php
│   │   ├── Session.php
│   │   └── helpers.php
│   └── Views/
│       ├── layouts/
│       │   ├── main.twig (or base/app)
│       │   ├── mobile.html.twig
│       │   ├── auth.html.twig
│       │   └── error.html.twig
│       ├── pages/
│       ├── admin/
│       ├── committee/
│       ├── resident/
│       └── setup/
├── config/
│   ├── app.php
│   ├── database.php
│   └── session.php
├── routes/
│   ├── web.php
│   └── api.php
├── resources/
│   ├── js/
│   │   ├── main.jsx
│   │   └── components/
│   │       ├── SearchableSelectIsland.jsx
│   │       └── InteractiveWidgets.jsx
│   └── css/
│       └── app.css
├── public/
│   ├── .htaccess
│   ├── index.php
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── manifest.json
│   ├── sw.js
│   ├── offline.html
│   └── dist/
│       ├── manifest.json
│       ├── assets/
│       └── ...
├── storage/
│   ├── logs/
│   └── sessions/
├── docs/
│   ├── migration-audit.md
│   ├── architecture.md
│   ├── deployment-shared-hosting.md
│   └── testing.md
├── composer.json
├── composer.lock
├── package.json
├── package-lock.json
├── vite.config.js
└── .env.example
```

### Phased Execution Steps:
1. **Phase 1: Audit Complete (this document).**
2. **Phase 2: Dependencies & Autoloading Setup**
   - Update `composer.json` to require `php: >=8.2`, `slim/slim: ^4.14`, `slim/psr7: ^1.7`, `slim/twig-view: ^3.4`, `twig/twig: ^3.20`, `vlucas/phpdotenv: ^5.6`.
   - Configure PSR-4 autoloading: `"App\\": "app/"`.
   - Run `composer update` to generate `composer.lock`.
3. **Phase 3: Twig & Vite Asset Manifest Service**
   - Implement `ViteAssetService` that reads `manifest.json` and supplies fingerprinted CSS and JS bundles.
   - Register Twig function `vite_asset()` so templates load built assets seamlessly in development and production.
   - Maintain full SEO metadata blocks (`title`, `description`, `canonical`, Open Graph, JSON-LD) in Twig layout.
4. **Phase 4: Routing & Controller Migration to Slim 4**
   - Implement Slim 4 front controller in `public/index.php` and root fallback `index.php`.
   - Move route declarations into `routes/web.php` and `routes/api.php` using Slim route groups and middleware.
   - Refactor controller dispatching to accept PSR-7 `Request` and `Response` interfaces while maintaining all existing business logic, validation, and session states.
   - Implement production-safe 404 and 500 error handlers.
5. **Phase 5: React & Vite Integration**
   - Install React, React-DOM, Vite, and `@vitejs/plugin-react` in `package.json`.
   - Setup `vite.config.js` to compile assets to `public/dist` with manifest enabled.
   - Implement client-side interactive islands (e.g. enhanced searchable select, interactive stat cards) mounted cleanly into explicit DOM nodes via `createRoot()`.
   - Ensure `npm run build` succeeds locally without requiring Node in production.
6. **Phase 6: Security, SEO & Reliability Hardening**
   - Add `.htaccess` upload execution block to `public/uploads/.htaccess`.
   - Ensure `public/robots.txt` and `public/sitemap.xml` are present and served correctly.
7. **Phase 7: Comprehensive Documentation & Shared Hosting Guide**
   - Author `docs/architecture.md`, `docs/deployment-shared-hosting.md`, and `docs/testing.md`.
8. **Phase 8: End-to-End Verification**
   - Run automated route verification and smoke tests.
   - Verify all existing screens and user flows.

---

## 6. Risks and Rollback Plan

### Identified Risks & Mitigations
| Risk | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| Shared hosting lacks mod_rewrite or DocumentRoot configuration | Low | High | Maintain dual entry points (`index.php` at root and `public/index.php`) with tested `.htaccess` fallbacks. |
| Slim 4 PSR-7 Response flow alters existing `redirect()` / `echo view()` behavior | Medium | High | Implement a robust controller response adapter or update controllers to return PSR-7 `ResponseInterface` cleanly. |
| Vite asset paths mismatch between local development and shared hosting subdirectory | Medium | Medium | Use relative or manifest-configured asset paths in `ViteAssetService`. |
| Missing Node.js on production | High (Known constraint) | None | Strict build-time asset compilation. Only compiled assets (`public/dist/`) and `manifest.json` are uploaded. |

### Rollback Plan
1. The repository is version-controlled with Git on branch `staging`.
2. Every phase will be validated with smoke tests before committing.
3. In the event of an unresolvable regression, git allows immediate rollback to the pre-migration commit tag.
