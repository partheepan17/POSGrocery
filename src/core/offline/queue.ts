type QueueItem = {
  id: string;
  kind: 'invoice' | 'refund' | 'cash_movement' | 'po' | 'grn' | 'generic';
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  body: any;
  createdAt: number;
};

const STORAGE_KEY = 'vp_offline_queue_v1';

function loadQueueLocal(): QueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveQueueLocal(items: QueueItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export const offlineQueue = {
  list(): QueueItem[] { return loadQueueLocal(); },
  size(): number { return loadQueueLocal().length; },
  enqueue(item: Omit<QueueItem, 'id'|'createdAt'>): string {
    const q = loadQueueLocal();
    const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    // dedupe by JSON body+url+method if already present
    const fingerprint = JSON.stringify({ k: item.kind, u: item.url, m: item.method, b: item.body });
    const exists = q.some(x => JSON.stringify({ k: x.kind, u: x.url, m: x.method, b: x.body }) === fingerprint);
    if (!exists) {
      q.push({ ...item, id, createdAt: Date.now() });
      saveQueueLocal(q);
    }
    return id;
  },
  remove(id: string) {
    const q = loadQueueLocal().filter(x => x.id !== id);
    saveQueueLocal(q);
  },
  async replay(fetchImpl: typeof fetch = fetch): Promise<number> {
    let q = loadQueueLocal();
    let okCount = 0;
    for (const item of q) {
      try {
        const res = await fetchImpl(item.url, { method: item.method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.body) });
        if (res.ok) {
          okCount += 1;
          offlineQueue.remove(item.id);
        }
      } catch {
        // leave in queue
      }
    }
    return okCount;
  }
};

// Auto-replay on reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { offlineQueue.replay(); });
}

export type QueuedMutation = {
  id: string; // stable id to merge retries of the same logical mutation
  endpoint: string;
  body: any;
  method?: string;
  counter?: number; // merge counter
  updated_at?: number; // last-write wins timestamp
};

const KEY = 'offline-queue-v2';

// IndexedDB helpers with localStorage fallback
const DB_NAME = 'pos-offline';
const STORE = 'queue';

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (!('indexedDB' in window)) return resolve(null);
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function idbGetAll(): Promise<QueuedMutation[] | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []) as QueuedMutation[]);
    req.onerror = () => resolve([]);
  });
}

async function idbPut(item: QueuedMutation) {
  const db = await openDB();
  if (!db) return;
  return new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function idbBulkPut(items: QueuedMutation[]) {
  const db = await openDB();
  if (!db) return;
  return new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    const s = tx.objectStore(STORE);
    items.forEach((it) => s.put(it));
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function idbDelete(id: string) {
  const db = await openDB();
  if (!db) return;
  return new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

function lsLoadQueued(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch { return []; }
}

function lsSaveQueued(list: QueuedMutation[]) { localStorage.setItem(KEY, JSON.stringify(list)); }

export async function loadQueuedMutations(): Promise<QueuedMutation[]> {
  return (await idbGetAll()) ?? lsLoadQueued();
}

export async function saveQueuedMutations(list: QueuedMutation[]) {
  if (await openDB()) await idbBulkPut(list);
  else lsSaveQueued(list);
}

export async function enqueue(m: QueuedMutation) {
  const now = Date.now();
  const list = await loadQueuedMutations();
  const idx = list.findIndex(x => x.id === m.id);
  if (idx >= 0) {
    // last-write wins + merge counters
    const prev = list[idx];
    list[idx] = { ...prev, ...m, counter: (prev.counter || 0) + 1, updated_at: now };
  } else {
    list.push({ ...m, counter: 1, updated_at: now });
  }
  await saveQueuedMutations(list);
  await idbPut(list[idx >= 0 ? idx : list.length - 1]);
}

export async function flush(apiBaseUrl: string) {
  const list = await loadQueuedMutations();
  const remain: QueuedMutation[] = [];
  
  for (const m of list) {
    try {
      const res = await fetch(`${apiBaseUrl}${m.endpoint}`, {
        method: m.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m.body)
      });
      
      if (!res.ok) {
        // Exponential backoff: retry up to 3 times with increasing delays
        const retryCount = (m.counter || 1) - 1;
        if (retryCount < 3) {
          // Add delay based on retry count (1s, 2s, 4s)
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            enqueue({ ...m, counter: retryCount + 2 });
          }, delay);
        }
        remain.push(m);
        continue;
      }
      
      // Success - remove from queue
      await idbDelete(m.id);
    } catch (error) {
      // Network error - keep in queue for retry
      remain.push(m);
    }
  }
  
  await saveQueuedMutations(remain);
  return { flushed: list.length - remain.length, remaining: remain.length };
}

export function setupOnlineFlush(apiBaseUrl: string) {
  window.addEventListener('online', () => { flush(apiBaseUrl); });
}

// Manual flush for testing/debugging
export async function manualFlush(apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250') {
  return await flush(apiBaseUrl);
}

// Get queue status for debugging
export async function getQueueStatus() {
  const mutations = await loadQueuedMutations();
  return {
    count: mutations.length,
    items: mutations.map(m => ({
      id: m.id,
      endpoint: m.endpoint,
      method: m.method,
      counter: m.counter,
      updated_at: m.updated_at
    }))
  };
}


