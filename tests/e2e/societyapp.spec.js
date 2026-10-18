const { test, expect } = require('@playwright/test');

test.describe('SocietyApp Full React SPA E2E & Video Suite', () => {

  test('Comprehensive Walkthrough: All Pages, Google Sign-In, Committee, Admin, Resident, Theme, and Responsive Views', async ({ page }) => {
    // -------------------------------------------------------------
    // 1. Public Landing Page & Compact Navbar Height Verification
    // -------------------------------------------------------------
    await page.goto('/');
    await page.waitForSelector('#main-header', { timeout: 10000 });

    // Verify Title and Hero Heading
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

    // Verify Navbar [Get Started] button linking to /login
    const navGetStartedBtn = navbar.locator('a:has-text("Get Started")');
    await expect(navGetStartedBtn).toBeVisible();
    await expect(navGetStartedBtn).toHaveAttribute('href', '/login');

    // Verify Hero [Get Started] button linking to /login
    const heroGetStartedBtn = page.locator('#hero-cta-primary');
    await expect(heroGetStartedBtn).toBeVisible();
    await expect(heroGetStartedBtn).toHaveAttribute('href', '/login');
    await page.waitForTimeout(2000);

    // Test Light Mode on Landing Page Hero
    const themeBtn = page.locator('button[aria-label="Theme Mode"]');
    await themeBtn.click();
    await page.click('button:has-text("Light")');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.waitForTimeout(2500);

    // Switch back to Dark mode
    await themeBtn.click();
    await page.click('button:has-text("Dark")');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.waitForTimeout(2000);

    // Verify Dual Device Mockups (Browser & Smartphone)
    await expect(page.locator('text=societyapp.ddev.site/admin')).toBeVisible();
    await expect(page.locator('text=Flat 402').first()).toBeVisible();
    await expect(page.locator('text=₹3,500').first()).toBeVisible();
    await page.waitForTimeout(2000);

    // Smooth Scroll through Features Section
    await page.locator('#features').scrollIntoViewIfNeeded();
    await expect(page.locator('text=Multiplatform')).toBeVisible();
    await expect(page.locator('text=Multi Society')).toBeVisible();
    await expect(page.locator('text=Instant UPI Payments')).toBeVisible();
    await page.waitForTimeout(2500);

    // Smooth Scroll through How It Works & Stats Section
    await page.locator('#how-it-works').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    await page.locator('#stats').scrollIntoViewIfNeeded();
    await expect(page.locator('#stats').getByText('500+')).toBeVisible();
    await expect(page.locator('#stats').getByText('50,000+')).toBeVisible();
    await page.waitForTimeout(2500);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    // -------------------------------------------------------------
    // 2. Public Contact Page
    // -------------------------------------------------------------
    await page.goto('/contact');
    await page.waitForSelector('form', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Get in Touch');
    await page.waitForTimeout(1500);

    await page.fill('input[placeholder="John Doe"]', 'Jane Resident');
    await page.fill('input[placeholder="name@example.com"]', 'jane@example.com');
    await page.fill('input[placeholder="Inquiry or Question"]', 'Parking query for Block B');
    await page.fill('textarea[placeholder="How can we assist your society?"]', 'Hello, can we request EV charging point installation in Block B?');
    await page.waitForTimeout(1500);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Message Sent Successfully!')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2500);

    // -------------------------------------------------------------
    // 3. Register Society / Contribute Page
    // -------------------------------------------------------------
    await page.goto('/society/contribute');
    await page.waitForSelector('form', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Register / Contribute a Housing Society');
    await page.waitForTimeout(1500);

    await page.fill('input[placeholder*="Green Valley"]', 'Silver Oak Residency');
    await page.fill('textarea[placeholder*="Full street address"]', 'Plot 42, Senapati Bapat Road');
    await page.fill('input[placeholder="Pune"]', 'Pune');
    await page.fill('input[placeholder="Maharashtra"]', 'Maharashtra');
    await page.fill('input[placeholder="411001"]', '411016');
    await page.fill('input[placeholder="e.g. 50"]', '48');
    await page.waitForTimeout(1500);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Proposal Submitted Successfully!')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2500);

    // -------------------------------------------------------------
    // 4. Registration Page (Sign Up) with Google Sign-Up
    // -------------------------------------------------------------
    await page.goto('/register');
    await page.waitForSelector('form', { timeout: 5000 });
    await expect(page.locator('h2')).toContainText('Create your account');
    // Verify Google Sign-Up Button
    const googleSignUpBtn = page.locator('button:has-text("Sign up with Google")');
    await expect(googleSignUpBtn).toBeVisible();
    await page.waitForTimeout(2500);

    // -------------------------------------------------------------
    // 5. Authentication Login Page with Google Sign-In
    // -------------------------------------------------------------
    await page.goto('/login');
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await expect(page.locator('h2')).toContainText('Welcome back');

    // Verify Google Sign-In Button
    const googleSignInBtn = page.locator('button:has-text("Continue with Google")');
    await expect(googleSignInBtn).toBeVisible();
    await page.waitForTimeout(2000);

    // Fill credentials & test eye toggle
    await page.fill('input[name="email"]', 'atulmahankal@gmail.com');
    await page.fill('input[name="password"]', 'password123');
    await page.waitForTimeout(1500);

    // Toggle password eye button
    const eyeToggle = page.locator('input[name="password"] ~ button');
    await eyeToggle.click();
    await page.waitForTimeout(1000);
    await eyeToggle.click();
    await page.waitForTimeout(1000);

    await page.click('button[type="submit"]');

    // Wait for redirect to admin portal
    await page.waitForURL('**/admin', { timeout: 10000 });
    await page.waitForSelector('#main-header', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('System Administration');
    await page.waitForTimeout(2500);

    // -------------------------------------------------------------
    // 6. Admin Portal Walkthrough
    // -------------------------------------------------------------
    // Admin Dashboard KPIs
    await expect(page.locator('#main-content').getByText('Total Societies')).toBeVisible();
    await expect(page.locator('#main-content').getByText('Pending Proposals')).toBeVisible();
    await expect(page.locator('#main-content').getByText('Registered Users')).toBeVisible();
    await page.waitForTimeout(2500);

    // Admin Societies Management
    await page.goto('/admin/societies');
    await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Housing Societies Management');
    await page.waitForTimeout(1500);
    await page.fill('input[placeholder*="Search by name"]', 'Society');
    await page.waitForTimeout(2000);

    // Admin Pending Societies
    await page.goto('/admin/societies/pending');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Pending Society Proposals');
    await page.waitForTimeout(2500);

    // Admin Users
    await page.goto('/admin/users');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Platform User Accounts');
    await page.waitForTimeout(2500);

    // Admin Invitations
    await page.goto('/admin/invitations');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Society Invitations');
    await page.waitForTimeout(2500);

    // Admin Settings
    await page.goto('/admin/settings');
    await page.waitForSelector('form', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Platform Settings');
    await page.waitForTimeout(2000);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2500);

    // -------------------------------------------------------------
    // 7. Committee Portal Walkthrough
    // -------------------------------------------------------------
    await page.goto('/committee');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Management Committee');
    await page.waitForTimeout(2500);

    await page.goto('/committee/flats');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Flats & Occupancy');
    await page.waitForTimeout(2500);

    // -------------------------------------------------------------
    // 8. Resident Portal Walkthrough
    // -------------------------------------------------------------
    await page.goto('/resident');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Welcome');
    await expect(page.locator('text=Outstanding Dues')).toBeVisible();
    await page.waitForTimeout(2500);

    // Resident Bills & UPI QR Modal
    await page.goto('/resident/bills');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Maintenance Bills & Dues');
    await page.waitForTimeout(2000);

    // If a pay button is present, click it to test UPI QR modal
    const payBtn = page.locator('button:has-text("Pay with UPI")').first();
    if (await payBtn.isVisible()) {
      await payBtn.click();
      await expect(page.locator('text=Pay via UPI QR Code')).toBeVisible();
      await expect(page.locator('img[alt="UPI QR Code"]')).toBeVisible();
      await page.waitForTimeout(3000);
      await page.click('button:has-text("Close")');
      await page.waitForTimeout(1500);
    }

    // Resident Receipts
    await page.goto('/resident/receipts');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Payment Receipts');
    await page.waitForTimeout(2500);

    // Resident Members Directory
    await page.goto('/resident/members');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Society Resident Directory');
    await page.waitForTimeout(2500);

    // Resident Link Flat Form
    await page.goto('/resident/link-flat');
    await page.waitForSelector('form', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Link Flat');
    await page.waitForTimeout(1500);
    await page.fill('input[name="wing"]', 'B');
    await page.fill('input[name="flat_no"]', '302');
    await page.waitForTimeout(1500);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Request Sent to Committee!')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2500);

    // -------------------------------------------------------------
    // 9. User Account Profile & Notifications
    // -------------------------------------------------------------
    await page.goto('/profile');
    await page.waitForSelector('form', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('My Account');
    await expect(page.locator('input[disabled]')).toHaveValue('atulmahankal@gmail.com', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Profile information updated successfully!')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2500);

    await page.goto('/notifications');
    await page.waitForSelector('#main-content', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Notifications');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Mark all as read")');
    await page.waitForTimeout(2500);

    // -------------------------------------------------------------
    // 10. Responsive Viewport Check (Tablet & Mobile)
    // -------------------------------------------------------------
    // Tablet View (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin');
    await page.waitForTimeout(3000);

    // Mobile View (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/resident');
    await page.waitForSelector('nav.md\\:hidden', { timeout: 5000 });
    await expect(page.locator('nav.md\\:hidden')).toBeVisible();
    await page.waitForTimeout(3000);
  });

});
