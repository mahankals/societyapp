# Shared Hosting Deployment Guide: SocietyApp

**Target Environment:** Shared CPanel / DirectAdmin / Apache Hosting  
**Constraints:** PHP 8.2+, No SSH Access, No Node.js Runtime, No Cron Jobs, FTP / File Manager Upload  

---

## 1. Local Pre-Deployment Preparation

All dependencies and frontend assets **MUST** be compiled locally before uploading. Never run Composer, npm, or shell commands on the production shared host.

### Step 1.1: Install Production PHP Dependencies Locally
Run Composer with optimized, production-only autoloading:
```bash
composer install --no-dev --optimize-autoloader
```
*(This produces a lean `vendor/` directory containing Slim 4, Twig, Dotenv, and PSR-7 without dev packages).*

### Step 1.2: Build Compiled Frontend Assets Locally
Compile the hashed React islands and Tailwind CSS bundle with Vite:
```bash
npm run build
```
Verify that the output files exist:
- `public/dist/manifest.json`
- `public/dist/assets/app.*.css`
- `public/dist/assets/main.*.js`
- `public/assets/dist/output.css` (legacy fallback)

### Step 1.3: Run Automated Verification Locally
Execute the automated test suite to ensure zero regressions before deployment:
```bash
php tests/run_tests.php
```
Ensure all tests pass (0 failures).

---

## 2. Directory Layout on Shared Hosting

Depending on how your hosting account is structured, follow **Option A** (preferred) or **Option B** (single-root hosting).

### Option A: Standard Layout (DocumentRoot is `public_html/`)
Place private files one level above `public_html` so sensitive application files are completely inaccessible from the web:

```text
/home/yourusername/
├── societyapp-core/             # PRIVATE: Above webroot
│   ├── app/
│   ├── config/
│   ├── routes/
│   ├── storage/
│   ├── vendor/
│   └── .env                     # Database & SMTP credentials
└── public_html/                 # PUBLIC WEBROOT (DocumentRoot)
    ├── .htaccess                # Apache rewrite rules
    ├── index.php                # Front controller
    ├── robots.txt
    ├── sitemap.xml
    ├── manifest.json
    ├── sw.js
    ├── offline.html
    ├── dist/                    # Compiled Vite assets & manifest
    │   ├── manifest.json
    │   └── assets/
    └── uploads/                 # User uploads
        └── .htaccess            # Execution deny rule
```

In `public_html/index.php`, configure path constants to point to `../societyapp-core/`:
```php
define('ROOT_PATH', dirname(__DIR__) . '/societyapp-core');
```

---

### Option B: Flat Layout (Everything inside `public_html/`)
If your shared hosting provider forces all files directly inside `public_html/`, use the included root `.htaccess` protection:

```text
/home/yourusername/public_html/
├── .htaccess                    # Root deny & rewrite rules
├── index.php                    # Passes through to public/index.php
├── .env                         # Environment credentials
├── app/                         # Denied by .htaccess
├── config/                      # Denied by .htaccess
├── routes/                      # Denied by .htaccess
├── vendor/                      # Denied by .htaccess
├── storage/                     # Denied by .htaccess
└── public/                      # Web assets
    ├── .htaccess
    ├── index.php
    ├── dist/
    └── uploads/
```

#### Vital Security Rule for Flat Layout
Verify that your root `.htaccess` denies web access to sensitive directories:
```apache
RewriteEngine On
RewriteRule ^(app|config|routes|vendor|storage|tests|\.env|\.git) - [F,L]
```
> [!CAUTION]
> Test this immediately after uploading by requesting `https://yourdomain.com/.env` in your browser. It must return **403 Forbidden** or **404 Not Found**. If it displays file contents, contact your host to ensure Apache `AllowOverride All` is active.

---

## 3. Uploading Files via FTP or File Manager

1. **Upload Files:**
   Upload the application directories:
   - `app/`
   - `config/`
   - `routes/`
   - `vendor/`
   - `storage/`
   - `public/` (or contents of `public/` to `public_html/`)
   - `maintenance.php`
2. **Directory Permissions:**
   Ensure the web server user can write to writable directories:
   - `storage/sessions/` -> `755` or `775`
   - `storage/logs/` -> `755` or `775`
   - `public/uploads/` -> `755` or `775`
3. **Uploads Protection:**
   Ensure `public/uploads/.htaccess` exists to prevent executing uploaded PHP files:
   ```apache
   <FilesMatch "\.(php|phtml|php3|php4|php5|php7|phps)$">
       Deny from all
   </FilesMatch>
   Options -Indexes -ExecCGI
   ```

---

## 4. Production Environment Configuration (`.env`)

Create or update `.env` in the application root with production credentials:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-society-domain.com

DB_HOST=localhost
DB_PORT=3306
DB_NAME=cpaneluser_societyapp
DB_USER=cpaneluser_dbuser
DB_PASS=YourStrongDbPasswordHere

SESSION_LIFETIME=60min

# Optional Google SSO credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 5. Post-Deployment Verification Checklist

Perform these verification checks immediately after uploading:

- [ ] **HTTPS Enforced:** Confirm `https://yourdomain.com/` redirects to HTTPS.
- [ ] **Asset Manifest:** Inspect page source on `https://yourdomain.com/`. Confirm `<link rel="stylesheet" href="/dist/assets/app....css">` loads with HTTP 200.
- [ ] **API Endpoint:** Test `https://yourdomain.com/api/status`. Must return JSON `{ "status": "ok" }`.
- [ ] **Public Routes:** Verify `/`, `/contact`, and `/society/contribute` render complete Twig HTML.
- [ ] **Protected Routes:** Visit `/resident` in a private window. Confirm it redirects to `/auth/login?return_url=%2Fresident`.
- [ ] **Admin Route:** Visit `/admin`. Confirm it redirects to `/admin/login`.
- [ ] **404 Handling:** Visit `https://yourdomain.com/non-existent-page`. Verify clean 404 page renders without PHP notices or stack traces.
- [ ] **Sensitive File Protection:** Attempt to load `https://yourdomain.com/.env`. Must be blocked (403/404).
- [ ] **Database Connection:** Test logging into an active account or accessing the setup wizard if initial setup is pending.
- [ ] **Upload Execution Block:** Confirm no uploaded files in `/uploads/` can execute server-side code.

---

## 6. Maintenance & Rollback Procedure

### Maintenance Mode
To place the site into maintenance mode during upgrades:
1. In `.env`, set:
   ```dotenv
   MAINTENANCE_MODE=true
   ```
2. Users will see the dark glassmorphism maintenance screen. System administrators can continue logging in by navigating to `/admin/login`.

### Rollback Process
If any unforeseen issue occurs during deployment:
1. Keep a timestamped zip of the previous release on the server (e.g. `societyapp_backup_YYYYMMDD.zip`).
2. Rename current folder to `societyapp_failed/` and extract previous release.
3. Verify site functionality restored.
