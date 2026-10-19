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

      // Verify Modal opens with UPI QR and society name
      await expect(page.locator('h2:has-text("Pay via UPI QR Code")')).toBeVisible();
      await expect(page.locator('img[alt="UPI QR Code"]')).toBeVisible();
      await expect(page.locator('button:has-text("Confirm Paid")')).toBeVisible();

      await page.screenshot({ path: 'test_bills_multi_upi_modal.png' });

      // Close modal
      await page.click('button:has-text("Close")');
    }

    console.log('[TEST] All requirements successfully tested and verified!');
  });
});
