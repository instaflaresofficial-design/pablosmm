"use client";
import { useEffect, useRef, useState } from 'react';
import { getApiBaseUrl } from './config';
import type { NormalizedSmmService } from '@/types/smm';

let cache: { services: NormalizedSmmService[], fxRate: number } | null = null;
let inflight: Promise<{ services: NormalizedSmmService[], fxRate: number }> | null = null;

export function useNormalizedServices() {
  const [services, setServices] = useState<NormalizedSmmService[]>(cache?.services || []);
  const [fxRate, setFxRate] = useState<number>(cache?.fxRate || 96.40);
  const [loading, setLoading] = useState<boolean>(!cache);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    async function load() {
      try {
        setLoading(true);
        const p =
          inflight ||
          (inflight = fetch(`${getApiBaseUrl()}/services`, { cache: 'no-store' })
            .then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.json();
            })
            .then((j) => ({
              services: (j.services as NormalizedSmmService[]) || [],
              fxRate: j.fxRate || 96.40
            }))
            .finally(() => {
              inflight = null;
            }));
        const data = await p;
        cache = data;
        if (mounted.current) {
          setServices(data.services);
          setFxRate(data.fxRate);
        }
      } catch (e: any) {
        if (mounted.current) setError(e?.message || 'Failed to load services');
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    load();
    return () => {
      mounted.current = false;
    };
  }, []);

  return { services, loading, error, fxRate };
}
