import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, SlidersHorizontal, Search, Award, ImagePlus, X } from 'lucide-react';
import { inventoryApi } from '../../api/inventory';
import { Card } from '../../components/ui/Card';
import { Table, Thead, Th, Tbody, Tr, Td, TableEmpty } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatKg, formatMoney, formatDateTime, stateColor, formatGrade } from '../../utils/format';
import { parseApiError } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';
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
  const [batchSearch, setBatchSearch]= useState('');
  const [showTransfer,   setShowTransfer]   = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [gradeTarget,    setGradeTarget]    = useState(null); // batch object
  const [certTarget,     setCertTarget]     = useState(null); // batch object

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['inventory-overview'],
    queryFn:  () => inventoryApi.overview(),
    enabled:  tab === 'overview',
  });

  const { data: batches, isLoading: batLoading } = useQuery({
    queryKey: ['batches', batchPage, batchFilter, batchSearch],
    queryFn:  () => inventoryApi.batches({
      page:   batchPage,
      limit:  25,
      status: batchFilter  || undefined,
      search: batchSearch  || undefined,
    }),
    enabled:  tab === 'batches',
    placeholderData: (prev) => prev,
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
    { id: 'overview', label: 'Stock Overview' },
    { id: 'batches',  label: 'Batch Register' },
    { id: 'ledger',   label: 'Stock Ledger'   },
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

      {/* ── Overview ── */}
      {tab === 'overview' && (
        ovLoading ? <PageSpinner /> :
        <Card padding={false}>
          <Table>
            <Thead>
              <tr>
                <Th>Location</Th><Th>Coffee Type</Th><Th>Grade</Th><Th>State</Th>
                <Th className="text-right">Total KG</Th>
                <Th className="text-right">Cost Value</Th>
                <Th className="text-right">Batches</Th>
              </tr>
            </Thead>
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
          {overview?.data?.length > 0 && (
            <div className="flex justify-end gap-8 px-4 py-3 border-t border-slate-100 text-sm font-semibold">
              <span className="text-slate-500">Total Stock: <span className="text-primary-700 tabular-nums">{formatKg(overview.data.reduce((a, r) => a + parseFloat(r.totalKg || 0), 0))}</span></span>
              <span className="text-slate-500">Total Value: <span className="text-success-700 tabular-nums">{formatMoney(overview.data.reduce((a, r) => a + parseFloat(r.totalCost || 0), 0))}</span></span>
            </div>
          )}
        </Card>
      )}

      {/* ── Batch Register ── */}
      {tab === 'batches' && (
        <Card padding={false}>
          {/* Filters */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search batch code, coffee type…"
                value={batchSearch}
                onChange={(e) => { setBatchSearch(e.target.value); setBatchPage(1); }}
                className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {batchSearch && (
                <button onClick={() => { setBatchSearch(''); setBatchPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
            {/* Status filter */}
            <select
              value={batchFilter}
              onChange={(e) => { setBatchFilter(e.target.value); setBatchPage(1); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All statuses</option>
              {['ACTIVE','PARTIALLY_CONSUMED','CONSUMED','TRANSFERRED','ADJUSTED'].map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {batLoading ? <PageSpinner /> : (
            <>
              <Table>
                <Thead>
                  <tr>
                    <Th>{t('inventory.batchCode')}</Th>
                    <Th>Coffee Type</Th>
                    <Th>Grade</Th>
                    <Th>State</Th>
                    <Th>Location</Th>
                    <Th className="text-right">{t('inventory.originalKg')}</Th>
                    <Th className="text-right">{t('inventory.remainingKg')}</Th>
                    <Th className="text-right">Cost/KG</Th>
                    <Th>Status</Th>
                    {isBossOrAdmin && <Th>Actions</Th>}
                  </tr>
                </Thead>
                <Tbody>
                  {!batches?.data?.length ? <TableEmpty colSpan={isBossOrAdmin ? 10 : 9} /> :
                    batches.data.map(b => (
                      <Tr key={b.id}>
                        <Td className="font-medium text-primary-700 font-mono">{b.batchCode}</Td>
                        <Td>{b.coffeeType?.name}</Td>
                        <Td>
                          {b.grade
                            ? <Badge variant="success">Grade {b.grade}</Badge>
                            : <span className="text-xs text-slate-400">Not graded</span>}
                        </Td>
                        <Td><Badge variant={stateColor(b.coffeeType?.state)}>{b.coffeeType?.state}</Badge></Td>
                        <Td>{b.location?.name}</Td>
                        <Td className="text-right tabular-nums">{formatKg(b.originalKg)}</Td>
                        <Td className="text-right tabular-nums font-semibold">{formatKg(b.remainingKg)}</Td>
                        <Td className="text-right tabular-nums text-xs text-slate-500">{formatMoney(b.costPerKg)}</Td>
                        <Td>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge status={b.status} />
                            {b.certificateImageUrl && (
                              <span className="text-[10px] text-success-600 font-medium">📄 Certificate</span>
                            )}
                          </div>
                        </Td>
                        {isBossOrAdmin && (
                          <Td>
                            <div className="flex gap-1">
                              {/* Grade button — available on any active/partial batch */}
                              {['ACTIVE','PARTIALLY_CONSUMED','CONSUMED'].includes(b.status) && (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => setGradeTarget(b)}
                                  title="Set grade"
                                >
                                  <Award size={13} /> Grade
                                </Button>
                              )}
                              {/* Certificate upload — only after fully consumed */}
                              {b.status === 'CONSUMED' && (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => setCertTarget(b)}
                                  title="Upload certificate"
                                >
                                  <ImagePlus size={13} />
                                  {b.certificateImageUrl ? 'Update Cert' : 'Add Cert'}
                                </Button>
                              )}
                            </div>
                          </Td>
                        )}
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

      {/* ── Stock Ledger ── */}
      {tab === 'ledger' && (
        ledLoading ? <PageSpinner /> :
        <Card padding={false}>
          <Table>
            <Thead>
              <tr>
                <Th>Date/Time</Th><Th>Batch</Th><Th>Location</Th>
                <Th>{t('inventory.movement')}</Th>
                <Th className="text-right">KG</Th><Th>By</Th>
              </tr>
            </Thead>
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

      {/* Modals */}
      {showTransfer && (
        <TransferModal onClose={() => setShowTransfer(false)} onSuccess={() => { setShowTransfer(false); invalidate(); }} />
      )}
      {showAdjustment && (
        <AdjustmentModal onClose={() => setShowAdjustment(false)} onSuccess={() => { setShowAdjustment(false); invalidate(); }} />
      )}
      {gradeTarget && (
        <GradeBatchModal
          batch={gradeTarget}
          onClose={() => setGradeTarget(null)}
          onSuccess={() => { setGradeTarget(null); invalidate(); }}
        />
      )}
      {certTarget && (
        <CertificateModal
          batch={certTarget}
          onClose={() => setCertTarget(null)}
          onSuccess={() => { setCertTarget(null); invalidate(); }}
        />
      )}
    </div>
  );
}

// ─── Grade Batch Modal ────────────────────────────────────────────────────────

function GradeBatchModal({ batch, onClose, onSuccess }) {
  const toast = useToast();
  const [grade, setGrade] = useState(batch.grade || '');

  const mutation = useMutation({
    mutationFn: () => inventoryApi.gradeBatch(batch.id, grade || null),
    onSuccess: () => {
      toast.success(`Grade ${grade || 'cleared'} set for ${batch.batchCode}.`);
      onSuccess();
    },
    onError: (err) => toast.error(parseApiError(err, 'Failed to set grade')),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Grade Batch — ${batch.batchCode}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Save Grade
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Batch info */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Coffee Type</span>
            <span className="font-medium">{batch.coffeeType?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">State</span>
            <Badge variant={stateColor(batch.coffeeType?.state)}>{batch.coffeeType?.state}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Original KG</span>
            <span className="font-medium tabular-nums">{formatKg(batch.originalKg)}</span>
          </div>
        </div>

        {/* Grade selection */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Grade</p>
          <div className="grid grid-cols-4 gap-2">
            {['', '1', '2', '3'].map((g) => (
              <button
                key={g || 'none'}
                type="button"
                onClick={() => setGrade(g)}
                className={`rounded-lg border-2 py-2.5 text-sm font-semibold transition-colors ${
                  grade === g
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600 hover:border-primary-300'
                }`}
              >
                {g ? `Grade ${g}` : 'None'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Certificate Upload Modal ─────────────────────────────────────────────────

function CertificateModal({ batch, onClose, onSuccess }) {
  const toast    = useToast();
  const fileRef  = useRef(null);
  const [preview, setPreview] = useState(batch.certificateImageUrl || null);
  const [imageUrl, setImageUrl] = useState(batch.certificateImageUrl || '');
  const [error, setError] = useState('');

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  const mutation = useMutation({
    mutationFn: () => inventoryApi.uploadCertificate(batch.id, imageUrl),
    onSuccess: () => {
      toast.success(`Certificate saved for ${batch.batchCode}.`);
      onSuccess();
    },
    onError: (err) => toast.error(parseApiError(err, 'Failed to save certificate')),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Ministry Certificate — ${batch.batchCode}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={mutation.isPending}
            disabled={!imageUrl}
            onClick={() => mutation.mutate()}
          >
            Save Certificate
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert variant="info">
          Upload the certificate image issued by the Coffee Ministry after this batch was fully sold.
          Accepted formats: JPG, PNG, WEBP (max 5 MB).
        </Alert>

        {error && <Alert variant="danger">{error}</Alert>}

        {/* Preview */}
        {preview ? (
          <div className="relative rounded-xl overflow-hidden border border-slate-200">
            <img src={preview} alt="Certificate" className="w-full max-h-64 object-contain bg-slate-50" />
            <button
              onClick={() => { setPreview(null); setImageUrl(''); }}
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-slate-600 hover:text-danger-600"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-primary-400 py-10 flex flex-col items-center gap-2 text-slate-400 hover:text-primary-600 transition-colors"
          >
            <ImagePlus size={28} strokeWidth={1.5} />
            <span className="text-sm font-medium">Click to upload certificate image</span>
            <span className="text-xs">JPG, PNG, WEBP · Max 5 MB</span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />

        {/* Batch info */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Batch</span>
            <span className="font-mono font-medium text-primary-700">{batch.batchCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Coffee Type</span>
            <span className="font-medium">{batch.coffeeType?.name}</span>
          </div>
          {batch.grade && (
            <div className="flex justify-between">
              <span className="text-slate-500">Grade</span>
              <Badge variant="success">Grade {batch.grade}</Badge>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Original KG</span>
            <span className="font-medium tabular-nums">{formatKg(batch.originalKg)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

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
