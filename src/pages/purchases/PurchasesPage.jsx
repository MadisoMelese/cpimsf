import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { purchasesApi } from '../../api/purchases';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Table, Thead, Th, Tbody, Tr, Td, TableEmpty } from '../../components/ui/Table';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatKg, formatMoney, formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { CreatePurchaseModal } from './CreatePurchaseModal';
import { PurchaseDetailModal } from './PurchaseDetailModal';

export default function PurchasesPage() {
  const queryClient           = useQueryClient();
  const { isBossOrAdmin }     = useAuth();
  const { t }                 = useLanguage();
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]       = useState(1);
  const [showCreate, setShowCreate]   = useState(false);
  const [selectedId, setSelectedId]   = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', { page, status: statusFilter }],
    queryFn:  () => purchasesApi.list({ page, limit: 20, status: statusFilter || undefined }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, operationId }) => purchasesApi.approve(id, { operationId }),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['purchases'] }),
  });

  if (isLoading) return <PageSpinner />;

  const purchases = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('purchases.title')}</h1>
          <p className="text-sm text-slate-500">{t('purchases.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> {t('purchases.newPurchase')}
        </Button>
      </div>

      {/* Filters */}
      <Card padding={false}>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search purchases…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">{t('purchases.allStatuses')}</option>
            {['DRAFT','SUBMITTED','VERIFIED','APPROVED','REJECTED'].map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
        </div>

        <Table>
          <Thead>
            <tr>
              <Th>{t('purchases.purchaseNumber')}</Th>
              <Th>{t('common.date')}</Th>
              <Th>{t('common.agent')}</Th>
              <Th>{t('common.location')}</Th>
              <Th className="text-right">{t('purchases.totalKg')}</Th>
              <Th className="text-right">{t('purchases.totalAmount')}</Th>
              <Th>{t('common.status')}</Th>
              <Th>{t('common.actions')}</Th>
            </tr>
          </Thead>
          <Tbody>
            {purchases.length === 0 ? (
              <TableEmpty message={t('purchases.noPurchases')} colSpan={8} />
            ) : purchases.map((p) => {
              const totalKg  = p.items?.reduce((a, i) => a + parseFloat(i.quantityKg || 0), 0) || 0;
              const totalAmt = p.items?.reduce((a, i) => a + parseFloat(i.totalPrice || 0), 0) || 0;

              return (
                <Tr key={p.id} onClick={() => setSelectedId(p.id)}>
                  <Td className="font-medium text-primary-700">{p.purchaseNumber}</Td>
                  <Td>{formatDate(p.purchaseDate)}</Td>
                  <Td>{p.agent?.name}</Td>
                  <Td>{p.location?.name}</Td>
                  <Td className="text-right tabular-nums">{formatKg(totalKg)}</Td>
                  <Td className="text-right tabular-nums">{formatMoney(totalAmt)}</Td>
                  <Td><Badge status={p.status} /></Td>
                  <Td>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {p.status === 'VERIFIED' && isBossOrAdmin && (
                        <Button
                          size="xs"
                          loading={approveMutation.isPending}
                          onClick={() => approveMutation.mutate({ id: p.id, operationId: crypto.randomUUID() })}
                        >
                          {t('purchases.approvePurchase')}
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>

        {/* Pagination */}
        {data?.pagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, data.pagination.total)} of {data.pagination.total}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="xs" disabled={!data.pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>{t('common.previous')}</Button>
              <Button variant="secondary" size="xs" disabled={!data.pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
            </div>
          </div>
        )}
      </Card>

      {showCreate && <CreatePurchaseModal onClose={() => setShowCreate(false)} />}
      {selectedId && <PurchaseDetailModal id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
