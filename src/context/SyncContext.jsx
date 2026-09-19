import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { syncApi } from '../api/sync';
import { useAuth } from './AuthContext';

const SyncContext = createContext(null);

const QUEUE_KEY     = 'cpims_sync_queue';
const LAST_SYNC_KEY = 'cpims_last_sync';

export function SyncProvider({ children }) {
  const { user }                        = useAuth();
  const [isOnline, setIsOnline]         = useState(navigator.onLine);
  const [isSyncing, setIsSyncing]       = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt]     = useState(localStorage.getItem(LAST_SYNC_KEY));
  const [conflicts, setConflicts]       = useState([]);

  // Refs avoid stale closures inside callbacks
  const syncLockRef   = useRef(false);
  const lastSyncAtRef = useRef(lastSyncAt);
  const isOnlineRef   = useRef(isOnline);
  const userRef       = useRef(user);

  // Keep refs in sync with state
  useEffect(() => { lastSyncAtRef.current = lastSyncAt; }, [lastSyncAt]);
  useEffect(() => { isOnlineRef.current = isOnline; },    [isOnline]);
  useEffect(() => { userRef.current = user; },            [user]);

  // Network state tracking
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Count pending queue on mount
  useEffect(() => {
    setPendingCount(getQueue().length);
  }, []);

  function getQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
    catch { return []; }
  }

  function saveQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    setPendingCount(queue.length);
  }

  /**
   * Enqueue an offline operation to be synced when back online.
   */
  const enqueue = useCallback((operation) => {
    const queue = getQueue();
    if (queue.some((op) => op.operationId === operation.operationId)) return;
    queue.push({ ...operation, createdAt: new Date().toISOString() });
    saveQueue(queue);
  }, []);

  /**
   * Push pending operations to server then pull changes.
   * Uses refs so it's always stable — no re-render needed when lastSyncAt changes.
   */
  const triggerSync = useCallback(async () => {
    if (syncLockRef.current || !isOnlineRef.current || !userRef.current) return;
    syncLockRef.current = true;
    setIsSyncing(true);

    try {
      const queue = getQueue();

      if (queue.length > 0) {
        const res     = await syncApi.push({ operations: queue });
        const results = res.data || [];

        // Keep only failed/conflict ops in the queue
        const remaining = queue.filter((op) => {
          const result = results.find((r) => r.operationId === op.operationId);
          return result?.status !== 'SYNCED' && result?.status !== 'ALREADY_APPLIED';
        });
        saveQueue(remaining);

        const newConflicts = results.filter((r) => r.status === 'CONFLICT');
        if (newConflicts.length > 0) {
          setConflicts((prev) => [...prev, ...newConflicts]);
        }
      }

      // Pull — use ref for lastSyncAt to avoid stale value
      const deviceId  = localStorage.getItem('device_id');
      const pullRes   = await syncApi.pull({
        deviceId,
        lastSyncAt: lastSyncAtRef.current || undefined,
      });
      const newSyncAt = pullRes.data?.syncedAt || new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, newSyncAt);
      setLastSyncAt(newSyncAt);

      // Refresh conflict list
      const conflictsRes = await syncApi.conflicts({ status: 'OPEN' });
      setConflicts(conflictsRes.data || []);
    } catch (err) {
      // Sync failures are non-fatal — retry on next online event
      console.warn('[CPIMS Sync]', err?.message);
    } finally {
      setIsSyncing(false);
      syncLockRef.current = false;
    }
  }, []); // stable — reads everything via refs

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && user) {
      triggerSync();
    }
  }, [isOnline, user, triggerSync]);

  return (
    <SyncContext.Provider value={{
      isOnline,
      isSyncing,
      pendingCount,
      lastSyncAt,
      conflicts,
      enqueue,
      triggerSync,
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
