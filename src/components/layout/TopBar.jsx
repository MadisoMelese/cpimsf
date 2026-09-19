import { Menu, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { useLanguage } from '../../context/LanguageContext';
import { clsx } from 'clsx';

export function TopBar({ onToggleSidebar }) {
  const { logout }                               = useAuth();
  const { isOnline, isSyncing, pendingCount, triggerSync } = useSync();
  const { lang, switchLang, t }                  = useLanguage();

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-slate-200 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">

        {/* Language switcher */}
        <button
          onClick={() => switchLang()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors select-none"
          title={lang === 'en' ? 'Switch to Amharic (አማርኛ)' : 'Switch to English'}
        >
          {lang === 'en' ? (
            <>
              <span className="text-base leading-none">🇪🇹</span>
              <span>አማርኛ</span>
            </>
          ) : (
            <>
              <span className="text-base leading-none">🇬🇧</span>
              <span>English</span>
            </>
          )}
        </button>

        {/* Sync button */}
        <button
          onClick={triggerSync}
          disabled={isSyncing || !isOnline}
          className={clsx(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            isOnline ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 cursor-not-allowed',
          )}
          title={isOnline ? t('common.syncNow') : t('common.offline')}
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          {pendingCount > 0 && (
            <span className="rounded-full bg-warning-500 text-white text-xs min-w-[16px] h-4 flex items-center justify-center px-1">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label={t('common.logout')}
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">{t('common.logout')}</span>
        </button>
      </div>
    </header>
  );
}
