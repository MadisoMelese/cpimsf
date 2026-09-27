import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Phone, MapPin, TrendingUp, Package, CreditCard, Calendar } from 'lucide-react';
import { reportsApi } from '../../api/reports';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { Table, Thead, Th, Tbody, Tr, Td, TableEmpty } from '../../components/ui/Table';
import { formatKg, formatMoney, formatDate, formatGrade, stateColor } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts';

export default function AgentDetailReport({ agentId, startDate, endDate, onBack }) {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ['report-agent-detail', agentId, startDate, endDate],
    queryFn:  () => reportsApi.agent(agentId, { startDate, endDate }),
  });

  if (isLoading) return <PageSpinner />;
  const d = data?.data;
  if (!d) return null;

  const { agent, summary, byGrade, byType, byLocation, byMonth, purchases } = d;
  const balanceNegative = parseFloat(summary.balance) > 0;

  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* ── Print stylesheet injected into head ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11pt; color: #000; }
          .print-break { page-break-before: always; }
          .print-avoid-break { page-break-inside: avoid; }
        }
      `}</style>

      <div className="space-y-5">

        {/* Header bar — hidden on print */}
        <div className="no-print flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Agents
          </button>
          <Button onClick={handlePrint}>
            <Printer size={15} />
            Print Report
          </Button>
        </div>

        {/* ── Print header ── */}
        <div className="print-avoid-break rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              {/* Logo + system name */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-sm">C</div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">CPIMS</p>
                  <p className="text-xs text-slate-500">Coffee Production & Inventory Management</p>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{t('reports.agentReport')}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(startDate)} — {formatDate(endDate)}</span>
                <span className="text-slate-300">|</span>
                <span>Generated: {formatDate(new Date())}</span>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-mono text-xs text-slate-400">{agent.code}</p>
              <p className="font-bold text-slate-900 text-lg">{agent.name}</p>
              {agent.phone && (
                <p className="flex items-center gap-1 text-slate-500 justify-end"><Phone size={12} />{agent.phone}</p>
              )}
              {agent.address && (
                <p className="flex items-center gap-1 text-slate-500 justify-end text-xs"><MapPin size={12} />{agent.address}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print-avoid-break">
          {[
            { label: 'Total Purchases',   value: summary.purchaseCount,           accent: 'text-slate-900' },
            { label: 'Total KG Delivered',value: formatKg(summary.totalKg),       accent: 'text-primary-700' },
            { label: 'Total Amount (ETB)',value: formatMoney(summary.totalMoney),  accent: 'text-success-700' },
            { label: 'Outstanding Balance', value: formatMoney(summary.balance),  accent: balanceNegative ? 'text-danger-600' : 'text-success-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className={`text-xl font-bold mt-1 tabular-nums ${s.accent}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Wet / Dry + avg price row */}
        <div className="grid grid-cols-3 gap-4 print-avoid-break">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Wet Coffee</p>
            <p className="text-xl font-bold text-info-700 tabular-nums mt-1">{formatKg(summary.wetKg)}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dry Coffee</p>
            <p className="text-xl font-bold text-warning-700 tabular-nums mt-1">{formatKg(summary.dryKg)}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Avg Price / KG</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{formatMoney(summary.avgPriceKg)}</p>
          </Card>
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 print-avoid-break">
          {byMonth?.length > 0 && (
            <Card>
              <CardHeader title={t('reports.monthlyTrend')} />
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={byMonth} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(3)} KG`} />
                  <Line type="monotone" dataKey="totalKg" stroke="#16a34a" strokeWidth={2} dot={true} name="KG" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
          {byGrade?.length > 0 && (
            <Card>
              <CardHeader title="KG by Grade" />
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={byGrade} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="grade" tickFormatter={(v) => `Grade ${v}`} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(3)} KG`} />
                  <Bar dataKey="totalKg" fill="#2563eb" radius={[3,3,0,0]} name="KG" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* ── By Grade table ── */}
        {byGrade?.length > 0 && (
          <Card padding={false} className="print-avoid-break">
            <CardHeader title={t('reports.gradeBreakdown')} className="px-5 pt-5" />
            <Table>
              <Thead>
                <tr>
                  <Th>Coffee Type</Th>
                  <Th>Grade</Th>
                  <Th>State</Th>
                  <Th className="text-right">Total KG</Th>
                  <Th className="text-right">Total Amount</Th>
                </tr>
              </Thead>
              <Tbody>
                {byType.map((t, i) => (
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

        {/* ── By Location ── */}
        {byLocation?.length > 0 && (
          <Card padding={false} className="print-avoid-break">
            <CardHeader title="By Reception Location" className="px-5 pt-5" />
            <Table>
              <Thead>
                <tr>
                  <Th>Location</Th>
                  <Th className="text-center">Deliveries</Th>
                  <Th className="text-right">Total KG</Th>
                  <Th className="text-right">Total Amount</Th>
                </tr>
              </Thead>
              <Tbody>
                {byLocation.map((l, i) => (
                  <Tr key={i}>
                    <Td className="font-medium">{l.locationName}</Td>
                    <Td className="text-center tabular-nums">{l.purchaseCount}</Td>
                    <Td className="text-right tabular-nums">{formatKg(l.totalKg)}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(l.totalMoney)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        )}

        {/* ── Purchase-by-purchase list ── */}
        {purchases?.length > 0 && (
          <div className="print-break">
            <Card padding={false}>
              <CardHeader
                title={t('reports.purchaseHistory')}
                subtitle={`${purchases.length} approved purchases`}
                className="px-5 pt-5"
              />
              <Table>
                <Thead>
                  <tr>
                    <Th>Purchase #</Th>
                    <Th>Date</Th>
                    <Th>Location</Th>
                    <Th>Received By</Th>
                    <Th>Approved By</Th>
                    <Th className="text-right">KG</Th>
                    <Th className="text-right">Amount</Th>
                    <Th className="text-right">Paid</Th>
                    <Th className="text-right">Balance</Th>
                    <Th>Payment</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {purchases.map((p) => (
                    <React.Fragment key={p.purchaseId}>
                      {/* Purchase header row */}
                      <Tr className="bg-slate-50">
                        <Td className="font-semibold text-primary-700">{p.purchaseNumber}</Td>
                        <Td className="font-medium">{formatDate(p.purchaseDate)}</Td>
                        <Td>{p.locationName}</Td>
                        <Td className="text-xs text-slate-500">{p.receivedBy}</Td>
                        <Td className="text-xs text-slate-500">{p.approvedBy}</Td>
                        <Td className="text-right tabular-nums font-medium">{formatKg(p.totalKg)}</Td>
                        <Td className="text-right tabular-nums font-medium">{formatMoney(p.totalMoney)}</Td>
                        <Td className="text-right tabular-nums text-success-600">{formatMoney(p.totalPaid)}</Td>
                        <Td className={`text-right tabular-nums font-semibold ${parseFloat(p.balance) > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                          {formatMoney(p.balance)}
                        </Td>
                        <Td>
                          {p.creditTerms === 'CASH'
                            ? <Badge variant="success">CASH</Badge>
                            : <Badge variant={p.isPaid ? 'success' : 'warning'}>{p.creditTerms}</Badge>}
                        </Td>
                      </Tr>

                      {/* Item sub-rows */}
                      {p.items.map((item, ii) => (
                        <Tr key={`${p.purchaseId}-item-${ii}`} className="text-xs">
                          <Td className="pl-8 text-slate-400" colSpan={2}>↳ {item.coffeeTypeName}</Td>
                          <Td>
                            <div className="flex gap-1">
                              <Badge variant={stateColor(item.state)} className="text-[10px] px-1.5 py-0">{item.state}</Badge>
                              <Badge variant="default"        className="text-[10px] px-1.5 py-0">{formatGrade(item.grade)}</Badge>
                            </div>
                          </Td>
                          <Td colSpan={2} className="text-slate-400">
                            {item.moistureContent ? `Moisture: ${item.moistureContent}%` : ''}
                          </Td>
                          <Td className="text-right tabular-nums text-slate-600">{formatKg(item.quantityKg)}</Td>
                          <Td className="text-right tabular-nums text-slate-600">{formatMoney(item.totalPrice)}</Td>
                          <Td className="text-right tabular-nums text-slate-400 text-[11px]">
                            {formatMoney(item.unitPriceKg)}/kg
                          </Td>
                          <Td colSpan={2}></Td>
                        </Tr>
                      ))}

                      {/* Payment records if any */}
                      {p.payments?.length > 0 && p.payments.map((pay, pi) => (
                        <Tr key={`${p.purchaseId}-pay-${pi}`} className="text-xs bg-success-50/50">
                          <Td className="pl-8 text-success-700" colSpan={3}>↳ Payment · {pay.paymentMethod}</Td>
                          <Td colSpan={3} className="text-success-600">{formatDate(pay.paymentDate)}{pay.reference ? ` · Ref: ${pay.reference}` : ''}</Td>
                          <Td className="text-right tabular-nums font-semibold text-success-700" colSpan={2}>{formatMoney(pay.amount)}</Td>
                          <Td colSpan={2}></Td>
                        </Tr>
                      ))}
                    </React.Fragment>
                  ))}
                </Tbody>
              </Table>

              {/* Totals footer */}
              <div className="flex items-center justify-end gap-8 px-5 py-4 border-t border-slate-200 bg-slate-50 text-sm font-semibold">
                <span>Total KG: <span className="tabular-nums text-primary-700">{formatKg(summary.totalKg)}</span></span>
                <span>Total Amount: <span className="tabular-nums text-success-700">{formatMoney(summary.totalMoney)}</span></span>
                <span>Total Paid: <span className="tabular-nums text-success-600">{formatMoney(summary.totalPaid)}</span></span>
                <span className={parseFloat(summary.balance) > 0 ? 'text-danger-600' : 'text-success-600'}>
                  Balance: <span className="tabular-nums">{formatMoney(summary.balance)}</span>
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* Print footer */}
        <div className="hidden print:block text-center text-xs text-slate-400 pt-4 border-t border-slate-200 mt-8">
          CPIMS — Agent Report for {agent.name} — Generated {new Date().toLocaleString()} — Confidential
        </div>

      </div>
    </>
  );
}
