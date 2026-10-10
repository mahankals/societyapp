const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const PROTOTYPE_PATH = 'file://' + path.resolve(__dirname, 'societyapp-prototype.html');
const SCREENSHOTS_DIR = path.resolve(__dirname, 'Screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const SCREENS = [
    {
        id: 'setup-key',
        name: '01-setup-security-check.png',
        title: 'Installation Security Check',
        url: '/setup',
        desc: 'Security key check before setup wizard'
    },
    {
        id: 'setup-wizard',
        name: '02-setup-wizard-smtp-test.png',
        title: 'Setup Step Wizard & SMTP',
        url: '/setup',
        desc: 'Step 4 of 5 with SMTP live test mail dispatch'
    },
    {
        id: 'auth-login',
        name: '03-auth-login.png',
        title: 'Sign In Screen',
        url: '/auth/login',
        desc: 'Authentication screen with email, password and Google SSO'
    },
    {
        id: 'admin-dash',
        name: '04-admin-dashboard-dark.png',
        title: 'Admin Dashboard (Dark)',
        url: '/admin',
        desc: 'Application Administration dashboard with 4 stats and lists'
    },
    {
        id: 'admin-dash',
        name: '05-admin-dashboard-light.png',
        title: 'Admin Dashboard (Light)',
        url: '/admin',
        theme: 'light',
        desc: 'Admin dashboard rendered in light mode'
    },
    {
        id: 'admin-societies',
        name: '06-admin-housing-societies.png',
        title: 'Housing Societies Management',
        url: '/admin/societies',
        desc: 'Societies list with Pending Requests button'
    },
    {
        id: 'admin-pending',
        name: '07-admin-pending-proposals.png',
        title: 'Pending Society Proposals',
        url: '/admin/societies/pending',
        desc: 'Pending onboarding proposals queue'
    },
    {
        id: 'admin-pending',
        name: '08-admin-reject-proposal-remark-modal.png',
        title: 'Reject Proposal Remark Modal',
        url: '/admin/societies/pending',
        modal: 'modalRejectRemark',
        desc: 'Mandatory rejection remark modal per changes.md'
    },
    {
        id: 'admin-users',
        name: '09-admin-users.png',
        title: 'Platform Users Management',
        url: '/admin/users',
        desc: 'Platform users directory for super administrator'
    },
    {
        id: 'admin-settings',
        name: '10-admin-settings-smtp.png',
        title: 'System Settings & SMTP',
        url: '/admin/settings',
        desc: 'Global settings and SMTP configuration'
    },
    {
        id: 'resident-dash',
        name: '11-resident-dashboard-dark.png',
        title: 'Resident Dashboard (Dark)',
        url: '/resident',
        role: 'resident',
        desc: 'Resident dashboard with quick actions and flat cards'
    },
    {
        id: 'resident-dash',
        name: '12-resident-dashboard-light.png',
        title: 'Resident Dashboard (Light)',
        url: '/resident',
        role: 'resident',
        theme: 'light',
        desc: 'Resident dashboard in crisp light theme'
    },
    {
        id: 'resident-dash',
        name: '13-resident-occupancy-modal.png',
        title: 'Manage Flat Occupancy Modal',
        url: '/resident',
        role: 'resident',
        modal: 'modalOccupancy',
        desc: '3-button occupancy modal with tenant readonly rules'
    },
    {
        id: 'resident-bills',
        name: '14-resident-bills-and-dues.png',
        title: 'Bills & Dues (Bulk Pay)',
        url: '/resident/bills',
        role: 'resident',
        desc: 'Maintenance dues ledger with multi-select bulk pay'
    },
    {
        id: 'resident-bills',
        name: '15-resident-bulk-upi-qr-modal.png',
        title: 'Bulk Pay UPI QR Code Modal',
        url: '/resident/bills',
        role: 'resident',
        modal: 'modalBulkUpi',
        desc: 'Instant UPI QR code modal with society VPA'
    },
    {
        id: 'resident-receipts',
        name: '16-resident-receipts-ledger.png',
        title: 'Payment Receipts Ledger',
        url: '/resident/receipts',
        role: 'resident',
        desc: 'Verified and pending payment receipts list'
    },
    {
        id: 'resident-dash',
        name: '17-resident-link-flat-tenant-notice.png',
        title: 'Link Flat Modal with Tenant Notice',
        url: '/resident',
        role: 'resident',
        modal: 'modalLinkFlat',
        action: 'tenantNotice',
        desc: 'Flat link modal with highlighted Tenant disclaimer alert'
    },
    {
        id: 'user-profile',
        name: '18-user-profile-connected-accounts.png',
        title: 'Profile & Connected Accounts',
        url: '/user/profile',
        desc: 'Profile with Google SSO link/unlink toggle'
    },
    {
        id: 'user-notifications',
        name: '19-user-notifications.png',
        title: 'User Notifications',
        url: '/user/notification',
        desc: 'Notification list with read/unread & view actions'
    },
    {
        id: 'committee-flats',
        name: '20-committee-flats-management.png',
        title: 'Committee Flats Management',
        url: '/comitee/flats',
        role: 'committee',
        desc: 'Flats & units directory with occupancy status'
    },
    {
        id: 'committee-bills',
        name: '21-committee-bills-upi-settings.png',
        title: 'Committee Bills & UPI Settings',
        url: '/comitee/bills',
        role: 'committee',
        desc: 'Bills management and Society UPI payment settings'
    },
    {
        id: 'society-contribute',
        name: '22-society-contribute-proposal.png',
        title: 'Contribute Society Proposal',
        url: '/society/contribute',
        desc: 'Contribute society onboarding with committee table'
    },
    {
        id: 'error-adr-validation',
        name: '23-adr-section-8-field-errors.png',
        title: 'ADR Section 8 Field Validation Errors',
        url: '/auth/login?error=validation',
        action: 'adrErrors',
        desc: 'Validation errors displayed directly below input fields'
    },
    {
        id: 'error-404',
        name: '24-error-404-page.png',
        title: '404 Page Not Found',
        url: '/page-not-found',
        desc: 'Branded 404 error page'
    },
    {
        id: 'error-500',
        name: '25-error-500-page.png',
        title: '500 Server Error',
        url: '/server-error',
        desc: 'Branded 500 error page with correlation ID'
    },
    {
        id: 'resident-dash',
        name: '26-mobile-resident-dashboard.png',
        title: 'Mobile Viewport Resident Dashboard',
        url: '/resident',
        role: 'resident',
        device: 'mobile',
        desc: 'Mobile responsive layout with collapsible navigation'
    }
];

async function captureAll() {
    console.log('Launching Headless Chrome...');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();

    for (const screen of SCREENS) {
        console.log(`Capturing: ${screen.name} - ${screen.title}...`);

        // Configure viewport
        if (screen.device === 'mobile') {
            await page.setViewport({ width: 420, height: 860, deviceScaleFactor: 2 });
        } else {
            await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
        }

        await page.goto(PROTOTYPE_PATH, { waitUntil: 'networkidle0' });

        // Apply screen state inside the page
        await page.evaluate((s) => {
            // Theme
            if (s.theme === 'light') {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
                document.documentElement.setAttribute('data-theme', 'light');
            } else {
                document.documentElement.classList.remove('light');
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
            }

            // Role
            if (s.role) {
                setRole(s.role, s.role.charAt(0).toUpperCase() + s.role.slice(1));
            } else {
                setRole('admin', 'Admin');
            }

            // Device frame
            if (s.device) {
                setDevice(s.device, s.device.charAt(0).toUpperCase() + s.device.slice(1));
            } else {
                setDevice('desktop', 'Desktop');
            }

            // Switch Screen
            switchScreen(s.id, s.title, s.url);

            // Special actions
            if (s.action === 'tenantNotice') {
                toggleLinkRole('tenant');
            } else if (s.action === 'adrErrors') {
                triggerAdrErrors();
            }

            // Open Modal if specified
            if (s.modal) {
                openModal(s.modal);
                if (s.modal === 'modalOccupancy') {
                    setOccupancyState('rented');
                }
            }

            // Ensure Lucide icons render
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }, screen);

        // Small pause for DOM/CSS paint
        await new Promise(r => setTimeout(r, 400));

        const targetFile = path.join(SCREENSHOTS_DIR, screen.name);
        await page.screenshot({ path: targetFile, fullPage: false });
        console.log(`Saved: ${targetFile}`);
    }

    await browser.close();
    console.log('✓ All 26 screenshots successfully generated in references/Screenshots/');
}

captureAll().catch(err => {
    console.error('Capture failed:', err);
    process.exit(1);
});
