import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, 
  User,
  Mail, 
  Phone,
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  WifiOff, 
  Smartphone, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import CustomCheckbox from '../../components/common/CustomCheckbox';
import DeveloperCredits from '../../components/common/DeveloperCredits';

export default function LoginPage() {
  const { login, appConfig } = useAuth();
  const { showAlert } = useModal();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchParams = new URLSearchParams(location.search);
  const returnUrl = searchParams.get('return_url');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginId || !password) {
      setError('Please enter your email address or mobile number, and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(loginId, password, remember);
      if (res?.needs_mobile) {
        navigate('/profile');
      } else if (returnUrl) {
        navigate(returnUrl);
      } else {
        navigate(res.redirect || (res.user?.role === 'admin' ? '/admin' : '/resident'));
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    const clientId = appConfig?.googleClientId;
    if (!clientId) {
      showAlert({
        title: 'Google Sign-In',
        message: 'Google Sign-In is not configured yet on this platform.',
        variant: 'info',
      });
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
                  if (data.needs_mobile || data.redirect === '/profile') {
                    window.location.href = '/profile';
                  } else {
                    window.location.href = data.redirect || (returnUrl || '/resident');
                  }
                } else {
                  setError(data.error || 'Google Sign-In failed.');
                }
              } catch (err) {
                setError('An error occurred during Google authentication.');
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
      {/* Left Column: Brand Showcase (Desktop only, matches older approved design) */}
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
            Your digital<br />
            <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 dark:from-brand-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              community hub
            </span>
          </h1>

          <p className="text-base text-surface-600 dark:text-surface-200/60 max-w-md leading-relaxed mb-10">
            Manage your society seamlessly with enterprise-grade tools for maintenance, automated UPI collections, and real-time community engagement.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/25 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm text-surface-700 dark:text-surface-200/80 font-medium">Bank-grade security with end-to-end encryption</span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 dark:bg-brand-500/20 border border-brand-500/25 dark:border-brand-500/30 flex items-center justify-center shrink-0">
                <WifiOff className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <span className="text-sm text-surface-700 dark:text-surface-200/80 font-medium">Works offline with instant sync</span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 dark:bg-purple-500/20 border border-purple-500/25 dark:border-purple-500/30 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-surface-700 dark:text-surface-200/80 font-medium">Modern responsive web app for any device</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-surface-500 dark:text-surface-200/40 pt-8 border-t border-surface-200/80 dark:border-white/5">
          <DeveloperCredits linkClassName="text-surface-700 dark:text-surface-200/70" />
          <span>All rights reserved</span>
        </div>
      </div>

      {/* Right Column: Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2.5 group mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-500/25">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-surface-900 dark:text-white font-heading">{appConfig.appName}</span>
            </Link>
          </div>

          <div className="mb-8 text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white mb-2 font-heading">
              Welcome back
            </h2>
            <p className="text-sm text-surface-600 dark:text-surface-200/60">
              Sign in to your account to continue
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login" className="block text-xs font-medium text-surface-700 dark:text-surface-200/80 mb-1.5">
                Email address or Mobile number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-surface-400 dark:text-surface-200/30" />
                </div>
                <input
                  type="text"
                  id="login"
                  name="login"
                  autoComplete="username"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="name@example.com or 9876543210"
                  className="w-full h-12 bg-white dark:bg-white/[0.04] border border-surface-300 dark:border-white/10 rounded-xl pl-10 pr-4 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-surface-700 dark:text-surface-200/80">
                  Password
                </label>
                <Link to="/reset-password" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-surface-400 dark:text-surface-200/30" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-12 bg-white dark:bg-white/[0.04] border border-surface-300 dark:border-white/10 rounded-xl pl-10 pr-11 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <CustomCheckbox
                checked={remember}
                onChange={(e, val) => setRemember(val !== undefined ? val : e.target.checked)}
                label="Remember me for 30 days"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 active:scale-95 transition-all cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign in to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-200 dark:border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-surface-50 dark:bg-surface-950 text-[11px] text-surface-500 dark:text-surface-200/40 uppercase tracking-wider">
                or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center gap-3 w-full h-12 bg-white dark:bg-white/[0.04] hover:bg-surface-50 dark:hover:bg-white/[0.08] border border-surface-200 dark:border-white/10 rounded-xl text-surface-800 dark:text-white font-medium text-sm transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <p className="text-center text-xs text-surface-600 dark:text-surface-200/50 mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 dark:text-brand-400 hover:underline font-semibold">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
