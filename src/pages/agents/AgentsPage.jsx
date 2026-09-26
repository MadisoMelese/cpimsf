import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserCircle, MoreVertical, ChevronRight, Phone, Mail, MapPin } from 'lucide-react';
import { agentsApi } from '../../api/reference';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatKg, formatMoney } from '../../utils/format';
import { AgentDetailPanel } from './AgentDetailPanel';
import { AgentFormModal } from './AgentFormModal';

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const [search,           setSearch]           = useState('');
  const [includeInactive,  setIncludeInactive]  = useState(false);
  const [filterType,       setFilterType]       = useState('all');   // all | supplier | customer
  const [selectedId,       setSelectedId]       = useState(null);
  const [showCreate,       setShowCreate]       = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ['agents-admin', { search, includeInactive, filterType }],
    queryFn:  () => agentsApi.list({
      page: 1, limit: 200,
      search:          search           || undefined,
      includeInactive: includeInactive  ? 'true' : undefined,
      isSupplier:      filterType === 'supplier' ? 'true' : filterType === 'customer' ? undefined : undefined,
      isCustomer:      filterType === 'customer' ? 'true' : undefined,
    }),
    placeholderData: (prev) => prev,
  });

  const agents = (data?.data || []).filter(a => {
    if (filterType === 'supplier') return a.isSupplier;
    if (filterType === 'customer') return a.isCustomer;
    return true;
  });

  const activateM   = useMutation({ mutationFn: (id) => agentsApi.activate(id),   onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents-admin'] }) });
  const deactivateM = useMutation({ mutationFn: (id) => agentsApi.deactivate(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents-admin'] }) });
  const deleteM     = useMutation({
    mutationFn: (id) => agentsApi.remove(id),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['agents-admin'] }); setSelectedId(null); },
  });

  const supplierCount = (data?.data || []).filter(a => a.isSupplier).length;
  const customerCount = (data?.data || []).filter(a => a.isCustomer).length;
  const activeCount   = (data?.data || []).filter(a => a.isActive).length;

  return (
    <div className="flex gap-5 h-full" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* ── Left panel: list ── */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Agents</h1>
            <p className="text-xs text-slate-500">{activeCount} active · {supplierCount} suppliers · {customerCount} customers</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, code, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1">
          {[
            { id: 'all',      label: 'All'      },
            { id: 'supplier', label: 'Suppliers' },
            { id: 'customer', label: 'Customers' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                filterType === f.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded"
          />
          Show inactive agents
        </label>

        {/* Agent list */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {agents.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No agents found</p>
          )}
          {agents.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              selected={selectedId === a.id}
              onClick={() => setSelectedId(a.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Right panel: detail ── */}
      <div className="flex-1 min-w-0">
        {selectedId ? (
          <AgentDetailPanel
            agentId={selectedId}
            onActivate={   () => activateM.mutate(selectedId)}
            onDeactivate={ () => deactivateM.mutate(selectedId)}
            onDelete={     () => {
              if (window.confirm('Permanently delete this agent? This cannot be undone.')) {
                deleteM.mutate(selectedId);
              }
            }}
            onUpdated={() => queryClient.invalidateQueries({ queryKey: ['agents-admin'] })}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <UserCircle size={48} strokeWidth={1} />
            <p className="text-sm">Select an agent to view details</p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <AgentFormModal
          onClose={() => setShowCreate(false)}
          onSaved={(agent) => {
            queryClient.invalidateQueries({ queryKey: ['agents-admin'] });
            setSelectedId(agent.id);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Agent card in list ────────────────────────────────────────────────────────

function AgentCard({ agent, selected, onClick }) {
  const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        selected
          ? 'bg-primary-50 border border-primary-200'
          : 'bg-white border border-slate-200 hover:border-primary-200 hover:bg-primary-50/30'
      }`}
    >
      {/* Avatar */}
      <div className="shrink-0">
        {agent.photoUrl ? (
          <img
            src={agent.photoUrl}
            alt={agent.name}
            className="h-10 w-10 rounded-full object-cover border border-slate-200"
          />
        ) : (
          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold ${
            agent.isActive ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'
          }`}>
            {initials}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${agent.isActive ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
            {agent.name}
          </p>
          {!agent.isActive && <Badge variant="danger" className="text-[10px] px-1.5 shrink-0">Inactive</Badge>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-400 font-mono">{agent.code}</span>
          {agent.isSupplier && <Badge variant="success" className="text-[10px] px-1.5">Supplier</Badge>}
          {agent.isCustomer && <Badge variant="info"    className="text-[10px] px-1.5">Customer</Badge>}
        </div>
        {agent.phone && <p className="text-xs text-slate-400 truncate mt-0.5">{agent.phone}</p>}
      </div>

      <ChevronRight size={14} className={selected ? 'text-primary-500' : 'text-slate-300'} />
    </button>
  );
}
