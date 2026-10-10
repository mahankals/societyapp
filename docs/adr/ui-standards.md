# Architecture Decision Record (ADR): UI/UX Design Standards & Component Guidelines

- **Status**: Accepted
- **Date**: 2026-10-09
- **Context**: Standardize design patterns, component interactions, responsive modal behavior, and accessible form controls across SocietyApp.

---

## 1. Floating Form Labels

### Decision
All text inputs, email inputs, password inputs, textareas, and select elements across the application must implement a consistent floating label pattern.

### Implementation Pattern
- Use Tailwind CSS `peer` and `peer-placeholder-shown` or `peer-focus` pseudo-classes.
- The input/select element requires `placeholder=" "` (a single space) when using CSS-only placeholder detection.
- Floating label positioning:
  - Default (unfocused, empty): centered vertically within the input field (`top-1/2 -translate-y-1/2` or `top-3.5`).
  - Active (focused or non-empty): transformed to top left (`top-2 -translate-y-4 scale-75 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900 px-1`).
- For select dropdowns or prepended inputs (e.g., `+91` phone prefix), labels should remain elevated above the input boundary or sit clearly in the top groove.

---

## 2. URL-Synchronized Filters & Tabs

### Decision
Any interactive filtering, searching, or tab navigation must synchronize its state with URL search query parameters (e.g., `?tab=database`, `?status=pending`, `?search=A-101`).

### Rationale
- Allows deep linking to specific settings tabs, bill filters, or search views.
- Preserves user context across page reloads and browser back/forward navigation.

### Implementation Pattern
```javascript
function switchTab(tabKey) {
  // Update UI active tab state
  ...
  // Sync to URL without reloading the page
  const url = new URL(window.location);
  url.searchParams.set('tab', tabKey);
  window.history.replaceState({}, '', url);
}

// On page load, read query param
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const activeTab = params.get('tab') || 'default_tab';
  switchTab(activeTab);
});
```

---

## 3. Form Submit Button State & Connectivity Verification

### Decision
1. **Inactive by Default**: Form submit buttons must initialize in a disabled/inactive state (`disabled`, `opacity-50 cursor-not-allowed`) to prevent accidental submissions of unchanged data.
2. **Dynamic Enablement**: As soon as any form field triggers an `input` or `change` event modifying initial values, the submit button is enabled.
3. **External Connectivity Pre-checks (Settings & Integrations)**:
   - For sensitive integrations (e.g., Database, SMTP Email, Payment Gateways), a dedicated `[Test Connection]` action button must verify connectivity before saving.
   - If a test connection fails, form submission is blocked with an informative error message.

---

## 4. Modal Viewport Resilience (1366×768 & Small Screens)

### Context & Problem
On standard 1366×768 (16:9) laptop screens or screens with fixed high-z-index topbars, large modal dialogues often clipped at top/bottom boundaries or became unscrollable.

### Decision
All modals must adhere to a strict responsive structure:
- **Container**:
  ```html
  <div id="modalId" class="fixed inset-0 z-[200] hidden flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
    <div class="relative w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <!-- Fixed Header -->
      <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">...</div>
      <!-- Scrollable Body -->
      <div class="p-6 overflow-y-auto flex-1 space-y-4">...</div>
      <!-- Fixed Footer -->
      <div class="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3 shrink-0">...</div>
    </div>
  </div>
  ```
- **Z-Index**: Always use `z-[200]` to guarantee modals sit above sticky headers (`z-50`) and bottom navigation sheets (`z-[100]`).
- **Scroll Constraints**: The inner modal card must have `max-h-[calc(100vh-2rem)]`, with the header and footer set to `shrink-0`, and the content area set to `flex-1 overflow-y-auto`.

---

## 5. Light & Dark Mode Color Contrast

### Decision
Text elements must maintain sufficient WCAG 2.1 AA contrast ratio across both Light and Dark themes.
- Subheadings and muted text must avoid low-opacity light colors (e.g. `text-amber-200/70` or `text-brand-300/80` on light background).
- Pair dark text with light text:
  - Warning/Amber badges: `text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60`
  - Subheadings / Muted labels: `text-slate-600 dark:text-slate-400` or `text-slate-700 dark:text-brand-300`

---

## 6. Custom Modals in Place of Native Alerts/Confirms

### Decision
Browser-native `alert()`, `confirm()`, and `prompt()` dialogues are deprecated in SocietyApp.
- Use `window.appAlert(message, title)` and `window.appConfirm(message, callback, title)` defined globally in the base layout (`mobile.html.twig` / `base.html.twig`).
- These custom modals integrate with the application's theme, handle asynchronous actions cleanly, and avoid browser pop-up blocking issues.

---

## 7. Data Tables: Real-Time Search and Contextual Filters

### Decision
Every tabular data view across Admin, Committee, and Resident portals must provide an intuitive, client-side or server-side search input and contextual filter controls.

### Implementation Pattern
- **Search Bar**: Provide an accessible input with search icon (`<i data-lucide="search"></i>`) filtering table rows in real-time by text matching across names, unit numbers, phone numbers, codes, or descriptions.
- **Contextual Filters**: Use segmented tabs (e.g. `#all`, `#paid`, `#unpaid`, `#pending`, `#rejected`) or select dropdowns to filter rows by status or type without unnecessary full-page reload jumps.
- **Empty State**: Render a friendly "No matching records found" row or banner when active search/filter queries yield 0 results.
- **Theming & Accessibility**: Filter controls must adhere to WCAG AA contrast standards in both dark and light modes with proper focus ring styling.

---

## 8. Field-Level Contextual Validation Feedback

### Decision
On form submission or live field validation, validation error messages must be positioned directly below the respective input field rather than solely relying on distant top-of-page alert banners or modal popups.

### Rationale
- Contextual error placement allows users to instantly identify which specific field requires correction without scanning across the entire page.
- Dramatically improves user experience on mobile screens where top alerts may scroll completely out of view.
- Provides accessible, granular feedback that can be tied to assistive technologies.

### Implementation Pattern
1. **Error Message Container**: Place a dedicated message element immediately beneath the field container:
   ```html
   <div class="space-y-1">
       <label for="society_name" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Society Name</label>
       <input type="text" id="society_name" name="society_name" class="input-glass w-full text-sm" aria-describedby="society_name_error">
       <p id="society_name_error" class="field-error text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1 hidden">
           <i data-lucide="alert-circle" class="w-3 h-3 shrink-0"></i>
           <span>Please enter a valid society name.</span>
       </p>
   </div>
   ```
2. **Visual Input Error State**:
   - Apply `border-rose-500 focus:ring-rose-500/30` and `aria-invalid="true"` to the failing input.
3. **Dynamic Error Clearing**:
   - Attach an `input` or `change` listener to each field that automatically removes the error state, hides the helper error message, and restores normal border styling as soon as the user interacts with the input.
4. **Form Submit Integration**:
   - On failed client-side or AJAX submission, scroll smoothly (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) and focus the first invalid field.
