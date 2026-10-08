/**
 * SocietyApp - Custom Searchable Dropdown Reusable Component
 * 
 * Features:
 * - Replaces / progressively enhances standard <select> elements
 * - Smart auto-positioning:
 *     - If trigger is near top / space below is sufficient: opens downwards below trigger
 *     - If trigger is near bottom / space below is limited: flips and opens upwards above trigger
 * - Window-level body rendering (appended directly to document.body with fixed positioning):
 *     - NEVER cut off or clipped by parent cards, modals, or overflow:hidden divs!
 * - Automatic search filter:
 *     - Automatically shows search input whenever options exceed visible area (> 5 items)
 * - Real-time filtering with instant feedback
 * - Full 2-way sync with native <select> (form submits, name, required, onchange events)
 * - Accessible keyboard navigation (Arrow Up/Down, Enter, Space, Escape)
 */

(function(window, document) {
    'use strict';

    class SearchableDropdown {
        constructor(selectElement, options = {}) {
            if (!selectElement || selectElement._searchableDropdown) {
                return;
            }

            this.select = selectElement;
            this.select._searchableDropdown = this;

            this.config = Object.assign({
                searchThreshold: 5, // Show search box if items > 5 or list is scrollable
                placeholder: selectElement.getAttribute('data-placeholder') || 'Select an option...',
                emptyText: 'No matching options found',
                maxHeight: 280,
                autoPosition: true,
                ...options
            }, options);

            this.isOpen = false;
            this.highlightedIndex = -1;
            this.activeOptionElements = [];

            this.init();
        }

        init() {
            // Hide native select visually while keeping it fully functional in the DOM for forms
            this.select.classList.add('sr-only');
            this.select.setAttribute('tabindex', '-1');
            this.select.setAttribute('aria-hidden', 'true');

            // Build trigger button
            this.createTrigger();

            // Build floating dropdown panel (attached to document.body for window-level rendering)
            this.createMenu();

            // Bind event listeners
            this.bindEvents();

            // Initial sync from native select value
            this.syncFromSelect();
        }

        createTrigger() {
            this.wrapper = document.createElement('div');
            this.wrapper.className = 'custom-select-wrapper relative inline-block w-full';

            this.trigger = document.createElement('button');
            this.trigger.type = 'button';
            this.trigger.className = 'custom-select-trigger w-full min-h-[44px] bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-sm text-white flex items-center justify-between gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer select-none';
            
            if (this.select.disabled) {
                this.trigger.disabled = true;
                this.trigger.classList.add('opacity-50', 'cursor-not-allowed');
            }

            // Copy custom classes from select if any
            const customClass = this.select.getAttribute('data-trigger-class');
            if (customClass) {
                this.trigger.className += ' ' + customClass;
            }

            this.triggerLabel = document.createElement('span');
            this.triggerLabel.className = 'truncate text-left flex-1 font-normal';
            this.triggerLabel.textContent = this.config.placeholder;

            this.triggerIcon = document.createElement('span');
            this.triggerIcon.className = 'custom-select-chevron flex items-center text-surface-200/50 transition-transform duration-200 flex-shrink-0';
            this.triggerIcon.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;

            this.trigger.appendChild(this.triggerLabel);
            this.trigger.appendChild(this.triggerIcon);
            this.wrapper.appendChild(this.trigger);

            // Insert wrapper right after native select
            this.select.parentNode.insertBefore(this.wrapper, this.select.nextSibling);
        }

        createMenu() {
            this.menu = document.createElement('div');
            this.menu.className = 'custom-select-menu fixed z-[999999] hidden rounded-xl border border-white/15 shadow-2xl overflow-hidden text-sm flex flex-col';
            this.menu.style.cssText = 'opacity: 1 !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; box-sizing: border-box;';

            // Search input container
            this.searchWrapper = document.createElement('div');
            this.searchWrapper.className = 'custom-select-search-wrap p-2.5 border-b border-white/10 bg-[#090d16] flex items-center gap-2';

            const searchIcon = document.createElement('span');
            searchIcon.className = 'text-surface-200/40 flex-shrink-0';
            searchIcon.innerHTML = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
            this.searchWrapper.appendChild(searchIcon);

            this.searchInput = document.createElement('input');
            this.searchInput.type = 'text';
            this.searchInput.className = 'w-full bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-surface-200/40 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all';
            this.searchInput.placeholder = 'Search options...';
            this.searchInput.autocomplete = 'off';

            this.searchWrapper.appendChild(this.searchInput);
            this.menu.appendChild(this.searchWrapper);

            // Options list container
            this.optionsContainer = document.createElement('div');
            this.optionsContainer.className = 'custom-select-options overflow-y-auto p-1.5 space-y-0.5 overscroll-contain flex-1';
            this.optionsContainer.style.maxHeight = this.config.maxHeight + 'px';
            this.menu.appendChild(this.optionsContainer);

            // Empty state container
            this.emptyEl = document.createElement('div');
            this.emptyEl.className = 'hidden p-4 text-center text-xs text-surface-200/50';
            this.emptyEl.textContent = this.config.emptyText;
            this.menu.appendChild(this.emptyEl);

            // CRITICAL REQUIREMENT: Render in window area (document.body) to never be cut by parent card/div
            document.body.appendChild(this.menu);
        }

        bindEvents() {
            // Click trigger to toggle
            this.trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggle();
            });

            // Search filter
            this.searchInput.addEventListener('input', () => {
                this.filterOptions(this.searchInput.value);
            });

            // Prevent closing when clicking inside menu
            this.menu.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // Keyboard navigation on trigger
            this.trigger.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!this.isOpen) {
                        this.open();
                    } else {
                        this.handleKeyboard(e.key);
                    }
                } else if (e.key === 'Escape' && this.isOpen) {
                    e.preventDefault();
                    this.close();
                }
            });

            // Keyboard navigation on search input
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                    e.preventDefault();
                    this.handleKeyboard(e.key);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.close();
                }
            });

            // Close on outside click
            this._onDocumentClick = (e) => {
                if (this.isOpen && !this.wrapper.contains(e.target) && !this.menu.contains(e.target)) {
                    this.close();
                }
            };
            document.addEventListener('click', this._onDocumentClick);

            // Update position on window scroll or resize
            this._onWindowChange = () => {
                if (this.isOpen) {
                    this.updatePosition();
                }
            };
            window.addEventListener('resize', this._onWindowChange, { passive: true });
            window.addEventListener('scroll', this._onWindowChange, { passive: true, capture: true });

            // Listen for native select change event
            this.select.addEventListener('change', () => {
                this.syncFromSelect();
            });
        }

        buildOptions() {
            this.optionsContainer.innerHTML = '';
            this.activeOptionElements = [];

            const nativeOptions = Array.from(this.select.options);
            const totalItems = nativeOptions.length;

            // REQUIREMENT: Show search input if dropdown items exceed visible threshold (> 5 items)
            const shouldShowSearch = totalItems > this.config.searchThreshold || this.select.getAttribute('data-searchable') === 'true';
            this.searchWrapper.style.display = shouldShowSearch ? 'flex' : 'none';

            nativeOptions.forEach((opt, index) => {
                const optBtn = document.createElement('button');
                optBtn.type = 'button';
                optBtn.className = 'custom-select-option w-full px-3 py-2 text-left rounded-lg text-sm text-surface-200/90 hover:text-white hover:bg-brand-500/15 flex items-center justify-between gap-2 transition-colors cursor-pointer select-none';
                optBtn.dataset.value = opt.value;
                optBtn.dataset.index = index;
                optBtn.dataset.text = opt.text;

                if (opt.disabled) {
                    optBtn.disabled = true;
                    optBtn.classList.add('opacity-40', 'cursor-not-allowed');
                }

                const isSelected = opt.selected;
                if (isSelected) {
                    optBtn.classList.add('text-brand-300', 'bg-brand-500/10', 'font-medium');
                }

                const textSpan = document.createElement('span');
                textSpan.className = 'truncate';
                textSpan.textContent = opt.text;
                optBtn.appendChild(textSpan);

                if (isSelected) {
                    const checkIcon = document.createElement('span');
                    checkIcon.className = 'text-brand-400 flex-shrink-0';
                    checkIcon.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
                    optBtn.appendChild(checkIcon);
                }

                optBtn.addEventListener('click', () => {
                    this.selectOption(opt.value);
                });

                this.optionsContainer.appendChild(optBtn);
                this.activeOptionElements.push(optBtn);
            });
        }

        filterOptions(query) {
            const cleanQuery = query.toLowerCase().trim();
            let visibleCount = 0;

            this.activeOptionElements.forEach(el => {
                const text = el.dataset.text.toLowerCase();
                const matches = text.includes(cleanQuery);
                el.style.display = matches ? 'flex' : 'none';
                if (matches) visibleCount++;
            });

            if (visibleCount === 0) {
                this.emptyEl.classList.remove('hidden');
            } else {
                this.emptyEl.classList.add('hidden');
            }

            this.updatePosition();
        }

        selectOption(value) {
            this.select.value = value;
            this.syncFromSelect();

            // Trigger events on native select so form handlers and inline onchange attributes execute
            if (typeof this.select.onchange === 'function') {
                try {
                    this.select.onchange();
                } catch (e) {
                    console.error('Error executing select onchange:', e);
                }
            }

            this.select.dispatchEvent(new Event('change', { bubbles: true }));
            this.select.dispatchEvent(new Event('input', { bubbles: true }));

            this.close();
            this.trigger.focus();
        }

        syncFromSelect() {
            const selectedOpt = this.select.options[this.select.selectedIndex];
            if (selectedOpt && selectedOpt.value !== '') {
                this.triggerLabel.textContent = selectedOpt.text;
                this.triggerLabel.classList.remove('text-surface-200/50');
                this.triggerLabel.classList.add('text-white');
            } else {
                this.triggerLabel.textContent = selectedOpt ? selectedOpt.text : this.config.placeholder;
                this.triggerLabel.classList.remove('text-white');
                this.triggerLabel.classList.add('text-surface-200/50');
            }
        }

        updatePosition() {
            if (!this.isOpen) return;

            const rect = this.trigger.getBoundingClientRect();
            
            // Check if trigger is offscreen
            if (rect.bottom < 0 || rect.top > window.innerHeight) {
                this.close();
                return;
            }

            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            const spaceBelow = viewportHeight - rect.bottom - 16;
            const spaceAbove = rect.top - 16;

            // Ideal height for comfortable dropdown
            const idealHeight = 320;

            // Auto-placement: open below only if ample room (>= idealHeight) OR if spaceBelow > spaceAbove
            const preferBelow = (spaceBelow >= idealHeight) || (spaceBelow >= spaceAbove);

            const availableSpace = Math.max(120, (preferBelow ? spaceBelow : spaceAbove) - 8);
            const menuMaxHeight = Math.min(availableSpace, 360);

            // Dynamic search check: show search input if threshold met
            const shouldShowSearch = this.activeOptionElements.length > this.config.searchThreshold || this.select.getAttribute('data-searchable') === 'true';
            this.searchWrapper.style.display = shouldShowSearch ? 'flex' : 'none';

            // Explicitly bound menu max-height to available space so it NEVER overflows offscreen
            this.menu.style.maxHeight = menuMaxHeight + 'px';

            const searchHeight = shouldShowSearch ? 48 : 0;
            const optionsMaxHeight = Math.max(80, menuMaxHeight - searchHeight - 8);
            this.optionsContainer.style.maxHeight = optionsMaxHeight + 'px';

            if (preferBelow) {
                // Open downwards below trigger
                this.menu.style.top = (rect.bottom + 6) + 'px';
                this.menu.style.bottom = 'auto';
                this.menu.setAttribute('data-placement', 'bottom');
            } else {
                // Open upwards above trigger
                this.menu.style.top = 'auto';
                this.menu.style.bottom = (viewportHeight - rect.top + 6) + 'px';
                this.menu.setAttribute('data-placement', 'top');
            }

            // Horizontal alignment and width
            const targetWidth = Math.max(rect.width, 240);
            this.menu.style.width = targetWidth + 'px';

            let left = rect.left;
            if (left + targetWidth > viewportWidth - 12) {
                left = viewportWidth - targetWidth - 12;
            }
            if (left < 12) {
                left = 12;
            }
            this.menu.style.left = left + 'px';
        }

        open() {
            // Close any other open SearchableDropdown instances
            document.querySelectorAll('.custom-select-menu:not(.hidden)').forEach(el => {
                if (el._instance && el._instance !== this) {
                    el._instance.close();
                }
            });

            this.isOpen = true;
            this.menu._instance = this;

            this.buildOptions();
            this.searchInput.value = '';
            this.emptyEl.classList.add('hidden');

            this.menu.classList.remove('hidden');
            this.trigger.setAttribute('aria-expanded', 'true');
            this.triggerIcon.style.transform = 'rotate(180deg)';

            this.updatePosition();

            // Focus search input if visible, otherwise focus first option
            if (this.searchWrapper.style.display !== 'none') {
                setTimeout(() => this.searchInput.focus(), 50);
            }
        }

        close() {
            if (!this.isOpen) return;

            this.isOpen = false;
            this.menu.classList.add('hidden');
            this.trigger.setAttribute('aria-expanded', 'false');
            this.triggerIcon.style.transform = 'rotate(0deg)';
            this.highlightedIndex = -1;
        }

        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        }

        handleKeyboard(key) {
            const visibleOptions = this.activeOptionElements.filter(el => el.style.display !== 'none' && !el.disabled);
            if (!visibleOptions.length) return;

            if (key === 'ArrowDown') {
                this.highlightedIndex = (this.highlightedIndex + 1) % visibleOptions.length;
                this.highlightOption(visibleOptions[this.highlightedIndex]);
            } else if (key === 'ArrowUp') {
                this.highlightedIndex = (this.highlightedIndex - 1 + visibleOptions.length) % visibleOptions.length;
                this.highlightOption(visibleOptions[this.highlightedIndex]);
            } else if (key === 'Enter') {
                if (this.highlightedIndex >= 0 && visibleOptions[this.highlightedIndex]) {
                    visibleOptions[this.highlightedIndex].click();
                }
            }
        }

        highlightOption(el) {
            this.activeOptionElements.forEach(item => item.classList.remove('bg-brand-500/20'));
            if (el) {
                el.classList.add('bg-brand-500/20');
                el.scrollIntoView({ block: 'nearest' });
            }
        }

        destroy() {
            document.removeEventListener('click', this._onDocumentClick);
            window.removeEventListener('resize', this._onWindowChange);
            window.removeEventListener('scroll', this._onWindowChange, true);

            if (this.menu && this.menu.parentNode) {
                this.menu.parentNode.removeChild(this.menu);
            }
            if (this.wrapper && this.wrapper.parentNode) {
                this.wrapper.parentNode.removeChild(this.wrapper);
            }
            this.select.classList.remove('sr-only');
            delete this.select._searchableDropdown;
        }
    }

    // Auto-initialize function for all <select> elements across the site
    function initSearchableDropdowns(root = document) {
        // Upgrade selects with custom classes or standard form selects (excluding small phone prefix selects or explicitly opted-out elements)
        const selects = root.querySelectorAll('select.custom-select, select[data-searchable], select.input-glass, select.searchable-select, form select:not(.no-custom-dropdown):not([multiple]):not(#admin_phone_country)');
        selects.forEach(select => {
            if (!select._searchableDropdown && !select.classList.contains('no-custom-dropdown')) {
                new SearchableDropdown(select);
            }
        });
    }

    // Export globally
    window.SearchableDropdown = SearchableDropdown;
    window.initSearchableDropdowns = initSearchableDropdowns;

    // Run automatically when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initSearchableDropdowns());
    } else {
        initSearchableDropdowns();
    }

})(window, document);
