import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus, AlertTriangle, X } from 'lucide-react';
import { locationsApi, coffeeTypesApi } from '../../api/reference';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { parseApiError } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';
import { useForm } from 'react-hook-form';
import { useLanguage } from '../../context/LanguageContext';

export default function SettingsPage() {
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
        {TABS.map(tab_ => (
          <button key={tab_.id} onClick={() => setTab(tab_.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === tab_.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {tab_.label}
          </button>
        ))}
      </div>
      {tab === 'locations'    && <LocationsTab />}
      {tab === 'coffee-types' && <CoffeeTypesTab />}
    </div>
  );
}

// ─── Inline confirm row ───────────────────────────────────────────────────────
// Replaces the item row with a warning strip + confirm / cancel buttons.

function ConfirmDeactivateRow({ name, onConfirm, onCancel, loading }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3">
      <AlertTriangle size={15} className="shrink-0 text-warning-500" />
      <p className="flex-1 text-sm text-warning-800">
        Deactivate <strong>{name}</strong>? It won't appear in new transactions.
      </p>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <X size={12} /> Cancel
        </button>
        <Button size="xs" variant="danger" loading={loading} onClick={onConfirm}>
          Deactivate
        </Button>
      </div>
    </div>
  );
}

// ─── Locations tab ────────────────────────────────────────────────────────────

function LocationsTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing,       setEditing]       = useState(null);
  const [creating,      setCreating]      = useState(false);
  const [confirmingId,  setConfirmingId]  = useState(null); // id of row showing inline confirm

  const { data, isLoading } = useQuery({
    queryKey: ['locations-settings'],
    queryFn:  locationsApi.list,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => locationsApi.update(id, { isActive: false }),
    onSuccess: () => {
      setConfirmingId(null);
      queryClient.invalidateQueries({ queryKey: ['locations-settings'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location deactivated successfully.');
    },
    onError: (err) => {
      setConfirmingId(null);
      toast.error(parseApiError(err, 'Failed to deactivate location.'));
    },
  });

  const locations = data?.data || [];

  return (
    <Card>
      <CardHeader
        title={t('settings.locationsTitle')}
        subtitle="Physical locations where coffee is received, stored, or processed"
        actions={<Button size="sm" onClick={() => setCreating(true)}><Plus size={14} /> Add</Button>}
      />
      <div className="space-y-2">
        {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

        {locations.map(l => (
          confirmingId === l.id ? (
            <ConfirmDeactivateRow
              key={l.id}
              name={l.name}
              loading={deactivateMutation.isPending}
              onConfirm={() => deactivateMutation.mutate(l.id)}
              onCancel={() => setConfirmingId(null)}
            />
          ) : (
            <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{l.name}</p>
                  <Badge variant={l.isActive ? 'success' : 'default'}>
                    {l.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 font-mono">{l.code}</p>
                {l.description && <p className="text-xs text-slate-400 mt-0.5">{l.description}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditing(l)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                {l.isActive && (
                  <button
                    onClick={() => setConfirmingId(l.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                    title="Deactivate"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )
        ))}

        {!isLoading && locations.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">{t('settings.noLocations')}</p>
        )}
      </div>

      {(creating || editing) && (
        <LocationFormModal
          location={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['locations-settings'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

function LocationFormModal({ location, onClose, onSuccess }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [error, setError] = useState('');
  const isEdit = Boolean(location);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: isEdit
      ? { name: location.name, code: location.code, description: location.description || '' }
      : {},
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? locationsApi.update(location.id, data)
      : locationsApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Location updated.' : 'Location created.');
      onSuccess?.();
    },
    onError: (err) => setError(parseApiError(err, 'Failed to save location')),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit — ${location.name}` : 'Add Location'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="loc-form" loading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
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

// ─── Coffee Types tab ─────────────────────────────────────────────────────────

const STATE_COLORS = {
  WET: 'info', DRY: 'warning', PARCHMENT: 'primary',
  HULLED: 'default', GREEN: 'success', SORTED: 'primary', GRADED: 'success',
};

function CoffeeTypesTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing,       setEditing]       = useState(null);
  const [creating,      setCreating]      = useState(false);
  const [confirmingId,  setConfirmingId]  = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['coffee-types-settings'],
    queryFn:  () => coffeeTypesApi.list(),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => coffeeTypesApi.update(id, { isActive: false }),
    onSuccess: () => {
      setConfirmingId(null);
      queryClient.invalidateQueries({ queryKey: ['coffee-types-settings'] });
      queryClient.invalidateQueries({ queryKey: ['coffee-types'] });
      toast.success('Coffee type deactivated successfully.');
    },
    onError: (err) => {
      setConfirmingId(null);
      toast.error(parseApiError(err, 'Failed to deactivate coffee type.'));
    },
  });

  const coffeeTypes = data?.data || [];

  return (
    <Card>
      <CardHeader
        title="Coffee Types & Grades"
        subtitle="Define the coffee types your operation handles — grade 1/2/3 or AA/AB etc."
        actions={<Button size="sm" onClick={() => setCreating(true)}><Plus size={14} /> Add</Button>}
      />
      <div className="space-y-2">
        {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

        {coffeeTypes.map(c => (
          confirmingId === c.id ? (
            <ConfirmDeactivateRow
              key={c.id}
              name={c.name}
              loading={deactivateMutation.isPending}
              onConfirm={() => deactivateMutation.mutate(c.id)}
              onCancel={() => setConfirmingId(null)}
            />
          ) : (
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
                <button
                  onClick={() => setEditing(c)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                {c.isActive && (
                  <button
                    onClick={() => setConfirmingId(c.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                    title="Deactivate"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )
        ))}

        {!isLoading && coffeeTypes.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">{t('settings.noCoffeeTypes')}</p>
        )}
      </div>

      {(creating || editing) && (
        <CoffeeTypeFormModal
          coffeeType={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['coffee-types-settings'] });
            queryClient.invalidateQueries({ queryKey: ['coffee-types'] });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

function CoffeeTypeFormModal({ coffeeType, onClose, onSuccess }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [error, setError] = useState('');
  const isEdit = Boolean(coffeeType);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: isEdit
      ? { name: coffeeType.name, grade: coffeeType.grade || '', state: coffeeType.state, description: coffeeType.description || '' }
      : { state: 'WET' },
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? coffeeTypesApi.update(coffeeType.id, data)
      : coffeeTypesApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Coffee type updated.' : 'Coffee type created.');
      onSuccess?.();
    },
    onError: (err) => setError(parseApiError(err, 'Failed to save coffee type')),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit — ${coffeeType.name}` : 'Add Coffee Type'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="ct-form" loading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </>
      }
    >
      {error && <Alert variant="danger" className="mb-3" onDismiss={() => setError('')}>{error}</Alert>}
      <form id="ct-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        {!isEdit && (
          <Input label="Code" required placeholder="e.g. CW-G1"
            error={errors.code?.message} {...register('code', { required: 'Required' })} />
        )}
        <Input label="Name" required error={errors.name?.message}
          {...register('name', { required: 'Required' })} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="State" required {...register('state', { required: 'Required' })}>
            {['WET','DRY','PARCHMENT','HULLED','GREEN','SORTED','GRADED'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Input label={t('settings.grade')} placeholder="1, 2, 3, AA, AB…" {...register('grade')} />
        </div>
        <Input label="Description" {...register('description')} />
      </form>
    </Modal>
  );
}
