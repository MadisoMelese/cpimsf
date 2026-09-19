import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { usersApi } from '../../api/reference';
import { Card } from '../../components/ui/Card';
import { Table, Thead, Th, Tbody, Tr, Td, TableEmpty } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageSpinner } from '../../components/ui/Spinner';
import { useForm } from 'react-hook-form';
import { formatDateTime } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';

export default function UsersPage() {
  const { t } = useLanguage();
  const queryClient  = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn:  () => usersApi.list({ page: 1, limit: 50 }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => usersApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  if (isLoading) return <PageSpinner />;
  const users = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Users</h1>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} /> New User</Button>
      </div>

      <Card padding={false}>
        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>{t('users.username')}</Th>
              <Th>{t('common.email')}</Th>
              <Th>{t('users.role')}</Th>
              <Th>{t('users.lastLogin')}</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {!users.length ? <TableEmpty colSpan={7} /> :
              users.map((u) => (
                <Tr key={u.id}>
                  <Td className="font-medium">{u.fullName}</Td>
                  <Td className="font-mono text-xs">{u.username}</Td>
                  <Td className="text-xs text-slate-500">{u.email}</Td>
                  <Td><Badge variant={u.role === 'BOSS' || u.role === 'ADMIN' ? 'primary' : 'default'}>{u.role}</Badge></Td>
                  <Td className="text-xs text-slate-500">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '—'}</Td>
                  <Td><Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></Td>
                  <Td>
                    <Button size="xs" variant="ghost"
                      onClick={() => toggleMutation.mutate({ id: u.id, isActive: !u.isActive })}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </Td>
                </Tr>
              ))
            }
          </Tbody>
        </Table>
      </Card>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateUserModal({ onClose }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); onClose(); },
  });

  return (
    <Modal open onClose={onClose} title="Create User"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="create-user-form" loading={mutation.isPending}>{t('common.create')}</Button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input label={t('users.fullName')} required error={errors.fullName?.message} {...register('fullName', { required: 'Required' })} />
        <Input label={t('users.username')} required error={errors.username?.message} {...register('username', { required: 'Required' })} />
        <Input label={t('common.email')} type="email" required error={errors.email?.message} {...register('email', { required: 'Required' })} />
        <Input label="Password" type="password" required error={errors.password?.message} {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
        <Select label={t('users.role')} required {...register('role', { required: 'Required' })}>
          <option value="">Select role…</option>
          {['BOSS','ADMIN','STOREKEEPER','VERIFIER'].map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
      </form>
    </Modal>
  );
}
