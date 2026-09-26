import { Link, useLocation } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export default function NotFoundPage() {
  const location = useLocation();
  const { user }  = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      {/* Card */}
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm px-10 py-12 text-center">

        {/* Illustration */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 ring-8 ring-primary-50/60">
          <Compass size={40} className="text-primary-500" strokeWidth={1.5} />
        </div>

        {/* Code */}
        <p className="text-8xl font-black tracking-tighter text-primary-100 select-none leading-none mb-4">
          404
        </p>

        {/* Heading & description */}
        <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          The page{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-600">
            {location.pathname}
          </code>{' '}
          doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="secondary" onClick={() => window.history.back()}>
            <ArrowLeft size={15} /> Go back
          </Button>
          <Button as={Link} to={user ? '/' : '/login'}>
            <Home size={15} />
            {user ? 'Dashboard' : 'Sign in'}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-slate-400">CPIMS © {new Date().getFullYear()}</p>
    </div>
  );
}
