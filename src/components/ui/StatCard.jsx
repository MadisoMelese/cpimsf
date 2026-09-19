import { clsx } from 'clsx';

export function StatCard({ label, value, sub, icon: Icon, trend, color = 'primary', className }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    danger:  'bg-danger-50 text-danger-600',
    info:    'bg-info-50 text-info-600',
  };

  return (
    <div className={clsx('bg-white rounded-xl border border-slate-200 shadow-sm p-5', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
          {trend !== undefined && (
            <p className={clsx('mt-1 text-xs font-medium', trend >= 0 ? 'text-success-600' : 'text-danger-600')}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className={clsx('rounded-xl p-2.5', colors[color])}>
            <Icon size={20} aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}
