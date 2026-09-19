import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Coffee } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';

export default function LoginPage() {
  const navigate        = useNavigate();
  const { login }       = useAuth();
  const { t, lang, switchLang } = useLanguage();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  async function onSubmit({ email, password }) {
    setError('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error?.message || t('login.invalid'));
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
          <p className="text-primary-200 text-sm mt-1">{t('login.tagline')}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">{t('login.title')}</h2>
            {/* Language switcher on login page too */}
            <button
              onClick={() => switchLang()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {lang === 'en' ? <><span>🇪🇹</span> <span>አማርኛ</span></> : <><span>🇬🇧</span> <span>English</span></>}
            </button>
          </div>

          {error && (
            <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label={t('login.email')}
              type="email"
              required
              autoComplete="email"
              autoFocus
              placeholder={t('login.emailHint')}
              error={errors.email?.message}
              {...register('email', {
                required: `${t('login.email')} ${t('common.required')}`,
                pattern:  { value: /\S+@\S+\.\S+/, message: t('login.email') },
              })}
            />
            <Input
              label={t('login.password')}
              type="password"
              required
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password', { required: `${t('login.password')} ${t('common.required')}` })}
            />
            <Button type="submit" size="lg" loading={isSubmitting} className="w-full mt-2">
              {t('login.signIn')}
            </Button>
          </form>
        </div>

        <p className="text-center text-primary-300 text-xs mt-6">
          © {new Date().getFullYear()} CPIMS — {t('login.copyright')}
        </p>
      </div>
    </div>
  );
}
