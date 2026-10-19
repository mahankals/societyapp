# Application Visual References & Screenshots

This directory contains full-page visual screenshots of all pages in **SocietyApp**, captured across **Dark Mode**, **Light Mode**, and **Mobile / Tablet Views**.

## Organization

- **Dark Mode Gallery**: `references/Screenshots/dark/`
- **Light Mode Gallery**: `references/Screenshots/light/`
- **Root Legacy Files**: `references/Screenshots/01-live-*.png` through `30-live-*.png`

## Available Pages Captured

| Page | URL | Access | Dark Mode | Light Mode |
| :--- | :--- | :--- | :--- | :--- |
| Landing Page | `/` | Public | [View](dark/01-landing.png) | [View](light/01-landing.png) |
| Contact Us | `/contact` | Public | [View](dark/02-contact.png) | [View](light/02-contact.png) |
| Login | `/login` | Public | [View](dark/03-auth-login.png) | [View](light/03-auth-login.png) |
| Register | `/register` | Public | [View](dark/04-auth-register.png) | [View](light/04-auth-register.png) |
| Reset Password | `/reset-password` | Public | [View](dark/05-auth-reset-password.png) | [View](light/05-auth-reset-password.png) |
| Society Contribution | `/society/contribute` | Shared | [View](dark/06-society-contribute.png) | [View](light/06-society-contribute.png) |
| Setup Wizard | `/setup` | Public | [View](dark/07-setup-wizard.png) | [View](light/07-setup-wizard.png) |
| 404 Error Page | `/not-found` | Public | [View](dark/08-error-404.png) | [View](light/08-error-404.png) |
| Admin Dashboard | `/admin` | Admin | [View](dark/09-admin-dashboard.png) | [View](light/09-admin-dashboard.png) |
| Admin Societies | `/admin/societies` | Admin | [View](dark/10-admin-societies.png) | [View](light/10-admin-societies.png) |
| Pending Society Proposals | `/admin/societies/pending` | Admin | [View](dark/11-admin-societies-pending.png) | [View](light/11-admin-societies-pending.png) |
| User Directory & Roles | `/admin/users` | Admin | [View](dark/12-admin-users.png) | [View](light/12-admin-users.png) |
| Society Invitations | `/admin/invitations` | Admin | [View](dark/13-admin-invitations.png) | [View](light/13-admin-invitations.png) |
| Platform & SMTP Settings | `/admin/settings` | Admin | [View](dark/14-admin-settings.png) | [View](light/14-admin-settings.png) |
| User Profile & Connected Accounts | `/profile` | Resident / Admin | [View](dark/15-user-profile.png) | [View](light/15-user-profile.png) |
| Notifications Center | `/notifications` | Resident / Admin | [View](dark/16-user-notifications.png) | [View](light/16-user-notifications.png) |
| Resident Dashboard | `/resident` | Resident | [View](dark/17-resident-dashboard.png) | [View](light/17-resident-dashboard.png) |
| Maintenance Bills & Dues | `/resident/bills` | Resident | [View](dark/18-resident-bills.png) | [View](light/18-resident-bills.png) |
| Payment Receipts Ledger | `/resident/receipts` | Resident | [View](dark/19-resident-receipts.png) | [View](light/19-resident-receipts.png) |
| Society Members & Contacts | `/resident/members` | Resident | [View](dark/20-resident-members.png) | [View](light/20-resident-members.png) |
| Request Flat Linking | `/resident/link-flat` | Resident | [View](dark/21-resident-link-flat.png) | [View](light/21-resident-link-flat.png) |
| Requests & Queries | `/resident/requests` | Resident | [View](dark/22-resident-requests.png) | [View](light/22-resident-requests.png) |
| Society Documents | `/resident/documents` | Resident | [View](dark/23-resident-documents.png) | [View](light/23-resident-documents.png) |
| Committee Dashboard | `/committee` | Committee | [View](dark/24-committee-dashboard.png) | [View](light/24-committee-dashboard.png) |
| Flats Management | `/committee/flats` | Committee | [View](dark/25-committee-flats.png) | [View](light/25-committee-flats.png) |
| Mobile Landing Page | `/` (390x844) | Public | [View](dark/26-mobile-landing.png) | [View](light/26-mobile-landing.png) |
| Mobile Admin Dashboard | `/admin` (390x844) | Admin | [View](dark/27-mobile-admin-dashboard.png) | [View](light/27-mobile-admin-dashboard.png) |
| Mobile Resident Dashboard | `/resident` (390x844) | Resident | [View](dark/28-mobile-resident-dashboard.png) | [View](light/28-mobile-resident-dashboard.png) |
| Mobile Sidebar Drawer Open | `/resident` (390x844) | Resident | [View](dark/29-mobile-resident-sidebar-open.png) | [View](light/29-mobile-resident-sidebar-open.png) |
| Tablet Admin Dashboard | `/admin` (820x1180) | Admin | [View](dark/30-tablet-admin-dashboard.png) | [View](light/30-tablet-admin-dashboard.png) |
| Tablet Resident Dashboard | `/resident` (820x1180) | Resident | [View](dark/31-tablet-resident-dashboard.png) | [View](light/31-tablet-resident-dashboard.png) |

## Updating Screenshots

Whenever UI, layouts, themes, or page functionality change, execute:
```bash
npm run screenshots
```
