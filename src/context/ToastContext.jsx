import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';
import { registerToastFn } from '../api/client';

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

// ─── Types ────────────────────────────────────────────────────────────────────

const VARIANTS = {
  success: {
    bar:  'bg-success-500',
    icon: CheckCircle2,
    iconClass: 'text-success-500',
    title: 'text-slate-900',
    body:  'text-slate-500',
    bg:    'bg-white',
    border:'border-slate-200',
  },
  error: {
    bar:  'bg-danger-500',
    icon: AlertCircle,
    iconClass: 'text-danger-500',
    title: 'text-slate-900',
    body:  'text-slate-500',
    bg:    'bg-white',
    border:'border-slate-200',
  },
  warning: {
    bar:  'bg-warning-500',
    icon: AlertTriangle,
    iconClass: 'text-warning-500',
    title: 'text-slate-900',
    body:  'text-slate-500',
    bg:    'bg-white',
    border:'border-slate-200',
  },
  info: {
    bar:  'bg-info-500',
    icon: Info,
    iconClass: 'text-info-500',
    title: 'text-slate-900',
    body:  'text-slate-500',
    bg:    'bg-white',
    border:'border-slate-200',
  },
};

const DEFAULT_DURATION = {
  success: 3500,
  error:   6000,
  warning: 5000,
  info:    4000,
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, removing: true } : t)),
    );
    // Remove from DOM after the exit animation finishes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 350);
  }, []);

  const toast = useCallback(
    (variant, message, { title, duration } = {}) => {
      const id = ++counterRef.current;
      const ms = duration ?? DEFAULT_DURATION[variant] ?? 4000;

      setToasts((prev) => [...prev, { id, variant, message, title, removing: false }]);

      if (ms > 0) {
        setTimeout(() => dismiss(id), ms);
      }

      return id;
    },
    [dismiss],
  );

  // Convenience methods
  const success = useCallback((msg, opts) => toast('success', msg, opts), [toast]);
  const error   = useCallback((msg, opts) => toast('error',   msg, opts), [toast]);
  const warning = useCallback((msg, opts) => toast('warning', msg, opts), [toast]);
  const info    = useCallback((msg, opts) => toast('info',    msg, opts), [toast]);

  // Wire the API client's global error toasts to this context
  useEffect(() => {
    registerToastFn(toast);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── UI ───────────────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 w-[360px] max-w-[calc(100vw-2.5rem)]"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }) {
  const v = VARIANTS[t.variant] ?? VARIANTS.info;
  const Icon = v.icon;

  return (
    <div
      role="alert"
      className={clsx(
        'relative flex items-start gap-3 rounded-xl border shadow-lg px-4 py-3 overflow-hidden',
        'transition-all duration-300',
        v.bg,
        v.border,
        t.removing
          ? 'opacity-0 translate-x-6 pointer-events-none'
          : 'opacity-100 translate-x-0',
      )}
    >
      {/* Left colour bar */}
      <span className={clsx('absolute left-0 inset-y-0 w-1 rounded-l-xl', v.bar)} aria-hidden="true" />

      {/* Icon */}
      <Icon size={18} className={clsx('shrink-0 mt-0.5 ml-1', v.iconClass)} aria-hidden="true" />

      {/* Body */}
      <div className="flex-1 min-w-0">
        {t.title && (
          <p className={clsx('text-sm font-semibold leading-snug', v.title)}>{t.title}</p>
        )}
        <p className={clsx('text-sm leading-snug', t.title ? v.body : v.title)}>{t.message}</p>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 mt-0.5 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  );
}
