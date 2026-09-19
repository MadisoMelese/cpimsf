import { format, parseISO } from 'date-fns';

/**
 * Format KG with 3 decimal places.
 */
export function formatKg(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (isNaN(n)) return '—';
  return `${n.toLocaleString('en-ET', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG`;
}

/**
 * Format money — defaults to ETB.
 */
export function formatMoney(value, currency = 'ETB') {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (isNaN(n)) return '—';
  return `${currency} ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a date string or Date.
 */
export function formatDate(value, fmt = 'dd MMM yyyy') {
  if (!value) return '—';
  try {
    const d = typeof value === 'string' ? parseISO(value) : new Date(value);
    return format(d, fmt);
  } catch {
    return String(value);
  }
}

export function formatDateTime(value) {
  return formatDate(value, 'dd MMM yyyy HH:mm');
}

export function formatPct(value, decimals = 2) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(decimals)}%`;
}

/** Format a grade label nicely: "1" → "Grade 1", "AA" → "Grade AA" */
export function formatGrade(grade) {
  if (!grade || grade === 'N/A') return 'Ungraded';
  return `Grade ${grade}`;
}

/** Returns a Tailwind color class for a coffee state badge */
export function stateColor(state) {
  const map = { WET: 'info', DRY: 'warning', HULLED: 'default', SORTED: 'primary', GRADED: 'success' };
  return map[state] || 'default';
}
