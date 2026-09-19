import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Package } from 'lucide-react';
import { processingApi } from '../../api/processing';
import { inventoryApi } from '../../api/inventory';
import { coffeeTypesApi, locationsApi } from '../../api/reference';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatKg, formatMoney, formatDate, formatPct, stateColor, formatGrade } from '../../utils/format';
import { newOperationId } from '../../utils/operationId';

export function ProcessingRunModal({ id, onClose }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [step, setStep]   = useState('view'); // view | inputs | outputs | confirm-complete | confirm-cancel

  const { data, isLoading } = useQuery({
    queryKey: ['processing-run', id],
    queryFn:  () => processingApi.get(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['processing-run', id] });
    queryClient.invalidateQueries({ queryKey: ['processing'] });
  };

  if (isLoading) return <Modal open onClose={onClose} title="Processing Run"><PageSpinner /></Modal>;
  const run = data?.data;
  if (!run) return null;

  return (
    <Modal open onClose={onClose} title={`Processing Run — ${run.runCode}`} size="xl"
      footer={
        <div className="flex items-center gap-2 w-full">
          <div className="flex gap-2 flex-1">
            {['DRAFT', 'IN_PROGRESS'].includes(run.status) && step === 'view' && (
              <>
                <Button size="sm" onClick={() => setStep('inputs')}>
                  <Plus size={14} /> Add Inputs
                </Button>
                {run.inputs?.length > 0 && (
                  <Button size="sm" variant="success" onClick={() => setStep('outputs')}>
                    Record Outputs &amp; Complete
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => setStep('confirm-cancel')}>
                  Cancel Run
                </Button>
              </>
            )}
            {step !== 'view' && (
              <Button size="sm" variant="secondary" onClick={() => { setStep('view'); setError(''); }}>
                ← Back
              </Button>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}

      {/* ── View mode ── */}
      {step === 'view' && (
        <div className="space-y-5">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div><span className="text-slate-500">Status:</span> <Badge status={run.status} /></div>
            <div><span className="text-slate-500">Location:</span> <span className="font-medium">{run.location?.name || '—'}</span></div>
            {run.processingCost && <div><span className="text-slate-500">Processing Cost:</span> <span className="font-medium">{formatMoney(run.processingCost)}</span></div>}
            {run.completedAt    && <div><span className="text-slate-500">Completed:</span> <span className="font-medium">{formatDate(run.completedAt)}</span></div>}
          </div>

          {/* Loss summary */}
          {run.status === 'COMPLETED' && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Input KG',   value: formatKg(run.totalInputKg),  color: 'text-slate-900' },
                { label: 'Output KG',  value: formatKg(run.totalOutputKg), color: 'text-success-700' },
                { label: 'Loss KG',    value: formatKg(run.lossKg),        color: 'text-warning-600' },
                { label: 'Loss %',     value: formatPct(run.lossPct),      color: run.lossOutOfRange ? 'text-danger-600' : 'text-slate-900' },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className={`font-bold tabular-nums ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
          {run.status === 'COMPLETED' && run.lossOutOfRange && (
            <Alert variant="danger">Loss % is outside the acceptable range — review required.</Alert>
          )}

          {/* Inputs */}
          {run.inputs?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Input Batches</p>
              <table className="w-full text-sm rounded-xl overflow-hidden border border-slate-200">
                <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left text-xs text-slate-500">Batch</th><th className="px-3 py-2 text-left text-xs text-slate-500">Type</th><th className="px-3 py-2 text-right text-xs text-slate-500">KG</th><th className="px-3 py-2 text-right text-xs text-slate-500">Cost/KG</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {run.inputs.map(inp => (
                    <tr key={inp.id}>
                      <td className="px-3 py-2 font-mono text-xs text-primary-700">{inp.batch?.batchCode}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 items-center">
                          <span className="text-xs">{inp.batch?.coffeeType?.name}</span>
                          <Badge variant={stateColor(inp.batch?.coffeeType?.state)} className="text-[10px] px-1.5">{inp.batch?.coffeeType?.state}</Badge>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatKg(inp.quantityKg)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500 text-xs">{formatMoney(inp.costPerKg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Output batches */}
          {run.outputBatches?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Output Batches</p>
              <table className="w-full text-sm rounded-xl overflow-hidden border border-slate-200">
                <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left text-xs text-slate-500">Batch</th><th className="px-3 py-2 text-left text-xs text-slate-500">Type / Grade</th><th className="px-3 py-2 text-right text-xs text-slate-500">KG</th><th className="px-3 py-2 text-right text-xs text-slate-500">Cost/KG</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {run.outputBatches.map(b => (
                    <tr key={b.id}>
                      <td className="px-3 py-2 font-mono text-xs text-success-700">{b.batchCode}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 items-center">
                          <span className="text-xs">{b.coffeeType?.name}</span>
                          <Badge variant={stateColor(b.coffeeType?.state)} className="text-[10px] px-1.5">{b.coffeeType?.state}</Badge>
                          <Badge variant="default" className="text-[10px] px-1.5">{formatGrade(b.coffeeType?.grade)}</Badge>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatKg(b.originalKg)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs text-slate-500">{formatMoney(b.costPerKg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Add inputs step ── */}
      {step === 'inputs' && (
        <AddInputsForm runId={id} onDone={() => { invalidate(); setStep('view'); }} onError={setError} />
      )}

      {/* ── Record outputs step ── */}
      {step === 'outputs' && (
        <CompleteRunForm run={run} onDone={() => { invalidate(); setStep('view'); }} onError={setError} />
      )}

      {/* ── Cancel confirmation ── */}
      {step === 'confirm-cancel' && (
        <CancelConfirm runId={id} userId={null} onDone={() => { invalidate(); onClose(); }} onError={setError} onBack={() => setStep('view')} />
      )}
    </Modal>
  );
}

// ─── Add Inputs sub-form ──────────────────────────────────────────────────────

function AddInputsForm({ runId, onDone, onError }) {
  const { data: batchesData } = useQuery({ queryKey: ['batches-active'],  queryFn: () => inventoryApi.batches({ status: 'ACTIVE',            limit: 200, page: 1 }) });
  const { data: partialData  } = useQuery({ queryKey: ['batches-partial'], queryFn: () => inventoryApi.batches({ status: 'PARTIALLY_CONSUMED', limit: 200, page: 1 }) });
  const allBatches = [...(batchesData?.data || []), ...(partialData?.data || [])];
  const batchMap   = Object.fromEntries(allBatches.map(b => [b.id, b]));

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { inputs: [{ batchId: '', quantityKg: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'inputs' });
  const watchedInputs = watch('inputs');

  const mutation = useMutation({
    mutationFn: (data) => processingApi.addInputs(runId, { inputs: data.inputs.map(i => ({ batchId: i.batchId, quantityKg: parseFloat(i.quantityKg) })) }),
    onSuccess: onDone,
    onError: (err) => onError(err?.response?.data?.error?.message || 'Failed to add inputs'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <p className="text-sm text-slate-500">Select the wet coffee batches to use as input for this processing run.</p>
      {fields.map((field, i) => {
        const sel = batchMap[watchedInputs?.[i]?.batchId];
        const maxQty = sel ? parseFloat(sel.remainingKg) : undefined;
        return (
          <div key={field.id} className="rounded-xl border border-slate-200 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Input {i + 1}</span>
              {sel && (
                <div className="flex items-center gap-2">
                  <Badge variant={stateColor(sel.coffeeType?.state)}>{sel.coffeeType?.state}</Badge>
                  <Badge variant="default">{formatGrade(sel.coffeeType?.grade)}</Badge>
                  <span className="text-xs text-slate-500"><Package size={11} className="inline mr-1" />Available: <strong>{formatKg(sel.remainingKg)}</strong></span>
                </div>
              )}
              {fields.length > 1 && <button type="button" onClick={() => remove(i)} className="p-1 text-slate-400 hover:text-danger-600"><Trash2 size={14} /></button>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Source Batch" error={errors.inputs?.[i]?.batchId?.message} {...register(`inputs.${i}.batchId`, { required: 'Select a batch' })}>
                <option value="">Select batch…</option>
                {allBatches.map(b => <option key={b.id} value={b.id}>{b.batchCode} — {b.coffeeType?.name} · {parseFloat(b.remainingKg).toFixed(3)} KG</option>)}
              </Select>
              <Input label="Quantity (KG)" type="number" step="0.001" min="0.001" max={maxQty} placeholder="0.000"
                hint={maxQty ? `Max: ${maxQty.toFixed(3)} KG` : undefined}
                error={errors.inputs?.[i]?.quantityKg?.message}
                {...register(`inputs.${i}.quantityKg`, {
                  required: 'Required',
                  min: { value: 0.001, message: 'Must be > 0' },
                  validate: v => !maxQty || parseFloat(v) <= maxQty || `Cannot exceed ${maxQty.toFixed(3)} KG`,
                })}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="xs" type="button" onClick={() => append({ batchId: '', quantityKg: '' })}>
          <Plus size={13} /> Add Another Batch
        </Button>
        <Button type="submit" loading={mutation.isPending}>Save Inputs</Button>
      </div>
    </form>
  );
}

// ─── Complete Run sub-form ────────────────────────────────────────────────────

function CompleteRunForm({ run, onDone, onError }) {
  const { data: coffeeTypes } = useQuery({ queryKey: ['coffee-types'], queryFn: () => coffeeTypesApi.list() });
  const { data: locations   } = useQuery({ queryKey: ['locations'],    queryFn: locationsApi.list });

  const totalInputKg = run.inputs?.reduce((a, i) => a + parseFloat(i.quantityKg), 0) || 0;

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { outputs: [{ coffeeTypeId: '', locationId: '', quantityKg: '', notes: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'outputs' });
  const watchedOutputs = watch('outputs');
  const totalOutputKg = (watchedOutputs || []).reduce((a, o) => a + (parseFloat(o.quantityKg) || 0), 0);
  const lossKg = totalInputKg - totalOutputKg;
  const lossPct = totalInputKg > 0 ? (lossKg / totalInputKg) * 100 : 0;

  const mutation = useMutation({
    mutationFn: (data) => processingApi.complete(run.id, {
      operationId: newOperationId(),
      outputs: data.outputs.map(o => ({ coffeeTypeId: o.coffeeTypeId, locationId: o.locationId, quantityKg: parseFloat(o.quantityKg), notes: o.notes || undefined })),
    }),
    onSuccess: onDone,
    onError: (err) => onError(err?.response?.data?.error?.message || 'Failed to complete run'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center mb-2">
        <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Total Input</p><p className="font-bold text-slate-900 tabular-nums">{formatKg(totalInputKg)}</p></div>
        <div className="bg-success-50 rounded-xl p-3"><p className="text-xs text-slate-500">Total Output</p><p className="font-bold text-success-700 tabular-nums">{formatKg(totalOutputKg)}</p></div>
        <div className={`rounded-xl p-3 ${lossPct > 30 ? 'bg-danger-50' : 'bg-warning-50'}`}>
          <p className="text-xs text-slate-500">Loss</p>
          <p className={`font-bold tabular-nums ${lossPct > 30 ? 'text-danger-600' : 'text-warning-600'}`}>{formatKg(lossKg)} ({lossPct.toFixed(1)}%)</p>
        </div>
      </div>
      {totalOutputKg > totalInputKg && <Alert variant="danger">Output KG cannot exceed input KG ({formatKg(totalInputKg)})</Alert>}

      {fields.map((field, i) => (
        <div key={field.id} className="rounded-xl border border-slate-200 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Output {i + 1}</span>
            {fields.length > 1 && <button type="button" onClick={() => remove(i)} className="p-1 text-slate-400 hover:text-danger-600"><Trash2 size={14} /></button>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Coffee Type (output)" error={errors.outputs?.[i]?.coffeeTypeId?.message} {...register(`outputs.${i}.coffeeTypeId`, { required: 'Required' })}>
              <option value="">Select output type…</option>
              {(coffeeTypes?.data || []).filter(c => c.state !== 'WET').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Store to Location" error={errors.outputs?.[i]?.locationId?.message} {...register(`outputs.${i}.locationId`, { required: 'Required' })}>
              <option value="">Select location…</option>
              {(locations?.data || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
            <Input label="Output KG" type="number" step="0.001" min="0.001"
              error={errors.outputs?.[i]?.quantityKg?.message}
              {...register(`outputs.${i}.quantityKg`, { required: 'Required', min: { value: 0.001, message: 'Must be > 0' } })}
            />
            <Input label="Notes (optional)" {...register(`outputs.${i}.notes`)} />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="xs" type="button" onClick={() => append({ coffeeTypeId: '', locationId: '', quantityKg: '', notes: '' })}>
          <Plus size={13} /> Add Output Batch
        </Button>
        <Button type="submit" loading={mutation.isPending} disabled={totalOutputKg > totalInputKg || totalOutputKg === 0}>
          Complete Run
        </Button>
      </div>
    </form>
  );
}

// ─── Cancel confirmation ──────────────────────────────────────────────────────

function CancelConfirm({ runId, onDone, onError, onBack }) {
  const mutation = useMutation({
    mutationFn: () => processingApi.cancel(runId),
    onSuccess: onDone,
    onError: (err) => onError(err?.response?.data?.error?.message || 'Cancel failed'),
  });

  return (
    <div className="space-y-4">
      <Alert variant="warning" title="Cancel this processing run?">
        Any input batch quantities that were registered will be restored to stock. This cannot be undone.
      </Alert>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>Go Back</Button>
        <Button variant="danger" loading={mutation.isPending} onClick={() => mutation.mutate()}>
          Yes, Cancel Run
        </Button>
      </div>
    </div>
  );
}
