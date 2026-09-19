import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { processingApi } from '../../api/processing';
import { locationsApi } from '../../api/reference';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { useLanguage } from '../../context/LanguageContext';

export function CreateProcessingModal({ onClose, onCreated }) {
  const { t } = useLanguage();
  const [error, setError] = useState('');
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: locationsApi.list });

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { processingCost: '', notes: '' },
  });

  const mutation = useMutation({
    mutationFn: (data) => processingApi.create(data),
    onSuccess: (res) => onCreated?.(res.data),
    onError: (err) => setError(err?.response?.data?.error?.message || 'Failed to create run'),
  });

  const onSubmit = (data) => {
    setError('');
    mutation.mutate({
      locationId:     data.locationId     || undefined,
      processingCost: data.processingCost ? parseFloat(data.processingCost) : undefined,
      processingCostNotes: data.processingCostNotes || undefined,
      notes:          data.notes          || undefined,
    });
  };

  return (
    <Modal open onClose={onClose} title={t('processing.createTitle')} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="proc-create-form" loading={mutation.isPending}>{t('processing.createRun')}</Button>
        </>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}
      <form id="proc-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select label={t('processing.processingLocation')} {...register('locationId')}>
          <option value="">Select location (optional)…</option>
          {(locations?.data || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
        <Input label={t('processing.processingCost')} type="number" step="0.01" min="0"
          hint="Labour, energy, and operational costs for this run"
          {...register('processingCost')} />
        <Input label={t('processing.costNotes')} placeholder="Describe the processing costs…"
          {...register('processingCostNotes')} />
        <Input label="Notes" placeholder="Any other notes about this run…" {...register('notes')} />
      </form>
    </Modal>
  );
}
