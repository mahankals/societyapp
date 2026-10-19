# Project Guidelines & Memory for SocietyManager / SocietyApp

## Visual Reference Screenshots Workflow (MANDATORY)

- Whenever any UI, CSS, layout, modal, component, or page changes are made in the project:
  - Run `npm run build` to compile client assets and Tailwind CSS.
  - Automatically re-generate and update the full set of reference screenshots in `references/Screenshots` (both `dark/` and `light/` modes, and mobile views) by executing:
    ```bash
    npm run screenshots
    ```
  - Ensure updated screenshots are committed alongside the code changes.
  - Screenshots are organized into:
    - `references/Screenshots/dark/` (All 31 screens in dark mode)
    - `references/Screenshots/light/` (All 31 screens in light mode)
    - `references/Screenshots/01-live-*.png` through `30-live-*.png` (legacy numbered root references)

## Mobile Navigation & Layout Rules

1. **No Mobile Bottom Button Bar**:
   - The bottom button bar (`MobileNav`) is removed. Never restore a fixed bottom button bar that covers content.
   - Content on mobile uses full width with clean bottom padding (`pb-8`).
2. **Mobile Sidebar Drawer**:
   - The sidebar on mobile (`< 768px`) is off-canvas (`-translate-x-full`) by default and never overlaps page content when closed.
   - When opened via the Navbar toggle button, it slides in with `z-50`, a dark backdrop (`bg-black/60`), and a mobile header with close button.
   - **Auto-Close Behavior**: The mobile drawer MUST automatically close:
     - When any navigation link inside the sidebar is tapped.
     - When the dark backdrop is tapped.
     - Whenever the URL/route changes (`location.pathname`).

## Resident Dashboard Guidelines

1. **Quick Action Titles**:
   - The link to resident members/directory on the resident dashboard MUST be titled **[Contact]** (`/resident/members`).
2. **Occupancy & Rent Toggle**:
   - Toggling unit rent availability or self-occupied status must update state inline with clear banner feedback; do not show blocking modal popups like "Status Updated".
3. **Role Badges**:
   - Badges for roles (`Chairman`, `Secretary`, `Treasurer`, `Committee`, `Tenant`, `Owner`) must use explicit high-contrast colors in both light mode and dark mode. Never use light text on white/light backgrounds.

## Payment & UPI Workflow

1. **Multi-Society Billing**:
   - Bills & Dues are scoped per society with a single society dropdown selector.
2. **Unified UPI Modal**:
   - QR Code payment requires entering Transaction ID / UTR before confirming.
   - "Pay with UPI App" enters an active **processing** state ("Processing Payment... Waiting for UPI App Response...").
   - Awaiting response handles both **Success** (Approved) and **Failed** (Declined) app responses.
   - On payment success, the modal displays the acknowledgment receipt with exactly **3 buttons**:
     - `[Share]`: Native share or clipboard copy.
     - `[Save]`: Downloads crisp PNG acknowledgment image.
     - `[Close]`: Dismisses modal and refreshes bills ledger.
3. **Payment Receipts**:
   - Must query completed transactions from `transactions` table and paid records from `maintenance_bills`, rendering printable/downloadable voucher links.
