# Architecture Documentation: SocietyApp Modernized

**Architecture Stack:** Slim Framework 4 + Twig 3 + React Islands + Vite + Tailwind CSS v4 + MariaDB/MySQL  
**Hosting Target:** Shared Hosting Compatible (PHP 8.2+, No SSH, No Node runtime, No Cron in production)

---

## 1. Overview & Architectural Goals

The SocietyApp architecture has been modernized from a custom procedural/MVC PHP routing setup to a robust, standards-compliant **Slim Framework 4** application. The refactoring achieves three core objectives:
1. **Standards Compliance:** Standard PSR-7 (Request/Response) and PSR-15 (Middleware) pipelines.
2. **SEO & Performance First:** Server-rendered Twig 3 templates deliver complete HTML and Open Graph metadata to crawlers and users; client-side React interactive islands enhance interactivity without server-side Node runtime requirements.
3. **Shared Hosting Ready:** Asset bundling and dependency management occur locally during development. Production deployment requires only uploading the PHP application, `vendor/`, and compiled `public/dist/` assets via FTP or hosting file manager.

---

## 2. Directory Structure

```text
societyapp/
├── app/
│   ├── Controllers/
│   │   ├── AdminController.php      # Platform super-admin management
│   │   ├── ResidentController.php   # Resident portal, billing, receipts, requests
│   │   ├── SocietyController.php    # Committee management, accounts, ledger
│   │   ├── SetupController.php      # Onboarding & deployment wizard
│   │   └── TenantController.php     # Backward-compatible redirect aliases
│   ├── Services/
│   │   └── ViteAssetService.php     # Reads Vite manifest & resolves fingerprinted assets
│   ├── Middleware/
│   │   ├── AuthMiddleware.php       # Enforces authenticated resident/committee sessions
│   │   ├── AdminMiddleware.php      # Enforces super-admin privileges
│   │   ├── GuestMiddleware.php      # Redirects logged-in users away from guest pages
│   │   └── SetupGuardMiddleware.php # Intercepts unconfigured instances to /setup
│   ├── Core/
│   │   ├── Database.php             # Singleton PDO MySQL/MariaDB database wrapper
│   │   ├── Session.php              # Session lifecycle, expiry, and flash messaging
│   │   ├── SlimBridge.php           # Adapts controller actions to PSR-7 Responses
│   │   ├── RedirectException.php    # Clean PSR-7 redirect exception
│   │   └── helpers.php              # Global helpers, Twig cache, SMTP socket engine
│   └── Views/
│       ├── layouts/
│       │   ├── main.twig            # Modernized SEO-first base layout with Vite assets
│       │   ├── mobile.html.twig     # Responsive application dashboard shell
│       │   ├── base.html.twig       # Public portal layout with Vite assets
│       │   ├── auth.html.twig       # Authentication screens layout
│       │   └── error.html.twig      # Error views layout
│       ├── pages/                   # Landing, contact, contribute
│       ├── admin/                   # Super-admin views
│       ├── committee/               # Society committee views
│       ├── resident/                # Resident portal views
│       └── setup/                   # Setup wizard screens
├── config/
│   ├── app.php                      # Application metadata, timezone, debug flags
│   ├── database.php                 # Database credentials and DSN configuration
│   └── session.php                  # Session cookie lifetime and name settings
├── routes/
│   ├── web.php                      # Web application routes (Slim 4)
│   └── api.php                      # JSON API endpoints (Slim 4)
├── resources/
│   ├── js/
│   │   ├── main.jsx                 # React island mount entry point
│   │   └── components/
│   │       └── Counter.jsx          # Interactive client island component
│   └── css/
│       └── app.css                  # Master Tailwind v4 CSS entry point
├── public/
│   ├── .htaccess                    # Apache rewrite & direct asset serving
│   ├── index.php                    # Slim 4 front controller
│   ├── robots.txt                   # Search crawler directives
│   ├── sitemap.xml                  # Canonical XML sitemap
│   ├── manifest.json                # PWA web manifest
│   ├── sw.js                        # PWA service worker
│   ├── offline.html                 # Offline fallback screen
│   └── dist/                        # Compiled production Vite assets
│       ├── manifest.json            # Vite asset fingerprint mapping
│       └── assets/                  # Hashed .js and .css bundles
├── storage/
│   ├── logs/                        # Application error logs
│   └── sessions/                    # Secure file-based session storage
├── tests/
│   └── run_tests.php                # Automated smoke & unit verification suite
├── composer.json                    # PHP dependencies (Slim 4, Twig, Dotenv)
├── package.json                     # Frontend build tooling (Vite, React, Tailwind 4)
├── vite.config.mjs                  # Vite configuration with manifest emission
└── .env.example                     # Environment template with placeholders
```

---

## 3. Core Subsystems

### 3.1 Request Lifecycle & Front Controller
1. **Entry:** Requests hit `public/index.php` (or root `index.php` on shared hosting).
2. **Environment & Core Bootstrap:** `Dotenv\Dotenv` loads `.env`. `Session::init()` configures secure cookie flags (`HttpOnly`, `SameSite=Lax`, HTTPS-aware `Secure`).
3. **Application Instantiation:** `Slim\Factory\AppFactory::create()` instantiates the Slim 4 app.
4. **Middleware Stack:**
   - `SetupGuardMiddleware`: Ensures application is configured; redirects uninitialized instances to `/setup`.
   - `BodyParsingMiddleware`: Parses JSON and form payloads.
   - `RoutingMiddleware`: Matches URI against FastRoute definitions.
   - `ErrorMiddleware`: Catches 404s and 500s, rendering custom Twig error templates while withholding internal stack traces in production.
5. **Route Execution via `SlimBridge`:**
   Controller handlers are wrapped with `App\Core\SlimBridge::wrap()`. Output buffering captures any direct output or view renders, while `App\Core\RedirectException` converts redirects into PSR-7 302 responses.

### 3.2 Twig Rendering & Vite Integration (HMR in Dev, Manifest in Production)
- Twig environment is cached via `getTwigEnvironment()` in `app/core/helpers.php`.
- Twig auto-escapes all output (`{{ var }}`) by default.
- Custom Twig functions:
  - `vite_tags([$js, $css])`:
    - **In Local Development with `npm run dev`:** Detects active Vite dev server via `public/hot` and injects the React Fast Refresh preamble, Vite HMR client (`@vite/client`), and direct module scripts for instant Hot Module Replacement.
    - **In Production / Static Mode:** Reads `public/dist/manifest.json` via `ViteAssetService` and injects hashed production `<link rel="stylesheet">` and `<script type="module">` tags with automatic fallback to `output.css`.
  - `vite_asset($entry)`: Resolves a single entry name to its active dev server or fingerprinted production URL.
- Master layout `app/views/layouts/main.twig` provides unified SEO blocks (`seo.title`, `seo.description`, `seo.canonical`), Open Graph tags, and structured layout slots.

### 3.3 React Interactive Islands Hydration
- React and Vite are strictly build-time tools.
- Public pages are rendered completely on the server with Twig for instant first contentful paint (FCP) and optimal SEO.
- Interactive components mount into explicit DOM containers using React 19's `createRoot()`:
  ```html
  <div data-react-island="counter" data-initial-count="10"></div>
  ```
- `resources/js/main.jsx` detects island elements on `DOMContentLoaded` and mounts components progressively without disrupting server-rendered DOM.

### 3.4 Database Access Layer
- Relational schema with 20 tables in MySQL / MariaDB InnoDB.
- Access via `Database::query()`, `Database::fetchOne()`, `Database::fetchAll()`, `Database::insert()`, and `Database::update()` using PDO prepared statements with parameter binding to prevent SQL injection.
