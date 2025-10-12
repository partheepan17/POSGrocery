import React, { useEffect, useState } from 'react';

export default function BackupToolsPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';

  const load = async () => {
    const res = await fetch(`${apiBaseUrl}/api/backups`);
    const data = await res.json();
    setBackups(data.backups || []);
  };

  useEffect(() => { load(); }, []);

  const runBackup = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/backups/run`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backup failed');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  const restore = async (name: string) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/backups/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      alert('Restore completed. Please restart the server.');
    } catch (e: any) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Backups</h1>
      <div className="flex items-center gap-2">
        <button onClick={runBackup} disabled={busy} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">{busy ? 'Running...' : 'Run Backup'}</button>
        <button onClick={load} className="px-3 py-1 border rounded">Refresh</button>
        {error && <span className="text-red-600 ml-2">{error}</span>}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded border p-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-2 py-1">Name</th>
              <th className="px-2 py-1 text-right">Size</th>
              <th className="px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.name} className="border-t">
                <td className="px-2 py-1">{b.name}</td>
                <td className="px-2 py-1 text-right">{Number(b.size).toLocaleString()}</td>
                <td className="px-2 py-1">
                  <a className="px-2 py-1 border rounded mr-2" href={`${apiBaseUrl}/api/backups/download/${encodeURIComponent(b.name)}`}>Download</a>
                  <button onClick={() => restore(b.name)} className="px-2 py-1 border rounded">Restore</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300">
        Keep BACKUP_KEY secret set in environment for encryption. Rotation keeps last 7 backups. Restore will replace the current DB; restart server afterwards.
      </div>
    </div>
  );
}










