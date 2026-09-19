import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wallet, Users, ChevronRight, CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { advancesApi } from '../../api/advances';
import { agentsApi } from '../../api/reference';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table, Thead, Th, Tbody, Tr, Td, TableEmpty } from '../../components/ui/Table';
import { PageSpinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { formatMoney, formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { GiveAdvanceModal } from './GiveAdvanceModal';
import { AdvanceDetailModal } from './AdvanceDetailModal';
import { useLanguage } from '../../context/LanguageContext';

const STATUS_COLORS = { PENDING: 'warning', ACCOUNTED: 'info', APPROVED: 'success', VOIDED: 'default' };
const STATUS_ICONS  = { PENDING: Clock, ACCOUNTED: ChevronRight, APPROVED: CheckCircle2, VOIDED: XCircle };

export default function PaymentsPage() {
  const { t } = useLanguage();
  const queryClient       = useQueryClient();
  const { isBossOrAdmin } = useAuth();
  const [tab,          setTab]         = useState('overview');
  const [showGive,     setShowGive]    = useState(false);
  const [selectedAdv,  setSelectedAdv] = useState(null);

  // All agents account overview
  const { data: overviewData, isLoading: ovLoading } = useQuery({
    queryKey: ['advances-overview'],
    queryFn:  () => advancesApi.overview(),
    enabled:  tab === 'overview',
  });

  // All advances list
  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['advances-list'],
    queryFn:  () => advancesApi.list({ limit: 100, page: 1 }),
    enabled:  tab === 'advances',
  });

  const overview  = overviewData?.data || [];
  const advances  = listData?.data    || [];

  const totalAdvanced  = overview.reduce((a, r) => a + parseFloat(r.totalAdvanced  || 0), 0);
  const totalExpenses  = overview.reduce((a, r) => a + parseFloat(r.totalExpenses  || 0), 0);
  const totalBalance   = overview.reduce((a, r) => a + parseFloat(r.balance        || 0), 0);
  const pendingCount   = advances.filter(a => a.status === 'PENDING').length;
  const awaitingCount  = advances.filter(a => a.status === 'ACCOUNTED').length;

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agent Cash Advances</h1>
          <p className="text-sm text-slate-500">Admin gives cash → Agent buys coffee → Reports expenses → Admin approves</p>
        </div>
        {isBossOrAdmin && (
          <Button onClick={() => setShowGive(true)}>
            <Plus size={16} /> Give Advance
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label={t('advances.totalAdvanced')} value={formatMoney(totalAdvanced)} color="info" />
        <SummaryCard label={t('advances.totalExpenses')} value={formatMoney(totalExpenses)} color="warning" />
        <SummaryCard label="Cash Still Held by Agents" value={formatMoney(totalBalance)} color={totalBalance > 0 ? 'danger' : 'success'} />
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('advances.awaitingApproval')}</p>
          <div className="flex items-end justify-between mt-1">
            <p className="text-2xl font-bold text-slate-900">{awaitingCount}</p>
            {pendingCount > 0 && <p className="text-xs text-warning-600">{pendingCount} pending account</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: 'overview',  label: 'Agent Accounts',  icon: Users  },
          { id: 'advances',  label: 'All Advances',     icon: Wallet },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Agent Accounts Overview ── */}
      {tab === 'overview' && (
        ovLoading ? <PageSpinner /> :
        <Card padding={false}>
          <Table>
            <Thead>
              <tr>
                <Th>Agent</Th>
                <Th className="text-center">Advances</Th>
                <Th className="text-right">Total Advanced</Th>
                <Th className="text-right">Coffee Cost</Th>
                <Th className="text-right">Other Expenses</Th>
                <Th className="text-right">Returned</Th>
                <Th className="text-right">Balance in Hand</Th>
              </tr>
            </Thead>
            <Tbody>
              {!overview.filter(a => a.advanceCount > 0).length
                ? <TableEmpty colSpan={7} message="No advances given yet — click Give Advance to start" />
                : overview.filter(a => a.advanceCount > 0).map(a => {
                  const bal = parseFloat(a.balance);
                  return (
                    <Tr key={a.agentId} onClick={() => { setTab('advances'); }}>
                      <Td>
                        <p className="font-medium text-slate-900">{a.agentName}</p>
                        <p className="text-xs text-slate-400 font-mono">{a.agentCode}</p>
                      </Td>
                      <Td className="text-center tabular-nums">{a.advanceCount}</Td>
                      <Td className="text-right tabular-nums font-medium">{formatMoney(a.totalAdvanced)}</Td>
                      <Td className="text-right tabular-nums text-warning-600">{formatMoney(a.coffeeCostTotal)}</Td>
                      <Td className="text-right tabular-nums text-slate-500">{formatMoney(a.otherExpenses)}</Td>
                      <Td className="text-right tabular-nums text-success-600">{formatMoney(a.totalReturned)}</Td>
                      <Td className={`text-right tabular-nums font-bold ${bal > 0 ? 'text-danger-600' : bal < 0 ? 'text-warning-600' : 'text-success-600'}`}>
                        {formatMoney(a.balance)}
                        {bal > 0 && <p className="text-[10px] font-normal text-danger-400">Agent holds cash</p>}
                        {bal < 0 && <p className="text-[10px] font-normal text-warning-400">Overspent</p>}
                      </Td>
                    </Tr>
                  );
                })
              }
            </Tbody>
          </Table>
          {overview.filter(a => a.advanceCount > 0).length > 0 && (
            <div className="flex items-center justify-end gap-8 px-4 py-3 border-t border-slate-100 text-sm font-semibold">
              <span className="text-slate-500">Total Advanced: <span className="tabular-nums text-info-700">{formatMoney(totalAdvanced)}</span></span>
              <span className="text-slate-500">Total Expenses: <span className="tabular-nums text-warning-700">{formatMoney(totalExpenses)}</span></span>
              <span className="text-slate-500">Net Balance: <span className={`tabular-nums ${totalBalance > 0 ? 'text-danger-600' : 'text-success-600'}`}>{formatMoney(totalBalance)}</span></span>
            </div>
          )}
        </Card>
      )}

      {/* ── All Advances List ── */}
      {tab === 'advances' && (
        listLoading ? <PageSpinner /> :
        <Card padding={false}>
          <Table>
            <Thead>
              <tr>
                <Th>Advance #</Th>
                <Th>Agent</Th>
                <Th>Date</Th>
                <Th>Method</Th>
                <Th className="text-right">Advanced</Th>
                <Th className="text-right">Expenses</Th>
                <Th className="text-right">Returned</Th>
                <Th className="text-right">Balance</Th>
                <Th>Status</Th>
              </tr>
            </Thead>
            <Tbody>
              {!advances.length
                ? <TableEmpty colSpan={9} message="No advances recorded yet" />
                : advances.map(adv => {
                  const totalExp = adv.expenses?.reduce((a, e) => a + parseFloat(e.amount || 0), 0) || 0;
                  const returned = parseFloat(adv.returnedAmount || 0);
                  const bal = parseFloat(adv.amount) - totalExp - returned;
                  const Icon = STATUS_ICONS[adv.status] || Clock;
                  return (
                    <Tr key={adv.id} onClick={() => setSelectedAdv(adv.id)}>
                      <Td className="font-medium text-primary-700">{adv.advanceNumber}</Td>
                      <Td>
                        <p className="font-medium">{adv.agent?.name}</p>
                        <p className="text-xs text-slate-400">{adv.agent?.code}</p>
                      </Td>
                      <Td>{formatDate(adv.advanceDate)}</Td>
                      <Td><Badge variant="default">{adv.paymentMethod}</Badge></Td>
                      <Td className="text-right tabular-nums font-medium">{formatMoney(adv.amount)}</Td>
                      <Td className="text-right tabular-nums text-warning-600">{formatMoney(totalExp)}</Td>
                      <Td className="text-right tabular-nums text-success-600">{formatMoney(returned)}</Td>
                      <Td className={`text-right tabular-nums font-bold ${bal > 0 ? 'text-danger-600' : bal < 0 ? 'text-warning-600' : 'text-success-600'}`}>
                        {formatMoney(bal)}
                      </Td>
                      <Td>
                        <Badge variant={STATUS_COLORS[adv.status]}>{adv.status}</Badge>
                      </Td>
                    </Tr>
                  );
                })
              }
            </Tbody>
          </Table>
        </Card>
      )}

      {/* Modals */}
      {showGive && (
        <GiveAdvanceModal
          onClose={() => setShowGive(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['advances-overview'] });
            queryClient.invalidateQueries({ queryKey: ['advances-list'] });
            setShowGive(false);
            setTab('advances');
          }}
        />
      )}

      {selectedAdv && (
        <AdvanceDetailModal
          id={selectedAdv}
          onClose={() => setSelectedAdv(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['advances-overview'] });
            queryClient.invalidateQueries({ queryKey: ['advances-list'] });
            queryClient.invalidateQueries({ queryKey: ['advance-detail', selectedAdv] });
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  const colors = { info: 'text-info-700', warning: 'text-warning-700', danger: 'text-danger-600', success: 'text-success-600' };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-xl font-bold mt-1 tabular-nums ${colors[color] || 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
