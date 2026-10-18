import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const { appConfig, refreshBootstrap } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Please fill in your name, email, and password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!terms) {
      setError('Please accept the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/register', { name, email, phone, password });
      await refreshBootstrap();
      navigate('/resident');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    const clientId = appConfig?.googleClientId;
    if (!clientId) {
      alert('Google Sign-In is not configured yet on this platform.');
      return;
    }

    if (window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse?.access_token) {
              setLoading(true);
              try {
                const res = await fetch('/auth/google-one-tap', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ credential: tokenResponse.access_token }),
                });
                const data = await res.json();
                if (data.success) {
                  window.location.href = data.redirect || '/resident';
                } else {
                  setError(data.error || 'Google Sign-Up failed.');
                }
              } catch (err) {
                setError('An error occurred during Google registration.');
              } finally {
                setLoading(false);
              }
            } else if (tokenResponse?.error) {
              console.error('Google token error:', tokenResponse);
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (e) {
        console.warn('Google OAuth client init error:', e);
      }
    }

    // Fallback to OAuth redirect
    window.location.href = '/auth/google';
  };

  return (
    <div className="min-h-[calc(100vh-52px)] flex bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 transition-colors">
      {/* Left Column: Brand Showcase (Matches approved design) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 relative overflow-hidden bg-gradient-to-br from-brand-50 via-surface-100 to-indigo-50/40 dark:from-brand-950/40 dark:via-surface-950 dark:to-surface-950 p-12 xl:p-16 flex-col justify-between border-r border-surface-200/90 dark:border-white/5">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none"></div>
        <div className="glow-orb w-[400px] h-[400px] bg-brand-500/10 dark:bg-brand-600/15 -top-20 -left-20 animate-pulse-slow pointer-events-none"></div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group mb-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:shadow-brand-500/50 transition-all">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">{appConfig.appName}</span>
          </Link>

          <h1 className="text-4xl xl:text-5xl font-bold text-surface-900 dark:text-white mb-6 leading-tight font-heading">
            Join your<br />
            <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 dark:from-brand-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              digital community
            </span>
          </h1>

          <p className="text-base text-surface-600 dark:text-surface-200/60 max-w-md leading-relaxed mb-10">
            Create your account in seconds and start managing your society operations with modern, intuitive tools.
          </p>

          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500/15 to-brand-600/10 dark:from-brand-500/20 dark:to-brand-600/10 border border-brand-500/25 dark:border-brand-500/30 flex items-center justify-center shrink-0">
                <span className="text-base font-bold text-brand-600 dark:text-brand-400">1</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-surface-900 dark:text-white">Quick Setup</h4>
                <p className="text-xs text-surface-500 dark:text-surface-200/50">Create your account in under a minute</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500/15 to-brand-600/10 dark:from-brand-500/20 dark:to-brand-600/10 border border-brand-500/25 dark:border-brand-500/30 flex items-center justify-center shrink-0">
                <span className="text-base font-bold text-brand-600 dark:text-brand-400">2</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-surface-900 dark:text-white">Link Your Residence</h4>
                <p className="text-xs text-surface-500 dark:text-surface-200/50">Connect your flat or society ownership</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500/15 to-brand-600/10 dark:from-brand-500/20 dark:to-brand-600/10 border border-brand-500/25 dark:border-brand-500/30 flex items-center justify-center shrink-0">
                <span className="text-base font-bold text-brand-600 dark:text-brand-400">3</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-surface-900 dark:text-white">Instant Access</h4>
                <p className="text-xs text-surface-500 dark:text-surface-200/50">Pay dues via UPI and view transparent records</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-surface-500 dark:text-surface-200/40 pt-8 border-t border-surface-200/80 dark:border-white/5">
          <span>&copy; {new Date().getFullYear()} {appConfig.appName}</span>
          <span>All rights reserved</span>
        </div>
      </div>

      {/* Right Column: Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-6 text-center">
            <Link to="/" className="inline-flex items-center gap-2.5 group mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-500/25">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-surface-900 dark:text-white font-heading">{appConfig.appName}</span>
            </Link>
          </div>

          <div className="mb-6 text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white mb-1.5 font-heading">
              Create your account
            </h2>
            <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-200/60">
              Join your society's digital community today
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-surface-700 dark:text-surface-200/80 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-surface-400 dark:text-surface-200/30" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full h-11 bg-white dark:bg-white/[0.04] border border-surface-300 dark:border-white/10 rounded-xl pl-10 pr-4 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-700 dark:text-surface-200/80 mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-surface-400 dark:text-surface-200/30" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-11 bg-white dark:bg-white/[0.04] border border-surface-300 dark:border-white/10 rounded-xl pl-10 pr-4 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-700 dark:text-surface-200/80 mb-1">
                Mobile Number (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Phone className="w-4 h-4 text-surface-400 dark:text-surface-200/30" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full h-11 bg-white dark:bg-white/[0.04] border border-surface-300 dark:border-white/10 rounded-xl pl-10 pr-4 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-200/80 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-3.5 h-3.5 text-surface-400 dark:text-surface-200/30" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8+ characters"
                    className="w-full h-11 bg-white dark:bg-white/[0.04] border border-surface-300 dark:border-white/10 rounded-xl pl-9 pr-9 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-200/80 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-3.5 h-3.5 text-surface-400 dark:text-surface-200/30" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full h-11 bg-white dark:bg-white/[0.04] border border-surface-300 dark:border-white/10 rounded-xl pl-9 pr-3 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="terms"
                required
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-surface-300 dark:border-white/20 bg-white dark:bg-white/5 text-brand-500 focus:ring-brand-500/30 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-surface-600 dark:text-surface-200/60 leading-snug cursor-pointer">
                I agree to the <span className="text-brand-600 dark:text-brand-400 underline">Terms of Service</span> and <span className="text-brand-600 dark:text-brand-400 underline">Privacy Policy</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 active:scale-95 transition-all cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-200 dark:border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-surface-50 dark:bg-surface-950 text-[11px] text-surface-500 dark:text-surface-200/40 uppercase tracking-wider">
                or sign up with
              </span>
            </div>
          </div>

          {/* Google Sign Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="flex items-center justify-center gap-3 w-full h-11 bg-white dark:bg-white/[0.04] hover:bg-surface-50 dark:hover:bg-white/[0.08] border border-surface-200 dark:border-white/10 rounded-xl text-surface-800 dark:text-white font-medium text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Sign up with Google</span>
          </button>

          <p className="text-center text-xs text-surface-600 dark:text-surface-200/50 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 dark:text-brand-400 hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
