import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { agentsApi } from '../../api/reference';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { parseApiError } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

export function AgentFormModal({ agent, onClose, onSaved }) {
  const { t } = useLanguage();
  const toast = useToast();
  const isEdit = Boolean(agent);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: isEdit
      ? {
          name:       agent.name       || '',
          phone:      agent.phone      || '',
          email:      agent.email      || '',
          address:    agent.address    || '',
          notes:      agent.notes      || '',
          isSupplier: agent.isSupplier,
          isCustomer: agent.isCustomer,
          // code is not editable — shown read-only
        }
      : { isSupplier: true, isCustomer: false, code: '' },
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? agentsApi.update(agent.id, data)
        : agentsApi.create(data),
    onSuccess: (res) => {
      toast.success(isEdit ? 'Agent updated.' : 'Agent created successfully.');
      onSaved?.(res.data);
    },
    onError: (err) => setError(parseApiError(err, 'Save failed')),
  });

  const onSubmit = (data) => {
    setError('');
    mutation.mutate(data);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit — ${agent.name}` : 'New Agent'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="agent-form" loading={isSubmitting || mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create Agent'}
          </Button>
        </>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}

      <form id="agent-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

        {/* Code — editable only on create */}
        {isEdit ? (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Agent Code</p>
            <p className="font-mono text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{agent.code}</p>
            <p className="text-xs text-slate-400 mt-1">Code cannot be changed after creation</p>
          </div>
        ) : (
          <Input
            label={t('common.code')}
            required
            placeholder="e.g. AGT-007"
            hint="Unique identifier — cannot be changed after creation"
            error={errors.code?.message}
            {...register('code', { required: 'Code is required' })}
          />
        )}

        <Input
          label={t('common.name')}
          required
          placeholder="Agent's full name"
          error={errors.name?.message}
          {...register('name', { required: 'Name is required' })}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('common.phone')}
            type="tel"
            placeholder="+251911000000"
            {...register('phone')}
          />
          <Input
            label={t('common.email')}
            type="email"
            placeholder="agent@example.com"
            {...register('email')}
          />
        </div>

        <Input
          label={t('common.address')}
          placeholder="e.g. Jimma Zone, Oromia"
          {...register('address')}
        />

        {/* Role checkboxes */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Role</p>
          <div className="flex gap-6">
            <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                {...register('isSupplier')}
              />
              <span>
                <span className="font-medium">Supplier</span>
                <span className="text-slate-400 ml-1 text-xs">(delivers coffee to us)</span>
              </span>
            </label>
            <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                {...register('isCustomer')}
              />
              <span>
                <span className="font-medium">Customer</span>
                <span className="text-slate-400 ml-1 text-xs">(buys coffee from us)</span>
              </span>
            </label>
          </div>
        </div>

        <Input
          label={t('common.notes')}
          placeholder="Additional notes about this agent…"
          {...register('notes')}
        />
      </form>
    </Modal>
  );
}
