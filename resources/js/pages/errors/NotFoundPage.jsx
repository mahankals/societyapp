import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-heading text-3xl font-extrabold shadow-lg shadow-brand-500/20">
        404
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-heading">
          Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-surface-200/60 max-w-md mx-auto">
          The requested route does not exist or may have been relocated within the society management portal.
        </p>
      </div>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-all shadow-md shadow-brand-500/25"
      >
        <Home className="w-4 h-4" />
        <span>Return to Home</span>
      </Link>
    </div>
  );
}
