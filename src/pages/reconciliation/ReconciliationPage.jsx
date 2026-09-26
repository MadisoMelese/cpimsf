import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Lock, ClipboardCheck, SlidersHorizontal, CreditCard } from 'lucide-react';
import { reconciliationApi } from '../../api/reconciliation';
import { purchasesApi } from '../../api/purchases';
import { Card, CardHeader } from '../../components/ui/Card';
import { Table, Thead, Th, Tbody, Tr, Td, TableEmpty } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate, formatKg, formatMoney } from '../../utils/format';
import { parseApiError } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { locationsApi } from '../../api/reference';
import { newOperationId } from '../../utils/operationId';
import { useLanguage } from '../../context/LanguageContext';

export default function ReconciliationPage() {
  const { t } = useLanguage();
  const queryClient       = useQueryClient();
  const { isBossOrAdmin } = useAuth();
  const [showCreate, setShowCreate]   = useState(false);
  const [selectedId, setSelectedId]   = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reconciliation-sessions'],
    queryFn:  () => reconciliationApi.sessions(),
  });

  if (isLoading) return <PageSpinner />;
  const sessions = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reconciliation</h1>
          <p className="text-sm text-slate-500">Physical stock verification and period locking</p>
        </div>
        {isBossOrAdmin && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Open Session
          </Button>
        )}
      </div>

      <Card padding={false}>
        <Table>
          <Thead>
            <tr>
              <Th>{t('reconciliation.sessionNumber')}</Th><Th>Location</Th><Th>{t('reconciliation.period')}</Th>
              <Th>{t('reconciliation.openedBy')}</Th><Th>Status</Th><Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {!sessions.length ? <TableEmpty colSpan={6} /> :
              sessions.map((s) => (
                <Tr key={s.id} onClick={() => setSelectedId(s.id)}>
                  <Td className="font-medium text-primary-700">{s.sessionCode}</Td>
                  <Td>{s.location?.name || 'All locations'}</Td>
                  <Td className="text-sm">{formatDate(s.periodStart)} – {formatDate(s.periodEnd)}</Td>
                  <Td className="text-sm">{s.openedBy?.fullName}</Td>
                  <Td><Badge status={s.status} /></Td>
                  <Td onClick={e => e.stopPropagation()}>
                    <Button size="xs" variant="secondary" onClick={() => setSelectedId(s.id)}>
                      Open
                    </Button>
                  </Td>
                </Tr>
              ))
            }
          </Tbody>
        </Table>
      </Card>

      {showCreate && <CreateSessionModal onClose={() => setShowCreate(false)} />}
      {selectedId && (
        <SessionDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

// ─── Create Session Modal ─────────────────────────────────────────────────────

function CreateSessionModal({ onClose }) {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: locationsApi.list });
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      periodStart: new Date().toISOString().split('T')[0],
      periodEnd:   new Date().toISOString().split('T')[0],
    },
  });

  const mutation = useMutation({
    mutationFn: (d) => reconciliationApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reconciliation-sessions'] }); onClose(); },
  });

  return (
    <Modal open onClose={onClose} title="Open Reconciliation Session"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="rec-form" loading={mutation.isPending}>{t('reconciliation.openSession')}</Button>
        </>
      }
    >
      <form id="rec-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <Select label="Location (optional)" {...register('locationId')}>
          <option value="">{t('reconciliation.allLocations')}</option>
          {(locations?.data || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('reconciliation.periodStart')} type="date" required error={errors.periodStart?.message} {...register('periodStart', { required: 'Required' })} />
          <Input label={t('reconciliation.periodEnd')}   type="date" required error={errors.periodEnd?.message}   {...register('periodEnd',   { required: 'Required' })} />
        </div>
        <Input label="Notes" {...register('notes')} />
      </form>
    </Modal>
  );
}

// ─── Session Detail Modal — Verify, Adjust, Close ────────────────────────────

function SessionDetailModal({ id, onClose }) {
  const queryClient       = useQueryClient();
  const { isBossOrAdmin } = useAuth();
  const { t }             = useLanguage();
  const toast             = useToast();
  const [step,        setStep]        = useState('view'); // view | verify | adjust | grade-payment | close
  const [error,       setError]       = useState('');
  const [closeNotes,  setCloseNotes]  = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['rec-session', id],
    queryFn:  () => reconciliationApi.session(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rec-session', id] });
    queryClient.invalidateQueries({ queryKey: ['reconciliation-sessions'] });
  };

  const closeMutation = useMutation({
    mutationFn: () => reconciliationApi.close(id, { notes: closeNotes }),
    onSuccess: () => { invalidate(); setStep('view'); toast.success('Period closed and locked.'); },
    onError: (err) => setError(parseApiError(err, 'Close failed')),
  });

  if (isLoading) return <Modal open onClose={onClose} title="Session"><PageSpinner /></Modal>;
  const s = data?.data;
  if (!s) return null;

  return (
    <Modal open onClose={onClose} title={`Session — ${s.sessionCode}`} size="xl"
      footer={
        <div className="flex items-center gap-2 w-full">
          <div className="flex gap-2 flex-1">
            {s.status !== 'CLOSED' && step === 'view' && (
              <>
                <Button size="sm" onClick={() => setStep('verify')}><ClipboardCheck size={14} /> Record Counts</Button>
                {isBossOrAdmin && <Button size="sm" variant="secondary" onClick={() => setStep('grade-payment')}><CreditCard size={14} /> Grade &amp; Payment</Button>}
                {isBossOrAdmin && <Button size="sm" variant="secondary" onClick={() => setStep('adjust')}><SlidersHorizontal size={14} /> Add Adjustment</Button>}
                {isBossOrAdmin && <Button size="sm" variant="danger" onClick={() => setStep('close')}><Lock size={14} /> Close & Lock</Button>}
              </>
            )}
            {step !== 'view' && <Button size="sm" variant="secondary" onClick={() => { setStep('view'); setError(''); }}>← Back</Button>}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}

      {/* ── View ── */}
      {step === 'view' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Period:</span> <span className="font-medium">{formatDate(s.periodStart)} – {formatDate(s.periodEnd)}</span></div>
            <div><span className="text-slate-500">Location:</span> <span className="font-medium">{s.location?.name || 'All'}</span></div>
            <div><span className="text-slate-500">Status:</span> <Badge status={s.status} /></div>
            <div><span className="text-slate-500">Opened:</span> <span className="font-medium">{formatDate(s.openedAt)} by {s.openedBy?.fullName}</span></div>
            {s.closedAt && <div><span className="text-slate-500">Closed:</span> <span className="font-medium">{formatDate(s.closedAt)} by {s.closedBy?.fullName}</span></div>}
          </div>

          {/* Verifications */}
          {s.verifications?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Physical Counts Recorded</p>
              <table className="w-full text-sm rounded-xl overflow-hidden border border-slate-200">
                <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left text-xs text-slate-500">Batch</th><th className="px-3 py-2 text-right text-xs text-slate-500">System KG</th><th className="px-3 py-2 text-right text-xs text-slate-500">Physical KG</th><th className="px-3 py-2 text-right text-xs text-slate-500">Difference</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {s.verifications.map(v => (
                    <tr key={v.id}>
                      <td className="px-3 py-2 text-xs font-mono">{v.batchId ? v.batchId.slice(0,8)+'…' : 'Overall'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatKg(v.systemKg)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatKg(v.physicalKg)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-medium ${parseFloat(v.differenceKg) < 0 ? 'text-danger-600' : parseFloat(v.differenceKg) > 0 ? 'text-warning-600' : 'text-success-600'}`}>
                        {parseFloat(v.differenceKg) > 0 ? '+' : ''}{formatKg(v.differenceKg)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Adjustments */}
          {s.adjustments?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Adjustments</p>
              <div className="space-y-1">
                {s.adjustments.map((a, i) => (
                  <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${a.direction === 'INCREASE' ? 'bg-success-50 border border-success-200' : 'bg-danger-50 border border-danger-200'}`}>
                    <span>{a.direction === 'INCREASE' ? '+' : '−'} {formatKg(a.quantityKg)} — {a.reason}</span>
                    <Badge variant={a.direction === 'INCREASE' ? 'success' : 'danger'}>{a.direction}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {s.status === 'CLOSED' && (
            <Alert variant="success" title={t('reconciliation.closedLocked')}>
              This period is locked. No stock ledger entries can be backdated into {formatDate(s.periodStart)}–{formatDate(s.periodEnd)}.
            </Alert>
          )}
        </div>
      )}

      {/* ── Grade & Payment (Admin only) ── */}
      {step === 'grade-payment' && (
        <GradePaymentForm session={s} onDone={() => { invalidate(); setStep('view'); }} onError={setError} />
      )}

      {/* ── Verify ── */}
      {step === 'verify' && (
        <VerifyForm sessionId={id} onDone={() => { invalidate(); setStep('view'); }} onError={setError} />
      )}

      {/* ── Adjust ── */}
      {step === 'adjust' && (
        <AdjustForm sessionId={id} onDone={() => { invalidate(); setStep('view'); }} onError={setError} />
      )}

      {/* ── Close ── */}
      {step === 'close' && (
        <div className="space-y-4">
          <Alert variant="warning" title="This action is permanent">
            Closing this session will lock the period <strong>{formatDate(s.periodStart)}–{formatDate(s.periodEnd)}</strong>.
            No stock entries can be backdated into this period after closing.
            Ensure all discrepancies have been resolved with adjustments.
          </Alert>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">{t('reconciliation.closingNotes')}</label>
            <textarea rows={3} value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Notes about this reconciliation…" />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('view')}>Cancel</Button>
            <Button variant="danger" loading={closeMutation.isPending} onClick={() => closeMutation.mutate()}>
              <Lock size={14} /> Close &amp; Lock Period
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Verify sub-form ──────────────────────────────────────────────────────────

function VerifyForm({ sessionId, onDone, onError }) {
  const { t } = useLanguage();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { verifications: [{ physicalKg: '', notes: '' }] },
  });

  const mutation = useMutation({
    mutationFn: (data) => reconciliationApi.verify(sessionId, {
      verifications: data.verifications.map(v => ({ physicalKg: parseFloat(v.physicalKg), notes: v.notes || undefined })),
    }),
    onSuccess: onDone,
    onError: (err) => onError(parseApiError(err, 'Verification failed')),
  });

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <p className="text-sm text-slate-500">Record the physical KG count. The system will compute the difference automatically.</p>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Physical KG Count" type="number" step="0.001" min="0"
          required error={errors.verifications?.[0]?.physicalKg?.message}
          {...register('verifications.0.physicalKg', { required: 'Required', min: { value: 0, message: 'Must be ≥ 0' } })}
        />
        <Input label="Notes" placeholder="Counting method, observations…"
          {...register('verifications.0.notes')}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={mutation.isPending}>{t('reconciliation.saveCount')}</Button>
      </div>
    </form>
  );
}

// ─── Adjust sub-form ──────────────────────────────────────────────────────────

function AdjustForm({ sessionId, onDone, onError }) {
  const { t } = useLanguage();
  const { data: batchesA } = useQuery({ queryKey: ['batches-active'],  queryFn: () => import('../../api/inventory').then(m => m.inventoryApi.batches({ status: 'ACTIVE', limit: 200, page: 1 })) });
  const { data: batchesP } = useQuery({ queryKey: ['batches-partial'], queryFn: () => import('../../api/inventory').then(m => m.inventoryApi.batches({ status: 'PARTIALLY_CONSUMED', limit: 200, page: 1 })) });
  const allBatches = [...(batchesA?.data || []), ...(batchesP?.data || [])];

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { batchId: '', direction: 'DECREASE', quantityKg: '', reason: '' },
  });

  const mutation = useMutation({
    mutationFn: (data) => reconciliationApi.adjust(sessionId, {
      batchId:    data.batchId,
      direction:  data.direction,
      quantityKg: parseFloat(data.quantityKg),
      reason:     data.reason,
      operationId: newOperationId(),
    }),
    onSuccess: onDone,
    onError: (err) => onError(parseApiError(err, 'Adjustment failed')),
  });

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <Select label="Batch" required error={errors.batchId?.message} {...register('batchId', { required: 'Required' })}>
        <option value="">Select batch…</option>
        {allBatches.map(b => <option key={b.id} value={b.id}>{b.batchCode} — {b.coffeeType?.name} · {parseFloat(b.remainingKg).toFixed(3)} KG</option>)}
      </Select>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Direction" {...register('direction')}>
          <option value="DECREASE">Decrease (write-off)</option>
          <option value="INCREASE">Increase (found stock)</option>
        </Select>
        <Input label="Quantity (KG)" type="number" step="0.001" min="0.001" required
          error={errors.quantityKg?.message} {...register('quantityKg', { required: 'Required', min: { value: 0.001, message: '> 0' } })} />
      </div>
      <Input label="Reason" required placeholder="Explain the discrepancy…"
        error={errors.reason?.message} {...register('reason', { required: 'Required' })} />
      <div className="flex justify-end">
        <Button type="submit" loading={mutation.isPending}>{t('reconciliation.applyAdj')}</Button>
      </div>
    </form>
  );
}

// ─── Grade & Payment Form (Admin only, inside reconciliation session) ─────────
// Lists all APPROVED purchases in the session period.
// Admin can set: grade (coffee type per item), payment type, due date.

function GradePaymentForm({ session, onDone, onError }) {
  const queryClient = useQueryClient();

  // Fetch approved purchases within this session's period
  const { data: purchasesData, isLoading } = useQuery({
    queryKey: ['purchases-for-recon', session.id],
    queryFn:  () => purchasesApi.list({
      status:    'APPROVED',
      startDate: session.periodStart?.split('T')[0],
      endDate:   session.periodEnd?.split('T')[0],
      limit:     200, page: 1,
    }),
  });

  const purchases = purchasesData?.data || [];

  if (isLoading) return <PageSpinner />;

  if (purchases.length === 0) {
    return (
      <Alert variant="info" title="No approved purchases in this period">
        No approved purchases found between {formatDate(session.periodStart)} and {formatDate(session.periodEnd)}.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Set payment terms and review grades for each approved purchase in this period.
        Grades are determined by the coffee type selected when receiving.
      </p>

      <div className="space-y-3">
        {purchases.map(p => (
          <PurchaseGradePaymentRow
            key={p.id}
            purchase={p}
            onUpdated={() => queryClient.invalidateQueries({ queryKey: ['purchases-for-recon', session.id] })}
            onError={onError}
          />
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}

function PurchaseGradePaymentRow({ purchase, onUpdated, onError }) {
  const [editing, setEditing] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      grade:         purchase.items?.[0]?.coffeeType?.grade || '',
      creditTerms:   purchase.creditTerms   || 'CASH',
      creditDueDate: purchase.creditDueDate ? purchase.creditDueDate.split('T')[0] : '',
      notes:         purchase.notes || '',
    },
  });

  const creditTerms = watch('creditTerms');

  const totalKg    = purchase.items?.reduce((a, i) => a + parseFloat(i.quantityKg || 0), 0) || 0;
  const totalMoney = purchase.items?.reduce((a, i) => a + parseFloat(i.totalPrice  || 0), 0) || 0;

  const mutation = useMutation({
    mutationFn: (data) => purchasesApi.setGradePayment(purchase.id, {
      creditTerms:   data.creditTerms,
      creditDueDate: data.creditDueDate || undefined,
      grade:         data.grade         || undefined,
      notes:         data.notes || undefined,
    }),
    onSuccess: () => { setEditing(false); onUpdated(); },
    onError: (err) => onError(parseApiError(err, 'Update failed')),
  });

  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
      {/* Purchase header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary-700">{purchase.purchaseNumber}</span>
            <Badge status={purchase.status} />
            <Badge variant={purchase.creditTerms === 'CASH' ? 'success' : purchase.creditDueDate && new Date(purchase.creditDueDate) < new Date() ? 'danger' : 'warning'}>
              {purchase.creditTerms === 'CASH' ? 'CASH' : purchase.creditTerms}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {purchase.agent?.name} · {formatDate(purchase.purchaseDate)} · {purchase.location?.name}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums">{totalKg.toFixed(3)} KG</p>
          <p className="text-sm text-success-700 tabular-nums">ETB {totalMoney.toLocaleString('en-ET', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Coffee items with grades */}
      <div className="flex flex-wrap gap-2">
        {purchase.items?.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs">
            <span className="font-medium">{item.coffeeType?.name}</span>
            {item.coffeeType?.grade && <Badge variant="default" className="text-[10px]">Grade {item.coffeeType.grade}</Badge>}
            <span className="text-slate-400">{parseFloat(item.quantityKg).toFixed(3)} KG</span>
          </div>
        ))}
      </div>

      {/* Payment terms */}
      {!editing ? (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <span className="text-slate-500">Payment: </span>
            <span className="font-medium">{purchase.creditTerms}</span>
            {purchase.creditDueDate && (
              <span className={`ml-2 ${new Date(purchase.creditDueDate) < new Date() ? 'text-danger-600 font-semibold' : 'text-slate-500'}`}>
                · Due {formatDate(purchase.creditDueDate)}
              </span>
            )}
          </div>
          <Button size="xs" variant="secondary" onClick={() => setEditing(true)}>
            <CreditCard size={12} /> Set Payment
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-3 pt-1 border-t border-slate-100">
          {/* Grade — Admin assigns here, not at receiving time */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Grade</label>
            <div className="flex gap-2">
              {['', '1', '2', '3'].map(g => (
                <label key={g} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" value={g} {...register('grade')}
                    className="text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm">{g === '' ? 'Not graded' : `Grade ${g}`}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Payment Type" {...register('creditTerms')}>
              <option value="CASH">Cash (paid immediately)</option>
              <option value="NET_7">Net 7 days</option>
              <option value="NET_14">Net 14 days</option>
              <option value="NET_30">Net 30 days</option>
              <option value="NET_60">Net 60 days</option>
              <option value="CUSTOM">Custom due date</option>
            </Select>
            {creditTerms !== 'CASH' && (
              <Input label="Due Date" type="date"
                hint="Leave blank to auto-calculate from terms"
                {...register('creditDueDate')} />
            )}
          </div>
          <Input label="Notes (optional)" {...register('notes')} />
          <div className="flex gap-2 justify-end">
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={mutation.isPending}>Save</Button>
          </div>
        </form>
      )}
    </div>
  );
}
