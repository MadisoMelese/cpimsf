import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Package } from 'lucide-react';
import { salesApi } from '../../api/sales';
import { agentsApi } from '../../api/reference';
import { inventoryApi } from '../../api/inventory';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { newOperationId } from '../../utils/operationId';
import { formatKg, formatMoney, stateColor, formatGrade } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';

export function CreateSaleModal({ onClose, onCreated }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  // Load customers and active batches
  const { data: agents }   = useQuery({ queryKey: ['agents-customers'], queryFn: () => agentsApi.list({ isCustomer: true }) });
  const { data: batchesData } = useQuery({
    queryKey: ['batches-active'],
    queryFn:  () => inventoryApi.batches({ status: 'ACTIVE', limit: 200, page: 1 }),
  });
  const { data: partialData } = useQuery({
    queryKey: ['batches-partial'],
    queryFn:  () => inventoryApi.batches({ status: 'PARTIALLY_CONSUMED', limit: 200, page: 1 }),
  });

  // Merge active + partially consumed batches
  const allBatches = [
    ...(batchesData?.data || []),
    ...(partialData?.data  || []),
  ];

  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      saleDate:   new Date().toISOString().split('T')[0],
      creditTerms:'CASH',
      currency:   'ETB',
      items: [{ batchId: '', quantityKg: '', unitSalePrice: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  // Build batch lookup map
  const batchMap = {};
  allBatches.forEach(b => { batchMap[b.id] = b; });

  // Live totals
  const totals = (watchedItems || []).reduce((acc, item) => {
    const qty = parseFloat(item.quantityKg)    || 0;
    const prc = parseFloat(item.unitSalePrice) || 0;
    return { kg: acc.kg + qty, amount: acc.amount + qty * prc };
  }, { kg: 0, amount: 0 });

  const mutation = useMutation({
    mutationFn: (data) => salesApi.create({ ...data, operationId: newOperationId() }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      onCreated?.(res.data);
      onClose();
    },
    onError: (err) => setError(err?.response?.data?.error?.message || 'Failed to create sale'),
  });

  const onSubmit = (data) => {
    setError('');
    mutation.mutate({
      ...data,
      items: data.items.map((i) => ({
        batchId:       i.batchId,
        quantityKg:    parseFloat(i.quantityKg),
        unitSalePrice: parseFloat(i.unitSalePrice),
      })),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('sales.newSale')}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-slate-500 flex gap-4">
            <span>Total: <strong className="text-slate-900">{totals.kg.toFixed(3)} KG</strong></span>
            <span>Amount: <strong className="text-success-700">ETB {totals.amount.toLocaleString('en-ET', { minimumFractionDigits: 2 })}</strong></span>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" form="create-sale-form" loading={isSubmitting || mutation.isPending}>
              Save as Draft
            </Button>
          </div>
        </div>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}

      <form id="create-sale-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

        {/* Header */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t('sales.customer')} required
            error={errors.agentId?.message}
            {...register('agentId', { required: 'Customer is required' })}
          >
            <option value="">Select customer…</option>
            {(agents?.data || []).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>

          <Input
            label={t('sales.saleDate')} type="date" required
            error={errors.saleDate?.message}
            {...register('saleDate', { required: 'Date is required' })}
          />

          <Select label={t('purchases.creditTerms')} {...register('creditTerms')}>
            <option value="CASH">Cash</option>
            <option value="NET_7">Net 7 days</option>
            <option value="NET_14">Net 14 days</option>
            <option value="NET_30">Net 30 days</option>
            <option value="NET_60">Net 60 days</option>
          </Select>

          <Input
            label="Notes (optional)"
            placeholder="Delivery instructions, references…"
            {...register('notes')}
          />
        </div>

        {/* Sale items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Sale Items</p>
              <p className="text-xs text-slate-500 mt-0.5">Allocate exact batches — cost is captured from batch at confirmation</p>
            </div>
            <Button
              variant="ghost" size="xs" type="button"
              onClick={() => append({ batchId: '', quantityKg: '', unitSalePrice: '' })}
            >
              <Plus size={14} /> Add Row
            </Button>
          </div>

          {allBatches.length === 0 && (
            <Alert variant="warning">
              No active batches in stock. Approve a purchase first to create stock.
            </Alert>
          )}

          <div className="space-y-3">
            {fields.map((field, i) => {
              const selectedBatch = batchMap[watchedItems?.[i]?.batchId];
              const maxQty = selectedBatch ? parseFloat(selectedBatch.remainingKg) : undefined;

              return (
                <div key={field.id} className="rounded-xl border border-slate-200 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Item {i + 1}</span>
                    {selectedBatch && (
                      <div className="flex items-center gap-2">
                        <Badge variant={stateColor(selectedBatch.coffeeType?.state)}>
                          {selectedBatch.coffeeType?.state}
                        </Badge>
                        <Badge variant="default">
                          {formatGrade(selectedBatch.coffeeType?.grade)}
                        </Badge>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Package size={11} />
                          Available: <strong className="text-slate-700">{formatKg(selectedBatch.remainingKg)}</strong>
                        </span>
                      </div>
                    )}
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="p-1 text-slate-400 hover:text-danger-600 transition-colors ml-2"
                        aria-label="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {/* Batch selector */}
                    <Select
                      label="Batch"
                      error={errors.items?.[i]?.batchId?.message}
                      {...register(`items.${i}.batchId`, { required: 'Select a batch' })}
                    >
                      <option value="">Select batch…</option>
                      {allBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batchCode} — {b.coffeeType?.name} · {parseFloat(b.remainingKg).toFixed(3)} KG
                        </option>
                      ))}
                    </Select>

                    {/* Quantity */}
                    <Input
                      label="Quantity (KG)"
                      type="number" step="0.001" min="0.001"
                      max={maxQty}
                      placeholder="0.000"
                      hint={maxQty ? `Max: ${maxQty.toFixed(3)} KG` : undefined}
                      error={errors.items?.[i]?.quantityKg?.message}
                      {...register(`items.${i}.quantityKg`, {
                        required: 'Required',
                        min: { value: 0.001, message: 'Must be > 0' },
                        validate: (v) =>
                          !maxQty || parseFloat(v) <= maxQty || `Cannot exceed ${maxQty.toFixed(3)} KG available`,
                      })}
                    />

                    {/* Sale price */}
                    <Input
                      label="Sale Price / KG (ETB)"
                      type="number" step="0.01" min="0"
                      placeholder="0.00"
                      hint={selectedBatch ? `Cost: ETB ${parseFloat(selectedBatch.costPerKg).toFixed(2)}/kg` : undefined}
                      error={errors.items?.[i]?.unitSalePrice?.message}
                      {...register(`items.${i}.unitSalePrice`, {
                        required: 'Required',
                        min: { value: 0.01, message: 'Must be > 0' },
                      })}
                    />
                  </div>

                  {/* Line total + margin */}
                  {watchedItems?.[i]?.quantityKg && watchedItems?.[i]?.unitSalePrice && selectedBatch && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Line total:{' '}
                        <strong className="text-success-700">
                          ETB {(parseFloat(watchedItems[i].quantityKg) * parseFloat(watchedItems[i].unitSalePrice))
                            .toLocaleString('en-ET', { minimumFractionDigits: 2 })}
                        </strong>
                      </span>
                      {(() => {
                        const qty  = parseFloat(watchedItems[i].quantityKg)    || 0;
                        const sell = parseFloat(watchedItems[i].unitSalePrice) || 0;
                        const cost = parseFloat(selectedBatch.costPerKg)       || 0;
                        const margin = (sell - cost) * qty;
                        return (
                          <span className={margin >= 0 ? 'text-success-600' : 'text-danger-600'}>
                            Est. margin:{' '}
                            <strong>ETB {margin.toLocaleString('en-ET', { minimumFractionDigits: 2 })}</strong>
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}
