"use client";
import { useEffect, useRef, useState } from 'react';
import { getApiBaseUrl } from './config';
import type { NormalizedSmmService } from '@/types/smm';

let cache: { services: NormalizedSmmService[] } | null = null;
let inflight: Promise<NormalizedSmmService[]> | null = null;

export function useNormalizedServices() {
  const [services, setServices] = useState<NormalizedSmmService[]>(cache?.services || []);
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
            .then((j) => (j.services as NormalizedSmmService[]) || [])
            .finally(() => {
              inflight = null;
            }));
        const data = await p;
        cache = { services: data };
        if (mounted.current) setServices(data);
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

  return { services, loading, error };
}
