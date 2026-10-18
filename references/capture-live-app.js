const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.resolve(__dirname, 'Screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Session ID created for Atul Mahankal (admin)
const SESSION_ID = 'd459b01d6a6d5e6d6f10f068335901a8';
const BASE_URL = 'https://societyapp.ddev.site';

const SCREENS = [
    // --- 1. Public Pages (Desktop 1440x900) ---
    { name: '01-live-landing.png', url: '/', auth: false, viewport: { width: 1440, height: 900 } },
    { name: '02-live-contact.png', url: '/contact', auth: false, viewport: { width: 1440, height: 900 } },
    { name: '03-live-auth-login.png', url: '/auth/login', auth: false, viewport: { width: 1440, height: 900 } },
    { name: '04-live-auth-register.png', url: '/auth/register', auth: false, viewport: { width: 1440, height: 900 } },
    { name: '05-live-auth-reset-password.png', url: '/auth/reset-password', auth: false, viewport: { width: 1440, height: 900 } },
    { name: '06-live-society-contribute.png', url: '/society/contribute', auth: false, viewport: { width: 1440, height: 900 } },
    { name: '07-live-setup-wizard.png', url: '/setup', auth: false, viewport: { width: 1440, height: 900 } },
    { name: '08-live-error-404.png', url: '/non-existent-page-not-found', auth: false, viewport: { width: 1440, height: 900 } },

    // --- 2. Admin Portal (Desktop 1440x900) ---
    { name: '09-live-admin-dashboard.png', url: '/admin', auth: true, viewport: { width: 1440, height: 900 } },
    { name: '10-live-admin-societies.png', url: '/admin/societies', auth: true, viewport: { width: 1440, height: 900 } },
    { name: '11-live-admin-societies-pending.png', url: '/admin/societies/pending', auth: true, viewport: { width: 1440, height: 900 } },
    { name: '12-live-admin-users.png', url: '/admin/users', auth: true, viewport: { width: 1440, height: 900 } },
    { name: '13-live-admin-invitations.png', url: '/admin/invitations', auth: true, viewport: { width: 1440, height: 900 } },
    { name: '14-live-admin-settings.png', url: '/admin/settings', auth: true, viewport: { width: 1440, height: 900 } },

    // --- 3. User & Resident Portal (Desktop 1440x900) ---
    { name: '15-live-user-profile.png', url: '/user/profile', auth: true, viewport: { width: 1440, height: 900 } },
    { name: '16-live-user-notifications.png', url: '/user/notification', auth: true, viewport: { width: 1440, height: 900 } },
    { name: '17-live-resident-dashboard.png', url: '/resident', auth: true, viewport: { width: 1440, height: 900 } },
    { name: '18-live-resident-bills.png', url: '/resident/bills', auth: true, viewport: { width: 1440, height: 900 } },
    { name: '19-live-resident-receipts.png', url: '/resident/receipts', auth: true, viewport: { width: 1440, height: 900 } },
    { name: '20-live-resident-members.png', url: '/resident/members', auth: true, viewport: { width: 1440, height: 900 } },
    { name: '21-live-resident-link-flat.png', url: '/resident/link-flat', auth: true, viewport: { width: 1440, height: 900 } },
    { name: '22-live-resident-requests.png', url: '/resident/requests', auth: true, viewport: { width: 1440, height: 900 } },
    { name: '23-live-resident-documents.png', url: '/resident/documents', auth: true, viewport: { width: 1440, height: 900 } },

    // --- 4. Mobile Viewports (390x844 - iPhone 13/14 scale) ---
    { name: '24-live-mobile-landing.png', url: '/', auth: false, viewport: { width: 390, height: 844, isMobile: true } },
    { name: '25-live-mobile-admin-dashboard.png', url: '/admin', auth: true, viewport: { width: 390, height: 844, isMobile: true } },
    { name: '26-live-mobile-resident-dashboard.png', url: '/resident', auth: true, viewport: { width: 390, height: 844, isMobile: true } },

    // --- 5. Tablet Viewports (820x1180 - iPad Air scale, compact sidebar rail) ---
    { name: '27-live-tablet-admin-dashboard.png', url: '/admin', auth: true, viewport: { width: 820, height: 1180, isMobile: false } },
    { name: '28-live-tablet-resident-dashboard.png', url: '/resident', auth: true, viewport: { width: 820, height: 1180, isMobile: false } },

    // --- 6. Light Theme Variants ---
    { name: '29-live-admin-dashboard-light.png', url: '/admin', auth: true, theme: 'light', viewport: { width: 1440, height: 900 } },
    { name: '30-live-resident-dashboard-light.png', url: '/resident', auth: true, theme: 'light', viewport: { width: 1440, height: 900 } },
];

async function run() {
    console.log('Launching Headless Chrome for live application screenshots...');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        ignoreHTTPSErrors: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--ignore-certificate-errors',
        ]
    });

    const page = await browser.newPage();

    for (const s of SCREENS) {
        try {
            console.log(`Capturing: ${s.name} from ${BASE_URL + s.url}...`);
            await page.setViewport({
                width: s.viewport.width,
                height: s.viewport.height,
                isMobile: s.viewport.isMobile || false,
                deviceScaleFactor: 2,
            });

            // Set cookie for auth routes
            if (s.auth) {
                await page.setCookie({
                    name: 'SOCIETYAPP_SESSION',
                    value: SESSION_ID,
                    domain: 'societyapp.ddev.site',
                    path: '/',
                    httpOnly: true,
                    secure: true,
                    sameSite: 'Lax',
                });
            } else {
                await page.deleteCookie({ name: 'SOCIETYAPP_SESSION', domain: 'societyapp.ddev.site' });
            }

            await page.goto(BASE_URL + s.url, { waitUntil: 'networkidle2', timeout: 20000 });

            // Apply light theme if specified
            if (s.theme === 'light') {
                await page.evaluate(() => {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.documentElement.setAttribute('data-color-mode', 'light');
                });
            }

            // Small delay for animations/lucide icons
            await new Promise(r => setTimeout(r, 600));

            const outPath = path.join(SCREENSHOTS_DIR, s.name);
            await page.screenshot({ path: outPath, fullPage: true });
            console.log(`Saved: ${outPath}`);
        } catch (e) {
            console.error(`Error on ${s.name}:`, e.message);
        }
    }

    await browser.close();
    console.log(`\nAll ${SCREENS.length} live application screenshots captured successfully in ${SCREENSHOTS_DIR}!`);
}

run();
