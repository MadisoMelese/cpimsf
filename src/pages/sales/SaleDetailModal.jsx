import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../../api/sales';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatKg, formatMoney, formatDate, stateColor, formatGrade } from '../../utils/format';
import { parseApiError } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';
import { newOperationId } from '../../utils/operationId';
import { useLanguage } from '../../context/LanguageContext';

export function SaleDetailModal({ id, onClose }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [error, setError]           = useState('');
  const [confirming, setConfirming] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn:  () => salesApi.get(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['sale', id] });
  };

  const confirmMutation = useMutation({
    mutationFn: () => salesApi.confirm(id, { operationId: newOperationId() }),
    onSuccess: () => { invalidate(); setConfirming(false); toast.success('Sale confirmed.'); },
    onError: (err) => setError(parseApiError(err, 'Confirm failed')),
  });

  const cancelMutation = useMutation({
    mutationFn: () => salesApi.cancel(id),
    onSuccess: () => { invalidate(); onClose(); toast.success('Sale cancelled.'); },
    onError: (err) => setError(parseApiError(err, 'Cancel failed')),
  });

  if (isLoading) return <Modal open onClose={onClose} title="Sale"><PageSpinner /></Modal>;

  const s = data?.data;
  if (!s) return null;

  const totalKg     = s.items?.reduce((a, i) => a + parseFloat(i.quantityKg || 0), 0) || 0;
  const totalSale   = s.items?.reduce((a, i) => a + parseFloat(i.saleAmount  || 0), 0) || 0;
  const totalCost   = s.items?.reduce((a, i) => a + parseFloat(i.costAmount  || 0), 0) || 0;
  const totalMargin = totalSale - totalCost;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Sale ${s.saleNumber}`}
      size="xl"
      footer={
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 flex gap-2">
            {s.status === 'DRAFT' && (
              <>
                {!confirming ? (
                  <Button onClick={() => setConfirming(true)}>
                    Confirm Sale & Consume Stock
                  </Button>
                ) : (
                  <>
                    <Alert variant="warning" className="flex-1 py-2 text-xs">
                      This will permanently consume the selected batches. Cannot be undone.
                    </Alert>
                    <Button
                      loading={confirmMutation.isPending}
                      onClick={() => confirmMutation.mutate()}
                    >
                      Yes, Confirm
                    </Button>
                    <Button variant="secondary" onClick={() => setConfirming(false)}>Cancel</Button>
                  </>
                )}
                <Button
                  variant="danger"
                  loading={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                >
                  Cancel Sale
                </Button>
              </>
            )}
          </div>
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
        </div>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}

      {/* Header info */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-5 text-sm">
        <div><span className="text-slate-500">Customer:</span> <span className="font-medium">{s.agent?.name}</span></div>
        <div><span className="text-slate-500">Date:</span> <span className="font-medium">{formatDate(s.saleDate)}</span></div>
        <div><span className="text-slate-500">Status:</span> <Badge status={s.status} /></div>
        <div><span className="text-slate-500">Terms:</span> <span className="font-medium">{s.creditTerms}</span></div>
        {s.creditDueDate && (
          <div><span className="text-slate-500">Due Date:</span> <span className="font-medium">{formatDate(s.creditDueDate)}</span></div>
        )}
      </div>

      {/* Items table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden mb-5">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Batch</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Type / Grade</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Qty KG</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Sale Price/KG</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Sale Amount</th>
              {s.status === 'CONFIRMED' && (
                <>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Cost/KG</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Margin</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {s.items?.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2.5 font-mono text-xs text-primary-700">
                  {item.batch?.batchCode}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-700">{item.batch?.coffeeType?.name}</span>
                    <Badge variant={stateColor(item.batch?.coffeeType?.state)} className="text-[10px] px-1.5 py-0">
                      {item.batch?.coffeeType?.state}
                    </Badge>
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      {formatGrade(item.batch?.coffeeType?.grade)}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatKg(item.quantityKg)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(item.unitSalePrice)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatMoney(item.saleAmount)}</td>
                {s.status === 'CONFIRMED' && (
                  <>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 text-xs">
                      {formatMoney(item.unitCostKg)}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${parseFloat(item.grossMargin) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                      {formatMoney(item.grossMargin)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          {/* Totals footer */}
          <tfoot className="bg-slate-50 border-t border-slate-200 text-sm font-semibold">
            <tr>
              <td colSpan={s.status === 'CONFIRMED' ? 2 : 2} className="px-4 py-2.5 text-slate-500">Total</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatKg(totalKg)}</td>
              <td className="px-4 py-2.5"></td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(totalSale)}</td>
              {s.status === 'CONFIRMED' && (
                <>
                  <td className="px-4 py-2.5"></td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${totalMargin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    {formatMoney(totalMargin)}
                  </td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payments if any */}
      {s.payments?.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">{t('sales.payments')}</p>
          <div className="space-y-1">
            {s.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-success-50 border border-success-200 px-3 py-2 text-sm">
                <span>{formatDate(p.paymentDate)} · {p.paymentMethod}</span>
                <span className="font-semibold text-success-700">{formatMoney(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
