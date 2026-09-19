import { clsx } from 'clsx';

export function Table({ children, className }) {
  return (
    <div className="overflow-x-auto">
      <table className={clsx('w-full text-sm text-left', className)}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
      {children}
    </thead>
  );
}

export function Th({ children, className }) {
  return (
    <th className={clsx('px-4 py-3 font-medium whitespace-nowrap', className)}>
      {children}
    </th>
  );
}

export function Tbody({ children }) {
  return (
    <tbody className="divide-y divide-slate-100">
      {children}
    </tbody>
  );
}

export function Tr({ children, className, onClick }) {
  return (
    <tr
      className={clsx(
        'hover:bg-slate-50 transition-colors',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }) {
  return (
    <td className={clsx('px-4 py-3 text-slate-700', className)}>
      {children}
    </td>
  );
}

export function TableEmpty({ message = 'No records found', colSpan = 10 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-slate-400 text-sm">
        {message}
      </td>
    </tr>
  );
}
