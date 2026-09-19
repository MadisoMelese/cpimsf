import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, SlidersHorizontal } from 'lucide-react';
import { inventoryApi } from '../../api/inventory';
import { Card } from '../../components/ui/Card';
import { Table, Thead, Th, Tbody, Tr, Td, TableEmpty } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatKg, formatMoney, formatDateTime, stateColor, formatGrade } from '../../utils/format';
import { TransferModal } from './TransferModal';
import { AdjustmentModal } from './AdjustmentModal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function InventoryPage() {
  const { t } = useLanguage();
  const queryClient            = useQueryClient();
  const { isBossOrAdmin }      = useAuth();
  const [tab,         setTab]  = useState('overview');
  const [batchPage,   setBatchPage]  = useState(1);
  const [ledgerPage,  setLedgerPage] = useState(1);
  const [batchFilter, setBatchFilter]= useState('ACTIVE');
  const [showTransfer,   setShowTransfer]   = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['inventory-overview'],
    queryFn:  () => inventoryApi.overview(),
    enabled:  tab === 'overview',
  });

  const { data: batches, isLoading: batLoading } = useQuery({
    queryKey: ['batches', batchPage, batchFilter],
    queryFn:  () => inventoryApi.batches({ page: batchPage, limit: 25, status: batchFilter || undefined }),
    enabled:  tab === 'batches',
  });

  const { data: ledger, isLoading: ledLoading } = useQuery({
    queryKey: ['ledger', ledgerPage],
    queryFn:  () => inventoryApi.ledger({ page: ledgerPage, limit: 25 }),
    enabled:  tab === 'ledger',
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory-overview'] });
    queryClient.invalidateQueries({ queryKey: ['batches'] });
    queryClient.invalidateQueries({ queryKey: ['ledger'] });
  };

  const TABS = [
    { id: 'overview', label: 'Stock Overview'  },
    { id: 'batches',  label: 'Batch Register'  },
    { id: 'ledger',   label: 'Stock Ledger'    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">Batch-level stock tracking — every KG is traced</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowTransfer(true)}>
            <ArrowRightLeft size={14} /> Transfer
          </Button>
          {isBossOrAdmin && (
            <Button variant="secondary" size="sm" onClick={() => setShowAdjustment(true)}>
              <SlidersHorizontal size={14} /> Adjust
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        ovLoading ? <PageSpinner /> :
        <Card padding={false}>
          <Table>
            <Thead><tr><Th>Location</Th><Th>Coffee Type</Th><Th>Grade</Th><Th>State</Th><Th className="text-right">Total KG</Th><Th className="text-right">Cost Value</Th><Th className="text-right">Batches</Th></tr></Thead>
            <Tbody>
              {!overview?.data?.length ? <TableEmpty colSpan={7} /> :
                overview.data.map((row, i) => (
                  <Tr key={i}>
                    <Td className="font-medium">{row.locationName}</Td>
                    <Td>{row.coffeeTypeName}</Td>
                    <Td><Badge variant="default">{row.grade ? `Grade ${row.grade}` : '—'}</Badge></Td>
                    <Td><Badge variant={stateColor(row.state)}>{row.state || '—'}</Badge></Td>
                    <Td className="text-right tabular-nums font-semibold">{formatKg(row.totalKg)}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(row.totalCost)}</Td>
                    <Td className="text-right">{row.batchCount}</Td>
                  </Tr>
                ))
              }
            </Tbody>
          </Table>
          {/* Totals */}
          {overview?.data?.length > 0 && (
            <div className="flex justify-end gap-8 px-4 py-3 border-t border-slate-100 text-sm font-semibold">
              <span className="text-slate-500">Total Stock: <span className="text-primary-700 tabular-nums">{formatKg(overview.data.reduce((a,r)=>a+parseFloat(r.totalKg||0),0))}</span></span>
              <span className="text-slate-500">Total Value: <span className="text-success-700 tabular-nums">{formatMoney(overview.data.reduce((a,r)=>a+parseFloat(r.totalCost||0),0))}</span></span>
            </div>
          )}
        </Card>
      )}

      {/* Batches */}
      {tab === 'batches' && (
        <Card padding={false}>
          <div className="p-4 border-b border-slate-100 flex gap-3">
            <select value={batchFilter} onChange={e => { setBatchFilter(e.target.value); setBatchPage(1); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">All statuses</option>
              {['ACTIVE','PARTIALLY_CONSUMED','CONSUMED','TRANSFERRED','ADJUSTED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {batLoading ? <PageSpinner /> : (
            <>
              <Table>
                <Thead><tr><Th>{t('inventory.batchCode')}</Th><Th>Coffee Type</Th><Th>Grade</Th><Th>State</Th><Th>Location</Th><Th className="text-right">{t('inventory.originalKg')}</Th><Th className="text-right">{t('inventory.remainingKg')}</Th><Th className="text-right">Cost/KG</Th><Th>Status</Th></tr></Thead>
                <Tbody>
                  {!batches?.data?.length ? <TableEmpty colSpan={9} /> :
                    batches.data.map(b => (
                      <Tr key={b.id}>
                        <Td className="font-medium text-primary-700">{b.batchCode}</Td>
                        <Td>{b.coffeeType?.name}</Td>
                        <Td><Badge variant="default">{formatGrade(b.coffeeType?.grade)}</Badge></Td>
                        <Td><Badge variant={stateColor(b.coffeeType?.state)}>{b.coffeeType?.state}</Badge></Td>
                        <Td>{b.location?.name}</Td>
                        <Td className="text-right tabular-nums">{formatKg(b.originalKg)}</Td>
                        <Td className="text-right tabular-nums font-semibold">{formatKg(b.remainingKg)}</Td>
                        <Td className="text-right tabular-nums text-xs text-slate-500">{formatMoney(b.costPerKg)}</Td>
                        <Td><Badge status={b.status} /></Td>
                      </Tr>
                    ))
                  }
                </Tbody>
              </Table>
              <PaginationBar data={batches} page={batchPage} setPage={setBatchPage} />
            </>
          )}
        </Card>
      )}

      {/* Ledger */}
      {tab === 'ledger' && (
        ledLoading ? <PageSpinner /> :
        <Card padding={false}>
          <Table>
            <Thead><tr><Th>Date/Time</Th><Th>Batch</Th><Th>Location</Th><Th>{t('inventory.movement')}</Th><Th className="text-right">KG</Th><Th>By</Th></tr></Thead>
            <Tbody>
              {!ledger?.data?.length ? <TableEmpty colSpan={6} /> :
                ledger.data.map(e => (
                  <Tr key={e.id}>
                    <Td className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(e.postedAt)}</Td>
                    <Td className="font-mono text-xs text-primary-700">{e.batch?.batchCode}</Td>
                    <Td className="text-xs">{e.location?.name}</Td>
                    <Td>
                      <span className={`text-xs font-medium rounded px-2 py-0.5 ${
                        e.movementType.includes('RECEIPT') || e.movementType.includes('OUTPUT') || e.movementType.includes('IN') || e.movementType.includes('INCREASE')
                          ? 'bg-success-100 text-success-700'
                          : e.movementType.includes('REVERSAL')
                            ? 'bg-info-100 text-info-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {e.movementType.replace(/_/g, ' ')}
                      </span>
                    </Td>
                    <Td className={`text-right tabular-nums font-semibold ${parseFloat(e.quantityKg) < 0 ? 'text-danger-600' : 'text-success-600'}`}>
                      {parseFloat(e.quantityKg) > 0 ? '+' : ''}{formatKg(e.quantityKg)}
                    </Td>
                    <Td className="text-xs text-slate-500">{e.performedBy?.fullName}</Td>
                  </Tr>
                ))
              }
            </Tbody>
          </Table>
          <PaginationBar data={ledger} page={ledgerPage} setPage={setLedgerPage} />
        </Card>
      )}

      {showTransfer && (
        <TransferModal onClose={() => setShowTransfer(false)} onSuccess={() => { setShowTransfer(false); invalidate(); }} />
      )}
      {showAdjustment && (
        <AdjustmentModal onClose={() => setShowAdjustment(false)} onSuccess={() => { setShowAdjustment(false); invalidate(); }} />
      )}
    </div>
  );
}

function PaginationBar({ data, page, setPage }) {
  if (!data?.pagination) return null;
  const { hasPrevPage, hasNextPage, total } = data.pagination;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
      <span>Total: {total}</span>
      <div className="flex gap-2">
        <Button variant="secondary" size="xs" disabled={!hasPrevPage} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <Button variant="secondary" size="xs" disabled={!hasNextPage} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
