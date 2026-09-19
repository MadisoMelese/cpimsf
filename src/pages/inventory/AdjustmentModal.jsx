import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../api/inventory';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { formatKg } from '../../utils/format';
import { newOperationId } from '../../utils/operationId';
import { useLanguage } from '../../context/LanguageContext';

export function AdjustmentModal({ onClose, onSuccess }) {
  const { t } = useLanguage(); {
  const [error, setError] = useState('');

  const { data: batchesActive  } = useQuery({ queryKey: ['batches-active'],  queryFn: () => inventoryApi.batches({ status: 'ACTIVE',            limit: 200, page: 1 }) });
  const { data: batchesPartial } = useQuery({ queryKey: ['batches-partial'], queryFn: () => inventoryApi.batches({ status: 'PARTIALLY_CONSUMED', limit: 200, page: 1 }) });
  const allBatches = [...(batchesActive?.data || []), ...(batchesPartial?.data || [])];
  const batchMap   = Object.fromEntries(allBatches.map(b => [b.id, b]));

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { batchId: '', direction: 'DECREASE', quantityKg: '', reason: '' },
  });
  const selectedBatch = batchMap[watch('batchId')];
  const direction     = watch('direction');

  const mutation = useMutation({
    mutationFn: (data) => inventoryApi.createAdjustment({
      batchId:    data.batchId,
      direction:  data.direction,
      quantityKg: parseFloat(data.quantityKg),
      reason:     data.reason,
      operationId: newOperationId(),
    }),
    onSuccess,
    onError: (err) => setError(err?.response?.data?.error?.message || 'Adjustment failed'),
  });

  return (
    <Modal open onClose={onClose} title={t('inventory.adjustTitle')} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="adj-form" loading={mutation.isPending}>{t('inventory.applyAdjustment')}</Button>
        </>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}

      <Alert variant="warning" className="mb-4">
        Stock adjustments are auditable and immutable. Use only for verified physical discrepancies.
      </Alert>

      <form id="adj-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <Select label={t('inventory.batchToAdjust')} required error={errors.batchId?.message}
          {...register('batchId', { required: 'Required' })}>
          <option value="">Select batch…</option>
          {allBatches.map(b => (
            <option key={b.id} value={b.id}>
              {b.batchCode} — {b.coffeeType?.name} · {parseFloat(b.remainingKg).toFixed(3)} KG
            </option>
          ))}
        </Select>

        {selectedBatch && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
            Current stock: <strong className="tabular-nums">{formatKg(selectedBatch.remainingKg)}</strong>
            {' '}· Location: {selectedBatch.location?.name}
          </div>
        )}

        <Select label={t('inventory.direction')} required {...register('direction')}>
          <option value="DECREASE">Decrease (write-off, loss, discrepancy)</option>
          <option value="INCREASE">Increase (found stock, return)</option>
        </Select>

        <Input label="Quantity (KG)" type="number" step="0.001" min="0.001"
          hint={direction === 'DECREASE' && selectedBatch ? `Max: ${formatKg(selectedBatch.remainingKg)}` : undefined}
          required error={errors.quantityKg?.message}
          {...register('quantityKg', {
            required: 'Required',
            min: { value: 0.001, message: 'Must be > 0' },
          })}
        />

        <Input label="Reason (required)" required placeholder="Physical count discrepancy, moisture loss, damage…"
          error={errors.reason?.message}
          {...register('reason', { required: 'Reason is required for audit purposes' })}
        />
      </form>
    </Modal>
  );
}
