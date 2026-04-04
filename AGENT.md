# AGENT.md - AI Agent Instructions

## Project Structure

```
root/
├── index.php                 # Entry point for shared hosting (loads public/index.php)
├── public/                   # Web root (DocumentRoot)
│   ├── index.php            # Main application entry + router
│   ├── .htaccess            # URL rewriting
│   └── assets/              # Public assets (CSS, JS, images)
├── app/                     # Application code (NOT publicly accessible)
│   ├── core/                # Core classes (Database, Session, Router, helpers)
│   ├── controllers/         # Controller classes
│   └── views/               # Twig templates
│       ├── layouts/         # Base layouts
│       ├── pages/           # Landing pages
│       ├── auth/            # Auth views
│       ├── admin/           # Admin views
│       └── client/          # Client views
├── config/                  # Configuration files
├── console.php              # CLI commands
├── docs/                    # Documentation
├── .env.example             # Environment template
└── .env                     # Local environment (gitignored)
```

## Routing

All routes are defined in `public/index.php` using the Router class:

```php
$router->get('/path', function() { ... });
$router->post('/path', function() { ... });
```

Middleware:
- `guest` - Redirects if logged in
- `auth` - Requires login
- `admin` - Requires admin role

## Console Commands

```bash
php console help                          # Show help
php console add-admin                     # Interactive admin creation
php console add-admin admin@mysociety.com Pass@123  # Direct admin creation
```

## Database

- Config: `config/database.php`
- Schema: `app/schema.sql`
- Wrapper: `app/core/Database.php`

## Building Assets

```bash
npm run build     # Build CSS once
npm run watch     # Watch and rebuild CSS
```

## Docker

```bash
docker compose -f docker-compose.dev.yml up -d      # Development
docker compose -f docker-compose.staging.yml up -d  # Staging
docker compose -f docker-compose.prod.yml up -d     # Production
```

## Rules

1. Never expose `app/`, `config/`, or `vendor/` directories publicly
2. All routes go through `public/index.php`
3. Use `Session::` and `Database::` static methods, not raw PHP
4. CSRF tokens required for all POST forms
5. Password hashing: `password_hash()` with cost 12
6. Twig templates extend `layouts/base.html.twig`
7. Use `redirect()` helper for redirects, never echo Location header
8. Use `Session::flash()` for one-time messages
