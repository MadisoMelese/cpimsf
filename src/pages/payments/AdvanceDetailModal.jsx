import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { advancesApi } from '../../api/advances';
import { purchasesApi } from '../../api/purchases';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatMoney, formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const CATEGORIES = ['COFFEE_PURCHASE','TRANSPORT','BAGS_PACKAGING','LOADING_LABOUR','WEIGHING_FEES','AGENT_COMMISSION','OTHER'];
const CAT_LABELS = {
  COFFEE_PURCHASE: 'Coffee Purchase', TRANSPORT: 'Transport', BAGS_PACKAGING: 'Bags & Packaging',
  LOADING_LABOUR: 'Loading Labour', WEIGHING_FEES: 'Weighing Fees', AGENT_COMMISSION: 'Agent Commission', OTHER: 'Other',
};
const METHODS = ['CASH','BANK_TRANSFER','MOBILE_MONEY','CHEQUE','OTHER'];
const METHOD_LABELS = { CASH:'Cash', BANK_TRANSFER:'Bank Transfer', MOBILE_MONEY:'Mobile Money', CHEQUE:'Cheque', OTHER:'Other' };

export function AdvanceDetailModal({ id, onClose, onUpdated }) {
  const { t } = useLanguage(); {
  const { isBossOrAdmin }  = useAuth();
  const [error, setError]  = useState('');
  const [step, setStep]    = useState('view'); // view | add-expense | record-return | void
  const [voidReason, setVoidReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['advance-detail', id],
    queryFn:  () => advancesApi.get(id),
  });

  const refresh = () => { onUpdated?.(); };

  const submitM  = useMutation({ mutationFn: () => advancesApi.submit(id),  onSuccess: refresh, onError: e => setError(e?.response?.data?.error?.message || 'Failed') });
  const approveM = useMutation({ mutationFn: () => advancesApi.approve(id), onSuccess: refresh, onError: e => setError(e?.response?.data?.error?.message || 'Failed') });
  const voidM    = useMutation({ mutationFn: () => advancesApi.void(id, { reason: voidReason }), onSuccess: () => { refresh(); onClose(); }, onError: e => setError(e?.response?.data?.error?.message || 'Failed') });
  const delExpM  = useMutation({ mutationFn: (expId) => advancesApi.deleteExpense(id, expId), onSuccess: refresh, onError: e => setError(e?.response?.data?.error?.message || 'Failed') });

  if (isLoading) return <Modal open onClose={onClose} title="Advance"><PageSpinner /></Modal>;
  const adv = data?.data;
  if (!adv) return null;

  const totalExpenses = adv.expenses?.reduce((a, e) => a + parseFloat(e.amount || 0), 0) || 0;
  const returned      = parseFloat(adv.returnedAmount || 0);
  const balance       = parseFloat(adv.amount) - totalExpenses - returned;
  const isLocked      = adv.status === 'APPROVED' || adv.status === 'VOIDED';

  return (
    <Modal open onClose={onClose} title={`Advance — ${adv.advanceNumber}`} size="xl"
      footer={
        <div className="flex items-center gap-2 w-full">
          <div className="flex gap-2 flex-1 flex-wrap">
            {adv.status === 'PENDING' && step === 'view' && (
              <>
                <Button size="sm" onClick={() => setStep('add-expense')}>
                  <Plus size={13} /> Add Expense
                </Button>
                {returned === 0 && <Button size="sm" variant="secondary" onClick={() => setStep('record-return')}>
                  <RotateCcw size={13} /> Record Return
                </Button>}
                <Button size="sm" variant="secondary" loading={submitM.isPending} onClick={() => submitM.mutate()}>
                  Submit for Approval
                </Button>
              </>
            )}
            {adv.status === 'ACCOUNTED' && isBossOrAdmin && step === 'view' && (
              <Button size="sm" loading={approveM.isPending} onClick={() => approveM.mutate()}>
                <CheckCircle2 size={13} /> Approve
              </Button>
            )}
            {!isLocked && isBossOrAdmin && step === 'view' && (
              <Button size="sm" variant="danger" onClick={() => setStep('void')}>
                <XCircle size={13} /> Void
              </Button>
            )}
            {step !== 'view' && (
              <Button size="sm" variant="secondary" onClick={() => { setStep('view'); setError(''); }}>
                ← Back
              </Button>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.close')}</Button>
        </div>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}

      {/* ── View ── */}
      {step === 'view' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div><span className="text-slate-500">Agent:</span> <span className="font-medium">{adv.agent?.name}</span></div>
            <div><span className="text-slate-500">Date:</span> <span className="font-medium">{formatDate(adv.advanceDate)}</span></div>
            <div><span className="text-slate-500">Status:</span> <Badge variant={adv.status === 'APPROVED' ? 'success' : adv.status === 'VOIDED' ? 'default' : adv.status === 'ACCOUNTED' ? 'info' : 'warning'}>{adv.status}</Badge></div>
            <div><span className="text-slate-500">Method:</span> <span className="font-medium">{METHOD_LABELS[adv.paymentMethod]}</span></div>
            {adv.reference && <div><span className="text-slate-500">Reference:</span> <span className="font-mono text-xs">{adv.reference}</span></div>}
            {adv.givenBy && <div><span className="text-slate-500">Given by:</span> <span>{adv.givenBy?.fullName}</span></div>}
            {adv.approvedBy && <div><span className="text-slate-500">Approved by:</span> <span>{adv.approvedBy?.fullName}</span></div>}
            {adv.notes && <div className="col-span-2 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600">{adv.notes}</div>}
          </div>

          {/* Account summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Advanced',      value: formatMoney(adv.amount),         color: 'text-info-700'    },
              { label: 'Total Expenses',value: formatMoney(totalExpenses),       color: 'text-warning-700' },
              { label: 'Returned',      value: formatMoney(returned),            color: 'text-success-600' },
              { label: 'Balance',       value: formatMoney(balance),             color: balance > 0 ? 'text-danger-600' : balance < 0 ? 'text-warning-600' : 'text-success-600' },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
                <p className={`font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Return info */}
          {adv.returnedAmount && (
            <div className="rounded-xl bg-success-50 border border-success-200 px-4 py-3 text-sm">
              <p className="font-medium text-success-800">{t('advances.cashReturned')}</p>
              <p className="text-success-600 mt-1">
                {formatMoney(adv.returnedAmount)} returned on {formatDate(adv.returnedDate)}
                {adv.returnedMethod ? ` via ${METHOD_LABELS[adv.returnedMethod]}` : ''}
                {adv.returnReference ? ` · Ref: ${adv.returnReference}` : ''}
              </p>
            </div>
          )}

          {/* Expenses */}
          {adv.expenses?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">{t('advances.expenseReport')}</p>
              <table className="w-full text-sm rounded-xl overflow-hidden border border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-slate-500">Date</th>
                    <th className="px-3 py-2 text-left text-xs text-slate-500">Category</th>
                    <th className="px-3 py-2 text-left text-xs text-slate-500">Description</th>
                    <th className="px-3 py-2 text-left text-xs text-slate-500">Purchase #</th>
                    <th className="px-3 py-2 text-right text-xs text-slate-500">Amount</th>
                    {!isLocked && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adv.expenses.map(exp => (
                    <tr key={exp.id} className={exp.category === 'COFFEE_PURCHASE' ? 'bg-warning-50/40' : ''}>
                      <td className="px-3 py-2 text-xs text-slate-500">{formatDate(exp.expenseDate)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={exp.category === 'COFFEE_PURCHASE' ? 'warning' : 'default'} className="text-[10px]">
                          {CAT_LABELS[exp.category]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">{exp.description}</td>
                      <td className="px-3 py-2 text-xs font-mono text-primary-600">
                        {exp.purchase?.purchaseNumber || '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{formatMoney(exp.amount)}</td>
                      {!isLocked && (
                        <td className="px-3 py-2">
                          <button onClick={() => delExpM.mutate(exp.id)} className="p-1 text-slate-300 hover:text-danger-600 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={!isLocked ? 4 : 4} className="px-3 py-2 text-xs font-semibold text-slate-500 text-right">{t('advances.expensesLabel')}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-warning-700">{formatMoney(totalExpenses)}</td>
                    {!isLocked && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {adv.expenses?.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No expenses recorded yet.</p>
          )}

          {adv.status === 'VOIDED' && adv.voidReason && (
            <Alert variant="danger" title="Voided">Reason: {adv.voidReason}</Alert>
          )}
        </div>
      )}

      {/* ── Add Expense ── */}
      {step === 'add-expense' && (
        <AddExpenseForm advanceId={id} agentId={adv.agentId}
          onDone={() => { refresh(); setStep('view'); }}
          onError={setError}
        />
      )}

      {/* ── Record Return ── */}
      {step === 'record-return' && (
        <RecordReturnForm advanceId={id} balance={balance}
          onDone={() => { refresh(); setStep('view'); }}
          onError={setError}
        />
      )}

      {/* ── Void ── */}
      {step === 'void' && (
        <div className="space-y-4">
          <Alert variant="warning" title="Void this advance?">
            This cannot be undone. The advance and all its expenses will be marked as voided.
          </Alert>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Reason (required)</label>
            <textarea rows={3} value={voidReason} onChange={e => setVoidReason(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-danger-400"
              placeholder="Why is this advance being voided?" />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('view')}>Cancel</Button>
            <Button variant="danger" loading={voidM.isPending} disabled={!voidReason.trim()} onClick={() => voidM.mutate()}>
              Confirm Void
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Add Expense sub-form ─────────────────────────────────────────────────────

function AddExpenseForm({ advanceId, agentId, onDone, onError }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { category: 'COFFEE_PURCHASE', expenseDate: new Date().toISOString().split('T')[0] },
  });

  const { data: purchasesData } = useQuery({
    queryKey: ['purchases-agent', agentId],
    queryFn:  () => purchasesApi.list({ agentId, status: 'APPROVED', limit: 50, page: 1 }),
  });

  const mutation = useMutation({
    mutationFn: (data) => advancesApi.addExpense(advanceId, {
      ...data,
      amount: parseFloat(data.amount),
      purchaseId: data.purchaseId || undefined,
    }),
    onSuccess: onDone,
    onError: (err) => onError(err?.response?.data?.error?.message || 'Failed to add expense'),
  });

  const category = watch('category');

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <p className="text-sm text-slate-500">Record what the agent spent from this advance.</p>

      <Select label="Category" required {...register('category')}>
        {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
      </Select>

      {/* Link to purchase if coffee purchase */}
      {category === 'COFFEE_PURCHASE' && (
        <Select label="Link to Purchase (optional)" {...register('purchaseId')}>
          <option value="">No purchase linked…</option>
          {(purchasesData?.data || []).map(p => (
            <option key={p.id} value={p.id}>
              {p.purchaseNumber} — {formatDate(p.purchaseDate)}
            </option>
          ))}
        </Select>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input label="Amount (ETB)" type="number" step="0.01" min="0.01" required
          error={errors.amount?.message}
          {...register('amount', { required: 'Required', min: { value: 0.01, message: '> 0' } })}
        />
        <Input label="Date" type="date" required
          error={errors.expenseDate?.message}
          {...register('expenseDate', { required: 'Required' })}
        />
      </div>

      <Input label="Description" required
        placeholder="e.g. Bought 500KG cherry from Abebe Kebede at ETB 15/KG"
        error={errors.description?.message}
        {...register('description', { required: 'Required' })}
      />

      <Input label="Receipt / Reference" placeholder="Receipt #, waybill number…" {...register('receiptRef')} />

      <div className="flex justify-end">
        <Button type="submit" loading={mutation.isPending}>{t('advances.addExpense')}</Button>
      </div>
    </form>
  );
}

// ─── Record Return sub-form ───────────────────────────────────────────────────

function RecordReturnForm({ advanceId, balance, onDone, onError }) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      returnedAmount: balance > 0 ? balance.toFixed(2) : '0.00',
      returnedDate:   new Date().toISOString().split('T')[0],
      returnedMethod: 'CASH',
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => advancesApi.recordReturn(advanceId, {
      ...data,
      returnedAmount: parseFloat(data.returnedAmount),
    }),
    onSuccess: onDone,
    onError: (err) => onError(err?.response?.data?.error?.message || 'Failed'),
  });

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <div className="rounded-xl bg-success-50 border border-success-200 px-4 py-3 text-sm text-success-700">
        Expected return: <strong>{formatMoney(balance)}</strong>
      </div>

      <Input label="Amount Returned (ETB)" type="number" step="0.01" min="0" required
        error={errors.returnedAmount?.message}
        {...register('returnedAmount', { required: 'Required', min: { value: 0, message: '≥ 0' } })}
      />

      <button type="button" onClick={() => setValue('returnedAmount', balance.toFixed(2))}
        className="text-xs rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 transition-colors">
        Full balance ({formatMoney(balance)})
      </button>

      <div className="grid grid-cols-2 gap-4">
        <Select label="Return Method" {...register('returnedMethod')}>
          {METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
        </Select>
        <Input label="Return Date" type="date" required {...register('returnedDate', { required: 'Required' })} />
      </div>

      <Input label="Reference" placeholder="Receipt #, transfer ref…" {...register('returnReference')} />

      <div className="flex justify-end">
        <Button type="submit" loading={mutation.isPending}>{t('advances.recordReturn')}</Button>
      </div>
    </form>
  );
}
