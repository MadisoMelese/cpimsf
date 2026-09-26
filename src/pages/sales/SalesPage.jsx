import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { salesApi } from '../../api/sales';
import { Card } from '../../components/ui/Card';
import { Table, Thead, Th, Tbody, Tr, Td, TableEmpty } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatKg, formatMoney, formatDate } from '../../utils/format';
import { CreateSaleModal } from './CreateSaleModal';
import { SaleDetailModal } from './SaleDetailModal';
import { useLanguage } from '../../context/LanguageContext';

export default function SalesPage() {
  const { t } = useLanguage();
  const [page,         setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search,       setSearch]       = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [selectedId,   setSelectedId]   = useState(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['sales', { page, status: statusFilter, search }],
    queryFn:  () => salesApi.list({
      page,
      limit:  20,
      status: statusFilter || undefined,
      search: search       || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  if (isLoading && !data) return <PageSpinner />;
  const sales = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales</h1>
          <p className="text-sm text-slate-500">{t('sales.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Sale
        </Button>
      </div>

      <Card padding={false}>
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search by sale #, customer…" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {isFetching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            )}
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">{t('sales.allStatuses')}</option>
            {['DRAFT', 'CONFIRMED', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="text-sm text-slate-500 ml-auto">
            {data?.pagination?.total ?? 0} record{data?.pagination?.total !== 1 ? 's' : ''}
          </span>
        </div>

        <Table>
          <Thead>
            <tr>
              <Th>{t('sales.saleNumber')}</Th>
              <Th>Date</Th>
              <Th>{t('sales.customer')}</Th>
              <Th className="text-right">Total KG</Th>
              <Th className="text-right">{t('sales.saleAmount')}</Th>
              <Th className="text-right">Cost</Th>
              <Th className="text-right">{t('sales.grossMargin')}</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <Tbody>
            {!sales.length
              ? <TableEmpty colSpan={8} message="No sales yet — click New Sale to start" />
              : sales.map((s) => {
                const margin = parseFloat(s.grossMargin || 0);
                return (
                  <Tr key={s.id} onClick={() => setSelectedId(s.id)}>
                    <Td className="font-medium text-primary-700">{s.saleNumber}</Td>
                    <Td>{formatDate(s.saleDate)}</Td>
                    <Td>{s.agent?.name}</Td>
                    <Td className="text-right tabular-nums">{s.totalKg ? formatKg(s.totalKg) : '—'}</Td>
                    <Td className="text-right tabular-nums">{s.totalSaleAmount ? formatMoney(s.totalSaleAmount) : '—'}</Td>
                    <Td className="text-right tabular-nums text-slate-500">{s.totalCostAmount ? formatMoney(s.totalCostAmount) : '—'}</Td>
                    <Td className={`text-right tabular-nums font-semibold ${margin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                      {s.grossMargin ? formatMoney(s.grossMargin) : '—'}
                    </Td>
                    <Td><Badge status={s.status} /></Td>
                  </Tr>
                );
              })
            }
          </Tbody>
        </Table>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, data.pagination.total)} of {data.pagination.total}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="xs" disabled={!data.pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="secondary" size="xs" disabled={!data.pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      {showCreate && (
        <CreateSaleModal
          onClose={() => setShowCreate(false)}
          onCreated={(sale) => setSelectedId(sale?.id)}
        />
      )}
      {selectedId && (
        <SaleDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
