import { clsx } from 'clsx';
import { useLanguage } from '../../context/LanguageContext';

const variants = {
  default:  'bg-slate-100 text-slate-700',
  primary:  'bg-primary-100 text-primary-700',
  success:  'bg-success-50 text-success-600',
  warning:  'bg-warning-50 text-warning-600',
  danger:   'bg-danger-50 text-danger-700',
  info:     'bg-info-50 text-info-600',
};

// Map domain status values to badge variants
const STATUS_VARIANT_MAP = {
  DRAFT:                'default',
  SUBMITTED:            'info',
  VERIFIED:             'primary',
  APPROVED:             'success',
  REJECTED:             'danger',
  CONFIRMED:            'success',
  CANCELLED:            'danger',
  ACTIVE:               'success',
  CONSUMED:             'default',
  PARTIALLY_CONSUMED:   'warning',
  COMPLETED:            'success',
  IN_PROGRESS:          'info',
  OPEN:                 'info',
  PENDING_ADJUSTMENTS:  'warning',
  CLOSED:               'default',
  PENDING:              'warning',
  ACCOUNTED:            'info',
  SYNCED:               'success',
  CONFLICT:             'danger',
  FAILED:               'danger',
  VOIDED:               'default',
  WET:                  'info',
  DRY:                  'warning',
  HULLED:               'default',
  SORTED:               'primary',
  GRADED:               'success',
};

export function Badge({ children, variant, status, className }) {
  // When used with status prop, auto-translate the label
  const { t } = useLanguage();

  const resolvedVariant = variant || STATUS_VARIANT_MAP[status] || 'default';
  const label = children ?? (status ? (t(`status.${status}`) || status) : null);

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[resolvedVariant],
        className,
      )}
    >
      {label}
    </span>
  );
}
