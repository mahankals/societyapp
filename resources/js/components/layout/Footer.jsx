import React from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DeveloperCredits from '../common/DeveloperCredits';

export default function Footer() {
  const { appConfig } = useAuth();

  return (
    <footer className="relative border-t border-surface-200/80 dark:border-white/5 pt-16 pb-10 bg-white dark:bg-surface-950 text-surface-600 dark:text-surface-200/70 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          {/* Brand info */}
          <div className="md:col-span-4">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-500/20">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-surface-900 dark:text-white tracking-tight">
                {appConfig.appName || 'SocietyApp'}
              </span>
            </Link>
            <p className="text-xs text-surface-500 dark:text-surface-200/50 leading-relaxed mb-5 max-w-xs">
              Empowering residential communities with enterprise-grade digital infrastructure for seamless society management.
            </p>
            <div className="flex gap-2">
              <a 
                href="#" 
                className="w-8 h-8 rounded-lg bg-surface-100 hover:bg-brand-500/20 hover:text-brand-500 dark:bg-white/5 dark:hover:bg-brand-500/20 dark:hover:text-brand-400 flex items-center justify-center text-surface-500 dark:text-white/40 transition-all" 
                aria-label="Twitter"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a 
                href="#" 
                className="w-8 h-8 rounded-lg bg-surface-100 hover:bg-brand-500/20 hover:text-brand-500 dark:bg-white/5 dark:hover:bg-brand-500/20 dark:hover:text-brand-400 flex items-center justify-center text-surface-500 dark:text-white/40 transition-all" 
                aria-label="GitHub"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
              </a>
              <a 
                href="#" 
                className="w-8 h-8 rounded-lg bg-surface-100 hover:bg-brand-500/20 hover:text-brand-500 dark:bg-white/5 dark:hover:bg-brand-500/20 dark:hover:text-brand-400 flex items-center justify-center text-surface-500 dark:text-white/40 transition-all" 
                aria-label="LinkedIn"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.69 1.69 0 1 0-.01-3.38 1.69 1.69 0 0 0 .01 3.38M7.86 18.5V10.1H5.06v8.4h2.8z"/></svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="md:col-span-2 col-span-6">
            <h4 className="text-[11px] font-bold text-surface-900 dark:text-white uppercase tracking-[0.15em] mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="/#features" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Features</a></li>
              <li><a href="/#how-it-works" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">How it Works</a></li>
              <li><a href="/#stats" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Impact &amp; Stats</a></li>
              <li><Link to="/society/contribute" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Add Society</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div className="md:col-span-2 col-span-6">
            <h4 className="text-[11px] font-bold text-surface-900 dark:text-white uppercase tracking-[0.15em] mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Careers</a></li>
              <li><Link to="/contact" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Contact Support</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="md:col-span-2 col-span-6">
            <h4 className="text-[11px] font-bold text-surface-900 dark:text-white uppercase tracking-[0.15em] mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">API Status</a></li>
              <li><Link to="/contact" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Direct WhatsApp</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-2 col-span-6">
            <h4 className="text-[11px] font-bold text-surface-900 dark:text-white uppercase tracking-[0.15em] mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Terms of Use</a></li>
              <li><a href="#" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Security</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom credits */}
        <div className="pt-6 border-t border-surface-200/80 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-3">
          <DeveloperCredits className="text-[11px] text-surface-500 dark:text-white/40" />
          <div className="flex items-center gap-2 text-[11px] text-surface-500 dark:text-white/30">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
