const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://societyapp.ddev.site';
const SCREENSHOTS_DIR = path.resolve(__dirname, 'Screenshots');
const DARK_DIR = path.join(SCREENSHOTS_DIR, 'dark');
const LIGHT_DIR = path.join(SCREENSHOTS_DIR, 'light');
const SETUP_DIR = path.join(SCREENSHOTS_DIR, 'setup');
const MOBILE_DIR = path.join(SCREENSHOTS_DIR, 'mobile');
const TABLET_DIR = path.join(SCREENSHOTS_DIR, 'tablet');

// Source directory for verified setup wizard screenshots
const WEBAPP_SETUP_DIR = path.resolve(__dirname, '../../screenshot/WebApp');

// Ensure all destination directories exist
[SCREENSHOTS_DIR, DARK_DIR, LIGHT_DIR, SETUP_DIR, MOBILE_DIR, TABLET_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Setup Wizard steps
function syncSetupScreenshots() {
    console.log('Syncing Setup Wizard step screenshots into references/Screenshots/setup/...');
    if (fs.existsSync(WEBAPP_SETUP_DIR)) {
        const setupFiles = fs.readdirSync(WEBAPP_SETUP_DIR).filter(f => f.endsWith('.png'));
        setupFiles.forEach(file => {
            const src = path.join(WEBAPP_SETUP_DIR, file);
            const dest = path.join(SETUP_DIR, file);
            fs.copyFileSync(src, dest);
        });
        console.log(`Synced ${setupFiles.length} setup wizard step screenshots.`);
    } else {
        console.warn('Setup wizard source directory not found:', WEBAPP_SETUP_DIR);
    }
}

// 31 core screens
const SCREENS = [
    // Public (8)
    { id: '01', name: '01-live-landing.png', url: '/', role: 'guest' },
    { id: '02', name: '02-live-contact.png', url: '/contact', role: 'guest' },
    { id: '03', name: '03-live-auth-login.png', url: '/auth/login', role: 'guest' },
    { id: '04', name: '04-live-auth-register.png', url: '/auth/register', role: 'guest' },
    { id: '05', name: '05-live-auth-reset-password.png', url: '/auth/reset-password', role: 'guest' },
    { id: '06', name: '06-live-society-contribute.png', url: '/society/contribute', role: 'guest' },
    { id: '07', name: '07-live-setup-wizard.png', url: '/setup', role: 'guest' },
    { id: '08', name: '08-live-error-404.png', url: '/route-not-found-404-test', role: 'guest' },

    // Admin (6)
    { id: '09', name: '09-live-admin-dashboard.png', url: '/admin', role: 'admin' },
    { id: '10', name: '10-live-admin-societies.png', url: '/admin/societies', role: 'admin' },
    { id: '11', name: '11-live-admin-societies-pending.png', url: '/admin/societies/pending', role: 'admin' },
    { id: '12', name: '12-live-admin-users.png', url: '/admin/users', role: 'admin' },
    { id: '13', name: '13-live-admin-invitations.png', url: '/admin/invitations', role: 'admin' },
    { id: '14', name: '14-live-admin-settings.png', url: '/admin/settings', role: 'admin' },

    // Resident (9)
    { id: '15', name: '15-live-user-profile.png', url: '/user/profile', role: 'resident' },
    { id: '16', name: '16-live-user-notifications.png', url: '/user/notification', role: 'resident' },
    { id: '17', name: '17-live-resident-dashboard.png', url: '/resident', role: 'resident' },
    { id: '18', name: '18-live-resident-bills.png', url: '/resident/bills', role: 'resident' },
    { id: '19', name: '19-live-resident-receipts.png', url: '/resident/receipts', role: 'resident' },
    { id: '20', name: '20-live-resident-members.png', url: '/resident/members', role: 'resident' },
    { id: '21', name: '21-live-resident-link-flat.png', url: '/resident/link-flat', role: 'resident' },
    { id: '22', name: '22-live-resident-requests.png', url: '/resident/requests', role: 'resident' },
    { id: '23', name: '23-live-resident-documents.png', url: '/resident/documents', role: 'resident' },

    // Committee (8)
    { id: '24', name: '24-live-committee-dashboard.png', url: '/comitee', role: 'admin' },
    { id: '25', name: '25-live-committee-flats.png', url: '/comitee/flats', role: 'admin' },
    { id: '26', name: '26-live-committee-bills.png', url: '/comitee/bills', role: 'admin' },
    { id: '27', name: '27-live-committee-members.png', url: '/comitee/members', role: 'admin' },
    { id: '28', name: '28-live-committee-requests.png', url: '/comitee/requests', role: 'admin' },
    { id: '29', name: '29-live-committee-expenses.png', url: '/comitee/expenses', role: 'admin' },
    { id: '30', name: '30-live-committee-accounting.png', url: '/comitee/accounting', role: 'admin' },
    { id: '31', name: '31-live-committee-broadcast.png', url: '/comitee/broadcast', role: 'admin' },
];

async function applyTheme(page, theme) {
    await page.evaluate((t) => {
        localStorage.setItem('societyapp_theme', t);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(t);
        document.documentElement.setAttribute('data-theme', t);
        document.documentElement.setAttribute('data-color-mode', t);
        if (typeof window.updateThemeUI === 'function') {
            window.updateThemeUI(t);
        }
    }, theme);
    await new Promise(r => setTimeout(r, 400));
}

async function loginAs(page, email, password) {
    console.log(`Authenticating as ${email}...`);
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
        const emailInput = document.getElementById('email');
        const passInput = document.getElementById('password');
        if (emailInput) emailInput.value = '';
        if (passInput) passInput.value = '';
    });
    await page.type('#email', email);
    await page.type('#password', password);
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    console.log(`Authentication finished for ${email}. Current URL: ${page.url()}`);
}

async function captureScreen(page, screen, theme, targetDir) {
    const fullUrl = `${BASE_URL}${screen.url}`;
    try {
        console.log(`[${theme.toUpperCase()}] Capturing: ${screen.name} (${fullUrl})...`);
        await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        await applyTheme(page, theme);
        const outPath = path.join(targetDir, screen.name);
        await page.screenshot({ path: outPath, fullPage: true });
        console.log(`  -> Saved: ${outPath}`);
    } catch (err) {
        console.error(`  -> ERROR capturing ${screen.name}:`, err.message);
    }
}

async function main() {
    syncSetupScreenshots();

    console.log('Launching headless browser...');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        ignoreHTTPSErrors: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--window-size=1440,900',
            '--ignore-certificate-errors',
        ]
    });

    const themes = ['dark', 'light'];

    for (const theme of themes) {
        const themeDir = theme === 'dark' ? DARK_DIR : LIGHT_DIR;
        console.log(`\n========================================`);
        console.log(`STARTING THEME RUN: ${theme.toUpperCase()}`);
        console.log(`Target Directory: ${themeDir}`);
        console.log(`========================================\n`);

        const context = await browser.createBrowserContext();
        const page = await context.newPage();
        await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);

        // Pre-configure theme on document load
        await page.evaluateOnNewDocument((t) => {
            localStorage.setItem('societyapp_theme', t);
            document.addEventListener('DOMContentLoaded', () => {
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(t);
                document.documentElement.setAttribute('data-theme', t);
                document.documentElement.setAttribute('data-color-mode', t);
            });
        }, theme);

        // 1. Public Screens
        const publicScreens = SCREENS.filter(s => s.role === 'guest');
        for (const s of publicScreens) {
            await captureScreen(page, s, theme, themeDir);
        }

        // 2. Admin & Committee Screens
        await loginAs(page, 'atulmahankal@gmail.com', 'password123');
        const adminScreens = SCREENS.filter(s => s.role === 'admin');
        for (const s of adminScreens) {
            await captureScreen(page, s, theme, themeDir);
        }

        // 3. Resident Screens
        await page.goto(`${BASE_URL}/auth/logout`, { waitUntil: 'networkidle2' });
        await loginAs(page, 'priya.patel@example.com', 'password123');
        const residentScreens = SCREENS.filter(s => s.role === 'resident');
        for (const s of residentScreens) {
            await captureScreen(page, s, theme, themeDir);
        }

        await context.close();
    }

    // Now generate mobile and tablet responsive views (in dark mode default)
    console.log(`\n========================================`);
    console.log(`STARTING RESPONSIVE CAPTURES (Mobile & Tablet)`);
    console.log(`========================================\n`);

    const respContext = await browser.createBrowserContext();
    const respPage = await respContext.newPage();

    // Mobile Viewport (412x892 - Modern Android/Phone)
    await respPage.setViewport({ width: 412, height: 892, deviceScaleFactor: 2, isMobile: true });
    
    // Mobile Landing
    await respPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await applyTheme(respPage, 'dark');
    await respPage.screenshot({ path: path.join(MOBILE_DIR, '24-live-mobile-landing.png'), fullPage: true });
    console.log('Saved: mobile/24-live-mobile-landing.png');

    // Mobile Resident Dashboard
    await loginAs(respPage, 'priya.patel@example.com', 'password123');
    await respPage.goto(`${BASE_URL}/resident`, { waitUntil: 'networkidle2' });
    await applyTheme(respPage, 'dark');
    await respPage.screenshot({ path: path.join(MOBILE_DIR, '26-live-mobile-resident-dashboard.png'), fullPage: true });
    console.log('Saved: mobile/26-live-mobile-resident-dashboard.png');

    // Mobile Admin Dashboard
    await respPage.goto(`${BASE_URL}/auth/logout`, { waitUntil: 'networkidle2' });
    await loginAs(respPage, 'atulmahankal@gmail.com', 'password123');
    await respPage.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    await applyTheme(respPage, 'dark');
    await respPage.screenshot({ path: path.join(MOBILE_DIR, '25-live-mobile-admin-dashboard.png'), fullPage: true });
    console.log('Saved: mobile/25-live-mobile-admin-dashboard.png');

    // Mobile Committee Dashboard
    await respPage.goto(`${BASE_URL}/comitee`, { waitUntil: 'networkidle2' });
    await applyTheme(respPage, 'dark');
    await respPage.screenshot({ path: path.join(MOBILE_DIR, '27-live-mobile-committee-dashboard.png'), fullPage: true });
    console.log('Saved: mobile/27-live-mobile-committee-dashboard.png');

    // Tablet Viewport (768x1024 - iPad Mini / Portrait Tablet)
    await respPage.setViewport({ width: 768, height: 1024, deviceScaleFactor: 2, isMobile: false });
    
    // Tablet Admin Dashboard
    await respPage.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    await applyTheme(respPage, 'dark');
    await respPage.screenshot({ path: path.join(TABLET_DIR, '28-live-tablet-admin-dashboard.png'), fullPage: true });
    console.log('Saved: tablet/28-live-tablet-admin-dashboard.png');

    // Tablet Resident Dashboard
    await respPage.goto(`${BASE_URL}/auth/logout`, { waitUntil: 'networkidle2' });
    await loginAs(respPage, 'priya.patel@example.com', 'password123');
    await respPage.goto(`${BASE_URL}/resident`, { waitUntil: 'networkidle2' });
    await applyTheme(respPage, 'dark');
    await respPage.screenshot({ path: path.join(TABLET_DIR, '29-live-tablet-resident-dashboard.png'), fullPage: true });
    console.log('Saved: tablet/29-live-tablet-resident-dashboard.png');

    await respContext.close();

    // Populate Root Screenshots Directory (Legacy 01-live to 30-live references)
    console.log(`\nPopulating root references/Screenshots/ legacy set...`);
    // Copy dark mode set to root as standard references
    const darkFiles = fs.readdirSync(DARK_DIR).filter(f => f.endsWith('.png'));
    darkFiles.forEach(f => {
        fs.copyFileSync(path.join(DARK_DIR, f), path.join(SCREENSHOTS_DIR, f));
    });
    // Add mobile/tablet references into root
    fs.copyFileSync(path.join(MOBILE_DIR, '24-live-mobile-landing.png'), path.join(SCREENSHOTS_DIR, '24-live-mobile-landing.png'));
    fs.copyFileSync(path.join(MOBILE_DIR, '25-live-mobile-admin-dashboard.png'), path.join(SCREENSHOTS_DIR, '25-live-mobile-admin-dashboard.png'));
    fs.copyFileSync(path.join(MOBILE_DIR, '26-live-mobile-resident-dashboard.png'), path.join(SCREENSHOTS_DIR, '26-live-mobile-resident-dashboard.png'));
    fs.copyFileSync(path.join(TABLET_DIR, '28-live-tablet-admin-dashboard.png'), path.join(SCREENSHOTS_DIR, '27-live-tablet-admin-dashboard.png'));
    fs.copyFileSync(path.join(TABLET_DIR, '29-live-tablet-resident-dashboard.png'), path.join(SCREENSHOTS_DIR, '28-live-tablet-resident-dashboard.png'));
    // Add 29-light and 30-light to root
    fs.copyFileSync(path.join(LIGHT_DIR, '09-live-admin-dashboard.png'), path.join(SCREENSHOTS_DIR, '29-live-admin-dashboard-light.png'));
    fs.copyFileSync(path.join(LIGHT_DIR, '17-live-resident-dashboard.png'), path.join(SCREENSHOTS_DIR, '30-live-resident-dashboard-light.png'));

    await browser.close();
    console.log('\n========================================');
    console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
    console.log(`Dark mode:   ${fs.readdirSync(DARK_DIR).length} files`);
    console.log(`Light mode:  ${fs.readdirSync(LIGHT_DIR).length} files`);
    console.log(`Setup steps: ${fs.readdirSync(SETUP_DIR).length} files`);
    console.log(`Mobile:      ${fs.readdirSync(MOBILE_DIR).length} files`);
    console.log(`Tablet:      ${fs.readdirSync(TABLET_DIR).length} files`);
    console.log('========================================\n');
}

main().catch(err => {
    console.error('Fatal error during screenshot capture:', err);
    process.exit(1);
});
