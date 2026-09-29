import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Edit2, Trash2, UserX, UserCheck, Camera, Phone, Mail,
  MapPin, TrendingUp, Package, CreditCard, Calendar, AlertTriangle,
  Wallet,
} from 'lucide-react';
import { agentsApi } from '../../api/reference';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatKg, formatMoney, formatDate } from '../../utils/format';
import { parseApiError } from '../../utils/errors';
import { AgentFormModal } from './AgentFormModal';
import { RecordPaymentModal } from '../payments/RecordPaymentModal';
import { useLanguage } from '../../context/LanguageContext';

export function AgentDetailPanel({ agentId, onActivate, onDeactivate, onDelete, onUpdated }) {
  const { t } = useLanguage();
  const queryClient   = useQueryClient();
  const [editOpen,    setEditOpen]    = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [photoError,  setPhotoError]  = useState('');
  const [payTarget,   setPayTarget]   = useState(null); // { id, purchaseNumber, remaining }
  const fileInputRef  = useRef(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['agent-stats', agentId],
    queryFn:  () => agentsApi.getWithStats(agentId),
  });

  const photoMutation = useMutation({
    mutationFn: ({ id, photoUrl }) => agentsApi.updatePhoto(id, photoUrl),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['agent-stats', agentId] });
      queryClient.invalidateQueries({ queryKey: ['agents-admin'] });
    },
    onError: (err) => setPhotoError(parseApiError(err, 'Photo update failed')),
  });

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setPhotoError('Photo must be under 2 MB'); return; }
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => photoMutation.mutate({ id: agentId, photoUrl: reader.result });
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    photoMutation.mutate({ id: agentId, photoUrl: null });
  }

  if (isLoading) return <PageSpinner />;
  if (error) return <Alert variant="danger">Failed to load agent details</Alert>;

  const a = data?.data;
  if (!a) return null;

  const initials = a.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const balance  = parseFloat(a.stats?.balance || 0);

  return (
    <div className="space-y-5">

      {/* ── Profile header card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start gap-5">

          {/* Avatar with upload */}
          <div className="relative shrink-0 group">
            {a.photoUrl ? (
              <img
                src={a.photoUrl}
                alt={a.name}
                className="h-24 w-24 rounded-2xl object-cover border-2 border-slate-200"
              />
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-primary-100 flex items-center justify-center text-3xl font-bold text-primary-700 border-2 border-primary-200">
                {initials}
              </div>
            )}
            {/* Photo overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1"
              title="Change photo"
            >
              <Camera size={18} />
              <span className="text-[10px] font-medium">Change</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900">{a.name}</h2>
                  <Badge variant={a.isActive ? 'success' : 'danger'}>
                    {a.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {a.isSupplier && <Badge variant="success">Supplier</Badge>}
                  {a.isCustomer && <Badge variant="info">Customer</Badge>}
                </div>
                <p className="text-sm font-mono text-slate-400 mt-0.5">{a.code}</p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  <Edit2 size={14} /> Edit
                </Button>
                {a.isActive ? (
                  <Button size="sm" variant="secondary" onClick={onDeactivate}>
                    <UserX size={14} /> Deactivate
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={onActivate}>
                    <UserCheck size={14} /> Activate
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </div>

            {/* Contact info */}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
              {a.phone && (
                <a href={`tel:${a.phone}`} className="flex items-center gap-1.5 hover:text-primary-600">
                  <Phone size={13} className="text-slate-400" />{a.phone}
                </a>
              )}
              {a.email && (
                <a href={`mailto:${a.email}`} className="flex items-center gap-1.5 hover:text-primary-600">
                  <Mail size={13} className="text-slate-400" />{a.email}
                </a>
              )}
              {a.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-slate-400" />{a.address}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-slate-400">
                <Calendar size={13} />Since {formatDate(a.createdAt)}
              </span>
            </div>

            {a.notes && (
              <p className="mt-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                {a.notes}
              </p>
            )}
          </div>
        </div>

        {/* Photo actions */}
        {(photoError || a.photoUrl) && (
          <div className="mt-3 flex items-center gap-3">
            {photoError && <Alert variant="danger" className="flex-1 py-1.5 text-xs">{photoError}</Alert>}
            {a.photoUrl && (
              <button onClick={removePhoto} className="text-xs text-danger-600 hover:underline ml-auto">
                Remove photo
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      {a.stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Purchases', value: a.stats.purchaseCount,           icon: Package,    color: 'text-slate-900'   },
            { label: 'Total KG',        value: formatKg(a.stats.totalKg),       icon: TrendingUp, color: 'text-primary-700' },
            { label: 'Total Amount',    value: formatMoney(a.stats.totalMoney), icon: CreditCard, color: 'text-success-700' },
            balance < 0
              ? {
                  label: 'Cash in Agent Hand',
                  value: formatMoney(Math.abs(balance)),
                  icon:  Wallet,
                  color: 'text-info-600',
                }
              : {
                  label: 'Outstanding Balance',
                  value: balance > 0 ? formatMoney(balance) : '✓ Settled',
                  icon:  AlertTriangle,
                  color: balance > 0 ? 'text-danger-600' : 'text-success-600',
                },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={13} className="text-slate-400" />
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
                </div>
                <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment summary */}
      {a.stats && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Payment Breakdown</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Total purchases</span>
            <span className="font-semibold tabular-nums">{formatMoney(a.stats.totalMoney)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Paid via payments</span>
            <span className="font-semibold text-success-600 tabular-nums">− {formatMoney(a.stats.totalPaid)}</span>
          </div>
          {parseFloat(a.stats.totalAdvanced) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Cash advances given</span>
              <span className="font-semibold text-info-600 tabular-nums">− {formatMoney(a.stats.totalAdvanced)}</span>
            </div>
          )}
          <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">
              {balance > 0 ? 'Outstanding balance' : balance < 0 ? 'Cash in agent hand' : 'Fully settled'}
            </span>
            <div className="flex items-center gap-3">
              <span className={`font-bold tabular-nums ${
                balance > 0 ? 'text-danger-600' : balance < 0 ? 'text-info-600' : 'text-success-600'
              }`}>
                {balance === 0 ? '✓ Settled' : formatMoney(Math.abs(balance))}
              </span>
              {/* Pay button — only shown when we still owe the agent money.
                  Advance already deducted from balance, so this is the true shortfall. */}
              {balance > 0.005 && (() => {
                // Find the first purchase that still has an unpaid balance for the modal
                const unpaid = a.recentPurchases?.find(p => {
                  const pMoney = p.items?.reduce((s, i) => s + parseFloat(i.totalPrice), 0) || 0;
                  const pPaid  = p.payments?.reduce((s, py) => s + parseFloat(py.amount), 0) || 0;
                  return pMoney - pPaid > 0.005;
                });
                if (!unpaid) return null;
                return (
                  <Button
                    size="xs"
                    onClick={() => setPayTarget({
                      id:             unpaid.id,
                      purchaseNumber: unpaid.purchaseNumber,
                      // Payable = agent's total outstanding balance (advance already deducted)
                      remaining:      balance,
                    })}
                  >
                    Pay {formatMoney(balance)}
                  </Button>
                );
              })()}
            </div>
          </div>
          {balance < 0 && (
            <p className="text-xs text-info-600 bg-info-50 rounded-lg px-3 py-1.5">
              Agent holds {formatMoney(Math.abs(balance))} in unused advance cash — to be returned or applied to the next purchase.
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>Avg price / KG</span>
            <span className="tabular-nums">{formatMoney(a.stats.avgPriceKg)}</span>
          </div>
        </div>
      )}

      {/* ── Recent advances ── */}
      {a.recentAdvances?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Wallet size={14} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Cash Advances</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Advance #</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Method</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Amount</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {a.recentAdvances.map(adv => {
                const statusColors = { PENDING: 'warning', ACCOUNTED: 'info', APPROVED: 'success', VOIDED: 'default' };
                return (
                  <tr key={adv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-primary-700">{adv.advanceNumber}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatDate(adv.advanceDate)}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{adv.paymentMethod}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-info-700">{formatMoney(adv.amount)}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={statusColors[adv.status] || 'default'}>{adv.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Recent purchases ── */}
      {a.recentPurchases?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">{t('agentsPage.recentHistory')}</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Purchase #</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Location</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Amount</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Balance</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {a.recentPurchases.map((p) => {
                const pMoney = p.items?.reduce((s, i) => s + parseFloat(i.totalPrice), 0) || 0;
                const pPaid  = p.payments?.reduce((s, py) => s + parseFloat(py.amount), 0) || 0;
                // Net advance on this agent's account. The advance is shared across all
                // purchases — we display the per-purchase raw balance for reference only.
                const pBal   = pMoney - pPaid;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-primary-700">{p.purchaseNumber}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatDate(p.purchaseDate)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p.location?.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(pMoney)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${pBal > 0.005 ? 'text-slate-600' : 'text-success-600'}`}>
                      {pBal > 0.005 ? formatMoney(pBal) : '✓ Paid'}
                    </td>
                    <td className="px-4 py-2.5"></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment modal */}
      {payTarget && (
        <RecordPaymentModal
          type="purchase"
          transactionId={payTarget.id}
          transactionNumber={payTarget.purchaseNumber}
          remainingAmount={payTarget.remaining}
          onClose={() => setPayTarget(null)}
          onSuccess={() => {
            setPayTarget(null);
            queryClient.invalidateQueries({ queryKey: ['agent-stats', agentId] });
          }}
        />
      )}

      {/* ── Delete confirmation ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-danger-50 flex items-center justify-center">
                <Trash2 size={18} className="text-danger-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{t('agentsPage.deleteAgent')}</p>
                <p className="text-sm text-slate-500">This action is permanent and cannot be undone.</p>
              </div>
            </div>
            <Alert variant="warning">
              Agents with purchase history cannot be deleted — deactivate them instead.
            </Alert>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => { setDeleteConfirm(false); onDelete(); }}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && (
        <AgentFormModal
          agent={a}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['agent-stats', agentId] });
            queryClient.invalidateQueries({ queryKey: ['agents-admin'] });
            onUpdated?.();
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
