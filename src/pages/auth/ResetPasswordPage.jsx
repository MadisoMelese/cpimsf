import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Coffee, Eye, EyeOff, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { authApi } from '../../api/auth';
import { parseApiError } from '../../utils/errors';
import { Button } from '../../components/ui/Button';
import { clsx } from 'clsx';

export default function ResetPasswordPage() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const token           = searchParams.get('token') || '';

  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done,        setDone]        = useState(false);
  const [apiError,    setApiError]    = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  const password = watch('password', '');

  // If no token in URL, show error immediately
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-50">
            <AlertTriangle size={28} className="text-danger-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Invalid reset link</h2>
          <p className="text-sm text-slate-500">This link is missing a reset token. Please request a new one.</p>
          <Link to="/forgot-password" className="inline-block text-sm text-primary-600 hover:text-primary-700 font-medium">
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit({ password: newPassword }) {
    setApiError('');
    try {
      await authApi.resetPassword({ token, password: newPassword });
      setDone(true);
    } catch (err) {
      setApiError(parseApiError(err, 'This reset link is invalid or has expired.'));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <Coffee size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CPIMS</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">

          {done ? (
            /* ── Success state ── */
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50">
                <CheckCircle2 size={28} className="text-success-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Password updated</h2>
              <p className="text-sm text-slate-500">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <Button className="w-full mt-2" onClick={() => navigate('/login')}>
                Sign in
              </Button>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Set new password</h2>
                <p className="text-sm text-slate-500 mt-1">Choose a strong password for your account.</p>
              </div>

              {apiError && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 mb-5">
                  <Lock size={15} className="shrink-0 mt-0.5 text-danger-500" />
                  <div className="flex-1">
                    <p className="text-sm text-danger-700">{apiError}</p>
                    <Link to="/forgot-password" className="text-xs text-danger-600 underline mt-1 inline-block">
                      Request a new reset link
                    </Link>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

                {/* New password */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
                    New password <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Lock size={15} className={clsx('transition-colors', errors.password ? 'text-danger-400' : 'text-slate-400')} />
                    </span>
                    <input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      autoFocus
                      autoComplete="new-password"
                      aria-invalid={!!errors.password}
                      className={clsx(
                        'block w-full rounded-lg border pl-9 pr-10 py-2.5 text-sm text-slate-900',
                        'focus:outline-none focus:ring-2 transition-colors',
                        errors.password
                          ? 'border-danger-500 bg-danger-50 focus:ring-danger-500'
                          : 'border-slate-300 bg-white focus:ring-primary-500 focus:border-primary-500',
                      )}
                      {...register('password', {
                        required:  'Password is required',
                        minLength: { value: 8, message: 'Password must be at least 8 characters' },
                      })}
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowPass(v => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p role="alert" className="text-xs text-danger-600">⚠ {errors.password.message}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm" className="text-sm font-medium text-slate-700">
                    Confirm new password <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Lock size={15} className={clsx('transition-colors', errors.confirm ? 'text-danger-400' : 'text-slate-400')} />
                    </span>
                    <input
                      id="confirm"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      aria-invalid={!!errors.confirm}
                      className={clsx(
                        'block w-full rounded-lg border pl-9 pr-10 py-2.5 text-sm text-slate-900',
                        'focus:outline-none focus:ring-2 transition-colors',
                        errors.confirm
                          ? 'border-danger-500 bg-danger-50 focus:ring-danger-500'
                          : 'border-slate-300 bg-white focus:ring-primary-500 focus:border-primary-500',
                      )}
                      {...register('confirm', {
                        required: 'Please confirm your password',
                        validate: (v) => v === password || 'Passwords do not match',
                      })}
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.confirm && (
                    <p role="alert" className="text-xs text-danger-600">⚠ {errors.confirm.message}</p>
                  )}
                </div>

                <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
                  Set new password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
