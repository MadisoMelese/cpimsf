import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../api/reference';
import { Card } from '../../components/ui/Card';
import { Table, Thead, Th, Tbody, Tr, Td, TableEmpty } from '../../components/ui/Table';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDateTime } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';

export default function AuditPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit', { page, entityType }],
    queryFn:  () => auditApi.list({ page, limit: 50, entityType: entityType || undefined }),
  });

  if (isLoading) return <PageSpinner />;
  const logs = data?.data || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500">Immutable history of all important system actions</p>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-slate-100">
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">{t('audit.allEntities')}</option>
            {['purchase','sale','batch','payment','processingRun','stockAdjustment','user'].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <Table>
          <Thead>
            <tr>
              <Th>{t('audit.timestamp')}</Th>
              <Th>{t('audit.action')}</Th>
              <Th>{t('audit.entity')}</Th>
              <Th>Entity ID</Th>
              <Th>{t('audit.user')}</Th>
              <Th>IP</Th>
            </tr>
          </Thead>
          <Tbody>
            {!logs.length ? <TableEmpty colSpan={6} /> :
              logs.map((l) => (
                <Tr key={l.id}>
                  <Td className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(l.createdAt)}</Td>
                  <Td><span className="text-xs font-mono bg-slate-100 rounded px-2 py-0.5">{l.action}</span></Td>
                  <Td className="text-xs">{l.entityType}</Td>
                  <Td className="text-xs font-mono text-slate-500 truncate max-w-[120px]" title={l.entityId}>{l.entityId}</Td>
                  <Td className="text-xs">{l.user?.fullName || l.userId || '—'}</Td>
                  <Td className="text-xs text-slate-400">{l.ipAddress || '—'}</Td>
                </Tr>
              ))
            }
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
