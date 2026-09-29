import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from '../../api/purchases';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatKg, formatMoney, formatDate, formatDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { newOperationId } from '../../utils/operationId';
import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { RecordPaymentModal } from '../payments/RecordPaymentModal';
import { parseApiError } from '../../utils/errors';

export function PurchaseDetailModal({ id, onClose }) {
  const { t } = useLanguage();
  const queryClient      = useQueryClient();
  const { isBossOrAdmin } = useAuth();
  const [error, setError]         = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject]     = useState(false);
  const [showPayment, setShowPayment]   = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase', id],
    queryFn:  () => purchasesApi.get(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['purchases'] });
    queryClient.invalidateQueries({ queryKey: ['purchase', id] });
    queryClient.invalidateQueries({ queryKey: ['payments-outstanding-ap'] });
  };

  const submitMutation  = useMutation({ mutationFn: () => purchasesApi.submit(id),  onSuccess: invalidate, onError: (e) => setError(parseApiError(e)) });
  const verifyMutation  = useMutation({ mutationFn: () => purchasesApi.verify(id),  onSuccess: invalidate, onError: (e) => setError(parseApiError(e)) });
  const approveMutation = useMutation({ mutationFn: () => purchasesApi.approve(id, { operationId: newOperationId() }), onSuccess: invalidate, onError: (e) => setError(parseApiError(e)) });
  const rejectMutation  = useMutation({ mutationFn: () => purchasesApi.reject(id, { reason: rejectReason }), onSuccess: () => { invalidate(); setShowReject(false); }, onError: (e) => setError(parseApiError(e)) });

  if (isLoading) return <Modal open onClose={onClose} title="Purchase"><PageSpinner /></Modal>;

  const p = data?.data;
  if (!p) return null;

  const totalKg  = p.items?.reduce((a, i) => a + parseFloat(i.quantityKg || 0), 0) || 0;
  const totalAmt = p.items?.reduce((a, i) => a + parseFloat(i.totalPrice  || 0), 0) || 0;
  const totalPaid = p.payments
    ?.filter(py => py.status === 'COMPLETED')
    .reduce((a, py) => a + parseFloat(py.amount || 0), 0) || 0;
  const remaining = totalAmt - totalPaid;
  const isPaid    = remaining <= 0.005;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Purchase ${p.purchaseNumber}`}
      size="lg"
      footer={
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 flex gap-2">
            {p.status === 'DRAFT' && (
              <Button size="sm" onClick={() => submitMutation.mutate()} loading={submitMutation.isPending}>
                Submit for Verification
              </Button>
            )}
            {p.status === 'SUBMITTED' && isBossOrAdmin && (
              <Button size="sm" onClick={() => verifyMutation.mutate()} loading={verifyMutation.isPending}>
                Mark Verified
              </Button>
            )}
            {p.status === 'VERIFIED' && isBossOrAdmin && (
              <>
                <Button size="sm" onClick={() => approveMutation.mutate()} loading={approveMutation.isPending}>
                  Approve &amp; Create Stock
                </Button>
                <Button size="sm" variant="danger" onClick={() => setShowReject(true)}>
                  Reject
                </Button>
              </>
            )}
            {/* Pay button — only for approved purchases with outstanding balance */}
            {p.status === 'APPROVED' && isBossOrAdmin && !isPaid && (
              <Button size="sm" variant="primary" onClick={() => setShowPayment(true)}>
                Record Payment
              </Button>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.close')}</Button>
        </div>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}

      {/* Header info */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
        <div><span className="text-slate-500">Agent:</span> <span className="font-medium">{p.agent?.name}</span></div>
        <div><span className="text-slate-500">Location:</span> <span className="font-medium">{p.location?.name}</span></div>
        <div><span className="text-slate-500">Date:</span> <span className="font-medium">{formatDate(p.purchaseDate)}</span></div>
        <div><span className="text-slate-500">Status:</span> <Badge status={p.status} /></div>
        <div><span className="text-slate-500">Credit Terms:</span> <span className="font-medium">{p.creditTerms}</span></div>
        {p.creditDueDate && <div><span className="text-slate-500">Due Date:</span> <span className="font-medium">{formatDate(p.creditDueDate)}</span></div>}
      </div>
      {/* Items table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden mb-5">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Coffee Type</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Quantity</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Unit Price</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {p.items?.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2.5">{item.coffeeType?.name}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatKg(item.quantityKg)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(item.unitPriceKg)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatMoney(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr>
              <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-right">Total</td>
              <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatKg(totalKg)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatMoney(totalAmt)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Batches created */}
      {p.batches?.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">{t('purchases.createdBatches')}</p>
          <div className="space-y-1">
            {p.batches.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-primary-700">{b.batchCode}</span>
                <span className="tabular-nums text-slate-600">{formatKg(b.remainingKg)} remaining</span>
                <Badge status={b.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject reason input */}
      {showReject && (
        <div className="mt-4 space-y-3">
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-danger-500"
            rows={3}
            placeholder="Reason for rejection (required)…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="danger" loading={rejectMutation.isPending} disabled={!rejectReason.trim()}
              onClick={() => rejectMutation.mutate()}>
              Confirm Rejection
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowReject(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Payment summary — only for approved purchases */}
      {p.status === 'APPROVED' && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Total amount</span>
            <span className="font-medium tabular-nums">{formatMoney(totalAmt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total paid</span>
            <span className="font-medium text-success-600 tabular-nums">{formatMoney(totalPaid)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5">
            <span className="font-medium text-slate-700">Outstanding balance</span>
            <span className={`font-bold tabular-nums ${isPaid ? 'text-success-600' : 'text-danger-600'}`}>
              {isPaid ? '✓ Fully paid' : formatMoney(remaining)}
            </span>
          </div>
        </div>
      )}

      {/* Record Payment modal */}
      {showPayment && (
        <RecordPaymentModal
          type="purchase"
          transactionId={p.id}
          transactionNumber={p.purchaseNumber}
          remainingAmount={remaining}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            invalidate();
            queryClient.invalidateQueries({ queryKey: ['agent-stats', p.agentId] });
          }}
        />
      )}
    </Modal>
  );
}
