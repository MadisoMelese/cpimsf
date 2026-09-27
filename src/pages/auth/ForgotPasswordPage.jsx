import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Coffee, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../api/auth';
import { parseApiError } from '../../utils/errors';
import { Button } from '../../components/ui/Button';
import { clsx } from 'clsx';

export default function ForgotPasswordPage() {
  const [sent,     setSent]     = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  async function onSubmit({ email }) {
    setApiError('');
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setApiError(parseApiError(err, 'Something went wrong. Please try again.'));
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

          {sent ? (
            /* ── Success state ── */
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50">
                <CheckCircle2 size={28} className="text-success-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Check your email</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                If <strong>{getValues('email')}</strong> is registered, we've sent a password reset link.
                Check your inbox and follow the instructions.
              </p>
              <p className="text-xs text-slate-400">
                The link expires in 30 minutes. Check your spam folder if you don't see it.
              </p>
              <Link
                to="/login"
                className="mt-2 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Forgot your password?</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter your email address and we'll send you a reset link.
                </p>
              </div>

              {apiError && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 mb-5">
                  <p className="text-sm text-danger-700 flex-1">{apiError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Email address <span className="text-danger-500">*</span>
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
                      placeholder="you@example.com"
                      aria-invalid={!!errors.email}
                      className={clsx(
                        'block w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
                        'focus:outline-none focus:ring-2 transition-colors',
                        errors.email
                          ? 'border-danger-500 bg-danger-50 focus:ring-danger-500'
                          : 'border-slate-300 bg-white focus:ring-primary-500 focus:border-primary-500',
                      )}
                      {...register('email', {
                        required: 'Email address is required',
                        pattern:  { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
                      })}
                    />
                  </div>
                  {errors.email && (
                    <p role="alert" className="text-xs text-danger-600">⚠ {errors.email.message}</p>
                  )}
                </div>

                <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
                  Send reset link
                </Button>
              </form>

              <div className="mt-5 text-center">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                  <ArrowLeft size={13} /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
