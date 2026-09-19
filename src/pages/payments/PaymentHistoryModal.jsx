import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { paymentsApi } from '../../api/payments';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatMoney, formatDate } from '../../utils/format';

const METHOD_LABELS = {
  CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer',
  MOBILE_MONEY: 'Mobile Money', CHEQUE: 'Cheque', OTHER: 'Other',
};

export function PaymentHistoryModal({ type, transactionId, transactionNumber, onClose }) {
  const queryClient = useQueryClient();
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidError,  setVoidError]  = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['payment-history', type, transactionId],
    queryFn:  () =>
      type === 'purchase'
        ? paymentsApi.forPurchase(transactionId)
        : paymentsApi.forSale(transactionId),
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }) => paymentsApi.void(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-history', type, transactionId] });
      queryClient.invalidateQueries({ queryKey: ['payments-outstanding-ap'] });
      queryClient.invalidateQueries({ queryKey: ['payments-outstanding-ar'] });
      queryClient.invalidateQueries({ queryKey: ['payments-due'] });
      setVoidTarget(null);
      setVoidReason('');
      setVoidError('');
    },
    onError: (err) => setVoidError(err?.response?.data?.error?.message || 'Void failed'),
  });

  if (isLoading) return <Modal open onClose={onClose} title="Payment History"><PageSpinner /></Modal>;

  const d        = data?.data;
  const payments = d?.payments || [];
  const summary  = d?.summary;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Payment History — ${transactionNumber}`}
      size="lg"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-center">
            <p className="text-xs text-slate-500">Total</p>
            <p className="font-bold text-slate-900 tabular-nums">{formatMoney(summary.totalAmount)}</p>
          </div>
          <div className="rounded-xl bg-success-50 border border-success-200 px-3 py-2.5 text-center">
            <p className="text-xs text-slate-500">Paid</p>
            <p className="font-bold text-success-700 tabular-nums">{formatMoney(summary.totalPaid)}</p>
          </div>
          <div className={`rounded-xl border px-3 py-2.5 text-center ${parseFloat(summary.remainingAmount) > 0 ? 'bg-danger-50 border-danger-200' : 'bg-success-50 border-success-200'}`}>
            <p className="text-xs text-slate-500">Remaining</p>
            <p className={`font-bold tabular-nums ${parseFloat(summary.remainingAmount) > 0 ? 'text-danger-600' : 'text-success-600'}`}>
              {formatMoney(summary.remainingAmount)}
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {summary && (
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-success-500 rounded-full transition-all"
            style={{
              width: `${Math.min(parseFloat(summary.totalPaid) / parseFloat(summary.totalAmount) * 100, 100)}%`,
            }}
          />
        </div>
      )}

      {/* Payment records */}
      {payments.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-8">No payments recorded yet</p>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${
                p.status === 'VOIDED'
                  ? 'bg-slate-50 border-slate-200 opacity-60'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {p.status === 'VOIDED'
                  ? <XCircle size={16} className="text-slate-400 shrink-0" />
                  : <CheckCircle2 size={16} className="text-success-500 shrink-0" />
                }
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(p.amount)}
                    </span>
                    <Badge variant="default">{METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</Badge>
                    {p.status === 'VOIDED' && <Badge variant="danger">VOIDED</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex gap-3">
                    <span>{formatDate(p.paymentDate)}</span>
                    {p.reference && <span>Ref: {p.reference}</span>}
                    {p.notes     && <span>{p.notes}</span>}
                  </div>
                  {p.status === 'VOIDED' && p.voidReason && (
                    <p className="text-xs text-danger-500 mt-0.5">Voided: {p.voidReason}</p>
                  )}
                </div>
              </div>

              {/* Void button — only for non-voided */}
              {p.status !== 'VOIDED' && (
                <button
                  onClick={() => { setVoidTarget(p.id); setVoidReason(''); setVoidError(''); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors shrink-0"
                  title="Void payment"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Void confirmation inline */}
      {voidTarget && (
        <div className="mt-4 rounded-xl border border-danger-200 bg-danger-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-danger-800">Void this payment?</p>
          <p className="text-xs text-danger-600">This cannot be undone. A voided payment returns the balance to outstanding.</p>
          {voidError && <Alert variant="danger" className="py-1.5 text-xs">{voidError}</Alert>}
          <textarea
            className="w-full rounded-lg border border-danger-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-danger-400"
            rows={2}
            placeholder="Reason for voiding (required)…"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              loading={voidMutation.isPending}
              disabled={!voidReason.trim()}
              onClick={() => voidMutation.mutate({ id: voidTarget, reason: voidReason })}
            >
              Confirm Void
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setVoidTarget(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
