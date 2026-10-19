import React from 'react';
import { Check } from 'lucide-react';

export default function CustomCheckbox({
  checked = false,
  onChange,
  label = null,
  description = null,
  disabled = false,
  className = '',
  name,
  id,
  title,
}) {
  const toggle = (e) => {
    if (disabled) return;
    if (onChange) {
      // Support both (e) and (boolean) signatures
      const nextChecked = !checked;
      const syntheticEvent = {
        target: { checked: nextChecked, name },
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
      };
      onChange(syntheticEvent, nextChecked);
    }
  };

  return (
    <label
      htmlFor={id}
      title={title}
      className={`inline-flex items-start gap-2.5 cursor-pointer select-none group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
        {/* Transparent overlay input so browser clicks and Playwright .check() work directly */}
        <input
          type="checkbox"
          id={id}
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={toggle}
          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed m-0 p-0"
        />

        {/* Custom Themed Checkbox Box */}
        <div
          className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all duration-150 pointer-events-none ${
            checked
              ? 'bg-brand-500 border-brand-500 text-white shadow-xs shadow-brand-500/30'
              : 'bg-surface-50 dark:bg-white/5 border-surface-300 dark:border-white/20 group-hover:border-brand-500/70 dark:group-hover:border-brand-400/70 shadow-inner'
          } ${disabled ? 'bg-surface-100 dark:bg-white/5' : ''}`}
        >
          {checked && (
            <Check className="w-3 h-3 text-white stroke-[2.5] animate-in zoom-in-75 duration-100" />
          )}
        </div>
      </div>

      {(label || description) && (
        <div className="leading-tight">
          {label && (
            <span className="text-xs font-medium text-surface-800 dark:text-surface-200 group-hover:text-surface-900 dark:group-hover:text-white transition-colors">
              {label}
            </span>
          )}
          {description && (
            <p className="text-[11px] text-surface-500 dark:text-surface-200/50 mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
    </label>
  );
}
