import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { inventoryApi } from '../../api/inventory';
import { locationsApi } from '../../api/reference';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { formatKg } from '../../utils/format';
import { newOperationId } from '../../utils/operationId';
import { useLanguage } from '../../context/LanguageContext';

export function TransferModal({ onClose, onSuccess }) {
  const { t } = useLanguage();
  const [error, setError] = useState('');

  const { data: locations }    = useQuery({ queryKey: ['locations'],    queryFn: locationsApi.list });
  const { data: batchesActive  } = useQuery({ queryKey: ['batches-active'],  queryFn: () => inventoryApi.batches({ status: 'ACTIVE',            limit: 200, page: 1 }) });
  const { data: batchesPartial } = useQuery({ queryKey: ['batches-partial'], queryFn: () => inventoryApi.batches({ status: 'PARTIALLY_CONSUMED', limit: 200, page: 1 }) });
  const allBatches = [...(batchesActive?.data || []), ...(batchesPartial?.data || [])];
  const batchMap   = Object.fromEntries(allBatches.map(b => [b.id, b]));

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      transferDate: new Date().toISOString().split('T')[0],
      fromLocationId: '', toLocationId: '',
      lines: [{ fromBatchId: '', quantityKg: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const watchedLines = watch('lines');
  const fromLocation = watch('fromLocationId');

  const mutation = useMutation({
    mutationFn: (data) => inventoryApi.createTransfer({
      fromLocationId: data.fromLocationId,
      toLocationId:   data.toLocationId,
      transferDate:   data.transferDate,
      operationId:    newOperationId(),
      lines: data.lines.map(l => ({ fromBatchId: l.fromBatchId, quantityKg: parseFloat(l.quantityKg) })),
    }),
    onSuccess,
    onError: (err) => setError(err?.response?.data?.error?.message || 'Transfer failed'),
  });

  // Only show batches from the selected from-location
  const filteredBatches = fromLocation
    ? allBatches.filter(b => b.locationId === fromLocation)
    : allBatches;

  return (
    <Modal open onClose={onClose} title={t('inventory.transferTitle')} size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="transfer-form" loading={mutation.isPending}>{t('inventory.executeTransfer')}</Button>
        </>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}

      <form id="transfer-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Select label={t('inventory.fromLocation')} required error={errors.fromLocationId?.message}
            {...register('fromLocationId', { required: 'Required' })}>
            <option value="">Select…</option>
            {(locations?.data || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Select label={t('inventory.toLocation')} required error={errors.toLocationId?.message}
            {...register('toLocationId', { required: 'Required' })}>
            <option value="">Select…</option>
            {(locations?.data || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Input label={t('inventory.transferDate')} type="date" required {...register('transferDate', { required: 'Required' })} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700">Batches to Transfer</p>
            <Button variant="ghost" size="xs" type="button" onClick={() => append({ fromBatchId: '', quantityKg: '' })}>
              <Plus size={13} /> Add Row
            </Button>
          </div>
          {fields.map((field, i) => {
            const sel    = batchMap[watchedLines?.[i]?.fromBatchId];
            const maxQty = sel ? parseFloat(sel.remainingKg) : undefined;
            return (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end mb-3">
                <Select error={errors.lines?.[i]?.fromBatchId?.message}
                  label={i === 0 ? 'Batch' : undefined}
                  {...register(`lines.${i}.fromBatchId`, { required: 'Required' })}>
                  <option value="">Select batch…</option>
                  {filteredBatches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batchCode} — {b.coffeeType?.name} · {parseFloat(b.remainingKg).toFixed(3)} KG
                    </option>
                  ))}
                </Select>
                <Input label={i === 0 ? 'Quantity (KG)' : undefined} type="number" step="0.001" min="0.001"
                  max={maxQty} hint={maxQty ? `Max: ${maxQty.toFixed(3)} KG` : undefined}
                  error={errors.lines?.[i]?.quantityKg?.message}
                  {...register(`lines.${i}.quantityKg`, {
                    required: 'Required',
                    min: { value: 0.001, message: 'Must be > 0' },
                    validate: v => !maxQty || parseFloat(v) <= maxQty || `Max ${maxQty.toFixed(3)} KG`,
                  })}
                />
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="mb-0.5 p-2 text-slate-400 hover:text-danger-600">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <Input label="Notes (optional)" {...register('notes')} />
      </form>
    </Modal>
  );
}
