import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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
  const containerRef = useRef(null);

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

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    if (disabled) return;
    setIsOpen(false);
    if (onChange) {
      onChange(val);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80"
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
              ? 'opacity-50 cursor-not-allowed bg-surface-100 dark:bg-white/5 border border-surface-200 dark:border-white/5 text-surface-400'
              : isOpen
              ? 'bg-surface-50 dark:bg-white/10 border-2 border-brand-500 shadow-sm text-surface-900 dark:text-white ring-2 ring-brand-500/20'
              : 'bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 hover:border-brand-500/60 text-surface-900 dark:text-white shadow-xs'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="truncate pr-2">
            {selectedOption ? (
              <span className="font-medium text-surface-900 dark:text-white">
                {selectedOption.label}
              </span>
            ) : (
              <span className="text-surface-400 dark:text-surface-200/40">
                {placeholder}
              </span>
            )}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-surface-400 dark:text-surface-200/50 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-brand-500' : ''
            }`}
          />
        </button>

        {/* Themed Dropdown Options Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 shadow-2xl py-1.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            {normalizedOptions.length === 0 ? (
              <div className="px-4 py-3 text-center text-xs text-surface-400 dark:text-surface-200/40">
                No options available
              </div>
            ) : (
              normalizedOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3.5 py-2 text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed text-surface-400'
                        : isSelected
                        ? 'bg-brand-50/80 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 font-semibold'
                        : 'text-surface-700 dark:text-surface-200 hover:bg-brand-50/50 dark:hover:bg-white/5 hover:text-brand-600 dark:hover:text-white'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate font-medium">{opt.label}</div>
                      {opt.subtitle && (
                        <div className="text-[10px] text-surface-500 dark:text-surface-200/50 truncate font-normal">
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
