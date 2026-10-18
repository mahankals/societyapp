# Testing Strategy & Test Suite: SocietyApp

**Test Framework:** Native PHP Automated Verification Suite + Vite Client Test Runner  
**Test File:** `tests/run_tests.php`  
**Frontend Runner:** `npm test`  

---

## 1. Automated Test Suite Execution

### Running PHP Smoke & Regression Tests
Run inside the development environment (DDEV or local CLI):

```bash
# In DDEV
ddev exec php tests/run_tests.php

# Or on local host
php tests/run_tests.php
```

### Running Frontend Tests
```bash
npm test
```

---

## 2. Test Suite Coverage

The test suite in `tests/run_tests.php` covers six core functional areas:

### 1. Vite Manifest & Asset Service
- **Manifest Loading:** Verifies `ViteAssetService::getManifest()` parses `public/dist/manifest.json` correctly.
- **Hashed JS Asset:** Ensures `resources/js/main.jsx` resolves to a valid hashed `/dist/assets/main.[hash].js` filename.
- **Hashed CSS Asset:** Ensures `resources/css/app.css` resolves to a valid hashed `/dist/assets/app.[hash].css` filename.
- **Tag Rendering:** Verifies HTML `<link rel="stylesheet">` and `<script type="module">` tags are properly generated.

### 2. Twig Rendering & Security
- **Twig Functions:** Verifies custom functions `vite_tags()` and `vite_asset()` are registered.
- **XSS Auto-Escaping:** Confirms malicious input like `<script>alert("xss")</script>` is safely escaped to `&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;`.
- **Master Layout:** Tests rendering of `app/views/layouts/main.twig` with configurable SEO metadata (`<title>`, `<meta name="description">`, `<link rel="canonical">`).

### 3. Database Connectivity & Queries
- **PDO Connection:** Verifies active database connection via `Database::getInstance()`.
- **Parameterized Query:** Validates parameterized prepared statement execution (`Database::fetchOne("SELECT 1 + ? AS calc", [41])`).
- **Schema Presence:** Confirms core tables (`users`, etc.) exist in the database.

### 4. PSR-7 Redirects & SlimBridge
- **Redirect Exception:** Verifies `redirect()` throws `App\Core\RedirectException` rather than abruptly calling `exit`.
- **PSR-7 302 Conversion:** Tests that `SlimBridge` intercepts `RedirectException` and returns a PSR-7 302 response with the proper `Location` header.
- **Body Writing:** Verifies string responses are written to the PSR-7 response body.
- **JSON Serialization:** Verifies array returns are automatically serialized with `Content-Type: application/json`.

### 5. SEO Files & Asset Protection
- **Robots.txt:** Validates `public/robots.txt` exists and points to the sitemap.
- **Sitemap.xml:** Validates `public/sitemap.xml` is well-formed XML containing indexable URLs.
- **Uploads Protection:** Confirms `public/uploads/.htaccess` exists with PHP execution deny rules.

---

## 3. Manual Verification Checklist

| Scenario | Action | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **Landing Page** | `GET /` | Returns HTTP 200 with complete Twig HTML, Vite hashed CSS/JS | Verified |
| **Contact Form** | `GET /contact` | Returns HTTP 200 with CSRF token and contact form | Verified |
| **API Health** | `GET /api/status` | Returns HTTP 200 with JSON `{ "status": "ok", "time": "..." }` | Verified |
| **Auth Guard** | `GET /resident` | Returns HTTP 302 redirecting to `/auth/login?return_url=%2Fresident` | Verified |
| **Admin Guard** | `GET /admin` | Returns HTTP 302 redirecting to `/admin/login` | Verified |
| **404 Handling** | `GET /random-404` | Returns HTTP 404 with custom error layout | Verified |
| **React Island** | Inspect DOM on page with island | React mounts into container with interactive state | Verified |
| **Shared Hosting** | No Node/SSH/Cron | Zero runtime dependencies on Node.js or background daemons | Verified |
