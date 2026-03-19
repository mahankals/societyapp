# SocietyApp

A modern, responsive, and PWA-ready management system for housing societies. This application is a rebuild of the original SocietyApp, modernized with Plain PHP, Tailwind CSS, and offline capabilities.

## Key Features
- **Modern UI/UX:** Built with the latest Tailwind CSS for a sleek, responsive experience.
- **PWA Ready:** Installable on mobile and desktop devices.
- **Offline Access:** Access key client data offline with PIN/Device authentication.
- **Admin Dashboard:** Comprehensive management for society administrators.
- **Client Area:** Dedicated portal for residents to view notifications, manage profiles, and upload documents.

## Project Structure
- `/`: Landing Page.
- `/admin`: Administrative management area.
- `/auth`: Authentication portal (Login, Registration, etc.).
- `/client`: Resident/Member portal.
- `/api`: Internal PHP-based JSON APIs.
- `/docs`: Project documentation and plans.
- `/assets`: Frontend assets (Tailwind CSS, JS, Images).

## Installation for Developers

### Prerequisites
- PHP 8.1+
- MySQL 8.0+
- [DDEV](https://ddev.readthedocs.io/) (Optional, but recommended)
- Node.js & NPM (for Tailwind CSS development)

### Setup Steps
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd SocietyApp
   ```
2. **Setup DDEV (If using DDEV):**
   ```bash
   ddev start
   ```
3. **Setup Tailwind CSS:**
   ```bash
   npm install
   # Run build once
   npx tailwindcss -i ./assets/src/input.css -o ./assets/dist/output.css
   # Or watch for changes
   npx tailwindcss -i ./assets/src/input.css -o ./assets/dist/output.css --watch
   ```
4. **Configure Database:**
   - Update `includes/db_config.php` with your database credentials (DDEV handles this automatically if using the provided config).
5. **Access the application:**
   - [http://societyapp.ddev.site](http://societyapp.ddev.site) (DDEV)
   - [http://localhost/SocietyApp](http://localhost/SocietyApp) (Standard PHP)

## Documentation
Refer to the `docs/` directory for detailed feature usage and development plans.
- [Status of Plan](docs/plans/index.md)
