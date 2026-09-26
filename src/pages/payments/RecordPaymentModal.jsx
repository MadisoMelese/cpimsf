import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { paymentsApi } from '../../api/payments';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { formatMoney } from '../../utils/format';
import { parseApiError } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';
import { newOperationId } from '../../utils/operationId';
import { useLanguage } from '../../context/LanguageContext';

const METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'OTHER'];

const METHOD_LABELS = {
  CASH:          'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  MOBILE_MONEY:  'Mobile Money (Telebirr / M-Pesa)',
  CHEQUE:        'Cheque',
  OTHER:         'Other',
};

export function RecordPaymentModal({ type, transactionId, transactionNumber, remainingAmount, onClose, onSuccess }) {
  const { t } = useLanguage();
  const toast = useToast();
  const isAP = type === 'purchase';  // AP = paying supplier, AR = receiving from customer
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      paymentDate:   new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH',
      amount:        parseFloat(remainingAmount || 0).toFixed(2),
      currency:      'ETB',
    },
  });

  const amount    = parseFloat(watch('amount') || 0);
  const remaining = parseFloat(remainingAmount || 0);
  const overpaid  = amount > remaining + 0.005; // tiny tolerance for float display

  const mutation = useMutation({
    mutationFn: (data) =>
      isAP
        ? paymentsApi.payPurchase(transactionId, data)
        : paymentsApi.receiveSale(transactionId, data),
    onSuccess: () => {
      toast.success(isAP ? 'Payment recorded.' : 'Receipt recorded.');
      onSuccess?.();
    },
    onError: (err) => setError(parseApiError(err, 'Payment failed')),
  });

  const onSubmit = (data) => {
    setError('');
    mutation.mutate({
      ...data,
      amount:        parseFloat(data.amount),
      operationId:   newOperationId(),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isAP ? `Record Payment — ${transactionNumber}` : `Record Receipt — ${transactionNumber}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="submit"
            form="payment-form"
            loading={isSubmitting || mutation.isPending}
            disabled={overpaid}
          >
            {isAP ? 'Record Payment' : 'Record Receipt'}
          </Button>
        </>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}

      {/* Balance summary */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 mb-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{isAP ? 'Amount owed to supplier' : 'Amount owed by customer'}</span>
          <span className="font-bold text-slate-900 tabular-nums">{formatMoney(remainingAmount)}</span>
        </div>
        {overpaid && (
          <p className="text-xs text-danger-600 mt-2 font-medium">
            ⚠ Amount exceeds remaining balance of {formatMoney(remainingAmount)}
          </p>
        )}
      </div>

      <form id="payment-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label={t('advances.amountEtb')}
          type="number"
          step="0.01"
          min="0.01"
          max={remaining}
          required
          error={errors.amount?.message}
          {...register('amount', {
            required: 'Amount is required',
            min: { value: 0.01, message: 'Must be > 0' },
            validate: (v) => parseFloat(v) <= remaining + 0.005 || `Cannot exceed ${formatMoney(remaining)}`,
          })}
        />

        {/* Quick-fill buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setValue('amount', parseFloat(remaining).toFixed(2))}
            className="text-xs rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 transition-colors"
          >
            Full amount ({formatMoney(remaining)})
          </button>
        </div>

        <Select label={t('advances.paymentMethod')} required {...register('paymentMethod')}>
          {METHODS.map((m) => (
            <option key={m} value={m}>{METHOD_LABELS[m]}</option>
          ))}
        </Select>

        <Input
          label={t('common.date')}
          type="date"
          required
          error={errors.paymentDate?.message}
          {...register('paymentDate', { required: 'Date is required' })}
        />

        <Input
          label="Reference / Transaction ID"
          placeholder="Bank ref, cheque number, Telebirr ID…"
          {...register('reference')}
        />

        <Input
          label="Notes (optional)"
          placeholder="Any additional notes…"
          {...register('notes')}
        />
      </form>
    </Modal>
  );
}
