import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { AppLayout } from './components/layout/AppLayout';
import { PageSpinner } from './components/ui/Spinner';

// ─── Lazy page imports ────────────────────────────────────────────────────────
const LoginPage          = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage      = lazy(() => import('./pages/dashboard/DashboardPage'));
const PurchasesPage      = lazy(() => import('./pages/purchases/PurchasesPage'));
const InventoryPage      = lazy(() => import('./pages/inventory/InventoryPage'));
const ProcessingPage     = lazy(() => import('./pages/processing/ProcessingPage'));
const SalesPage          = lazy(() => import('./pages/sales/SalesPage'));
const PaymentsPage       = lazy(() => import('./pages/payments/PaymentsPage'));
const ReconciliationPage = lazy(() => import('./pages/reconciliation/ReconciliationPage'));
const ReportsPage        = lazy(() => import('./pages/reports/ReportsPage'));
const SyncCenterPage     = lazy(() => import('./pages/sync/SyncCenterPage'));
const AuditPage          = lazy(() => import('./pages/audit/AuditPage'));
const UsersPage          = lazy(() => import('./pages/users/UsersPage'));
const AgentsPage         = lazy(() => import('./pages/agents/AgentsPage'));
const SettingsPage       = lazy(() => import('./pages/settings/SettingsPage'));

// ─── Guards ───────────────────────────────────────────────────────────────────

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

// ─── Authenticated shell ──────────────────────────────────────────────────────
// SyncProvider is mounted once here — not re-mounted on every route change.
// It needs to live inside RequireAuth so useAuth() resolves correctly.

function AuthenticatedApp() {
  return (
    <SyncProvider>
      <AppLayout />
    </SyncProvider>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <RequireAuth>
              <AuthenticatedApp />
            </RequireAuth>
          }
        >
          {/* Main */}
          <Route index                  element={<DashboardPage />} />
          <Route path="purchases"       element={<PurchasesPage />} />
          <Route path="inventory"       element={<InventoryPage />} />
          <Route path="processing"      element={<ProcessingPage />} />
          <Route path="sales"           element={<SalesPage />} />
          <Route path="payments"        element={<PaymentsPage />} />
          <Route path="reconciliation"  element={<ReconciliationPage />} />
          <Route path="reports"         element={<ReportsPage />} />

          {/* System */}
          <Route path="sync"            element={<SyncCenterPage />} />
          <Route path="conflicts"       element={<SyncCenterPage />} />

          {/* Boss/Admin only */}
          <Route path="audit"     element={<RequireRole roles={['BOSS', 'ADMIN']}><AuditPage /></RequireRole>} />
          <Route path="users"     element={<RequireRole roles={['BOSS', 'ADMIN']}><UsersPage /></RequireRole>} />
          <Route path="agents"    element={<RequireRole roles={['BOSS', 'ADMIN']}><AgentsPage /></RequireRole>} />
          <Route path="settings"  element={<RequireRole roles={['BOSS', 'ADMIN']}><SettingsPage /></RequireRole>} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </LanguageProvider>
  );
}
