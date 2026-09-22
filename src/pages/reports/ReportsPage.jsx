import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, ChevronRight, TrendingUp, Package, Users, CreditCard } from 'lucide-react';
import { reportsApi } from '../../api/reports';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { Table, Thead, Th, Tbody, Tr, Td, TableEmpty } from '../../components/ui/Table';
import { formatKg, formatMoney, formatDate, formatPct, formatGrade, stateColor } from '../../utils/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Legend,
} from 'recharts';
import AgentDetailReport from './AgentDetailReport';
import { useLanguage } from '../../context/LanguageContext';

const TODAY       = new Date().toISOString().split('T')[0];
const MONTH_START = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

const TABS = [
  { id: 'purchases', label: 'Daily Purchases', icon: TrendingUp },
  { id: 'agents',    label: 'Agent Performance', icon: Users },
  { id: 'payments',  label: 'Payments & Credit', icon: CreditCard },
  { id: 'processing',label: 'Processing Loss', icon: Package },
];

export default function ReportsPage() {
  const { t } = useLanguage();
  const [tab,       setTab]       = useState('agents');
  const [startDate, setStartDate] = useState(MONTH_START);
  const [endDate,   setEndDate]   = useState(TODAY);
  const [selectedAgent, setSelectedAgent] = useState(null); // agent id for drilldown

  // If an agent is selected, render the drilldown
  if (selectedAgent) {
    return (
      <AgentDetailReport
        agentId={selectedAgent}
        startDate={startDate}
        endDate={endDate}
        onBack={() => setSelectedAgent(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">All figures derive from approved transactional records</p>
      </div>

      {/* Date filter */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <DateInput label="From" value={startDate} onChange={setStartDate} />
          <DateInput label="To"   value={endDate}   onChange={setEndDate}   />
          <div className="flex gap-2 ml-auto">
            {[
              { label: 'This month', start: MONTH_START, end: TODAY },
              { label: 'Last 3 months', start: nMonthsAgo(3), end: TODAY },
              { label: 'This year',  start: `${new Date().getFullYear()}-01-01`, end: TODAY },
            ].map((q) => (
              <button
                key={q.label}
                onClick={() => { setStartDate(q.start); setEndDate(q.end); }}
                className="text-xs rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'purchases'  && <PurchasesReport  startDate={startDate} endDate={endDate} />}
      {tab === 'agents'     && <AgentsReport     startDate={startDate} endDate={endDate} onSelectAgent={setSelectedAgent} />}
      {tab === 'payments'   && <PaymentsReport   startDate={startDate} endDate={endDate} />}
      {tab === 'processing' && <ProcessingReport startDate={startDate} endDate={endDate} />}
    </div>
  );
}

// ─── Date input helper ────────────────────────────────────────────────────────

function DateInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}

function nMonthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split('T')[0];
}

// ─── Purchases Report ─────────────────────────────────────────────────────────

function PurchasesReport({ startDate, endDate }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-purchases', startDate, endDate],
    queryFn:  () => reportsApi.dailyPurchases({ startDate, endDate }),
  });

  if (isLoading) return <PageSpinner />;
  const d = data?.data;
  if (!d) return null;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total KG Purchased', value: formatKg(d.summary.totalKg),       color: 'primary' },
          { label: 'Total Amount (ETB)',  value: formatMoney(d.summary.totalMoney), color: 'success' },
          { label: 'Avg Price / KG',      value: formatMoney(d.summary.averagePriceKg), color: 'info' },
          { label: 'Total Purchases',     value: d.summary.purchaseCount,           color: 'warning' },
        ].map((s) => (
          <Card key={s.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 tabular-nums text-${s.color}-700`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Wet vs dry split */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">Wet Coffee</p>
          <p className="text-2xl font-bold text-info-700 tabular-nums">{formatKg(d.summary.wetKg)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">Dry Coffee</p>
          <p className="text-2xl font-bold text-warning-700 tabular-nums">{formatKg(d.summary.dryKg)}</p>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By agent */}
        {d.byAgent?.length > 0 && (
          <Card>
            <CardHeader title="KG by Agent" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.byAgent} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="agentName" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(3)} KG`} />
                <Bar dataKey="totalKg" fill="#16a34a" radius={[3,3,0,0]} name="Total KG" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* By grade */}
        {d.byGrade?.length > 0 && (
          <Card>
            <CardHeader title="KG by Grade" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.byGrade} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="grade" tickFormatter={(v) => `Grade ${v}`} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(3)} KG`} />
                <Bar dataKey="totalKg" fill="#2563eb" radius={[3,3,0,0]} name="Total KG" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* By location table */}
      {d.byLocation?.length > 0 && (
        <Card padding={false}>
          <CardHeader title="By Reception Location" className="px-5 pt-5" />
          <Table>
            <Thead>
              <tr>
                <Th>Location</Th>
                <Th className="text-right">Purchases</Th>
                <Th className="text-right">Total KG</Th>
                <Th className="text-right">Total Amount</Th>
              </tr>
            </Thead>
            <Tbody>
              {d.byLocation.map((l, i) => (
                <Tr key={i}>
                  <Td className="font-medium">{l.locationName}</Td>
                  <Td className="text-right tabular-nums">{l.purchaseCount}</Td>
                  <Td className="text-right tabular-nums">{formatKg(l.totalKg)}</Td>
                  <Td className="text-right tabular-nums">{formatMoney(l.totalMoney)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}

      {/* Coffee type breakdown */}
      {d.byType?.length > 0 && (
        <Card padding={false}>
          <CardHeader title="By Coffee Type" className="px-5 pt-5" />
          <Table>
            <Thead>
              <tr>
                <Th>Type</Th>
                <Th>Grade</Th>
                <Th>State</Th>
                <Th className="text-right">Total KG</Th>
                <Th className="text-right">Total Amount</Th>
              </tr>
            </Thead>
            <Tbody>
              {d.byType.map((t, i) => (
                <Tr key={i}>
                  <Td className="font-medium">{t.coffeeTypeName}</Td>
                  <Td><Badge variant="default">{formatGrade(t.grade)}</Badge></Td>
                  <Td><Badge variant={stateColor(t.state)}>{t.state}</Badge></Td>
                  <Td className="text-right tabular-nums">{formatKg(t.totalKg)}</Td>
                  <Td className="text-right tabular-nums">{formatMoney(t.totalMoney)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ─── Agents Overview ──────────────────────────────────────────────────────────

function AgentsReport({ startDate, endDate, onSelectAgent }) {
  const {t} = useLanguage()
  const { data, isLoading } = useQuery({
    queryKey: ['report-agents', startDate, endDate],
    queryFn:  () => reportsApi.agents({ startDate, endDate }),
  });

  if (isLoading) return <PageSpinner />;
  const agents = data?.data || [];

  const totalKg    = agents.reduce((a, ag) => a + parseFloat(ag.totalKg    || 0), 0);
  const totalMoney = agents.reduce((a, ag) => a + parseFloat(ag.totalMoney || 0), 0);
  const totalBalance = agents.reduce((a, ag) => a + parseFloat(ag.balance  || 0), 0);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active Suppliers</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{agents.filter(a => a.purchaseCount > 0).length} <span className="text-sm font-normal text-slate-500">of {agents.length}</span></p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total KG Received</p>
          <p className="text-2xl font-bold text-primary-700 mt-1 tabular-nums">{formatKg(totalKg)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Outstanding Balance</p>
          <p className={`text-2xl font-bold mt-1 tabular-nums ${totalBalance > 0 ? 'text-danger-600' : 'text-success-600'}`}>
            {formatMoney(totalBalance)}
          </p>
        </Card>
      </div>

      {/* KG by agent chart */}
      {agents.filter(a => a.purchaseCount > 0).length > 0 && (
        <Card>
          <CardHeader title={t('reports.kgByAgent')} subtitle="Click a row below to view full agent report" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={agents.filter(a => a.purchaseCount > 0)} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="agentName" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(3)} KG`} />
              <Bar dataKey="totalKg" fill="#16a34a" radius={[3,3,0,0]} name="Total KG" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Agent table */}
      <Card padding={false}>
        <Table>
          <Thead>
            <tr>
              <Th>Agent</Th>
              <Th>Phone</Th>
              <Th className="text-center">Purchases</Th>
              <Th className="text-right">Total KG</Th>
              <Th className="text-right">Wet KG</Th>
              <Th className="text-right">Dry KG</Th>
              <Th className="text-right">Total Amount</Th>
              <Th className="text-right">Paid</Th>
              <Th className="text-right">Balance</Th>
              <Th></Th>
            </tr>
          </Thead>
          <Tbody>
            {agents.length === 0 ? (
              <TableEmpty colSpan={10} message="No agents found" />
            ) : agents.map((a) => (
              <Tr key={a.agentId} onClick={() => onSelectAgent(a.agentId)} className="cursor-pointer">
                <Td>
                  <div>
                    <p className="font-medium text-slate-900">{a.agentName}</p>
                    <p className="text-xs text-slate-400 font-mono">{a.agentCode}</p>
                  </div>
                </Td>
                <Td className="text-sm text-slate-500">{a.phone || '—'}</Td>
                <Td className="text-center tabular-nums">{a.purchaseCount}</Td>
                <Td className="text-right tabular-nums font-medium">{formatKg(a.totalKg)}</Td>
                <Td className="text-right tabular-nums text-info-600">{formatKg(a.wetKg)}</Td>
                <Td className="text-right tabular-nums text-warning-600">{formatKg(a.dryKg)}</Td>
                <Td className="text-right tabular-nums">{formatMoney(a.totalMoney)}</Td>
                <Td className="text-right tabular-nums text-success-600">{formatMoney(a.totalPaid)}</Td>
                <Td className={`text-right tabular-nums font-semibold ${parseFloat(a.balance) > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                  {formatMoney(a.balance)}
                </Td>
                <Td>
                  <ChevronRight size={16} className="text-slate-400" />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Payments Report ──────────────────────────────────────────────────────────

function PaymentsReport({ startDate, endDate }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-payments', startDate, endDate],
    queryFn:  () => reportsApi.payments({ startDate, endDate }),
  });

  if (isLoading) return <PageSpinner />;
  const d = data?.data;
  if (!d) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Purchase Payments', value: formatMoney(d.summary.totalPurchasePayments), color: 'success' },
          { label: 'Sale Receipts',     value: formatMoney(d.summary.totalSaleReceipts),     color: 'info'    },
          { label: 'Overdue',           value: d.summary.overdueCount,      color: d.summary.overdueCount > 0 ? 'danger' : 'default' },
          { label: 'Outstanding',       value: d.summary.outstandingCount,  color: 'warning' },
        ].map((s) => (
          <Card key={s.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 tabular-nums text-${s.color}-700`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Overdue */}
      {d.overdue?.length > 0 && (
        <Card padding={false}>
          <CardHeader title="Overdue Payments" subtitle="Past credit due date with remaining balance" className="px-5 pt-5" />
          <Table>
            <Thead><tr><Th>Purchase #</Th><Th>Agent</Th><Th>Due Date</Th><Th className="text-right">Remaining</Th></tr></Thead>
            <Tbody>
              {d.overdue.map((p, i) => (
                <Tr key={i}>
                  <Td className="font-medium text-primary-700">{p.purchaseNumber}</Td>
                  <Td>{p.agentName}</Td>
                  <Td className="text-danger-600 font-medium">{formatDate(p.creditDueDate)}</Td>
                  <Td className="text-right tabular-nums font-bold text-danger-600">{formatMoney(p.remainingAmount)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}

      {/* Outstanding */}
      {d.outstanding?.length > 0 && (
        <Card padding={false}>
          <CardHeader title="Outstanding Credit Balances" className="px-5 pt-5" />
          <Table>
            <Thead><tr><Th>Purchase #</Th><Th>Agent</Th><Th>Due Date</Th><Th className="text-right">Remaining</Th></tr></Thead>
            <Tbody>
              {d.outstanding.map((p, i) => (
                <Tr key={i}>
                  <Td className="font-medium text-primary-700">{p.purchaseNumber}</Td>
                  <Td>{p.agentName}</Td>
                  <Td className={new Date(p.creditDueDate) < new Date() ? 'text-danger-600 font-medium' : ''}>{formatDate(p.creditDueDate)}</Td>
                  <Td className="text-right tabular-nums font-semibold text-warning-700">{formatMoney(p.remainingAmount)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}

      {/* Recent payments */}
      {d.purchasePayments?.length > 0 && (
        <Card padding={false}>
          <CardHeader title="Purchase Payments" className="px-5 pt-5" />
          <Table>
            <Thead><tr><Th>Purchase #</Th><Th>Agent</Th><Th>Date</Th><Th>Method</Th><Th className="text-right">Amount</Th></tr></Thead>
            <Tbody>
              {d.purchasePayments.slice(0, 20).map((p) => (
                <Tr key={p.id}>
                  <Td className="font-medium text-primary-700">{p.purchase?.purchaseNumber}</Td>
                  <Td>{p.purchase?.agent?.name}</Td>
                  <Td>{formatDate(p.paymentDate)}</Td>
                  <Td><Badge variant="default">{p.paymentMethod}</Badge></Td>
                  <Td className="text-right tabular-nums font-semibold text-success-700">{formatMoney(p.amount)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ─── Processing Loss Report ───────────────────────────────────────────────────

function ProcessingReport({ startDate, endDate }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-processing', startDate, endDate],
    queryFn:  () => reportsApi.processingLoss({ startDate, endDate }),
  });

  if (isLoading) return <PageSpinner />;
  const d = data?.data;
  if (!d) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Runs',         value: d.summary.totalRuns,                color: 'default'  },
          { label: 'Total Input',  value: formatKg(d.summary.totalInputKg),   color: 'info'     },
          { label: 'Total Output', value: formatKg(d.summary.totalOutputKg),  color: 'success'  },
          { label: 'Total Loss',   value: formatKg(d.summary.totalLossKg),    color: 'warning'  },
        ].map((s) => (
          <Card key={s.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 tabular-nums text-${s.color === 'default' ? 'slate-900' : `${s.color}-700`}`}>{s.value}</p>
          </Card>
        ))}
      </div>
      {d.summary.outOfRangeCount > 0 && (
        <div className="rounded-xl bg-danger-50 border border-danger-200 px-4 py-3 text-sm text-danger-700 font-medium">
          ⚠ {d.summary.outOfRangeCount} processing run{d.summary.outOfRangeCount > 1 ? 's are' : ' is'} outside the acceptable loss range — review required.
        </div>
      )}
      {d.runs?.length > 0 && (
        <Card padding={false}>
          <Table>
            <Thead>
              <tr>
                <Th>Run Code</Th><Th>Completed</Th>
                <Th className="text-right">Input KG</Th><Th className="text-right">Output KG</Th>
                <Th className="text-right">Loss KG</Th><Th className="text-right">Loss %</Th>
                <Th>Status</Th>
              </tr>
            </Thead>
            <Tbody>
              {d.runs.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-medium text-primary-700">{r.runCode}</Td>
                  <Td>{formatDate(r.completedAt)}</Td>
                  <Td className="text-right tabular-nums">{formatKg(r.totalInputKg)}</Td>
                  <Td className="text-right tabular-nums">{formatKg(r.totalOutputKg)}</Td>
                  <Td className="text-right tabular-nums text-warning-600">{formatKg(r.lossKg)}</Td>
                  <Td className="text-right tabular-nums">{formatPct(r.lossPct)}</Td>
                  <Td>
                    {r.lossOutOfRange
                      ? <Badge variant="danger">OUT OF RANGE</Badge>
                      : <Badge variant="success">OK</Badge>}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
