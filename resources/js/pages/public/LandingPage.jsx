import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  ShieldCheck, 
  CreditCard, 
  Users, 
  Bell, 
  ArrowRight, 
  CheckCircle2, 
  Smartphone,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LandingPage() {
  const { user, appConfig } = useAuth();

  return (
    <div className="space-y-20 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="text-center pt-8 pb-12 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Next-Generation Society Management Platform</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto font-heading">
          Smart, Transparent &amp; Effortless <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">Housing Society</span> Management
        </h1>
        
        <p className="mt-6 text-base sm:text-lg text-surface-200/70 max-w-2xl mx-auto leading-relaxed">
          Streamline maintenance billing, UPI payments, member directories, and society committee governance in one modern, mobile-first workspace.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {user ? (
            <Link
              to={user.role === 'admin' ? '/admin' : '/resident'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/25"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/25"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-white/10 transition-all"
              >
                <span>Resident Login</span>
              </Link>
            </>
          )}
          <Link
            to="/society/contribute"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold transition-all"
          >
            <Building2 className="w-4 h-4" />
            <span>Register Your Society</span>
          </Link>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section id="features" className="space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-heading">
            Engineered for Residents &amp; Committees
          </h2>
          <p className="mt-2 text-sm text-surface-200/60">
            Everything your housing society needs to run efficiently and securely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-brand-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Automated Maintenance &amp; UPI</h3>
            <p className="text-sm text-surface-200/70 leading-relaxed">
              Generate recurring maintenance bills, scan dynamic society UPI QR codes for instant dues clearing, and download automated digital receipts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-brand-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Member &amp; Unit Governance</h3>
            <p className="text-sm text-surface-200/70 leading-relaxed">
              Track flat ownership, tenant occupancy, and verify family member affiliations with committee-grade approval workflows.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-brand-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Transparent Accounting</h3>
            <p className="text-sm text-surface-200/70 leading-relaxed">
              Access real-time society expense ledgers, view collection rates, and maintain transparent audit trails across committee tenures.
            </p>
          </div>
        </div>
      </section>

      {/* Impact Numbers */}
      <section className="p-8 rounded-3xl bg-gradient-to-r from-brand-950/80 to-surface-900 border border-brand-500/20 text-center">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-brand-300 font-heading">100%</p>
            <p className="text-xs sm:text-sm text-surface-200/60 mt-1">Digital Receipts</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-brand-300 font-heading">0%</p>
            <p className="text-xs sm:text-sm text-surface-200/60 mt-1">Cash Payment Risk</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-brand-300 font-heading">Instant</p>
            <p className="text-xs sm:text-sm text-surface-200/60 mt-1">UPI Dues Settlement</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-brand-300 font-heading">PWA</p>
            <p className="text-xs sm:text-sm text-surface-200/60 mt-1">Mobile Installable</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 pt-8 pb-4 text-center text-xs text-surface-200/50 space-y-2">
        <p>&copy; {new Date().getFullYear()} {appConfig.appName}. All rights reserved.</p>
        <p>
          <Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link>
          <span className="mx-2">&middot;</span>
          <Link to="/society/contribute" className="hover:text-white transition-colors">Register Society</Link>
        </p>
      </footer>
    </div>
  );
}
