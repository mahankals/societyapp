const { test, expect } = require('@playwright/test');

test.describe('SocietyApp Full React SPA E2E & Video Suite', () => {

  test('Complete Flow: Public, Auth, Compact Navbar, Admin, Resident, Theme, and Responsive Views', async ({ page }) => {
    // -------------------------------------------------------------
    // 1. Public Landing Page & Compact Navbar Height Verification
    // -------------------------------------------------------------
    await page.goto('/');
    await page.waitForSelector('#main-header', { timeout: 10000 });

    // Verify Title and Hero
    await expect(page).toHaveTitle(/Society App|SocietyApp/);
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toContainText('Housing Society');

    // VERIFY COMPACT NAVBAR HEIGHT (Must be ~52px, less than 60px)
    const navbar = page.locator('#main-header');
    const navBox = await navbar.boundingBox();
    expect(navBox).not.toBeNull();
    console.log(`[VERIFY] Main Navbar Height: ${navBox.height}px`);
    expect(navBox.height).toBeLessThanOrEqual(58);
    expect(navBox.height).toBeGreaterThanOrEqual(48);

    // Verify Dual Device Mockups (Browser & Smartphone)
    await expect(page.locator('text=societyapp.ddev.site/admin')).toBeVisible();
    await expect(page.locator('text=Flat 402')).toBeVisible();
    await expect(page.locator('text=₹3,500')).toBeVisible();
    await page.waitForTimeout(1200);

    // Scroll through Features Section
    await page.locator('#features').scrollIntoViewIfNeeded();
    await expect(page.locator('text=Instant Cloud Portal')).toBeVisible();
    await expect(page.locator('text=Instant UPI Payments')).toBeVisible();
    await page.waitForTimeout(1200);

    // Scroll through Stats & Community Trust
    await page.locator('#stats').scrollIntoViewIfNeeded();
    await expect(page.locator('#stats').getByText('500+')).toBeVisible();
    await expect(page.locator('#stats').getByText('50,000+')).toBeVisible();
    await page.waitForTimeout(1200);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(800);

    // -------------------------------------------------------------
    // 2. Public Contact Page
    // -------------------------------------------------------------
    await page.goto('/contact');
    await page.waitForSelector('form', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Get in Touch');

    await page.fill('input[placeholder="John Doe"]', 'Jane Resident');
    await page.fill('input[placeholder="name@example.com"]', 'jane@example.com');
    await page.fill('input[placeholder="Inquiry or Question"]', 'Parking query for Block B');
    await page.fill('textarea[placeholder="How can we assist your society?"]', 'Hello, can we request EV charging point installation in Block B?');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Message Sent Successfully!')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // 3. Contribute / Register Society Page
    // -------------------------------------------------------------
    await page.goto('/society/contribute');
    await page.waitForSelector('form', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Register / Contribute a Housing Society');

    await page.fill('input[placeholder*="Green Valley"]', 'Silver Oak Residency');
    await page.fill('textarea[placeholder*="Full street address"]', 'Plot 42, Senapati Bapat Road');
    await page.fill('input[placeholder="Pune"]', 'Pune');
    await page.fill('input[placeholder="Maharashtra"]', 'Maharashtra');
    await page.fill('input[placeholder="411001"]', '411016');
    await page.fill('input[placeholder="e.g. 50"]', '48');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Proposal Submitted Successfully!')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // 4. Authentication Login Flow
    // -------------------------------------------------------------
    await page.goto('/login');
    await page.waitForSelector('input[placeholder*="name@example.com"]', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Welcome Back');

    await page.fill('input[placeholder*="name@example.com"]', 'atulmahankal@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to admin portal
    await page.waitForURL('**/admin', { timeout: 10000 });
    await page.waitForSelector('#main-header', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('System Administration');
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // 5. Admin Portal Walkthrough
    // -------------------------------------------------------------
    // Admin Dashboard KPIs
    await expect(page.locator('#main-content').getByText('Total Societies')).toBeVisible();
    await expect(page.locator('#main-content').getByText('Pending Proposals')).toBeVisible();
    await expect(page.locator('#main-content').getByText('Registered Users')).toBeVisible();

    // Admin Societies Management
    await page.goto('/admin/societies');
    await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Housing Societies Management');
    await page.fill('input[placeholder*="Search by name"]', 'Society');
    await page.waitForTimeout(500);

    // Admin Pending Societies
    await page.goto('/admin/societies/pending');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Pending Society Proposals');
    await page.waitForTimeout(500);

    // Admin Users
    await page.goto('/admin/users');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Platform User Accounts');
    await page.waitForTimeout(500);

    // Admin Invitations
    await page.goto('/admin/invitations');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Society Invitations');
    await page.waitForTimeout(500);

    // Admin Settings
    await page.goto('/admin/settings');
    await page.waitForSelector('form', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Platform Settings');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // 6. Theme Toggle (Dark -> Light -> Dark)
    // -------------------------------------------------------------
    const themeBtn = page.locator('button[aria-label="Theme Mode"]');
    await themeBtn.click();
    await page.click('button:has-text("Light")');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.waitForTimeout(500);

    await themeBtn.click();
    await page.click('button:has-text("Dark")');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // 7. Resident Portal Walkthrough
    // -------------------------------------------------------------
    await page.goto('/resident');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Welcome');
    await expect(page.locator('text=Outstanding Dues')).toBeVisible();
    await page.waitForTimeout(500);

    // Resident Bills & UPI QR Modal
    await page.goto('/resident/bills');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Maintenance Bills & Dues');

    // If a pay button is present, click it to test UPI QR modal
    const payBtn = page.locator('button:has-text("Pay with UPI")').first();
    if (await payBtn.isVisible()) {
      await payBtn.click();
      await expect(page.locator('text=Pay via UPI QR Code')).toBeVisible();
      await expect(page.locator('img[alt="UPI QR Code"]')).toBeVisible();
      await page.waitForTimeout(1000);
      await page.click('button:has-text("Close")');
    }

    // Resident Receipts
    await page.goto('/resident/receipts');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Payment Receipts');
    await page.waitForTimeout(500);

    // Resident Members Directory
    await page.goto('/resident/members');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Society Resident Directory');
    await page.waitForTimeout(500);

    // Resident Link Flat Form
    await page.goto('/resident/link-flat');
    await page.waitForSelector('form', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Link Flat');
    await page.fill('input[name="wing"]', 'B');
    await page.fill('input[name="flat_no"]', '302');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Request Sent to Committee!')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // 8. User Account Profile & Notifications
    // -------------------------------------------------------------
    await page.goto('/profile');
    await page.waitForSelector('form', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('My Account');
    await expect(page.locator('input[disabled]')).toHaveValue('atulmahankal@gmail.com', { timeout: 10000 });
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Profile information updated successfully!')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    await page.goto('/notifications');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Notifications');
    await page.click('button:has-text("Mark all as read")');
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // 9. Responsive Viewport Check (Tablet & Mobile)
    // -------------------------------------------------------------
    // Tablet View (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin');
    await page.waitForTimeout(1000);

    // Mobile View (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/resident');
    await page.waitForSelector('nav.md\\:hidden', { timeout: 5000 });
    await expect(page.locator('nav.md\\:hidden')).toBeVisible();
    await page.waitForTimeout(1000);
  });

});
