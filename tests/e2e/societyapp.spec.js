const { test, expect } = require('@playwright/test');

test.describe('SocietyApp Complete Multi-Role Walkthrough & Demo', () => {

  test('End-to-End Demonstration Covering All User Requirements', async ({ page }) => {
    // Unique test run timestamp for clean test data
    const timestamp = Date.now();
    const guestEmail = `rohan.resident.${timestamp}@example.com`;
    const guestPhone = `98220${String(timestamp).slice(-5)}`;
    const societyProposalName = `Imperial Heights CHS ${String(timestamp).slice(-4)}`;

    // Auto-accept any browser alerts/confirms
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // =========================================================================
    // STEP 1: Landing Page (Snappy, Professional, No Long Delays)
    // =========================================================================
    console.log('[STEP 1] Landing Page Showcase');
    await page.goto('/');
    await page.waitForSelector('#main-header', { timeout: 10000 });

    // Verify Title & Hero
    await expect(page).toHaveTitle(/Society App|SocietyApp/);
    await expect(page.locator('h1')).toContainText('Housing Society');

    // Verify 52px Compact Navbar and Get Started button
    const navbar = page.locator('#main-header');
    await expect(navbar).toBeVisible();
    await expect(navbar.locator('a:has-text("Get Started")')).toBeVisible();

    // Toggle Theme (Dark -> Light -> Dark)
    const themeBtn = page.locator('button[aria-label="Theme Mode"]');
    await themeBtn.click();
    await page.click('button:has-text("Light")');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.waitForTimeout(1200);

    await themeBtn.click();
    await page.click('button:has-text("Dark")');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.waitForTimeout(1000);

    // Quick scroll to show Multiplatform, Multi Society, Instant UPI Payments
    await page.locator('#features').scrollIntoViewIfNeeded();
    await expect(page.locator('text=Multiplatform')).toBeVisible();
    await expect(page.locator('text=Multi Society')).toBeVisible();
    await page.waitForTimeout(1200);

    // Quick scroll to stats
    await page.locator('#stats').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(1000);

    // =========================================================================
    // STEP 2: Guest Registration (Name, Email, Required Mobile, Password)
    // =========================================================================
    console.log('[STEP 2] Guest Registration');
    await page.goto('/register');
    await page.waitForSelector('form', { timeout: 10000 });

    // Verify Developer Credits
    await expect(page.locator('text=Designed & Developed by').first()).toBeVisible();
    await expect(page.locator('text=Atul Mahankal').first()).toBeVisible();

    // Fill Registration Form
    await page.fill('input[placeholder="John Doe"]', 'Rohan Deshmukh');
    await page.fill('input[type="email"]', guestEmail);
    await page.fill('input[type="tel"]', guestPhone);
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    await page.check('#terms');
    await page.waitForTimeout(1000);

    await page.click('button[type="submit"]');

    // Wait for auto-redirect after registration (to /profile or /resident)
    await page.waitForTimeout(2000);
    console.log('[STEP 2] Registration completed successfully');

    // =========================================================================
    // STEP 3: Society Contribution (as Logged-in User or Guest)
    // =========================================================================
    console.log('[STEP 3] Submit Society Contribution Proposal');
    await page.goto('/society/contribute');
    await page.waitForSelector('form', { timeout: 10000 });

    await page.fill('input[placeholder*="Green Valley"]', societyProposalName);
    await page.fill('textarea[placeholder*="Full street address"]', 'Plot 88, Baner Main Road');
    await page.fill('input[placeholder="Pune"]', 'Pune');
    await page.fill('input[placeholder="Maharashtra"]', 'Maharashtra');
    await page.fill('input[placeholder="411001"]', '411045');
    await page.fill('input[placeholder="e.g. 50"]', '64');
    await page.waitForTimeout(1000);

    await page.click('button[type="submit"]');
    await expect(page.locator('text=Proposal Submitted Successfully!')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // =========================================================================
    // STEP 4: Accept New Society Request (App Administrator)
    // =========================================================================
    console.log('[STEP 4] Admin Login & Approve Society Proposal');
    // Login as Admin
    await page.goto('/login');
    await page.waitForSelector('input[name="login"]', { timeout: 10000 });
    await page.fill('input[name="login"]', 'atulmahankal@gmail.com');
    await page.fill('input[name="password"]', 'password123');
    await page.waitForTimeout(1000);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin**', { timeout: 15000 });
    await page.waitForTimeout(1200);

    // Navigate to Pending Societies
    await page.goto('/admin/societies/pending');
    await page.waitForSelector('h1:has-text("Pending Society Proposals")', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify our proposal is in the list and click "Approve"
    const proposalCard = page.locator(`div[data-proposal-card*="${societyProposalName}"]`).first();
    await expect(proposalCard).toBeVisible({ timeout: 10000 });
    const approveBtn = proposalCard.locator('button:has-text("Approve")');
    await approveBtn.click();

    // Verify approval confirmation
    await expect(page.locator('text=approved successfully')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // =========================================================================
    // STEP 5: Add Wings, Flats, Map Owner (as Committee Member)
    // =========================================================================
    console.log('[STEP 5] Committee Portal: Add Wings & Flats');
    await page.goto('/committee/flats');
    await page.waitForSelector('h1:has-text("Flats & Occupancy")', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Open Add Unit / Flat Modal
    const addFlatBtn = page.locator('button:has-text("Add Unit / Flat")');
    await addFlatBtn.click();
    await page.waitForSelector('text=Add Society Unit / Flat', { timeout: 5000 });

    // Enter Wing "B", Flat "302", Floor "3", Type "2 BHK"
    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await modal.locator('input[placeholder="e.g. A, B"]').fill('B');
    await modal.locator('input[placeholder="e.g. 204"]').fill('302');
    await modal.locator('input[placeholder="e.g. 2"]').fill('3');
    await modal.locator('select').selectOption('2 BHK');
    await page.waitForTimeout(1000);

    await modal.locator('button:has-text("Save Flat")').click();
    await expect(page.locator('text=Flat B-302 created successfully!')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // Verify flat appears in inventory table
    await expect(page.locator('td:has-text("Unit B-302")')).toBeVisible();

    // =========================================================================
    // STEP 6: Request to Map Flat (as Resident)
    // =========================================================================
    console.log('[STEP 6] Resident Request to Map Flat');
    // Login as the resident user
    await page.goto('/login');
    await page.waitForSelector('input[name="login"]', { timeout: 10000 });
    await page.fill('input[name="login"]', guestEmail);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // Navigate to Link Flat page
    await page.goto('/resident/link-flat');
    await page.waitForSelector('h1:has-text("Link Flat")', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Select Available Unit / Flat from dropdown (Unit B-302 created in Step 5)
    const flatSelect = page.locator('select[name="flat_id"]');
    const flatOption = flatSelect.locator('option:has-text("302")');
    if (await flatOption.count() > 0) {
      const val = await flatOption.getAttribute('value');
      await flatSelect.selectOption(val);
      await page.waitForTimeout(800);
    } else {
      const manualBtn = page.locator('button:has-text("Enter manually")');
      if (await manualBtn.isVisible()) {
        await manualBtn.click();
        await page.waitForTimeout(500);
      }
      await page.fill('input[placeholder*="A, B"]', 'B');
      await page.fill('input[placeholder*="101, 204"]', '302');
      await page.waitForTimeout(500);
    }

    await page.click('button:has-text("Submit Request"), button:has-text("Send Request to Committee")');
    await expect(page.locator('text=Request Sent to Committee!')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // =========================================================================
    // STEP 7: Accept Flat Map Request (as Committee Member)
    // =========================================================================
    console.log('[STEP 7] Committee Member Accepts Flat Map Request');
    // Login as Admin / Committee
    await page.goto('/login');
    await page.waitForSelector('input[name="login"]', { timeout: 10000 });
    await page.fill('input[name="login"]', 'atulmahankal@gmail.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin**', { timeout: 15000 });

    // Navigate to Committee Dashboard
    await page.goto('/committee');
    await page.waitForSelector('h1:has-text("Committee Dashboard")', { timeout: 10000 });
    await page.waitForTimeout(1200);

    // Check Pending Flat Link Requests section
    const pendingReqRow = page.locator('tr:has-text("Unit B-302")').first();
    await expect(pendingReqRow).toBeVisible();

    // Click Approve
    const committeeApproveBtn = pendingReqRow.locator('button:has-text("Approve")');
    await committeeApproveBtn.click();
    await expect(page.locator('text=approved successfully')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // =========================================================================
    // STEP 8: View Status of Society Contribution & Flat Link Request (as Resident)
    // =========================================================================
    console.log('[STEP 8] Resident Views Proposal & Flat Link Status');
    await page.goto('/login');
    await page.waitForSelector('input[name="login"]', { timeout: 10000 });
    await page.fill('input[name="login"]', guestEmail);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('/resident/link-flat');
    await page.waitForSelector('text=Flat Link Requests Status', { timeout: 10000 });
    await page.waitForTimeout(1200);

    // Verify Active status
    await expect(page.locator('text=Unit B-302').first()).toBeVisible();
    await expect(page.locator('span:has-text("ACTIVE")').first()).toBeVisible();

    // Verify Society proposal status
    await expect(page.locator('text=Society Contribution Status').first()).toBeVisible();
    await page.waitForTimeout(1500);

    // =========================================================================
    // STEP 9: Create Maintenance & Parking Bills (as Committee Member)
    // =========================================================================
    console.log('[STEP 9] Committee Member Creates Maintenance & Parking Bills');
    await page.goto('/login');
    await page.waitForSelector('input[name="login"]', { timeout: 10000 });
    await page.fill('input[name="login"]', 'atulmahankal@gmail.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin**', { timeout: 15000 });

    await page.goto('/committee');
    await page.waitForSelector('button:has-text("+ Create Bill")', { timeout: 10000 });

    // 1. Create Maintenance Bill
    await page.click('button:has-text("+ Create Bill")');
    await page.waitForSelector('text=Create Maintenance / Parking Bill', { timeout: 5000 });
    const billModal = page.locator('.fixed.inset-0').last();
    await billModal.locator('input[placeholder*="Regular Maintenance"]').fill('November 2026 Regular Maintenance');
    await billModal.locator('input[placeholder="2500"]').fill('2500');
    await page.waitForTimeout(1000);
    await billModal.locator('button:has-text("Issue Bill")').click();
    await expect(page.locator('text=created successfully!').first()).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1200);

    // 2. Create Parking Charges Bill
    await page.click('button:has-text("+ Create Bill")');
    await page.waitForSelector('text=Create Maintenance / Parking Bill', { timeout: 5000 });
    const parkingModal = page.locator('.fixed.inset-0').last();
    await parkingModal.locator('select').selectOption('Parking Charges');
    await parkingModal.locator('input[placeholder*="Regular Maintenance"]').fill('Covered Basement Slot P-18');
    await parkingModal.locator('input[placeholder="2500"]').fill('600');
    await page.waitForTimeout(1000);
    await parkingModal.locator('button:has-text("Issue Bill")').click();
    await expect(page.locator('text=created successfully!').first()).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // =========================================================================
    // STEP 10: View Outstanding Bills with UPI Payment (as Resident)
    // =========================================================================
    console.log('[STEP 10] Resident Views Outstanding Bills & Opens UPI QR Payment Modal');
    await page.goto('/login');
    await page.waitForSelector('input[name="login"]', { timeout: 10000 });
    await page.fill('input[name="login"]', 'atulmahankal@gmail.com'); // Admin is also mapped to flat or has bills
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('/resident/bills');
    await page.waitForSelector('h1:has-text("Maintenance Bills")', { timeout: 10000 });
    await page.waitForTimeout(1200);

    // Click "Pay with UPI" button on the first pending bill
    const payUpiBtn = page.locator('button:has-text("Pay with UPI")').first();
    await expect(payUpiBtn).toBeVisible({ timeout: 10000 });
    await payUpiBtn.click();

    // Verify UPI QR Modal opens with QR code and UPI ID
    await page.waitForSelector('text=Pay via UPI QR Code', { timeout: 5000 });
    await expect(page.locator('img[alt="UPI QR Code"]').first()).toBeVisible();
    await expect(page.locator('text=Scan with Google Pay, PhonePe').first()).toBeVisible();
    await page.waitForTimeout(2000);

    // Close UPI Modal
    await page.click('button:has-text("Close")');
    await page.waitForTimeout(1000);

    // =========================================================================
    // STEP 11: Record Expenses with Attaching Proof Documents (as Committee Member)
    // =========================================================================
    console.log('[STEP 11] Committee Member Records Expense with Proof Document');
    await page.goto('/committee');
    await page.waitForSelector('button:has-text("+ Record Expense")', { timeout: 10000 });

    await page.click('button:has-text("+ Record Expense")');
    await page.waitForSelector('text=Record Society Expense', { timeout: 5000 });
    const expenseModal = page.locator('.fixed.inset-0').last();
    await expenseModal.locator('input[placeholder*="Apex Security"]').fill('Reliable Water Tanker Suppliers');
    await expenseModal.locator('input[placeholder="4500"]').fill('3200');
    await expenseModal.locator('input[placeholder*="Verification invoice"]').fill('Receipt #WT-8942 attached - 2 tankers delivery');
    await page.waitForTimeout(1000);

    await expenseModal.locator('button:has-text("Record Outflow")').click();
    await expect(page.locator('text=recorded successfully!').first()).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // =========================================================================
    // STEP 12: View Society Reports (as Committee Member)
    // =========================================================================
    console.log('[STEP 12] View Society Financial Overview & Reports');
    await expect(page.locator('text=Society Financial Overview & Reports').first()).toBeVisible();
    await expect(page.locator('text=Total Collections').first()).toBeVisible();
    await expect(page.locator('text=Recorded Expenses').first()).toBeVisible();
    await expect(page.locator('text=Treasury Net Balance').first()).toBeVisible();
    await page.waitForTimeout(2000);

    // =========================================================================
    // STEP 13: Make Flat Available for Rent (as Resident)
    // =========================================================================
    console.log('[STEP 13] Resident Toggles Flat Available for Rent');
    await page.goto('/resident');
    await page.waitForSelector('h1:has-text("Welcome")', { timeout: 10000 });
    await page.waitForTimeout(1200);

    // Find the flat card and click "Make Available for Rent"
    const markSelfBtn = page.locator('button:has-text("Mark Self Occupied")').first();
    if (await markSelfBtn.isVisible()) {
      await markSelfBtn.click();
      await page.waitForTimeout(1000);
    }
    const rentToggleBtn = page.locator('button:has-text("Make Available for Rent")').first();
    if (await rentToggleBtn.isVisible()) {
      await rentToggleBtn.click();
      await expect(page.locator('span:has-text("Available for Rent")').first()).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1500);
    }

    // =========================================================================
    // STEP 14: Request as Tenant / Link Tenant to Flat (as Resident)
    // =========================================================================
    console.log('[STEP 14] Search Registered User & Link Tenant to Available Unit');
    const linkTenantBtn = page.locator('button:has-text("Link Tenant")').first();
    if (await linkTenantBtn.isVisible()) {
      await linkTenantBtn.click();
      await page.waitForSelector('text=Link Tenant to Unit', { timeout: 5000 });

      const tenantModal = page.locator('.fixed.inset-0').last();
      const searchInput = tenantModal.locator('input[placeholder*="Enter email or mobile"]');
      await searchInput.fill(guestEmail);
      await page.waitForTimeout(500);

      const searchBtn = tenantModal.locator('button:has-text("Search")');
      await searchBtn.click();
      await page.waitForTimeout(1000);

      // Verify registered user name appears in search results
      await expect(tenantModal.locator('text=Rohan Deshmukh').first()).toBeVisible({ timeout: 5000 });

      // Click Select on the user
      await tenantModal.locator('button:has-text("Select")').first().click();
      await page.waitForTimeout(800);

      // Verify Verified preview badge
      await expect(tenantModal.locator('text=Registered User Selected').first()).toBeVisible();

      // Confirm Tenant
      await tenantModal.locator('button:has-text("Confirm Tenant")').click();
      await expect(page.locator('text=Tenant linked successfully').first()).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1500);

      // Verify Rented status badge
      await expect(page.locator('span:has-text("Rented")').first()).toBeVisible();
      await expect(page.locator('text=Rohan Deshmukh').first()).toBeVisible();
    }

    // =========================================================================
    // STEP 15: Contacts of Flat Owner & Tenant of Linked Flat (as Resident)
    // =========================================================================
    console.log('[STEP 15] Resident Directory: Contacts of Owners & Tenants');
    await page.goto('/resident/members');
    await page.waitForSelector('h1:has-text("Society Resident Directory")', { timeout: 10000 });
    await page.waitForTimeout(1200);

    // Search for unit or resident
    const searchInput = page.locator('input[placeholder*="Search by resident"]');
    await searchInput.fill('Unit');
    await page.waitForTimeout(1500);
    await searchInput.fill('');
    await page.waitForTimeout(1200);

    // =========================================================================
    // STEP 16: Multi-Tab Profile & Developer Credits
    // =========================================================================
    console.log('[STEP 16] Multi-Tab Profile Showcase');
    await page.goto('/profile');
    await page.waitForSelector('h1:has-text("Account")', { timeout: 10000 });

    // 1. Personal Information tab
    await expect(page.locator('button:has-text("Personal Information")')).toBeVisible();
    await page.waitForTimeout(1000);

    // 2. Change Password tab
    await page.click('button:has-text("Change Password")');
    await expect(page.locator('input[name="current_password"]')).toBeVisible();
    await page.waitForTimeout(1000);

    // 3. Emergency Contact tab
    await page.click('button:has-text("Emergency Contact")');
    await expect(page.locator('input[name="emergency_contact_name"]')).toBeVisible();
    await page.waitForTimeout(1000);

    // 4. Security PIN tab
    await page.click('button:has-text("Security PIN")');
    await expect(page.locator('input[placeholder="Enter 4-digit PIN"]')).toBeVisible();
    await page.waitForTimeout(1000);

    // 5. Connected Accounts tab
    await page.click('button:has-text("Connected Accounts")');
    await expect(page.locator('text=Google Account')).toBeVisible();
    await page.waitForTimeout(1200);

    // Verify Shared Component: "Designed & Developed by Atul Mahankal"
    await expect(page.locator('text=Designed & Developed by').first()).toBeVisible();
    await expect(page.locator('text=Atul Mahankal').first()).toBeVisible();
    await page.waitForTimeout(1500);

    console.log('✅ COMPLETE WALKTHROUGH TEST FINISHED SUCCESSFULLY!');
  });

});
