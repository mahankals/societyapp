# Phase 1: Setup & Infrastructure

## Goals
- Initialize the project with a clean, modular structure.
- Configure Tailwind CSS for modern UI development.
- Establish a base landing page and database connectivity.

## Tasks
1. **[Completed] Directory Structure**
   - Created: `admin`, `auth`, `client`, `api`, `includes`, `assets/src`, `assets/dist`, `assets/js`.

2. **[Completed] Base Configuration**
   - `tailwind.config.js`: Setup content paths.
   - `assets/src/input.css`: Initialized with Tailwind directives.
   - `includes/db_config.php`: Established PDO connection template.
   - **Twig Templating**: Installed Twig via Composer and setup `templates/` directory with `base.html.twig`.

3. **[Completed] Landing Page (`index.php`)**
   - Created a responsive landing page using Twig templates (`templates/index.html.twig`).

4. **[Completed] UI Layout Setup**
   - Established `templates/base.html.twig` as the master layout for inheritance.

5. **[Completed] Centralized Routing Setup**
   - Implemented `index.php` as a front-controller for the application.
   - Configured allowed routes: `/`, `/auth`, `/admin`, `/client`, `/api`.
   - Added `.htaccess` for clean URL rewriting.
   - Unauthorized routes are handled with a 404 response.

6. **[To Do] Initial Commit of Routing Infrastructure**
   - Commit the functional router and `.htaccess` files.
