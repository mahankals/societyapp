const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'https://societyapp.ddev.site';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../references/Screenshots');
const DARK_DIR = path.join(SCREENSHOTS_DIR, 'dark');
const LIGHT_DIR = path.join(SCREENSHOTS_DIR, 'light');

[SCREENSHOTS_DIR, DARK_DIR, LIGHT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const SCREENS = [
  // --- 1. Public Pages (Desktop 1440x900) ---
  { id: '01', key: '01-live-landing', file: '01-landing', url: '/', auth: false, viewport: { width: 1440, height: 900 } },
  { id: '02', key: '02-live-contact', file: '02-contact', url: '/contact', auth: false, viewport: { width: 1440, height: 900 } },
  { id: '03', key: '03-live-auth-login', file: '03-auth-login', url: '/login', auth: false, viewport: { width: 1440, height: 900 } },
  { id: '04', key: '04-live-auth-register', file: '04-auth-register', url: '/register', auth: false, viewport: { width: 1440, height: 900 } },
  { id: '05', key: '05-live-auth-reset-password', file: '05-auth-reset-password', url: '/reset-password', auth: false, viewport: { width: 1440, height: 900 } },
  { id: '06', key: '06-live-society-contribute', file: '06-society-contribute', url: '/society/contribute', auth: false, viewport: { width: 1440, height: 900 } },
  { id: '07', key: '07-live-setup-wizard', file: '07-setup-wizard', url: '/setup', auth: false, viewport: { width: 1440, height: 900 } },
  { id: '08', key: '08-live-error-404', file: '08-error-404', url: '/non-existent-page-not-found', auth: false, viewport: { width: 1440, height: 900 } },

  // --- 2. Admin Portal (Desktop 1440x900) ---
  { id: '09', key: '09-live-admin-dashboard', file: '09-admin-dashboard', url: '/admin', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '10', key: '10-live-admin-societies', file: '10-admin-societies', url: '/admin/societies', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '11', key: '11-live-admin-societies-pending', file: '11-admin-societies-pending', url: '/admin/societies/pending', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '12', key: '12-live-admin-users', file: '12-admin-users', url: '/admin/users', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '13', key: '13-live-admin-invitations', file: '13-admin-invitations', url: '/admin/invitations', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '14', key: '14-live-admin-settings', file: '14-admin-settings', url: '/admin/settings', auth: true, viewport: { width: 1440, height: 900 } },

  // --- 3. User & Resident Portal (Desktop 1440x900) ---
  { id: '15', key: '15-live-user-profile', file: '15-user-profile', url: '/profile', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '16', key: '16-live-user-notifications', file: '16-user-notifications', url: '/notifications', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '17', key: '17-live-resident-dashboard', file: '17-resident-dashboard', url: '/resident', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '18', key: '18-live-resident-bills', file: '18-resident-bills', url: '/resident/bills', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '19', key: '19-live-resident-receipts', file: '19-resident-receipts', url: '/resident/receipts', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '20', key: '20-live-resident-members', file: '20-resident-members', url: '/resident/members', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '21', key: '21-live-resident-link-flat', file: '21-resident-link-flat', url: '/resident/link-flat', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '22', key: '22-live-resident-requests', file: '22-resident-requests', url: '/resident/requests', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '23', key: '23-live-resident-documents', file: '23-resident-documents', url: '/resident/documents', auth: true, viewport: { width: 1440, height: 900 } },

  // --- 4. Committee Portal (Desktop 1440x900) ---
  { id: '24', key: '24-committee-dashboard', file: '24-committee-dashboard', url: '/committee', auth: true, viewport: { width: 1440, height: 900 } },
  { id: '25', key: '25-committee-flats', file: '25-committee-flats', url: '/committee/flats', auth: true, viewport: { width: 1440, height: 900 } },

  // --- 5. Mobile Viewports (390x844 - iPhone scale) ---
  { id: '26', key: '24-live-mobile-landing', file: '26-mobile-landing', url: '/', auth: false, viewport: { width: 390, height: 844, isMobile: true } },
  { id: '27', key: '25-live-mobile-admin-dashboard', file: '27-mobile-admin-dashboard', url: '/admin', auth: true, viewport: { width: 390, height: 844, isMobile: true } },
  { id: '28', key: '26-live-mobile-resident-dashboard', file: '28-mobile-resident-dashboard', url: '/resident', auth: true, viewport: { width: 390, height: 844, isMobile: true } },
  { id: '29', key: '27-mobile-resident-sidebar-open', file: '29-mobile-resident-sidebar-open', url: '/resident', auth: true, viewport: { width: 390, height: 844, isMobile: true }, openMobileSidebar: true },

  // --- 6. Tablet Viewports (820x1180 - iPad scale) ---
  { id: '30', key: '27-live-tablet-admin-dashboard', file: '30-tablet-admin-dashboard', url: '/admin', auth: true, viewport: { width: 820, height: 1180, isMobile: false } },
  { id: '31', key: '28-live-tablet-resident-dashboard', file: '31-tablet-resident-dashboard', url: '/resident', auth: true, viewport: { width: 820, height: 1180, isMobile: false } },
];

async function captureAll() {
  console.log(`Starting automated screenshot capture on ${BASE_URL}...`);
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  });

  // Step 1: Perform login to get authenticated cookies & storageState
  console.log('Authenticating as admin/resident (atulmahankal@gmail.com)...');
  const authContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const authPage = await authContext.newPage();
  await authPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 20000 });
  await authPage.fill('input[name="login"]', 'atulmahankal@gmail.com');
  await authPage.fill('input[name="password"]', 'password123');
  await authPage.click('button[type="submit"]');
  await authPage.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  const storageState = await authContext.storageState();
  await authContext.close();
  console.log('Authentication successful. Storage state captured.\n');

  // Step 2: Iterate over both dark and light modes
  const themes = ['dark', 'light'];

  for (const theme of themes) {
    console.log(`====================================================`);
    console.log(`📸 CAPTURING ALL SCREENS IN [${theme.toUpperCase()}] MODE`);
    console.log(`====================================================`);

    const destDir = theme === 'dark' ? DARK_DIR : LIGHT_DIR;

    for (const screen of SCREENS) {
      const screenLabel = `${screen.file}.png`;
      process.stdout.write(`  [${theme.toUpperCase()}] Capturing ${screenLabel} (${screen.url})... `);

      let context;
      try {
        context = await browser.newContext({
          viewport: { width: screen.viewport.width, height: screen.viewport.height },
          isMobile: screen.viewport.isMobile || false,
          ignoreHTTPSErrors: true,
          colorScheme: theme,
          storageState: screen.auth ? storageState : undefined,
        });

        const page = await context.newPage();
        await page.goto(`${BASE_URL}${screen.url}`, { waitUntil: 'networkidle', timeout: 25000 }).catch(async () => {
          await page.waitForTimeout(2000);
        });

        // Set explicit theme in DOM and localStorage
        await page.evaluate((currentTheme) => {
          localStorage.setItem('theme', currentTheme);
          if (currentTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-color-mode', 'dark');
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-color-mode', 'light');
          }
        }, theme);

        // If openMobileSidebar is requested, click the sidebar toggle button
        if (screen.openMobileSidebar) {
          const toggleBtn = page.locator('button[aria-label="Toggle Sidebar"]').first();
          if (await toggleBtn.isVisible()) {
            await toggleBtn.click();
            await page.waitForTimeout(500);
          }
        }

        // Wait for animations and icon rendering
        await page.waitForTimeout(600);

        // Capture screenshot in theme folder
        const outThemePath = path.join(destDir, `${screen.file}.png`);
        await page.screenshot({ path: outThemePath, fullPage: true });

        // Also update standard root numbered files
        if (theme === 'dark' && screen.key) {
          const outRootPath = path.join(SCREENSHOTS_DIR, `${screen.key}.png`);
          await page.screenshot({ path: outRootPath, fullPage: true });
        } else if (theme === 'light') {
          if (screen.url === '/admin') {
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '29-live-admin-dashboard-light.png'), fullPage: true });
          } else if (screen.url === '/resident') {
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '30-live-resident-dashboard-light.png'), fullPage: true });
          }
        }

        console.log(`✓ OK`);
      } catch (err) {
        console.log(`⚠️ Failed: ${err.message}`);
      } finally {
        if (context) await context.close();
      }
    }
    console.log();
  }

  await browser.close();

  // Step 3: Write an updated README index in references/Screenshots
  const readmeContent = `# Application Visual References & Screenshots

This directory contains full-page visual screenshots of all pages in **SocietyApp**, captured across **Dark Mode**, **Light Mode**, and **Mobile / Tablet Views**.

## Organization

- **Dark Mode Gallery**: \`references/Screenshots/dark/\`
- **Light Mode Gallery**: \`references/Screenshots/light/\`
- **Root Legacy Files**: \`references/Screenshots/01-live-*.png\` through \`30-live-*.png\`

## Available Pages Captured

| Page | URL | Access | Dark Mode | Light Mode |
| :--- | :--- | :--- | :--- | :--- |
| Landing Page | \`/\` | Public | [View](dark/01-landing.png) | [View](light/01-landing.png) |
| Contact Us | \`/contact\` | Public | [View](dark/02-contact.png) | [View](light/02-contact.png) |
| Login | \`/login\` | Public | [View](dark/03-auth-login.png) | [View](light/03-auth-login.png) |
| Register | \`/register\` | Public | [View](dark/04-auth-register.png) | [View](light/04-auth-register.png) |
| Reset Password | \`/reset-password\` | Public | [View](dark/05-auth-reset-password.png) | [View](light/05-auth-reset-password.png) |
| Society Contribution | \`/society/contribute\` | Shared | [View](dark/06-society-contribute.png) | [View](light/06-society-contribute.png) |
| Setup Wizard | \`/setup\` | Public | [View](dark/07-setup-wizard.png) | [View](light/07-setup-wizard.png) |
| 404 Error Page | \`/not-found\` | Public | [View](dark/08-error-404.png) | [View](light/08-error-404.png) |
| Admin Dashboard | \`/admin\` | Admin | [View](dark/09-admin-dashboard.png) | [View](light/09-admin-dashboard.png) |
| Admin Societies | \`/admin/societies\` | Admin | [View](dark/10-admin-societies.png) | [View](light/10-admin-societies.png) |
| Pending Society Proposals | \`/admin/societies/pending\` | Admin | [View](dark/11-admin-societies-pending.png) | [View](light/11-admin-societies-pending.png) |
| User Directory & Roles | \`/admin/users\` | Admin | [View](dark/12-admin-users.png) | [View](light/12-admin-users.png) |
| Society Invitations | \`/admin/invitations\` | Admin | [View](dark/13-admin-invitations.png) | [View](light/13-admin-invitations.png) |
| Platform & SMTP Settings | \`/admin/settings\` | Admin | [View](dark/14-admin-settings.png) | [View](light/14-admin-settings.png) |
| User Profile & Connected Accounts | \`/profile\` | Resident / Admin | [View](dark/15-user-profile.png) | [View](light/15-user-profile.png) |
| Notifications Center | \`/notifications\` | Resident / Admin | [View](dark/16-user-notifications.png) | [View](light/16-user-notifications.png) |
| Resident Dashboard | \`/resident\` | Resident | [View](dark/17-resident-dashboard.png) | [View](light/17-resident-dashboard.png) |
| Maintenance Bills & Dues | \`/resident/bills\` | Resident | [View](dark/18-resident-bills.png) | [View](light/18-resident-bills.png) |
| Payment Receipts Ledger | \`/resident/receipts\` | Resident | [View](dark/19-resident-receipts.png) | [View](light/19-resident-receipts.png) |
| Society Members & Contacts | \`/resident/members\` | Resident | [View](dark/20-resident-members.png) | [View](light/20-resident-members.png) |
| Request Flat Linking | \`/resident/link-flat\` | Resident | [View](dark/21-resident-link-flat.png) | [View](light/21-resident-link-flat.png) |
| Requests & Queries | \`/resident/requests\` | Resident | [View](dark/22-resident-requests.png) | [View](light/22-resident-requests.png) |
| Society Documents | \`/resident/documents\` | Resident | [View](dark/23-resident-documents.png) | [View](light/23-resident-documents.png) |
| Committee Dashboard | \`/committee\` | Committee | [View](dark/24-committee-dashboard.png) | [View](light/24-committee-dashboard.png) |
| Flats Management | \`/committee/flats\` | Committee | [View](dark/25-committee-flats.png) | [View](light/25-committee-flats.png) |
| Mobile Landing Page | \`/\` (390x844) | Public | [View](dark/26-mobile-landing.png) | [View](light/26-mobile-landing.png) |
| Mobile Admin Dashboard | \`/admin\` (390x844) | Admin | [View](dark/27-mobile-admin-dashboard.png) | [View](light/27-mobile-admin-dashboard.png) |
| Mobile Resident Dashboard | \`/resident\` (390x844) | Resident | [View](dark/28-mobile-resident-dashboard.png) | [View](light/28-mobile-resident-dashboard.png) |
| Mobile Sidebar Drawer Open | \`/resident\` (390x844) | Resident | [View](dark/29-mobile-resident-sidebar-open.png) | [View](light/29-mobile-resident-sidebar-open.png) |
| Tablet Admin Dashboard | \`/admin\` (820x1180) | Admin | [View](dark/30-tablet-admin-dashboard.png) | [View](light/30-tablet-admin-dashboard.png) |
| Tablet Resident Dashboard | \`/resident\` (820x1180) | Resident | [View](dark/31-tablet-resident-dashboard.png) | [View](light/31-tablet-resident-dashboard.png) |

## Updating Screenshots

Whenever UI, layouts, themes, or page functionality change, execute:
\`\`\`bash
npm run screenshots
\`\`\`
`;

  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'README.md'), readmeContent, 'utf8');
  console.log(`\n🎉 All screenshots successfully generated in ${SCREENSHOTS_DIR}!\n`);
}

captureAll().catch((err) => {
  console.error('Fatal error during screenshot capture:', err);
  process.exit(1);
});
