"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/** PabloSMM serves Indian customers; all catalog and wallet amounts are INR. */
export type Currency = 'INR';

type Ctx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** @deprecated Kept for API compatibility; always null (no FX). */
  usdToInr: null;
  /** Amounts from the API are already in INR. */
  convert: (amountInInr: number) => number;
  convertToUsd: (amountInInr: number) => number;
  formatMoneyCompact: (amountInInr: number) => string;
  formatMoney: (amountInInr: number) => string;
  formatMoneyDirect: (amountInNative: number) => string;
  formatMoneyDirectCompact: (amountInNative: number) => string;
};

const CurrencyContext = createContext<Ctx | null>(null);

const STORAGE_KEY = 'app:currency';

function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return n.toLocaleString();
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('INR');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'INR');
    } catch { }
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState('INR');
    try { localStorage.setItem(STORAGE_KEY, 'INR'); } catch { }
  }, []);

  const convert = useCallback((amountInInr: number) => amountInInr, []);
  const convertToUsd = useCallback((amountInInr: number) => amountInInr, []);

  const formatMoney = useCallback((amountInInr: number) => {
    const n = convert(amountInInr);
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n); } catch { }
    return `₹${n.toFixed(2)}`;
  }, [convert]);

  const formatMoneyCompact = useCallback((amountInInr: number) => {
    const n = convert(amountInInr);
    return `₹${compact(n)}`;
  }, [convert]);

  const formatMoneyDirect = useCallback((amountInNative: number) => {
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amountInNative); } catch { }
    return `₹${amountInNative.toFixed(2)}`;
  }, []);

  const formatMoneyDirectCompact = useCallback((amountInNative: number) => {
    return `₹${compact(amountInNative)}`;
  }, []);

  const value = useMemo<Ctx>(() => ({
    currency,
    setCurrency,
    usdToInr: null,
    convert,
    formatMoneyCompact,
    formatMoney,
    convertToUsd,
    formatMoneyDirect,
    formatMoneyDirectCompact,
  }), [currency, setCurrency, convert, formatMoneyCompact, formatMoney, convertToUsd, formatMoneyDirect, formatMoneyDirectCompact]);

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    return {
      currency: 'INR' as Currency,
      setCurrency: () => {},
      usdToInr: null,
      convert: (val: number) => (typeof val === 'number' && !isNaN(val) ? val : 0),
      formatMoneyCompact: (val: number) => {
        const n = typeof val === 'number' && !isNaN(val) ? val : 0;
        return `₹${compact(n)}`;
      },
      formatMoney: (val: number) => {
        const n = typeof val === 'number' && !isNaN(val) ? val : 0;
        return `₹${n.toFixed(2)}`;
      },
      convertToUsd: (val: number) => (typeof val === 'number' && !isNaN(val) ? val : 0),
      formatMoneyDirect: (val: number) => {
        const n = typeof val === 'number' && !isNaN(val) ? val : 0;
        return `₹${n.toFixed(2)}`;
      },
      formatMoneyDirectCompact: (val: number) => {
        const n = typeof val === 'number' && !isNaN(val) ? val : 0;
        return `₹${compact(n)}`;
      },
    };
  }
  return ctx;
}
