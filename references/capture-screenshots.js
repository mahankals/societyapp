const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const PROTOTYPE_PATH = 'file://' + path.resolve(__dirname, 'societyapp-prototype.html');
const SCREENSHOTS_DIR = path.resolve(__dirname, 'Screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('Launching headless Chrome to capture prototype screenshots...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,960']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });
  await page.goto(PROTOTYPE_PATH, { waitUntil: 'networkidle0' });

  async function snap(filename, actions) {
    if (actions) {
      await page.evaluate(actions);
      await new Promise(r => setTimeout(r, 400));
    }
    const filePath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filePath });
    console.log(`✓ Captured: ${filename}`);
  }

  // 1. Setup Wizard
  await snap('01-setup-wizard.png', () => { switchScreen('setup'); setSetupStep(1); });

  // 2. Setup Step 3 (SMTP Live Email Test)
  await snap('02-setup-smtp-live-test.png', () => { switchScreen('setup'); setSetupStep(3); simulateSendTestEmail(); });

  // 3. Login Screen
  await snap('03-auth-login.png', () => { switchScreen('login'); });

  // 4. Resident Dashboard
  await snap('04-resident-dashboard.png', () => { switchScreen('resident-dash'); closeModal('occupancyModal'); });

  // 5. Resident Occupancy Modal (Self occupied | Available for rent | Rented)
  await snap('05-resident-occupancy-status-modal.png', () => {
    switchScreen('resident-dash');
    document.getElementById('occupancySelect').value = 'available_for_rent';
    toggleRentFields();
    openModal('occupancyModal');
  });

  // 6. Resident Bills & Dues
  await snap('06-resident-bills-and-dues.png', () => { closeModal('occupancyModal'); switchScreen('resident-bills'); });

  // 7. Bulk Pay with UPI Modal
  await snap('07-resident-bulk-pay-upi-modal.png', () => { switchScreen('resident-bills'); openModal('bulkPayModal'); });

  // 8. Offline Payment (Send for Confirmation) Modal
  await snap('08-resident-send-for-confirmation-modal.png', () => { closeModal('bulkPayModal'); switchScreen('resident-bills'); openModal('offlinePayModal'); });

  // 9. Payment Receipts with Verified, Pending, and Rejected Statuses
  await snap('09-resident-receipts-status.png', () => { closeModal('offlinePayModal'); switchScreen('resident-receipts'); });

  // 10. Link Flat with Tenant Notice
  await snap('10-resident-link-flat-tenant-notice.png', () => { switchScreen('resident-link-flat'); setLinkingType('tenant'); });

  // 11. Committee Flats
  await snap('11-committee-flats-management.png', () => { switchScreen('comitee-flats'); });

  // 12. Committee Bills
  await snap('12-committee-bills-management.png', () => { switchScreen('comitee-bills'); });

  // 13. Admin Dashboard
  await snap('13-admin-dashboard-fixed-layout.png', () => { switchScreen('admin-dash'); });

  // 14. Admin Societies with Pending Requests Button (3)
  await snap('14-admin-societies-pending-button.png', () => { switchScreen('admin-societies'); });

  // 15. Admin Pending Proposals with Reject Remark Modal
  await snap('15-admin-pending-proposals.png', () => { switchScreen('admin-pending'); });

  // 16. Admin Reject Proposal Remark Modal
  await snap('16-admin-reject-proposal-remark-modal.png', () => { switchScreen('admin-pending'); openModal('rejectProposalModal'); });

  // 17. Admin Users (Admin Only)
  await snap('17-admin-users-admin-only.png', () => { closeModal('rejectProposalModal'); switchScreen('admin-users'); });

  // 18. Contribute Society with Empty Members Table
  await snap('18-contribute-society-empty-members.png', () => { switchScreen('contribute'); });

  // 19. ADR Section 8: Field-Level Validation Errors Below Inputs
  await snap('19-adr-section-8-field-level-errors.png', () => { switchScreen('error-validation'); triggerSimulatedErrors(); });

  // 20. Error 404 Page
  await snap('20-error-404-page.png', () => { switchScreen('error-404'); });

  // 21. Error 500 Page
  await snap('21-error-500-page.png', () => { switchScreen('error-500'); });

  // 22. Mobile View
  await snap('22-mobile-responsive-resident-dashboard.png', () => {
    switchScreen('resident-dash');
    setDevice('mobile');
  });

  await browser.close();
  console.log('All screenshots captured successfully in references/Screenshots/!');
}

run().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
