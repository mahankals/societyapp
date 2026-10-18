import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  ArrowRight, 
  PlayCircle, 
  Zap, 
  WifiOff, 
  ShieldCheck, 
  IndianRupee, 
  CheckCircle2, 
  Sparkles, 
  Rocket, 
  Calendar,
  Receipt,
  Bell,
  MessageSquare,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden selection:bg-brand-500/30 selection:text-white">
      {/* ========== HERO SECTION ========== */}
      <section className="relative min-h-[calc(100vh-52px)] flex items-center overflow-hidden pt-12 pb-20">
        {/* Background Effects */}
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none"></div>
        <div className="glow-orb w-[600px] h-[600px] bg-brand-600/15 -top-24 left-[10%] animate-pulse-slow pointer-events-none"></div>
        <div className="glow-orb w-[500px] h-[500px] bg-brand-500/10 -bottom-24 right-[5%] animate-pulse-slow pointer-events-none" style={{ animationDelay: '2s' }}></div>
        <div className="glow-orb w-[300px] h-[300px] bg-purple-600/10 top-[20%] right-[20%] animate-float pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column: Content */}
            <div className="text-center lg:text-left relative z-20">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold mb-6 animate-fade-in">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
                <span>Live Resident Portal</span>
              </div>
              
              {/* Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6 text-white font-heading animate-fade-up">
                Your Housing Society,<br />
                <span className="bg-gradient-to-r from-brand-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Completely Digital.
                </span>
              </h1>
              
              {/* Subheading */}
              <p className="text-base sm:text-lg lg:text-xl text-surface-200/60 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8 animate-fade-up">
                The modern management platform for residential communities. Transparent maintenance, automated UPI collections, digital member directory, and real-time governance.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center animate-fade-up">
                {user ? (
                  <Link 
                    to={user.role === 'admin' ? '/admin' : '/resident'} 
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold text-base hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/25 active:scale-95"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link 
                      to="/register" 
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold text-base hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/25 active:scale-95"
                    >
                      <span>Get Started Free</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link 
                      to="/login" 
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-base border border-white/10 transition-all active:scale-95"
                    >
                      <span>Resident Login</span>
                    </Link>
                  </>
                )}
                <a 
                  href="#features" 
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-surface-200 hover:text-white font-semibold text-base border border-white/10 transition-all"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>View Features</span>
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start animate-fade-up">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 border-2 border-surface-950 flex items-center justify-center text-xs font-bold text-white shadow-sm">A</div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-surface-950 flex items-center justify-center text-xs font-bold text-white shadow-sm">R</div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-surface-950 flex items-center justify-center text-xs font-bold text-white shadow-sm">K</div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-surface-950 flex items-center justify-center text-xs font-bold text-white shadow-sm">S</div>
                  <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-surface-950 flex items-center justify-center text-xs font-medium text-white/60">+</div>
                </div>
                <div className="text-xs sm:text-sm text-surface-200/50">
                  <span className="text-white font-semibold">500+</span> societies already onboarded
                </div>
              </div>
            </div>

            {/* Right Column: Dual Device Mockup (Browser + Mobile) */}
            <div className="relative animate-fade-up max-lg:mt-8">
              {/* Glow behind device */}
              <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 via-purple-500/10 to-brand-600/20 rounded-[2.5rem] blur-2xl pointer-events-none"></div>
              
              {/* Dashboard Browser Mockup */}
              <div className="relative rounded-[2rem] p-1.5 bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/40 w-full max-w-[620px] mx-auto">
                <div className="bg-surface-900/90 rounded-[1.7rem] overflow-hidden border border-white/5">
                  {/* Title Bar */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-surface-950/60">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/70"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/70"></div>
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="px-3 py-0.5 bg-white/5 rounded-md text-[11px] text-surface-200/40 font-mono">
                        societyapp.ddev.site/admin
                      </div>
                    </div>
                  </div>
                  
                  {/* Dashboard Visual Mockup Content */}
                  <div className="p-4 grid grid-cols-12 gap-3" style={{ aspectRatio: '16/10' }}>
                    {/* Mock Sidebar */}
                    <div className="col-span-3 space-y-2 border-r border-white/5 pr-2">
                      <div className="h-6 bg-white/10 rounded-lg w-4/5 mb-3"></div>
                      <div className="h-6 bg-brand-500/20 border border-brand-500/30 rounded-lg flex items-center px-2">
                        <div className="w-2 h-2 rounded-full bg-brand-400 mr-2"></div>
                        <div className="h-2 bg-brand-300/40 rounded w-12"></div>
                      </div>
                      <div className="h-5 bg-white/5 rounded-lg w-full"></div>
                      <div className="h-5 bg-white/5 rounded-lg w-5/6"></div>
                      <div className="h-5 bg-white/5 rounded-lg w-4/5"></div>
                    </div>
                    
                    {/* Mock Main Area */}
                    <div className="col-span-9 space-y-3">
                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                          <div className="h-1.5 bg-white/20 rounded w-10 mb-2"></div>
                          <div className="h-4 bg-gradient-to-r from-brand-500/40 to-brand-400/30 rounded w-12"></div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                          <div className="h-1.5 bg-white/20 rounded w-10 mb-2"></div>
                          <div className="h-4 bg-gradient-to-r from-emerald-500/40 to-emerald-400/30 rounded w-14"></div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                          <div className="h-1.5 bg-white/20 rounded w-10 mb-2"></div>
                          <div className="h-4 bg-gradient-to-r from-amber-500/40 to-amber-400/30 rounded w-10"></div>
                        </div>
                      </div>
                      
                      {/* Chart Area */}
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col justify-between" style={{ minHeight: '90px' }}>
                        <div className="h-2 bg-white/20 rounded w-20 mb-2"></div>
                        <div className="flex items-end gap-2 h-14">
                          <div className="flex-1 bg-brand-500/20 rounded-t" style={{ height: '40%' }}></div>
                          <div className="flex-1 bg-brand-500/30 rounded-t" style={{ height: '65%' }}></div>
                          <div className="flex-1 bg-brand-500/40 rounded-t" style={{ height: '50%' }}></div>
                          <div className="flex-1 bg-brand-500/50 rounded-t" style={{ height: '85%' }}></div>
                          <div className="flex-1 bg-brand-500/40 rounded-t" style={{ height: '60%' }}></div>
                          <div className="flex-1 bg-brand-500/60 rounded-t" style={{ height: '95%' }}></div>
                          <div className="flex-1 bg-brand-500/40 rounded-t" style={{ height: '70%' }}></div>
                        </div>
                      </div>

                      {/* Bottom Cards */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/5 rounded-xl p-2 border border-white/5 space-y-1">
                          <div className="h-1.5 bg-white/20 rounded w-12 mb-1.5"></div>
                          <div className="h-1.5 bg-white/10 rounded w-full"></div>
                          <div className="h-1.5 bg-white/10 rounded w-4/5"></div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-2 border border-white/5 flex items-center justify-around">
                          <div className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/30"></div>
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30"></div>
                          <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Smartphone Mockup (Overlapping Front Right) */}
              <div className="absolute -bottom-6 -right-2 sm:-right-4 w-[190px] sm:w-[220px] rounded-[2.2rem] bg-surface-950 p-2 border-4 border-surface-800 shadow-2xl shadow-black/80 z-30 transition-transform duration-300 hover:scale-105">
                <div className="rounded-[1.7rem] bg-surface-900 border border-white/10 overflow-hidden flex flex-col text-left">
                  {/* Dynamic Island */}
                  <div className="pt-2 pb-1 flex justify-center bg-surface-950/90 border-b border-white/5">
                    <div className="w-14 h-2 bg-surface-800 rounded-full flex items-center justify-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-surface-600"></div>
                    </div>
                  </div>

                  {/* Mobile Top Bar */}
                  <div className="px-2.5 py-1 flex items-center justify-between border-b border-white/5 bg-surface-900/90">
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-3.5 rounded bg-brand-500 flex items-center justify-center">
                        <Building2 className="w-2 h-2 text-white" />
                      </div>
                      <span className="text-[9px] font-bold text-white">SocietyApp</span>
                    </div>
                    <span className="text-[7px] px-1 rounded-full bg-white/10 text-white/70 font-semibold">Flat 402</span>
                  </div>

                  {/* Mobile App Content */}
                  <div className="p-2 space-y-1.5 bg-gradient-to-b from-surface-900 to-surface-950">
                    {/* Maintenance Card */}
                    <div className="p-2 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-600/10 border border-brand-500/25">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[7px] uppercase tracking-wider text-surface-200/60 font-semibold">Maintenance</span>
                        <span className="text-[7px] font-bold text-amber-400">Due in 3d</span>
                      </div>
                      <div className="text-[11px] font-extrabold text-white">₹3,500<span className="text-[8px] text-surface-200/50 font-normal"> /mo</span></div>
                      <div className="mt-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-brand-500 text-white text-[8px] font-bold shadow-md shadow-brand-500/30">
                        <Zap className="w-2.5 h-2.5" />
                        <span>Pay with UPI</span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div className="p-1 rounded-lg bg-white/5 border border-white/5">
                        <Receipt className="w-2.5 h-2.5 text-brand-400 mx-auto mb-0.5" />
                        <span className="text-[6px] text-surface-200/70 block leading-tight font-medium">Receipts</span>
                      </div>
                      <div className="p-1 rounded-lg bg-white/5 border border-white/5">
                        <Bell className="w-2.5 h-2.5 text-emerald-400 mx-auto mb-0.5" />
                        <span className="text-[6px] text-surface-200/70 block leading-tight font-medium">Notices</span>
                      </div>
                      <div className="p-1 rounded-lg bg-white/5 border border-white/5">
                        <MessageSquare className="w-2.5 h-2.5 text-amber-400 mx-auto mb-0.5" />
                        <span className="text-[6px] text-surface-200/70 block leading-tight font-medium">Tickets</span>
                      </div>
                    </div>

                    {/* Activity Items */}
                    <div className="p-1 rounded-lg bg-white/[0.03] border border-white/5 flex items-center gap-1">
                      <div className="w-3.5 h-3.5 rounded bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Check className="w-2 h-2 text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[7px] font-semibold text-white truncate">Water Tank Cleaned</p>
                        <p className="text-[6px] text-surface-200/40">Today, 10:30 AM</p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Home Indicator */}
                  <div className="py-1 flex justify-center bg-surface-950">
                    <div className="w-8 h-0.5 bg-surface-700 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Floating notification card */}
              <div className="absolute -bottom-4 -left-4 sm:-left-6 rounded-xl p-2.5 pr-4 bg-surface-900/90 border border-white/10 backdrop-blur-xl animate-float shadow-xl shadow-black/30 hidden sm:block">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Payment Received</div>
                    <div className="text-[10px] text-surface-200/50">₹5,000 • Maintenance Fee</div>
                  </div>
                </div>
              </div>

              {/* Floating security badge */}
              <div className="absolute -top-3 -right-3 rounded-xl px-3 py-1.5 bg-surface-900/90 border border-white/10 backdrop-blur-xl animate-float shadow-xl shadow-black/30 hidden sm:flex items-center gap-2" style={{ animationDelay: '3s' }}>
                <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                <span className="text-xs font-semibold text-white">SSL/TLS Secured</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section id="features" className="relative py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Core Capabilities</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight font-heading">
              Built for <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">Excellence</span>
            </h2>
            <p className="text-surface-200/60 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              Everything your residential community needs, unified in one platform designed for speed, clarity, and trust.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-brand-500/40 hover:bg-white/[0.05] transition-all group">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Zap className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Instant Cloud Portal</h3>
              <p className="text-surface-200/60 text-xs leading-relaxed">
                Lightning-fast performance and seamless access on any phone, tablet, or desktop. Manage your society anywhere, anytime.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 hover:bg-white/[0.05] transition-all group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <WifiOff className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Offline Persistence</h3>
              <p className="text-surface-200/60 text-xs leading-relaxed">
                Access critical documents, digital IDs, and recent notices even with poor reception. Syncs automatically when back online.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/40 hover:bg-white/[0.05] transition-all group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Enterprise Security</h3>
              <p className="text-surface-200/60 text-xs leading-relaxed">
                Role-based access control with SSL/TLS encryption, Bcrypt password protection, and CSRF guard on every administrative action.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-pink-500/40 hover:bg-white/[0.05] transition-all group">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <IndianRupee className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Instant UPI Payments</h3>
              <p className="text-surface-200/60 text-xs leading-relaxed">
                Scan dynamic society UPI QR codes for zero-hassle dues clearing with automated payment reconciliation and instant receipts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS SECTION ========== */}
      <section id="how-it-works" className="relative py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold mb-4">
              <Rocket className="w-3.5 h-3.5 text-brand-400" />
              <span>Get Started</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight font-heading">
              Up and Running in <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">Minutes</span>
            </h2>
            <p className="text-surface-200/60 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              Three simple steps to modernize your entire housing society operations.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-4 text-brand-400 font-bold text-lg">
                1
              </div>
              <h3 className="text-base font-bold text-white mb-2">Register Your Society</h3>
              <p className="text-xs text-surface-200/60 leading-relaxed">
                Sign up with your society details and configure administrator or committee roles in minutes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-4 text-brand-400 font-bold text-lg">
                2
              </div>
              <h3 className="text-base font-bold text-white mb-2">Invite Members &amp; Units</h3>
              <p className="text-xs text-surface-200/60 leading-relaxed">
                Residents join instantly via invitation link or request their flat linking digitally without paper forms.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-4 text-brand-400 font-bold text-lg">
                3
              </div>
              <h3 className="text-base font-bold text-white mb-2">Go Digital</h3>
              <p className="text-xs text-surface-200/60 leading-relaxed">
                Collect dues with UPI, view transparent accounting, publish broadcasts, and manage flats all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== STATS SECTION ========== */}
      <section id="stats" className="relative py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="rounded-3xl p-8 sm:p-12 bg-white/[0.03] border border-white/10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-brand-400 font-heading">500+</div>
                <div className="text-xs sm:text-sm text-surface-200/60 mt-1">Societies</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-heading">50,000+</div>
                <div className="text-xs sm:text-sm text-surface-200/60 mt-1">Residents</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-heading">99.9%</div>
                <div className="text-xs sm:text-sm text-surface-200/60 mt-1">Uptime</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-indigo-400 font-heading">24/7</div>
                <div className="text-xs sm:text-sm text-surface-200/60 mt-1">Support</div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-surface-200/40">
              <span className="uppercase tracking-wider font-semibold">Trusted across</span>
              <span className="text-white/80 font-medium">Mumbai</span>
              <span>•</span>
              <span className="text-white/80 font-medium">Pune</span>
              <span>•</span>
              <span className="text-white/80 font-medium">Bangalore</span>
              <span>•</span>
              <span className="text-white/80 font-medium">Delhi</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="relative py-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="relative rounded-3xl overflow-hidden p-8 sm:p-14 text-center bg-gradient-to-br from-brand-600 via-brand-700 to-purple-800 border border-brand-500/30 shadow-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 mb-6 text-white text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Free for small residential communities</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 tracking-tight font-heading">
              Ready to modernize your community?
            </h2>
            <p className="text-white/80 text-sm sm:text-base mb-8 max-w-lg mx-auto leading-relaxed">
              Join hundreds of housing societies already using SocietyApp to streamline operations and elevate the resident experience.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
              {user ? (
                <Link
                  to={user.role === 'admin' ? '/admin' : '/resident'}
                  className="px-6 py-3 rounded-xl bg-white text-brand-700 font-bold text-sm hover:bg-white/90 transition-all shadow-lg active:scale-95"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="px-6 py-3 rounded-xl bg-white text-brand-700 font-bold text-sm hover:bg-white/90 transition-all shadow-lg active:scale-95"
                >
                  Get Started Free
                </Link>
              )}
              <Link
                to="/society/contribute"
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-sm transition-all"
              >
                Register Your Society
              </Link>
            </div>
            <p className="mt-4 text-[11px] text-white/50">No credit card required • Setup in 2 minutes</p>
          </div>
        </div>
      </section>
    </div>
  );
}
