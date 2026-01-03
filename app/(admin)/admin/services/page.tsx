"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useCurrency } from '@/components/layout/CurrencyProvider';
import type { NormalizedSmmService, Platform, ServiceType, Variant } from '@/types/smm';

type OverrideRow = {
  key: string; // source:serviceId
  include: boolean;
  displayName?: string;
  platform?: Platform;
  type?: ServiceType;
  variant?: Variant;
  customRatePer1000?: number;
  marginPercent?: number;
};

type AdminConfig = {
  strict?: boolean;
  defaultMarginPercent?: number;
  overrides?: Array<{
    source: string;
    sourceServiceId: string;
    include?: boolean;
    platform?: Platform;
    type?: ServiceType;
    variant?: Variant;
    displayName?: string;
    customRatePer1000?: number;
    marginPercent?: number;
  }>;
};

const platforms: Platform[] = ['instagram','facebook','x','telegram','tiktok','youtube'];
const types: ServiceType[] = ['followers','likes','views','comments','shares','votes'];
const variants: Variant[] = ['any','post','reel','story','igtv','video','live','short'];

export default function AdminServicesPage() {
  const [raw, setRaw] = useState<NormalizedSmmService[]>([]);
  const [cfg, setCfg] = useState<AdminConfig>({ strict: false, defaultMarginPercent: 0, overrides: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [aResp, bResp] = await Promise.all([
          fetch('/api/admin/services/raw').then(async r => {
            if (!r.ok) throw new Error(`services/raw ${r.status}`);
            return r.json();
          }),
          fetch('/api/admin/config').then(async r => {
            if (!r.ok) throw new Error(`admin/config ${r.status}`);
            return r.json();
          }),
        ]);
        setRaw(aResp.services || []);
        setCfg(bResp.error ? { strict: false, defaultMarginPercent: 0, overrides: [] } : bResp);
      } catch (e: any) {
        console.error('Failed loading admin services/config', e);
        setRaw([]);
        setCfg({ strict: false, defaultMarginPercent: 0, overrides: [] });
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { formatMoneyCompact, usdToInr } = useCurrency();

  const rows = useMemo(() => {
    const map = new Map<string, OverrideRow>();
    (cfg.overrides || []).forEach(o => {
      map.set(`${o.source}:${o.sourceServiceId}`, {
        key: `${o.source}:${o.sourceServiceId}`,
        include: !!o.include,
        displayName: o.displayName,
        platform: o.platform,
        type: o.type,
        variant: o.variant,
        customRatePer1000: o.customRatePer1000,
        marginPercent: o.marginPercent,
      });
    });
    return raw
      .filter(s => (s.providerName + ' ' + s.category).toLowerCase().includes(query.toLowerCase()))
      .map(s => {
        const key = `${s.source}:${s.sourceServiceId}`;
        const r = map.get(key) || { key, include: !cfg.strict };
        return { svc: s, row: r };
      });
  }, [raw, cfg, query]);

  const upsert = (key: string, patch: Partial<OverrideRow>) => {
    setCfg(prev => {
      const next = { ...prev, overrides: [...(prev.overrides || [])] } as AdminConfig;
      const [source, sourceServiceId] = key.split(':');
      const idx = next.overrides!.findIndex(o => o.source === source && o.sourceServiceId === sourceServiceId);
      if (idx === -1) {
        next.overrides!.push({ source, sourceServiceId, include: false });
      }
      const i = next.overrides!.findIndex(o => o.source === source && o.sourceServiceId === sourceServiceId);
      const curr = next.overrides![i];
      next.overrides![i] = { ...curr, ...patch } as any;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    await fetch('/api/admin/config', { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(cfg) });
    setSaving(false);
  };

  if (loading) return <div className="admin-container">Loading…</div>;

  return (
    <div className="admin-container">
      <h2 style={{ marginTop: 0 }}>Admin: Services</h2>
      <div className="controls">
        <label>
          <input type="checkbox" checked={!!cfg.strict} onChange={e => setCfg(c => ({ ...c, strict: e.target.checked }))} />
          &nbsp;Strict mode (only included services visible)
        </label>
        <label>
          Default margin %:&nbsp;
          <input type="number" value={cfg.defaultMarginPercent || 0} onChange={e => setCfg(c => ({ ...c, defaultMarginPercent: Number(e.target.value || 0) }))} style={{ width:80 }} />
        </label>
        <input placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} style={{ marginLeft:'auto', minWidth:200 }} />
        <button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>Include</th>
              <th>Provider</th>
              <th>Service ID</th>
              <th>Name</th>
              <th>Platform</th>
              <th>Type</th>
              <th>Variant</th>
              <th>Base Rate/1K</th>
              <th>Display Name</th>
              <th>Custom Rate/1K</th>
              <th>Margin %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ svc, row }) => (
              <tr key={row.key}>
                <td>
                  <input type="checkbox" checked={!!row.include} onChange={e => upsert(row.key, { include: e.target.checked })} />
                </td>
                <td>{svc.source}</td>
                <td>{svc.sourceServiceId}</td>
                <td>{svc.providerName}</td>
                <td>
                  <select value={row.platform || svc.platform} onChange={(e)=> upsert(row.key, { platform: e.target.value as Platform })}>
                    {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td>
                  <select value={row.type || svc.type} onChange={(e)=> upsert(row.key, { type: e.target.value as ServiceType })}>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td>
                  <select value={row.variant || svc.variant} onChange={(e)=> upsert(row.key, { variant: e.target.value as Variant })}>
                    {variants.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>
                <td>
                  <div style={{ fontSize:12, color:'#6c757d' }}>{svc.providerCurrency || 'USD'}</div>
                  <div>{svc.baseRatePer1000 != null ? svc.baseRatePer1000.toFixed(4) : '-'}</div>
                  <div style={{ color:'#6c757d', fontSize:12 }}>
                    USD: {(svc.ratePer1000 ?? 0).toFixed(4)}
                  </div>
                  <div style={{ color:'#6c757d', fontSize:12 }}>
                    Provider (active): {
                      (() => {
                        const base = svc.baseRatePer1000 ?? 0;
                        const provCur = svc.providerCurrency || 'USD';
                        const baseUsd = provCur === 'INR' && usdToInr ? base / usdToInr : base;
                        return formatMoneyCompact(baseUsd);
                      })()
                    }
                  </div>
                </td>
                <td>
                  <input value={row.displayName || ''} onChange={(e)=> upsert(row.key, { displayName: e.target.value })} />
                </td>
                <td>
                  <input type="number" value={row.customRatePer1000 ?? ''} placeholder="e.g. 1.25" onChange={(e)=> upsert(row.key, { customRatePer1000: e.target.value === '' ? undefined : Number(e.target.value) })} style={{ width:100 }} />
                </td>
                <td>
                  <input type="number" value={row.marginPercent ?? ''} placeholder="%" onChange={(e)=> upsert(row.key, { marginPercent: e.target.value === '' ? undefined : Number(e.target.value) })} style={{ width:80 }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color:'#6c757d' }}>Note: Saving writes to admin/services.config.json. On serverless deployments, filesystem writes may not persist. Consider using a database for production.</p>
    </div>
  );
}
