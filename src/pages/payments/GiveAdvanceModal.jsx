import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { advancesApi } from '../../api/advances';
import { agentsApi } from '../../api/reference';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { newOperationId } from '../../utils/operationId';
import { useLanguage } from '../../context/LanguageContext';

const METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'OTHER'];
const METHOD_LABELS = { CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', MOBILE_MONEY: 'Mobile Money (Telebirr)', CHEQUE: 'Cheque', OTHER: 'Other' };

export function GiveAdvanceModal({ onClose, onSuccess }) {
  const { t } = useLanguage();
  const [error, setError] = useState('');
  const { data: agents } = useQuery({ queryKey: ['agents'], queryFn: () => agentsApi.list({ isSupplier: true }) });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { advanceDate: new Date().toISOString().split('T')[0], paymentMethod: 'CASH' },
  });

  const mutation = useMutation({
    mutationFn: (data) => advancesApi.give({ ...data, amount: parseFloat(data.amount), operationId: newOperationId() }),
    onSuccess,
    onError: (err) => setError(err?.response?.data?.error?.message || 'Failed to record advance'),
  });

  return (
    <Modal open onClose={onClose} title={t('advances.giveTitle')} size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="advance-form" loading={isSubmitting || mutation.isPending}>{t('advances.recordAdvance')}</Button>
        </>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}

      <div className="rounded-xl bg-info-50 border border-info-200 px-4 py-3 mb-5 text-sm text-info-700">
        Record cash or transfer given to the agent before they go to buy coffee. The agent will account for this when they return.
      </div>

      <form id="advance-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4" noValidate>
        <Select label="Agent" required error={errors.agentId?.message}
          {...register('agentId', { required: 'Select an agent' })}>
          <option value="">Select agent…</option>
          {(agents?.data || []).map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Input label={t('advances.amountEtb')} type="number" step="0.01" min="0.01" required
            error={errors.amount?.message}
            {...register('amount', { required: 'Amount is required', min: { value: 0.01, message: 'Must be > 0' } })}
          />
          <Input label="Date" type="date" required
            error={errors.advanceDate?.message}
            {...register('advanceDate', { required: 'Date is required' })}
          />
        </div>

        <Select label={t('advances.paymentMethod')} required {...register('paymentMethod')}>
          {METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
        </Select>

        <Input label="Reference / Transaction ID"
          placeholder="Bank transfer ref, Telebirr ID…"
          {...register('reference')}
        />

        <Input label={t('common.notes')}
          placeholder="Purpose of advance, buying trip details…"
          {...register('notes')}
        />
      </form>
    </Modal>
  );
}
