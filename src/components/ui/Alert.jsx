import { clsx } from 'clsx';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

const variants = {
  info:    { bg: 'bg-info-50 border-info-200',    text: 'text-info-700',    icon: Info,           iconClass: 'text-info-500' },
  success: { bg: 'bg-success-50 border-success-200', text: 'text-success-700', icon: CheckCircle2, iconClass: 'text-success-500' },
  warning: { bg: 'bg-warning-50 border-warning-200', text: 'text-warning-700', icon: AlertTriangle, iconClass: 'text-warning-500' },
  danger:  { bg: 'bg-danger-50 border-danger-200',   text: 'text-danger-700',  icon: AlertCircle,  iconClass: 'text-danger-500' },
};

export function Alert({ variant = 'info', title, children, onDismiss, className }) {
  const v = variants[variant];
  const Icon = v.icon;

  return (
    <div className={clsx('flex gap-3 rounded-xl border p-4', v.bg, className)} role="alert">
      <Icon size={18} className={clsx('shrink-0 mt-0.5', v.iconClass)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && <p className={clsx('text-sm font-medium', v.text)}>{title}</p>}
        {children && <div className={clsx('text-sm mt-1', v.text)}>{children}</div>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className={clsx('shrink-0', v.text, 'hover:opacity-70')} aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
