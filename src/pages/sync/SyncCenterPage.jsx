import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { syncApi } from '../../api/sync';
import { useSync } from '../../context/SyncContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { formatDateTime } from '../../utils/format';
import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function SyncCenterPage() {
  const { t } = useLanguage();
  const queryClient                 = useQueryClient();
  const { isOnline, isSyncing, pendingCount, lastSyncAt, triggerSync } = useSync();
  const [resolveId, setResolveId]   = useState(null);
  const [resolution, setResolution] = useState('USE_SERVER');
  const [notes, setNotes]           = useState('');

  const { data: conflicts } = useQuery({
    queryKey: ['conflicts'],
    queryFn:  () => syncApi.conflicts({ status: 'OPEN' }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, data }) => syncApi.resolve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
      setResolveId(null);
      setNotes('');
    },
  });

  const openConflicts = conflicts?.data || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Sync Center</h1>
        <p className="text-sm text-slate-500">Manage offline synchronization and conflicts</p>
      </div>

      {/* Status banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isOnline ? 'bg-success-50' : 'bg-warning-50'}`}>
            {isOnline ? <CheckCircle2 className="text-success-600" size={20} /> : <XCircle className="text-warning-600" size={20} />}
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">{t('sync.connection')}</p>
            <p className="font-semibold text-slate-900">{isOnline ? 'Online' : 'Offline'}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-warning-50 flex items-center justify-center">
            <RefreshCw className={`text-warning-600 ${isSyncing ? 'animate-spin' : ''}`} size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">{t('sync.pendingOps')}</p>
            <p className="font-semibold text-slate-900">{pendingCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-danger-50 flex items-center justify-center">
            <AlertTriangle className="text-danger-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">{t('sync.openConflicts')}</p>
            <p className="font-semibold text-slate-900">{openConflicts.length}</p>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Last sync: {lastSyncAt ? formatDateTime(lastSyncAt) : 'Never'}
        </p>
        <Button onClick={triggerSync} loading={isSyncing} disabled={!isOnline}>
          <RefreshCw size={16} />
          Sync Now
        </Button>
      </div>

      {/* Conflicts */}
      {openConflicts.length > 0 && (
        <Card>
          <CardHeader
            title="Sync Conflicts — Require Manual Resolution"
            subtitle="Each conflict must be resolved by Boss/Admin. No automatic resolution is applied."
          />
          <div className="space-y-4">
            {openConflicts.map((c) => (
              <div key={c.id} className="rounded-xl border border-danger-200 bg-danger-50 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {c.entityType} — <span className="font-mono text-xs">{c.entityId}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Device: {c.deviceId} · Local v{c.localVersion} vs Server v{c.serverVersion}
                    </p>
                    <p className="text-xs text-slate-500">
                      Detected: {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                  <Badge status="CONFLICT">CONFLICT</Badge>
                </div>

                {/* Payload diff */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-slate-600 mb-1">Local version (device)</p>
                    <pre className="bg-white rounded p-2 overflow-x-auto text-xs border border-slate-200 max-h-32">
                      {JSON.stringify(c.localPayload, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600 mb-1">Server version</p>
                    <pre className="bg-white rounded p-2 overflow-x-auto text-xs border border-slate-200 max-h-32">
                      {JSON.stringify(c.serverPayload, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Resolution */}
                {resolveId === c.id ? (
                  <div className="space-y-3 pt-2 border-t border-danger-200">
                    <div className="flex gap-3">
                      {['USE_LOCAL', 'USE_SERVER', 'MANUAL'].map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input type="radio" name={`res-${c.id}`} value={opt}
                            checked={resolution === opt} onChange={() => setResolution(opt)} />
                          {opt === 'USE_LOCAL' ? 'Use local (device)' : opt === 'USE_SERVER' ? 'Use server' : 'Manual merge'}
                        </label>
                      ))}
                    </div>
                    <textarea
                      placeholder="Resolution notes (required)…"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" loading={resolveMutation.isPending} disabled={!notes.trim()}
                        onClick={() => resolveMutation.mutate({ id: c.id, data: { resolution, notes } })}>
                        Confirm Resolution
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setResolveId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="danger" onClick={() => { setResolveId(c.id); setResolution('USE_SERVER'); setNotes(''); }}>
                    Resolve Conflict
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {openConflicts.length === 0 && (
        <Alert variant="success" title={t('sync.noConflicts')}>
          All sync operations are clean. No manual resolution needed.
        </Alert>
      )}
    </div>
  );
}
