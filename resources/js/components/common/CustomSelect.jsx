import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export default function CustomSelect({
  label = '',
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  id,
  name,
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options to { value, label, subtitle, disabled }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: String(opt.value ?? ''),
        label: opt.label ?? opt.name ?? String(opt.value ?? ''),
        subtitle: opt.subtitle ?? opt.city ?? '',
        disabled: Boolean(opt.disabled),
      };
    }
    return {
      value: String(opt),
      label: String(opt),
      subtitle: '',
      disabled: false,
    };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  // Close on outside click & reset search
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      // Auto-focus search input if options exceed visible area (> 5 options)
      if (normalizedOptions.length > 5) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    } else {
      setSearchQuery('');
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, normalizedOptions.length]);

  const handleSelect = (val) => {
    if (disabled) return;
    setIsOpen(false);
    setSearchQuery('');
    if (onChange) {
      onChange(val);
    }
  };

  // Filter options when searching
  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase().trim();
    return (
      opt.label.toLowerCase().includes(term) ||
      (opt.subtitle && opt.subtitle.toLowerCase().includes(term)) ||
      opt.value.toLowerCase().includes(term)
    );
  });

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-800 dark:text-surface-200/80"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Themed Custom Trigger Button */}
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs sm:text-sm transition-all cursor-pointer ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-400'
              : isOpen
              ? 'bg-white dark:bg-white/10 border-2 border-brand-500 shadow-sm text-slate-900 dark:text-white ring-2 ring-brand-500/20'
              : 'bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 hover:border-brand-500/60 text-slate-900 dark:text-white shadow-xs'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="truncate pr-2">
            {selectedOption ? (
              <span className="font-semibold text-slate-900 dark:text-white">
                {selectedOption.label}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-surface-200/40">
                {placeholder}
              </span>
            )}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 dark:text-surface-200/50 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-brand-500' : ''
            }`}
          />
        </button>

        {/* Themed Dropdown Options Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white dark:bg-surface-950 border border-slate-200 dark:border-white/10 shadow-2xl py-1 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            {/* Search Input if options exceed visible area (> 5 options) */}
            {normalizedOptions.length > 5 && (
              <div className="p-2 border-b border-slate-200 dark:border-white/10 sticky top-0 bg-white dark:bg-surface-950 z-10">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 dark:text-surface-200/50 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search options..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-200/40 focus:outline-none focus:border-brand-500 font-medium"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-center text-xs text-slate-500 dark:text-surface-200/50">
                {searchQuery ? 'No matching options found' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3.5 py-2 text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed text-slate-400'
                        : isSelected
                        ? 'bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 font-bold border-l-2 border-brand-500'
                        : 'text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-brand-700 dark:hover:text-brand-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate font-medium text-slate-900 dark:text-white">
                        {opt.label}
                      </div>
                      {opt.subtitle && (
                        <div className="text-[10px] text-slate-500 dark:text-surface-200/60 truncate font-normal">
                          {opt.subtitle}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Synchronized accessible select element for forms and automated testing */}
        <select
          name={name}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
          tabIndex={-1}
          aria-hidden="true"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {normalizedOptions.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
