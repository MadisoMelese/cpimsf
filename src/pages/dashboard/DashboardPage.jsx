import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, ShoppingCart, AlertTriangle, RefreshCw } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { inventoryApi } from '../../api/inventory';
import { purchasesApi } from '../../api/purchases';
import { salesApi } from '../../api/sales';
import { useSync } from '../../context/SyncContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatKg, formatDate } from '../../utils/format';

export default function DashboardPage() {
  // conflicts and online state come from SyncContext — no extra query needed
  const { isOnline, pendingCount, conflicts } = useSync();
  const { t } = useLanguage();
  const conflictCount = conflicts.length;

  const { data: inventory, isLoading: invLoading } = useQuery({
    queryKey: ['inventory-overview'],
    queryFn:  () => inventoryApi.overview(),
  });

  const { data: recentPurchases } = useQuery({
    queryKey: ['purchases-recent'],
    queryFn:  () => purchasesApi.list({ limit: 5, page: 1 }),
  });

  const { data: recentSales } = useQuery({
    queryKey: ['sales-recent'],
    queryFn:  () => salesApi.list({ limit: 5, page: 1 }),
  });

  if (invLoading) return <PageSpinner />;

  const totalStockKg = inventory?.data?.reduce((a, s) => a + parseFloat(s.totalKg || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('dashboard.title')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t('dashboard.subtitle')}</p>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-3 rounded-xl bg-warning-50 border border-warning-200 px-4 py-3 text-sm text-warning-700">
          <RefreshCw size={16} />
          <span>{t('dashboard.offlineBanner')}{pendingCount > 0 && ` (${pendingCount} ${t('common.pending')})`}</span>
        </div>
      )}

      {/* Conflict banner */}
      {conflictCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-danger-50 border border-danger-200 px-4 py-3 text-sm text-danger-700">
          <AlertTriangle size={16} />
          <span>{conflictCount} {t('dashboard.conflictBanner')}</span>
          <Link to="/conflicts" className="font-semibold underline ml-auto">{t('dashboard.resolve')}</Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('dashboard.totalStock')}   value={formatKg(totalStockKg)}                          icon={Package}       color="primary" />
        <StatCard label={t('dashboard.purchases')}    value={recentPurchases?.pagination?.total ?? '—'}        icon={ShoppingCart}  color="warning" />
        <StatCard label={t('dashboard.sales')}        value={recentSales?.pagination?.total ?? '—'}            icon={TrendingUp}    color="success" />
        <StatCard label={t('dashboard.openConflicts')}value={conflictCount} icon={AlertTriangle} color={conflictCount > 0 ? 'danger' : 'info'} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by location */}
        <Card>
          <CardHeader title={t('dashboard.stockByLocation')} />
          {!inventory?.data?.length ? (
            <p className="text-sm text-slate-400 text-center py-8">{t('dashboard.noStock')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {inventory.data.map((row, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{row.locationName}</p>
                    <p className="text-xs text-slate-500">{row.coffeeTypeName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">{formatKg(row.totalKg)}</p>
                    <p className="text-xs text-slate-500">
                      {row.batchCount} {row.batchCount !== 1 ? t('dashboard.batches') : t('dashboard.batch')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent purchases */}
        <Card>
          <CardHeader
            title={t('dashboard.recentPurchases')}
            actions={<Link to="/purchases" className="text-xs text-primary-600 hover:underline">{t('dashboard.viewAll')}</Link>}
          />
          {!recentPurchases?.data?.length ? (
            <p className="text-sm text-slate-400 text-center py-8">{t('dashboard.noPurchases')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPurchases.data.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.purchaseNumber}</p>
                    <p className="text-xs text-slate-500">{p.agent?.name} · {formatDate(p.purchaseDate)}</p>
                  </div>
                  <Badge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
