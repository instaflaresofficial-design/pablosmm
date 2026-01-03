"use client";
import React, { useEffect, useMemo, useState } from 'react';

type Provider = {
  key: string;
  name?: string;
  apiUrl: string;
  apiKey: string; // masked when loaded
  enabled?: boolean;
  currency?: 'USD' | 'INR';
};

export default function ProvidersAdminPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Provider>({ key: '', name: '', apiUrl: '', apiKey: '', enabled: true });
  const [filter, setFilter] = useState('');

  const list = useMemo(() => providers.filter(p => (p.key + ' ' + (p.name||'') + ' ' + p.apiUrl).toLowerCase().includes(filter.toLowerCase())), [providers, filter]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch('/api/admin/providers');
      const data = await res.json();
      setProviders(data.providers || []);
      setLoading(false);
    }
    load();
  }, []);

  const save = async () => {
    if (!form.key || !form.apiUrl) return;
    setSaving(true);
    await fetch('/api/admin/providers', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(form) });
    const res = await fetch('/api/admin/providers').then(r=>r.json());
    setProviders(res.providers || []);
    setForm({ key: '', name: '', apiUrl: '', apiKey: '', enabled: true });
    setSaving(false);
  };

  const remove = async (key: string) => {
    if (!confirm('Delete provider ' + key + '?')) return;
    await fetch('/api/admin/providers?key=' + encodeURIComponent(key), { method: 'DELETE' });
    const res = await fetch('/api/admin/providers').then(r=>r.json());
    setProviders(res.providers || []);
  };

  const toggleEnabled = async (p: Provider) => {
    await fetch('/api/admin/providers', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ ...p, enabled: !p.enabled }) });
    const res = await fetch('/api/admin/providers').then(r=>r.json());
    setProviders(res.providers || []);
  };

  if (loading) return <div className="admin-container">Loading…</div>;

  return (
    <div className="admin-container">
      <h2 style={{ marginTop: 0 }}>Admin: Providers</h2>
      <div className="controls">
        <input placeholder="Search providers…" value={filter} onChange={e=>setFilter(e.target.value)} />
      </div>

      <div className="table-panel" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Enabled</th>
              <th>Key</th>
              <th>Name</th>
              <th>API URL</th>
              <th>Currency</th>
              <th>API Key</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.key}>
                <td>
                  <input type="checkbox" checked={p.enabled !== false} onChange={()=>toggleEnabled(p)} />
                </td>
                <td>{p.key}</td>
                <td>{p.name || '-'}</td>
                <td>{p.apiUrl}</td>
                <td>{p.currency || 'USD'}</td>
                <td>{p.apiKey || '—'}</td>
                <td>
                  <button onClick={() => remove(p.key)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Add / Update Provider</h3>
      <div className="controls" style={{ flexWrap:'wrap' }}>
        <input placeholder="Key (unique)" value={form.key} onChange={e=>setForm(f=>({ ...f, key: e.target.value }))} />
        <input placeholder="Name (optional)" value={form.name || ''} onChange={e=>setForm(f=>({ ...f, name: e.target.value }))} />
        <input placeholder="API URL (e.g. https://panel.com/api/v2)" style={{ minWidth: 320 }} value={form.apiUrl} onChange={e=>setForm(f=>({ ...f, apiUrl: e.target.value }))} />
        <input placeholder="API Key (paste here)" value={form.apiKey} onChange={e=>setForm(f=>({ ...f, apiKey: e.target.value }))} />
        <label style={{ display:'flex', alignItems:'center', gap:6 }}>
          Currency:
          <select value={form.currency || 'USD'} onChange={e=>setForm(f=>({ ...f, currency: e.target.value as 'USD' | 'INR' }))}>
            <option value="USD">USD</option>
            <option value="INR">INR</option>
          </select>
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:6 }}>
          <input type="checkbox" checked={form.enabled !== false} onChange={e=>setForm(f=>({ ...f, enabled: e.target.checked }))} />
          Enabled
        </label>
        <button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Provider'}</button>
      </div>

      <p style={{ color:'#6c757d' }}>Note: Providers are saved to admin/providers.config.json. On serverless deployments, filesystem writes may not persist. Use a persistent store for production.</p>
    </div>
  );
}
