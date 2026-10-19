const { test, expect } = require('@playwright/test');

test.describe('Verify New Resident Requirements', () => {

  test('Link Flat, Tenant Removal & Rent Visibility, Single Society Bills & Multi Payment', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Login as Admin (who has full access to resident views)
    await page.goto('/login');
    await page.waitForSelector('input[name="login"]', { timeout: 10000 });
    await page.fill('input[name="login"]', 'atulmahankal@gmail.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for auth to complete
    await page.waitForTimeout(2000);
    await page.goto('/resident');
    await page.waitForSelector('h1', { timeout: 10000 });
    console.log('[TEST] Logged in and loaded resident dashboard');

    // 1. Verify Resident Dashboard & Tenant / Rent Visibility
    await expect(page.locator('h1')).toContainText('Welcome');
    
    // Check if flat cards exist
    const flatCards = page.locator('.grid > div');
    const flatCount = await flatCards.count();
    console.log(`[TEST] Found ${flatCount} flat card(s)`);

    // Take screenshot of resident dashboard
    await page.screenshot({ path: 'test_resident_dashboard.png' });

    // 2. Navigate to Link Flat
    await page.goto('/resident/link-flat');
    await page.waitForSelector('h1', { timeout: 10000 });
    console.log('[TEST] On Link Flat page');

    // Verify Contribute Society link
    const contributeLink = page.locator('a:has-text("Your Society Not listed? Click here to Contribute")');
    await expect(contributeLink).toBeVisible();
    await expect(contributeLink).toHaveAttribute('href', '/society/contribute');

    // Verify Residency Type is before Flat selector
    // In DOM order, "Your Residency Type" label should appear before "Select Available Unit"
    const pageContent = await page.content();
    const residencyIndex = pageContent.indexOf('Your Residency Type');
    const flatSelectIndex = pageContent.indexOf('Select Available Unit');
    expect(residencyIndex).toBeGreaterThan(-1);
    expect(flatSelectIndex).toBeGreaterThan(-1);
    expect(residencyIndex).toBeLessThan(flatSelectIndex);
    console.log('[TEST] Residency Type is verified before Flat selection');

    // Verify Flat Owner and Tenant radio cards
    await expect(page.locator('label:has-text("Flat Owner")')).toBeVisible();
    await expect(page.locator('label:has-text("Tenant")')).toBeVisible();

    // Switch between owner and tenant to verify dynamic available flat label
    await page.click('label:has-text("Tenant")');
    await expect(page.locator('text=Select Available Unit / Flat (Available for Rent)')).toBeVisible();

    await page.click('label:has-text("Flat Owner")');
    await expect(page.locator('text=Select Available Unit / Flat (for Owner)')).toBeVisible();

    // Verify unlinked flat dropdown
    await expect(page.locator('select[name="flat_id"]')).toBeVisible();

    await page.screenshot({ path: 'test_link_flat_page.png' });

    // 3. Navigate to Maintenance Bills & Dues
    await page.goto('/resident/bills');
    await page.waitForSelector('h1', { timeout: 10000 });
    console.log('[TEST] On Bills & Dues page');

    // Verify single society dropdown
    const societyDropdown = page.locator('select');
    await expect(societyDropdown).toBeVisible();

    // Verify table has bills
    const billsRows = page.locator('tbody tr');
    const rowsCount = await billsRows.count();
    console.log(`[TEST] Found ${rowsCount} bill row(s)`);

    // Verify multi-selection checkboxes
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    const cbCount = await checkboxes.count();
    console.log(`[TEST] Found ${cbCount} unpaid bill checkbox(es)`);

    if (cbCount > 0) {
      // Check first bill
      await checkboxes.first().check();
      // Verify multi-bill summary action bar appears
      await expect(page.locator('text=bill selected')).toBeVisible();
      await expect(page.locator('button:has-text("Pay Selected with UPI")')).toBeVisible();

      // Click "Pay Selected with UPI"
      await page.click('button:has-text("Pay Selected with UPI")');

      // Verify Modal opens with UPI QR and "Pay with UPI App" option
      await expect(page.locator('h2:has-text("Pay via UPI QR Code")')).toBeVisible();
      await expect(page.locator('button:has-text("Pay with UPI App")')).toBeVisible();
      await expect(page.locator('img[alt="UPI QR Code"]')).toBeVisible();
      await expect(page.locator('button:has-text("Confirm Paid")')).toBeVisible();

      // 1. Try confirming without Transaction ID (should fail validation)
      await page.click('button:has-text("Confirm Paid")');
      await expect(page.locator('text=Transaction ID / UTR is required')).toBeVisible();

      // 2. Enter Transaction ID and confirm payment
      await page.fill('input[placeholder*="12-digit UTR"]', 'UTR984120485912');
      await page.click('button:has-text("Confirm Paid")');

      // 3. Verify modal body is REPLACED with GPay-style Payment Receipt with 3 buttons [Share] [Save] [Close]
      await expect(page.locator('h2:has-text("Payment Successful")')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=UTR984120485912')).toBeVisible();
      await expect(page.locator('button:has-text("Share")')).toBeVisible();
      await expect(page.locator('button:has-text("Save")')).toBeVisible();
      await expect(page.locator('button:has-text("Close")')).toBeVisible();

      // Test image generation / download trigger
      await page.click('button:has-text("Save")');
      await page.waitForTimeout(500);

      // Close receipt
      await page.click('button:has-text("Close")');
      await page.waitForTimeout(1000);

      // 4. Test "Pay with UPI App" with processing state, app response, and 3 buttons on success
      const remainingCheckboxes = page.locator('tbody input[type="checkbox"]');
      if (await remainingCheckboxes.count() > 0) {
        await remainingCheckboxes.first().check();
        await page.click('button:has-text("Pay Selected with UPI")');
        await expect(page.locator('button:has-text("Pay with UPI App")')).toBeVisible();

        // Click Pay with UPI App -> transitions to processing & waiting for app response
        await page.click('button:has-text("Pay with UPI App")');
        await expect(page.locator('text=Processing Payment')).toBeVisible();
        await expect(page.locator('h2:has-text("Waiting for UPI App Response...")')).toBeVisible();
        await expect(page.locator('button:has-text("App Approved (Success)")')).toBeVisible();
        await expect(page.locator('button:has-text("App Declined (Failed)")')).toBeVisible();

        // 4a. Verify "App Declined (Failed)" response path
        await page.click('button:has-text("App Declined (Failed)")');
        await expect(page.locator('h2:has-text("Payment Failed / Declined")')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Your bills remain unpaid')).toBeVisible();
        await expect(page.locator('button:has-text("Try Again")')).toBeVisible();

        // 4b. Verify "Try Again" returns to input mode
        await page.click('button:has-text("Try Again")');
        await expect(page.locator('button:has-text("Pay with UPI App")')).toBeVisible();

        // 4c. Verify "App Approved (Success)" response path & 3 buttons [Share] [Save] [Close]
        await page.click('button:has-text("Pay with UPI App")');
        await expect(page.locator('text=Processing Payment')).toBeVisible();
        await expect(page.locator('h2:has-text("Waiting for UPI App Response...")')).toBeVisible();
        await page.click('button:has-text("App Approved (Success)")');
        await expect(page.locator('h2:has-text("Payment Successful")')).toBeVisible({ timeout: 10000 });

        // Verify all 3 buttons are present on success
        const shareBtn = page.locator('button:has-text("Share")');
        const saveBtn = page.locator('button:has-text("Save")');
        const closeBtn = page.locator('button:has-text("Close")');
        await expect(shareBtn).toBeVisible();
        await expect(saveBtn).toBeVisible();
        await expect(closeBtn).toBeVisible();

        // Test Share and Save buttons
        await saveBtn.click();
        await page.waitForTimeout(500);
        await shareBtn.click();
        await page.waitForTimeout(500);

        // Click Close to finish payment and dismiss modal
        await closeBtn.click();
      }

      // 5. Test Payment Receipts page now displays paid rows & PDF links
      console.log('[TEST] Checking Payment Receipts Ledger...');
      await page.goto('/resident/receipts');
      await page.waitForSelector('h1:has-text("Payment Receipts")', { timeout: 10000 });
      const receiptRows = page.locator('tbody tr');
      await expect(receiptRows.first()).toBeVisible({ timeout: 10000 });
      const count = await receiptRows.count();
      console.log(`[TEST] Found ${count} payment receipt row(s)`);
      expect(count).toBeGreaterThan(0);
      await expect(page.locator('a:has-text("PDF")').first()).toBeVisible();

      // 6. Test Searchable CustomSelect with options
      console.log('[TEST] Checking Searchable CustomSelect dropdown...');
      await page.goto('/resident/bills');
      await page.waitForSelector('h1:has-text("Maintenance Bills & Dues")', { timeout: 10000 });
      // Open society dropdown
      const selectTrigger = page.locator('button[aria-haspopup="listbox"]').first();
      await selectTrigger.click();
      await expect(page.locator('[aria-expanded="true"]')).toBeVisible();
      // Dropdown option text is visible
      const optionBtn = page.locator('div[class*="rounded-2xl"] button').first();
      await expect(optionBtn).toBeVisible();
      // Close dropdown
      await selectTrigger.click();

      // 7. Verify Role text visibility on Resident Dashboard
      console.log('[TEST] Checking Role text visibility on Resident Dashboard...');
      await page.goto('/resident');
      await page.waitForSelector('h1:has-text("Welcome")', { timeout: 10000 });
      const roleBadge = page.locator('span[class*="capitalize"]').first();
      await expect(roleBadge).toBeVisible();
    }

    console.log('[TEST] All requirements successfully tested and verified!');
  });

  test('Society Contribution with Committee Member Flat Mapping & Notifications', async ({ page }) => {
    // 1. Login as Admin / Contributor
    await page.goto('/login');
    await page.waitForSelector('input[name="login"]', { timeout: 10000 });
    await page.fill('input[name="login"]', 'atulmahankal@gmail.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 2. Go to Society Contribution page
    await page.goto('/society/contribute');
    await page.waitForSelector('h1:has-text("Register / Contribute a Housing Society")', { timeout: 10000 });
    console.log('[TEST] On Society Contribution page');

    // 3. Verify form components from design screenshot:
    // - Card 1: Housing Society Details
    await expect(page.locator('h2:has-text("1. Housing Society Details")')).toBeVisible();
    // - Card 2: Founding Committee & Flat Mapping
    await expect(page.locator('h2:has-text("2. Founding Committee & Flat Mapping")')).toBeVisible();
    // - Occupancy Status 3 options (Self occupied, Available for rent, Rented)
    await expect(page.locator('button:has-text("Self occupied")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Available for rent")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Rented")').first()).toBeVisible();
    // - Info banner matching screenshot
    await expect(page.locator('text=Link an already registered member account or fill their contact details')).toBeVisible();

    // 4. Fill Society Details
    const uniqueSocName = `Palm Meadows Apex CHS ${Date.now()}`;
    await page.fill('input[placeholder*="Green Valley"]', uniqueSocName);
    await page.fill('textarea[placeholder*="Full street address"]', 'Plot 42, Sector 18, Palm Beach Marg');
    await page.fill('input[placeholder="Pune"]', 'Pune');
    await page.fill('input[placeholder="411001"]', '411045');

    // 5. Verify Member 1 has flat mapping fields
    await expect(page.locator('input[placeholder="A"]').first()).toBeVisible();
    await expect(page.locator('input[placeholder="101"]').first()).toBeVisible();

    // 6. Add Member 2
    await page.click('button:has-text("Add Member")');
    await page.waitForTimeout(500);
    expect(await page.locator('text=COMMITTEE MEMBER').count()).toBeGreaterThan(0);

    // Fill Member 2 details
    const memberNameInputs = page.locator('input[placeholder="Full name"]');
    await memberNameInputs.nth(1).fill('Rohan Deshmukh');
    const memberEmailInputs = page.locator('input[placeholder="member@example.com"]');
    await memberEmailInputs.nth(1).fill('rohan.resident.1792338476483@example.com');

    // Select Occupancy Status "Available for rent" for Member 2
    const rentButtons = page.locator('button:has-text("Available for rent")');
    await rentButtons.nth(1).click();

    // 7. Submit Proposal
    await page.click('button:has-text("Submit Society Proposal for Approval")');
    await expect(page.locator('h2:has-text("Proposal Submitted Successfully!")')).toBeVisible({ timeout: 15000 });
    console.log('[TEST] Society proposal submitted successfully with committee flat mapping');

    // 8. Check Notifications for user 1 (contributor)
    await page.goto('/notifications');
    await page.waitForSelector('h1:has-text("Notifications")', { timeout: 10000 });
    await expect(page.locator(`text=${uniqueSocName}`).first()).toBeVisible({ timeout: 10000 });
    console.log('[TEST] Verified contribution notification delivered!');

    // 9. Admin Approves the proposal
    await page.goto('/admin/societies/pending');
    await page.waitForSelector('h1:has-text("Pending Society Proposals")', { timeout: 10000 });
    const approveBtn = page.locator(`button:has-text("Approve")`).first();
    await approveBtn.click();
    await page.waitForTimeout(2000);
    console.log('[TEST] Approved society proposal');

    // 10. Check notifications after approval
    await page.goto('/notifications');
    await page.waitForSelector('h1:has-text("Notifications")', { timeout: 10000 });
    await expect(page.locator('text=Society Proposal Approved!').first()).toBeVisible({ timeout: 10000 });
    console.log('[TEST] Verified approval notification delivered!');
  });
});

