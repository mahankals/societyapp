# SocietyApp

A modern, responsive, and PWA-ready management system for housing societies. Built with Plain PHP, Tailwind CSS, and offline capabilities.

## Quick Links

- [📖 Full Documentation](docs/README.md) — Architecture, setup, commands, and deployment
- [🐛 Issues](https://github.com/mahankals/societyapp/issues) — Report bugs or request features

## Key Features

- **Modern UI/UX** — Glass-morphism design with Tailwind CSS, responsive across all devices
- **PWA Ready** — Installable on mobile and desktop with offline support
- **Secure Auth** — Email/password + Google OAuth with CSRF protection
- **Role-Based Access** — Admin and Resident portals with permission control
- **Admin Dashboard** — Full society management with stats, billing, and notices
- **Client Portal** — Residents can view bills, submit requests, and track complaints
- **Custom Error Pages** — Beautiful 401, 403, 404, and 500 error screens

## Quick Start

### 1. Install Dependencies

```bash
composer install
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database and Google OAuth credentials
```

### 3. Run Migrations

```bash
php console migrate
```

### 4. Create Admin User

```bash
php console add-admin admin@mysociety.com Pass@123
```

### 5. Build Assets

```bash
npm run build    # Build CSS once
npm run watch    # Watch for changes
```

### 6. Run the App

**Option A: WAMP/XAMPP**
- Point your DocumentRoot to the project folder
- Access: `http://localhost/SocietyApp`

**Option B: PHP Built-in Server**
```bash
php -S localhost:8000
```

**Option C: Docker**
```bash
docker compose -f docker-compose.dev.yml up -d
# Access: http://localhost:8080
```

**Option D: DDEV**
```bash
ddev start
ddev launch
```

## Console Commands

```bash
php console help                          # Show all commands
php console migrate                       # Run database migrations
php console add-admin                     # Create admin (interactive)
php console add-admin admin@mysociety.com Pass@123  # Create admin (direct)
```

## Docker Environments

| Environment | File | Ports |
|-------------|------|-------|
| Development | `docker-compose.dev.yml` | App: 8080, DB: 3306, Mail: 8025 |
| Staging | `docker-compose.staging.yml` | App: 8080, DB: 3306 |
| Production | `docker-compose.prod.yml` | App: 80, DB: 3306 |

All ports and credentials are configurable via `.env`.

## License

ISC
