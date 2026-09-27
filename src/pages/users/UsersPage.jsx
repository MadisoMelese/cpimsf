import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, KeyRound, Mail, Eye, EyeOff } from 'lucide-react';
import { usersApi } from '../../api/reference';
import { Card } from '../../components/ui/Card';
import { Table, Thead, Th, Tbody, Tr, Td, TableEmpty } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { PageSpinner } from '../../components/ui/Spinner';
import { parseApiError } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';
import { useForm } from 'react-hook-form';
import { formatDateTime } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';

export default function UsersPage() {
  const { t } = useLanguage();
  const queryClient  = useQueryClient();
  const [showCreate,     setShowCreate]     = useState(false);
  const [resetTarget,    setResetTarget]    = useState(null); // user object
  const [search,         setSearch]         = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['users', { search }],
    queryFn:  () => usersApi.list({ page: 1, limit: 50, search: search || undefined }),
    placeholderData: (prev) => prev,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => usersApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const users = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Users</h1>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} /> New User</Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, username, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {isFetching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            )}
          </div>
        </div>

        {isLoading ? <PageSpinner /> : (
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
                    <Td>
                      <Badge variant={u.role === 'BOSS' || u.role === 'ADMIN' ? 'primary' : 'default'}>
                        {u.role}
                      </Badge>
                    </Td>
                    <Td className="text-xs text-slate-500">
                      {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '—'}
                    </Td>
                    <Td>
                      <Badge variant={u.isActive ? 'success' : 'danger'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => toggleMutation.mutate({ id: u.id, isActive: !u.isActive })}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setResetTarget(u)}
                          title="Reset password"
                        >
                          <KeyRound size={13} />
                          Reset PW
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))
              }
            </Tbody>
          </Table>
        )}
      </Card>

      {showCreate  && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Create User Modal ────────────────────────────────────────────────────────

function CreateUserModal({ onClose }) {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const toast = useToast();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully.');
      onClose();
    },
    onError: (err) => setError(parseApiError(err, 'Failed to create user')),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Create User"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="create-user-form" loading={mutation.isPending}>
            {t('common.create')}
          </Button>
        </>
      }
    >
      {error && <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>{error}</Alert>}
      <form id="create-user-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input label={t('users.fullName')} required error={errors.fullName?.message}
          {...register('fullName', { required: 'Required' })} />
        <Input label={t('users.username')} required error={errors.username?.message}
          {...register('username', { required: 'Required' })} />
        <Input label={t('common.email')} type="email" required error={errors.email?.message}
          {...register('email', { required: 'Required' })} />
        <Input label="Password" type="password" required error={errors.password?.message}
          {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
        <Select label={t('users.role')} required {...register('role', { required: 'Required' })}>
          <option value="">Select role…</option>
          {['BOSS','ADMIN','STOREKEEPER','VERIFIER'].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}

// ─── Reset Password Modal (admin manual set) ─────────────────────────────────

function ResetPasswordModal({ user, onClose }) {
  const toast = useToast();
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done,        setDone]        = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  const password = watch('password', '');

  const mutation = useMutation({
    mutationFn: (data) => usersApi.resetPassword(user.id, { password: data.password }),
    onSuccess: () => {
      setDone(true);
      toast.success(`Password updated for ${user.fullName}.`);
    },
    onError: (err) => toast.error(parseApiError(err, 'Failed to reset password')),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Reset User Password"
      size="sm"
      footer={
        done ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              form="admin-reset-pw-form"
              loading={isSubmitting || mutation.isPending}
            >
              <KeyRound size={14} /> Set Password
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="space-y-3">
          <Alert variant="success">
            Password updated for <strong>{user.fullName}</strong>. Their existing sessions have been
            revoked — they'll need to sign in again with the new password.
          </Alert>
        </div>
      ) : (
        <div className="space-y-4">
          {/* User card */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-semibold text-primary-700 shrink-0">
                {user.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.fullName}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                  <Mail size={11} /> {user.email}
                </p>
              </div>
              <Badge variant={user.role === 'BOSS' || user.role === 'ADMIN' ? 'primary' : 'default'} className="shrink-0">
                {user.role}
              </Badge>
            </div>
          </div>

          <form id="admin-reset-pw-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4" noValidate>

            {/* New password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-new-pw" className="text-sm font-medium text-slate-700">
                New password <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="admin-new-pw"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoFocus
                  className={`block w-full rounded-lg border pr-10 pl-3 py-2.5 text-sm text-slate-900
                    focus:outline-none focus:ring-2 transition-colors
                    ${errors.password ? 'border-danger-500 bg-danger-50 focus:ring-danger-500' : 'border-slate-300 bg-white focus:ring-primary-500'}`}
                  {...register('password', {
                    required:  'Password is required',
                    minLength: { value: 8, message: 'Minimum 8 characters' },
                  })}
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPass(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showPass ? 'Hide' : 'Show'}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && (
                <p role="alert" className="text-xs text-danger-600">⚠ {errors.password.message}</p>
              )}
            </div>

            {/* Confirm */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-confirm-pw" className="text-sm font-medium text-slate-700">
                Confirm password <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="admin-confirm-pw"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`block w-full rounded-lg border pr-10 pl-3 py-2.5 text-sm text-slate-900
                    focus:outline-none focus:ring-2 transition-colors
                    ${errors.confirm ? 'border-danger-500 bg-danger-50 focus:ring-danger-500' : 'border-slate-300 bg-white focus:ring-primary-500'}`}
                  {...register('confirm', {
                    required: 'Please confirm the password',
                    validate: (v) => v === password || 'Passwords do not match',
                  })}
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showConfirm ? 'Hide' : 'Show'}
                >
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.confirm && (
                <p role="alert" className="text-xs text-danger-600">⚠ {errors.confirm.message}</p>
              )}
            </div>
          </form>

          <p className="text-xs text-slate-400">
            The user's existing sessions will be signed out immediately after saving.
          </p>
        </div>
      )}
    </Modal>
  );
}
