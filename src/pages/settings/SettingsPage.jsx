import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { locationsApi, coffeeTypesApi } from '../../api/reference';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { useForm } from 'react-hook-form';
import { useLanguage } from '../../context/LanguageContext';

export default function SettingsPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('locations');
  const TABS = [
    { id: 'locations',    label: 'Locations'    },
    { id: 'coffee-types', label: 'Coffee Types' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage reference data — locations, coffee types, grades</p>
      </div>
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'locations'    && <LocationsTab />}
      {tab === 'coffee-types' && <CoffeeTypesTab />}
    </div>
  );
}

// ─── Locations ────────────────────────────────────────────────────────────────

function LocationsTab() {
  const queryClient          = useQueryClient();
  const [editing,  setEditing]  = useState(null);  // null | location object
  const [creating, setCreating] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['locations-settings'],
    queryFn:  locationsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => locationsApi.update(id, { isActive: false }),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['locations-settings'] }),
  });

  const locations = data?.data || [];

  return (
    <Card>
      <CardHeader title={t('settings.locationsTitle')}
        subtitle="Physical locations where coffee is received, stored, or processed"
        actions={<Button size="sm" onClick={() => setCreating(true)}><Plus size={14} /> Add</Button>}
      />
      <div className="space-y-2">
        {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
        {locations.map(l => (
          <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-900">{l.name}</p>
                <Badge variant={l.isActive ? 'success' : 'default'}>{l.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono">{l.code}</p>
              {l.description && <p className="text-xs text-slate-400 mt-0.5">{l.description}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditing(l)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                <Pencil size={14} />
              </button>
              {l.isActive && (
                <button onClick={() => deleteMutation.mutate(l.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
        {!isLoading && locations.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">{t('settings.noLocations')}</p>
        )}
      </div>
      {(creating || editing) && (
        <LocationFormModal
          location={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['locations-settings'] }); setCreating(false); setEditing(null); }}
        />
      )}
    </Card>
  );
}

function LocationFormModal({ location, onClose, onSuccess }) {
  const [error, setError] = useState('');
  const isEdit = Boolean(location);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: isEdit ? { name: location.name, code: location.code, description: location.description || '' } : {},
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? locationsApi.update(location.id, data) : locationsApi.create(data),
    onSuccess,
    onError: (err) => setError(err?.response?.data?.error?.message || 'Failed'),
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? `Edit — ${location.name}` : 'Add Location'} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="loc-form" loading={mutation.isPending}>{isEdit ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      {error && <Alert variant="danger" className="mb-3" onDismiss={() => setError('')}>{error}</Alert>}
      <form id="loc-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        {!isEdit && (
          <Input label="Code" required placeholder="e.g. WH-NORTH"
            error={errors.code?.message} {...register('code', { required: 'Required' })} />
        )}
        <Input label="Name" required error={errors.name?.message}
          {...register('name', { required: 'Required' })} />
        <Input label="Description" {...register('description')} />
      </form>
    </Modal>
  );
}

// ─── Coffee Types ─────────────────────────────────────────────────────────────

const STATE_COLORS = { WET: 'info', DRY: 'warning', PARCHMENT: 'primary', HULLED: 'default', GREEN: 'success', SORTED: 'primary', GRADED: 'success' };

function CoffeeTypesTab() {
  const queryClient           = useQueryClient();
  const [editing,  setEditing]  = useState(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['coffee-types-settings'],
    queryFn:  () => coffeeTypesApi.list(),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => coffeeTypesApi.update(id, { isActive: false }),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['coffee-types-settings'] }),
  });

  const coffeeTypes = data?.data || [];

  return (
    <Card>
      <CardHeader title="Coffee Types &amp; Grades"
        subtitle="Define the coffee types your operation handles — grade 1/2/3 or AA/AB etc."
        actions={<Button size="sm" onClick={() => setCreating(true)}><Plus size={14} /> Add</Button>}
      />
      <div className="space-y-2">
        {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
        {coffeeTypes.map(c => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-slate-900">{c.name}</p>
                <Badge variant={STATE_COLORS[c.state] || 'default'}>{c.state}</Badge>
                {c.grade && <Badge variant="default">Grade {c.grade}</Badge>}
                {!c.isActive && <Badge variant="danger">Inactive</Badge>}
              </div>
              <p className="text-xs text-slate-400 font-mono">{c.code}</p>
              {c.description && <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                <Pencil size={14} />
              </button>
              {c.isActive && (
                <button onClick={() => deactivateMutation.mutate(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
        {!isLoading && coffeeTypes.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">{t('settings.noCoffeeTypes')}</p>
        )}
      </div>
      {(creating || editing) && (
        <CoffeeTypeFormModal
          coffeeType={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['coffee-types-settings'] }); setCreating(false); setEditing(null); }}
        />
      )}
    </Card>
  );
}

function CoffeeTypeFormModal({ coffeeType, onClose, onSuccess }) {
  const [error, setError] = useState('');
  const isEdit = Boolean(coffeeType);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: isEdit
      ? { name: coffeeType.name, grade: coffeeType.grade || '', state: coffeeType.state, description: coffeeType.description || '' }
      : { state: 'WET' },
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? coffeeTypesApi.update(coffeeType.id, data) : coffeeTypesApi.create(data),
    onSuccess,
    onError: (err) => setError(err?.response?.data?.error?.message || 'Failed'),
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? `Edit — ${coffeeType.name}` : 'Add Coffee Type'} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="ct-form" loading={mutation.isPending}>{isEdit ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      {error && <Alert variant="danger" className="mb-3" onDismiss={() => setError('')}>{error}</Alert>}
      <form id="ct-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        {!isEdit && (
          <Input label="Code" required placeholder="e.g. CW-G1"
            error={errors.code?.message} {...register('code', { required: 'Required' })} />
        )}
        <Input label="Name" required error={errors.name?.message} {...register('name', { required: 'Required' })} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="State" required {...register('state', { required: 'Required' })}>
            {['WET','DRY','PARCHMENT','HULLED','GREEN','SORTED','GRADED'].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label={t('settings.grade')} placeholder="1, 2, 3, AA, AB…" {...register('grade')} />
        </div>
        <Input label="Description" {...register('description')} />
      </form>
    </Modal>
  );
}
