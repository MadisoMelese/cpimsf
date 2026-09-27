import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Coffee, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../../components/ui/Button';
import { parseApiError } from '../../utils/errors';
import { clsx } from 'clsx';

export default function LoginPage() {
  const navigate        = useNavigate();
  const { login }       = useAuth();
  const { t, lang, switchLang } = useLanguage();

  const [apiError,    setApiError]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [shake,       setShake]       = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    clearErrors,
  } = useForm({ mode: 'onTouched' });

  // Clear the server-level error as soon as the user edits any field
  function clearApiError() {
    if (apiError) setApiError('');
  }

  async function onSubmit({ email, password }) {
    setApiError('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = parseApiError(err, t('login.invalid'));
      setApiError(msg);
      // Shake animation to draw attention to the error
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  }

  // ─── Field registration with inline clear ────────────────────────────────
  const emailReg = register('email', {
    required: 'Email address is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Enter a valid email address',
    },
    onChange: clearApiError,
  });

  const passwordReg = register('password', {
    required: 'Password is required',
    minLength: { value: 1, message: 'Password is required' },
    onChange: clearApiError,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <Coffee size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CPIMS</h1>
          <p className="text-primary-200 text-sm mt-1">{t('login.tagline')}</p>
        </div>

        {/* Card */}
        <div
          className={clsx(
            'bg-white rounded-2xl shadow-lg p-8 transition-all',
            shake && 'animate-shake',
          )}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">{t('login.title')}</h2>
            <button
              type="button"
              onClick={switchLang}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {lang === 'en'
                ? <><span>🇪🇹</span> <span>አማርኛ</span></>
                : <><span>🇬🇧</span> <span>English</span></>}
            </button>
          </div>

          {/* ── API / server error ── */}
          {apiError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 mb-5"
            >
              <Lock size={16} className="shrink-0 mt-0.5 text-danger-500" aria-hidden="true" />
              <p className="text-sm text-danger-700 flex-1">{apiError}</p>
              <button
                type="button"
                onClick={() => setApiError('')}
                className="shrink-0 text-danger-400 hover:text-danger-600 transition-colors"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                {t('login.email')}
                <span className="ml-0.5 text-danger-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Mail size={15} className={clsx('transition-colors', errors.email ? 'text-danger-400' : 'text-slate-400')} />
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder={t('login.emailHint')}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={clsx(
                    'block w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
                    'focus:outline-none focus:ring-2 transition-colors',
                    errors.email
                      ? 'border-danger-500 bg-danger-50 focus:ring-danger-500 focus:border-danger-500'
                      : 'border-slate-300 bg-white focus:ring-primary-500 focus:border-primary-500',
                  )}
                  {...emailReg}
                />
              </div>
              {errors.email && (
                <p id="email-error" role="alert" className="text-xs text-danger-600 flex items-center gap-1">
                  <span aria-hidden="true">⚠</span> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                {t('login.password')}
                <span className="ml-0.5 text-danger-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Lock size={15} className={clsx('transition-colors', errors.password ? 'text-danger-400' : 'text-slate-400')} />
                </span>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={clsx(
                    'block w-full rounded-lg border pl-9 pr-10 py-2.5 text-sm text-slate-900',
                    'focus:outline-none focus:ring-2 transition-colors',
                    errors.password
                      ? 'border-danger-500 bg-danger-50 focus:ring-danger-500 focus:border-danger-500'
                      : 'border-slate-300 bg-white focus:ring-primary-500 focus:border-primary-500',
                  )}
                  {...passwordReg}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="text-xs text-danger-600 flex items-center gap-1">
                  <span aria-hidden="true">⚠</span> {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              className="w-full"
            >
              {t('login.signIn')}
            </Button>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-primary-300 text-xs mt-6">
          © {new Date().getFullYear()} CPIMS — {t('login.copyright')}
        </p>
      </div>
    </div>
  );
}
