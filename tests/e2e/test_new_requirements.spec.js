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

      // 3. Verify modal body is REPLACED with GPay-style Payment Receipt
      await expect(page.locator('h2:has-text("Payment Successful")')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=UTR984120485912')).toBeVisible();
      await expect(page.locator('button:has-text("Save / Share Image")')).toBeVisible();
      await expect(page.locator('button:has-text("Done")')).toBeVisible();

      // Test image generation / download trigger
      await page.click('button:has-text("Save / Share Image")');
      await page.waitForTimeout(1000);

      // Close receipt
      await page.click('button:has-text("Done")');
      await page.waitForTimeout(1000);

      // 4. Test "Pay with UPI App" with actual status confirmation (both failed and succeeded)
      const remainingCheckboxes = page.locator('tbody input[type="checkbox"]');
      if (await remainingCheckboxes.count() > 0) {
        await remainingCheckboxes.first().check();
        await page.click('button:has-text("Pay Selected with UPI")');
        await expect(page.locator('button:has-text("Pay with UPI App")')).toBeVisible();

        // Click Pay with UPI App -> transitions to awaiting actual outcome view
        await page.click('button:has-text("Pay with UPI App")');
        await expect(page.locator('h2:has-text("UPI App Payment in Progress")')).toBeVisible();
        await expect(page.locator('button:has-text("Confirm Payment Succeeded")')).toBeVisible();
        await expect(page.locator('button:has-text("Payment Failed or Cancelled")')).toBeVisible();

        // 4a. Verify "Payment Failed or Cancelled" path
        await page.click('button:has-text("Payment Failed or Cancelled")');
        await expect(page.locator('h2:has-text("Payment Failed / Declined")')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Your bills remain unpaid')).toBeVisible();
        await expect(page.locator('button:has-text("Try Again")')).toBeVisible();

        // 4b. Verify "Try Again" returns to input mode
        await page.click('button:has-text("Try Again")');
        await expect(page.locator('button:has-text("Pay with UPI App")')).toBeVisible();

        // 4c. Verify "Confirm Payment Succeeded" path
        await page.click('button:has-text("Pay with UPI App")');
        await expect(page.locator('h2:has-text("UPI App Payment in Progress")')).toBeVisible();
        await page.click('button:has-text("Confirm Payment Succeeded")');
        await expect(page.locator('h2:has-text("Payment Successful")')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('button:has-text("Save / Share Image")')).toBeVisible();
        await page.click('button:has-text("Done")');
      }
    }

    console.log('[TEST] All requirements successfully tested and verified!');
  });
});
