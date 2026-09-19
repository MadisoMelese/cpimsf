import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { purchasesApi } from '../../api/purchases';
import { agentsApi, locationsApi, coffeeTypesApi } from '../../api/reference';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { newOperationId } from '../../utils/operationId';
import { stateColor } from '../../utils/format';
import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export function CreatePurchaseModal({ onClose }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const { data: agents }      = useQuery({ queryKey: ['agents'],       queryFn: () => agentsApi.list({ isSupplier: true }) });
  const { data: locations }   = useQuery({ queryKey: ['locations'],    queryFn: locationsApi.list });
  const { data: coffeeTypes } = useQuery({ queryKey: ['coffee-types'], queryFn: () => coffeeTypesApi.list() });

  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      purchaseDate: new Date().toISOString().split('T')[0],
      creditTerms:  'CASH',
      currency:     'ETB',   // ← Ethiopian Birr
      items: [{ coffeeTypeId: '', quantityKg: '', unitPriceKg: '', moistureContent: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  // look up a coffee type by id for badge display
  const ctMap = {};
  (coffeeTypes?.data || []).forEach(c => { ctMap[c.id] = c; });

  const mutation = useMutation({
    mutationFn: (data) => purchasesApi.create({ ...data, operationId: newOperationId() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      onClose();
    },
    onError: (err) => setError(err?.response?.data?.error?.message || 'Failed to create purchase'),
  });

  const onSubmit = (data) => {
    setError('');
    mutation.mutate({
      ...data,
      items: data.items.map((i) => ({
        coffeeTypeId:    i.coffeeTypeId,
        quantityKg:      parseFloat(i.quantityKg),
        unitPriceKg:     parseFloat(i.unitPriceKg),
        moistureContent: i.moistureContent ? parseFloat(i.moistureContent) : undefined,
        notes:           i.notes || undefined,
      })),
    });
  };

  // computed totals
  const totals = (watchedItems || []).reduce((acc, item) => {
    const kg  = parseFloat(item.quantityKg)  || 0;
    const prc = parseFloat(item.unitPriceKg) || 0;
    return { kg: acc.kg + kg, money: acc.money + kg * prc };
  }, { kg: 0, money: 0 });

  return (
    <Modal
      open
      onClose={onClose}
      title={t('purchases.newPurchaseReceipt')}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          {/* Live totals */}
          <div className="text-sm text-slate-500 flex gap-4">
            <span>Total: <strong className="text-slate-900">{totals.kg.toFixed(3)} KG</strong></span>
            <span>Amount: <strong className="text-success-700">ETB {totals.money.toLocaleString('en-ET', { minimumFractionDigits: 2 })}</strong></span>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="create-purchase-form" loading={isSubmitting || mutation.isPending}>
              Save Purchase
            </Button>
          </div>
        </div>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}

      <form id="create-purchase-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

        {/* Header fields */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Agent / Supplier" required
            error={errors.agentId?.message}
            {...register('agentId', { required: 'Agent is required' })}
          >
            <option value="">Select agent…</option>
            {(agents?.data || []).map((a) => (
              <option key={a.id} value={a.id}>{a.name} {a.phone ? `(${a.phone})` : ''}</option>
            ))}
          </Select>

          <Select
            label="Reception Location" required
            error={errors.locationId?.message}
            {...register('locationId', { required: 'Location is required' })}
          >
            <option value="">Select location…</option>
            {(locations?.data || []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>

          <Input
            label="Purchase Date" type="date" required
            error={errors.purchaseDate?.message}
            {...register('purchaseDate', { required: 'Date is required' })}
          />

          <Select label="Payment Terms" {...register('creditTerms')}>
            <option value="CASH">Cash (immediate)</option>
            <option value="NET_7">Net 7 days</option>
            <option value="NET_14">Net 14 days</option>
            <option value="NET_30">Net 30 days</option>
            <option value="NET_60">Net 60 days</option>
            <option value="CUSTOM">Custom</option>
          </Select>
        </div>

        <Input
          label="Notes (optional)"
          placeholder="Storekeeper observations, delivery conditions…"
          {...register('notes')}
        />

        {/* Coffee items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Coffee Items</p>
              <p className="text-xs text-slate-500 mt-0.5">Record each coffee type, grade, quantity and price in ETB</p>
            </div>
            <Button
              variant="ghost" size="xs" type="button"
              onClick={() => append({ coffeeTypeId: '', quantityKg: '', unitPriceKg: '', moistureContent: '' })}
            >
              <Plus size={14} /> Add Row
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, i) => {
              const selectedCt = ctMap[watchedItems?.[i]?.coffeeTypeId];
              return (
                <div key={field.id} className="rounded-xl border border-slate-200 p-3 space-y-3">
                  {/* Row label */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Item {i + 1}</span>
                    {selectedCt && (
                      <div className="flex gap-1">
                        <Badge variant={stateColor(selectedCt.state)}>{selectedCt.state}</Badge>
                        <Badge variant="default">Grade {selectedCt.grade || '—'}</Badge>
                      </div>
                    )}
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="p-1 text-slate-400 hover:text-danger-600 transition-colors ml-auto"
                        aria-label="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Coffee type */}
                    <div className="col-span-2 lg:col-span-1">
                      <Select
                        label="Coffee Type"
                        error={errors.items?.[i]?.coffeeTypeId?.message}
                        {...register(`items.${i}.coffeeTypeId`, { required: 'Required' })}
                      >
                        <option value="">Select…</option>
                        {(coffeeTypes?.data || []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* Quantity */}
                    <Input
                      label="Quantity (KG)"
                      type="number" step="0.001" min="0.001"
                      placeholder="0.000"
                      error={errors.items?.[i]?.quantityKg?.message}
                      {...register(`items.${i}.quantityKg`, {
                        required: 'Required',
                        min: { value: 0.001, message: 'Must be > 0' },
                      })}
                    />

                    {/* Unit price in ETB */}
                    <Input
                      label="Price / KG (ETB)"
                      type="number" step="0.01" min="0"
                      placeholder="0.00"
                      error={errors.items?.[i]?.unitPriceKg?.message}
                      {...register(`items.${i}.unitPriceKg`, {
                        required: 'Required',
                        min: { value: 0, message: 'Must be ≥ 0' },
                      })}
                    />

                    {/* Moisture — only relevant for WET */}
                    <Input
                      label="Moisture % (wet only)"
                      type="number" step="0.1" min="0" max="100"
                      placeholder="e.g. 65"
                      hint="Leave blank for dry coffee"
                      {...register(`items.${i}.moistureContent`)}
                    />
                  </div>

                  {/* Line total */}
                  {watchedItems?.[i]?.quantityKg && watchedItems?.[i]?.unitPriceKg && (
                    <div className="text-right text-xs text-slate-500">
                      Line total:{' '}
                      <strong className="text-success-700 text-sm">
                        ETB {(parseFloat(watchedItems[i].quantityKg || 0) * parseFloat(watchedItems[i].unitPriceKg || 0))
                          .toLocaleString('en-ET', { minimumFractionDigits: 2 })}
                      </strong>
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
