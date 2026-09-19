import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { processingApi } from '../../api/processing';
import { Card } from '../../components/ui/Card';
import { Table, Thead, Th, Tbody, Tr, Td, TableEmpty } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatKg, formatDate, formatPct, formatMoney } from '../../utils/format';
import { ProcessingRunModal } from './ProcessingRunModal';
import { CreateProcessingModal } from './CreateProcessingModal';
import { useLanguage } from '../../context/LanguageContext';

export default function ProcessingPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [page,        setPage]        = useState(1);
  const [statusFilter,setStatusFilter]= useState('');
  const [selectedId,  setSelectedId]  = useState(null);
  const [showCreate,  setShowCreate]  = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['processing', { page, status: statusFilter }],
    queryFn:  () => processingApi.list({ page, limit: 20, status: statusFilter || undefined }),
  });

  if (isLoading) return <PageSpinner />;
  const runs = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Processing</h1>
          <p className="text-sm text-slate-500">Transform wet coffee → dry with full batch lineage and loss tracking</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Run
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('processing.allStatuses')}</option>
            {['DRAFT','IN_PROGRESS','COMPLETED','CANCELLED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="text-sm text-slate-400 ml-auto">{data?.pagination?.total ?? 0} runs</span>
        </div>

        <Table>
          <Thead>
            <tr>
              <Th>{t('processing.runCode')}</Th>
              <Th>Status</Th>
              <Th className="text-right">{t('processing.inputKg')}</Th>
              <Th className="text-right">{t('processing.outputKg')}</Th>
              <Th className="text-right">{t('processing.lossKg')}</Th>
              <Th className="text-right">{t('processing.lossPct')}</Th>
              <Th>{t('processing.lossStatus')}</Th>
              <Th>{t('processing.completed')}</Th>
            </tr>
          </Thead>
          <Tbody>
            {!runs.length
              ? <TableEmpty colSpan={8} message="No processing runs yet — click New Run to start" />
              : runs.map((r) => (
                <Tr key={r.id} onClick={() => setSelectedId(r.id)}>
                  <Td className="font-medium text-primary-700">{r.runCode}</Td>
                  <Td><Badge status={r.status} /></Td>
                  <Td className="text-right tabular-nums">{r.totalInputKg  ? formatKg(r.totalInputKg)  : '—'}</Td>
                  <Td className="text-right tabular-nums">{r.totalOutputKg ? formatKg(r.totalOutputKg) : '—'}</Td>
                  <Td className="text-right tabular-nums text-warning-600">{r.lossKg ? formatKg(r.lossKg) : '—'}</Td>
                  <Td className="text-right tabular-nums">{r.lossPct ? formatPct(r.lossPct) : '—'}</Td>
                  <Td>
                    {r.status === 'COMPLETED' && (
                      r.lossOutOfRange
                        ? <Badge variant="danger">OUT OF RANGE</Badge>
                        : <Badge variant="success">OK</Badge>
                    )}
                  </Td>
                  <Td className="text-sm text-slate-500">{r.completedAt ? formatDate(r.completedAt) : '—'}</Td>
                </Tr>
              ))
            }
          </Tbody>
        </Table>

        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>Page {page} of {data.pagination.totalPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="xs" disabled={!data.pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="secondary" size="xs" disabled={!data.pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {showCreate && (
        <CreateProcessingModal
          onClose={() => setShowCreate(false)}
          onCreated={(run) => { setShowCreate(false); setSelectedId(run.id); queryClient.invalidateQueries({ queryKey: ['processing'] }); }}
        />
      )}

      {selectedId && (
        <ProcessingRunModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
