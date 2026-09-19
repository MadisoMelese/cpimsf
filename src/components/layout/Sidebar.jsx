import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, ShoppingCart, Warehouse, Cog, TrendingUp,
  CreditCard, ClipboardCheck, BarChart3, Users, Settings,
  RefreshCw, AlertTriangle, ScrollText, Coffee, MapPin, UserCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { useLanguage } from '../../context/LanguageContext';

const navItems = [
  { to: '/',               label: 'Dashboard',       icon: LayoutDashboard, roles: null },
  { to: '/purchases',      label: 'Purchases',       icon: ShoppingCart,    roles: null },
  { to: '/inventory',      label: 'Inventory',       icon: Warehouse,       roles: null },
  { to: '/processing',     label: 'Processing',      icon: Cog,             roles: null },
  { to: '/sales',          label: 'Sales',           icon: TrendingUp,      roles: null },
  { to: '/payments',       label: 'Cash Advances',   icon: CreditCard,      roles: ['BOSS', 'ADMIN'] },
  { to: '/reconciliation', label: 'Reconciliation',  icon: ClipboardCheck,  roles: ['BOSS', 'ADMIN', 'STOREKEEPER'] },
  { to: '/reports',        label: 'Reports',         icon: BarChart3,       roles: ['BOSS', 'ADMIN', 'STOREKEEPER'] },
];

const adminItems = [
  { to: '/users',          label: 'Users',           icon: Users,           roles: ['BOSS', 'ADMIN'] },
  { to: '/agents',         label: 'Agents',          icon: UserCircle,      roles: ['BOSS', 'ADMIN'] },
  { to: '/settings',       label: 'Settings',        icon: Settings,        roles: ['BOSS', 'ADMIN'] },
];

const systemItems = [
  { to: '/sync',           label: 'Sync Center',     icon: RefreshCw,       roles: null },
  { to: '/conflicts',      label: 'Conflicts',       icon: AlertTriangle,   roles: ['BOSS', 'ADMIN'] },
  { to: '/audit',          label: 'Audit Logs',      icon: ScrollText,      roles: ['BOSS', 'ADMIN'] },
];

function NavItem({ to, label, icon: Icon, badge }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )
      }
    >
      <Icon size={18} aria-hidden="true" />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="rounded-full bg-danger-500 text-white text-xs font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}

export function Sidebar({ collapsed = false }) {
  const { user } = useAuth();
  const { pendingCount, conflicts, isOnline } = useSync();
  const { t } = useLanguage();

  function canSee(roles) {
    if (!roles) return true;
    return roles.includes(user?.role);
  }

  // Use t() for nav labels
  const translatedNav = [
    { to: '/',               label: t('nav.dashboard'),      icon: LayoutDashboard, roles: null },
    { to: '/purchases',      label: t('nav.purchases'),      icon: ShoppingCart,    roles: null },
    { to: '/inventory',      label: t('nav.inventory'),      icon: Warehouse,       roles: null },
    { to: '/processing',     label: t('nav.processing'),     icon: Cog,             roles: null },
    { to: '/sales',          label: t('nav.sales'),          icon: TrendingUp,      roles: null },
    { to: '/payments',       label: t('nav.cashAdvances'),   icon: CreditCard,      roles: ['BOSS', 'ADMIN'] },
    { to: '/reconciliation', label: t('nav.reconciliation'), icon: ClipboardCheck,  roles: ['BOSS', 'ADMIN', 'STOREKEEPER'] },
    { to: '/reports',        label: t('nav.reports'),        icon: BarChart3,       roles: ['BOSS', 'ADMIN', 'STOREKEEPER'] },
  ];

  const translatedAdmin = [
    { to: '/users',    label: t('nav.users'),    icon: Users,       roles: ['BOSS', 'ADMIN'] },
    { to: '/agents',   label: t('nav.agents'),   icon: UserCircle,  roles: ['BOSS', 'ADMIN'] },
    { to: '/settings', label: t('nav.settings'), icon: Settings,    roles: ['BOSS', 'ADMIN'] },
  ];

  const translatedSystem = [
    { to: '/sync',      label: t('nav.sync'),       icon: RefreshCw,     roles: null },
    { to: '/conflicts', label: t('nav.conflicts'),   icon: AlertTriangle, roles: ['BOSS', 'ADMIN'] },
    { to: '/audit',     label: t('nav.audit'),       icon: ScrollText,    roles: ['BOSS', 'ADMIN'] },
  ];

  return (
    <aside
      className={clsx(
        'flex flex-col h-full bg-white border-r border-slate-200',
        collapsed ? 'w-16' : 'w-64',
        'transition-all duration-200',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-200">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shrink-0">
          <Coffee size={18} />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">CPIMS</p>
            <p className="text-xs text-slate-500">Coffee Management</p>
          </div>
        )}
      </div>

      {/* Online status pill */}
      {!collapsed && (
        <div className="px-4 py-2">
          <div className={clsx(
            'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium w-fit',
            isOnline ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700',
          )}>
            <span className={clsx('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-success-500' : 'bg-warning-500')} />
            {isOnline ? t('common.online') : t('common.offline')}
            {pendingCount > 0 && <span>· {pendingCount} {t('common.pending')}</span>}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {translatedNav.filter((i) => canSee(i.roles)).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {canSee(['BOSS', 'ADMIN']) && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('nav.admin')}</p>
            </div>
            {translatedAdmin.filter((i) => canSee(i.roles)).map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </>
        )}

        <div className="pt-4 pb-1 px-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('nav.system')}</p>
        </div>
        {translatedSystem.filter((i) => canSee(i.roles)).map((item) => (
          <NavItem
            key={item.to}
            {...item}
            badge={
              item.to === '/sync'      ? pendingCount :
              item.to === '/conflicts' ? conflicts.length :
              0
            }
          />
        ))}
      </nav>

      {/* User footer */}
      {!collapsed && user && (
        <div className="px-3 py-3 border-t border-slate-200">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-semibold shrink-0">
              {user.fullName?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.fullName}</p>
              <p className="text-xs text-slate-500">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
