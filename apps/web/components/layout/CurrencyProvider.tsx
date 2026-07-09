"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '@/lib/config';

export type Currency = 'USD' | 'INR';

type Ctx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  // USD -> display currency conversion rate (INR per USD when INR selected)
  usdToInr: number | null;
  // Convert an amount in USD to the active currency number
  convert: (amountInUsd: number) => number;
  // Convert an amount in the active currency back to USD
  convertToUsd: (amountInActive: number) => number;
  // Format a number in active currency compact (K/M suffix)
  formatMoneyCompact: (amountInUsd: number) => string;
  // Format a number in active currency full
  formatMoney: (amountInUsd: number) => string;
};

const CurrencyContext = createContext<Ctx | null>(null);

const STORAGE_KEY = 'app:currency';
const DEFAULT_CURRENCY: Currency = 'INR';
const DEFAULT_USD_TO_INR = null;

function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return n.toLocaleString();
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [usdToInr, setUsdToInr] = useState<number | null>(DEFAULT_USD_TO_INR);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Currency | null;
      if (saved === 'USD' || saved === 'INR') {
        setCurrencyState(saved);
      }
    } catch { }
  }, []);

  // Fetch live USD -> INR rate on mount and refresh every 10 minutes
  useEffect(() => {
    let mounted = true;
    const fetchRate = async () => {
      try {
        // Prefer server-side FX endpoint so client and server use the same source/fallbacks
        const res = await fetch(`${getApiBaseUrl()}/fx`);
        const j = await res.json();
        const rate = j?.usd_to_inr;
        // Validate server-provided rate to avoid bogus scraped values
        if (mounted && typeof rate === 'number' && isFinite(rate) && rate > 0 && rate > 10 && rate < 1000) {
          setUsdToInr(rate);
          return;
        }
      } catch {
        // fallthrough to client-side fallback below
      }
      try {
        const res2 = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=INR');
        const j2 = await res2.json();
        const rate2 = j2?.rates?.INR;
        if (mounted && typeof rate2 === 'number' && isFinite(rate2) && rate2 > 0) {
          setUsdToInr(rate2);
        }
      } catch {
        // ignore and keep default
      }
    };
    fetchRate();
    const id = setInterval(fetchRate, 10 * 60 * 1000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch { }
  }, []);

  const convert = useCallback((amountInUsd: number) => {
    const rate = usdToInr || 82.5; // Final fallback if completely offline
    return currency === 'INR' ? amountInUsd * rate : amountInUsd;
  }, [currency, usdToInr]);

  // Convert an amount in the active currency back to USD
  const convertToUsd = useCallback((amountInActive: number) => {
    const rate = usdToInr || 82.5;
    return currency === 'INR' ? amountInActive / rate : amountInActive;
  }, [currency, usdToInr]);

  const formatMoney = useCallback((amountInUsd: number) => {
    const n = convert(amountInUsd);
    if (currency === 'INR') {
      try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n); } catch { }
      return `₹${n.toFixed(2)}`;
    }
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n); } catch { }
    return `$${n.toFixed(2)}`;
  }, [convert, currency]);

  const formatMoneyCompact = useCallback((amountInUsd: number) => {
    const n = convert(amountInUsd);
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${compact(n)}`;
  }, [convert, currency]);

  const value = useMemo<Ctx>(() => ({ currency, setCurrency, usdToInr, convert, formatMoneyCompact, formatMoney, convertToUsd }), [currency, setCurrency, usdToInr, convert, formatMoneyCompact, formatMoney, convertToUsd]);

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
