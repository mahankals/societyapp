import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Shared DeveloperCredits component.
 * Displays "Designed & Developed by Atul Mahankal".
 * Reusable across Auth pages, Footer, and any page headers/footers.
 */
export default function DeveloperCredits({ className = '', linkClassName = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-200/50 ${className}`}>
      <span>Designed &amp; Developed by</span>
      <Link
        to="/contact"
        className={`font-medium text-surface-700 dark:text-surface-200/80 hover:text-brand-500 dark:hover:text-brand-400 underline decoration-surface-300 dark:decoration-white/20 transition-colors ${linkClassName}`}
      >
        Atul Mahankal
      </Link>
    </span>
  );
}
