# SocietyApp Documentation

## Getting Started

- [Quick Start Guide](../README.md#quick-start) — Installation, setup, and running the app
- [Console Commands](../README.md#console-commands) — CLI tools for admin management
- [Docker Setup](../README.md#docker-environments) — Dev, staging, and production Docker configs

## Architecture

### Directory Structure

```
root/
├── index.php                 # Shared hosting entry (loads public/index.php)
├── public/                   # Web root — only this folder is publicly accessible
│   ├── index.php            # Main entry point + all routes
│   ├── .htaccess            # URL rewriting for Apache
│   └── assets/              # CSS, JS, images, uploads
├── app/                     # Application code (NOT publicly accessible)
│   ├── core/                # Database, Session, Router, helpers
│   ├── controllers/         # Controller classes
│   └── views/               # Twig templates (layouts, pages, auth, admin, client)
├── config/                  # Configuration files (database, app, session)
├── console.php              # CLI commands
├── .env                     # Local environment (gitignored)
└── .env.example             # Environment template
```

### Routing

All routes are defined in `public/index.php` using the Router class:

```php
$router->get('/path', function() { ... });
$router->post('/path', function() { ... });
```

**Middleware:**
- `guest` — Redirects if already logged in
- `auth` — Requires login (shows 401 page if not authenticated)
- `admin` — Requires admin role (shows 403 page if not admin)

### Error Pages

| Page | Code | Description |
|------|------|-------------|
| 401 | Unauthorized | User not logged in |
| 403 | Forbidden | User lacks permission |
| 404 | Not Found | Route doesn't exist |
| 500 | Server Error | Unexpected application error |

## Development Plans

- [Phase Progress](plans/index.md) — Track completion of all phases

## Configuration

### Environment Variables

All configuration is managed through `.env`. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key variables:
- `APP_ENV` — Environment (development, staging, production)
- `APP_DEBUG` — Enable debug output
- `APP_URL` — Base URL of the application
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` — Database credentials
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `SESSION_LIFETIME` — Session timeout in seconds

### Database

- Schema: `app/schema.sql`
- Config: `config/database.php`
- Wrapper: `app/core/Database.php`

## Console Commands

```bash
php console help                              # Show all commands
php console add-admin                         # Interactive admin creation
php console add-admin admin@mysociety.com Pass@123  # Direct admin creation
```

> **Note:** Only one admin can exist at a time. Delete the existing admin before creating a new one.

## Docker

```bash
docker compose -f docker-compose.dev.yml up -d      # Development
docker compose -f docker-compose.staging.yml up -d  # Staging
docker compose -f docker-compose.prod.yml up -d     # Production
```

All ports and credentials are configurable via `.env`.

## Security

- `app/`, `config/`, `vendor/` directories are blocked from public access
- All routes go through `public/index.php` only
- CSRF tokens required for all POST forms
- Password hashing with `password_hash()` (cost 12)
- Session regeneration on login
- Role-based access control
