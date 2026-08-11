"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/** PabloSMM serves Indian customers; all catalog and wallet amounts are INR. */
export type Currency = 'INR' | 'USD';

type Ctx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Fixed fallback FX rate (1 USD = 88 INR) */
  usdToInr: number;
  /** Amounts from the API are in INR. Converts to active currency. */
  convert: (amountInInr: number) => number;
  convertToUsd: (amountInInr: number) => number;
  formatMoneyCompact: (amountInInr: number) => string;
  formatMoney: (amountInInr: number) => string;
  formatMoneyDirect: (amountInNative: number) => string;
  formatMoneyDirectCompact: (amountInNative: number) => string;
};

const CurrencyContext = createContext<Ctx | null>(null);

const STORAGE_KEY = 'app:currency';
const USD_TO_INR = 88.0;

function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return n.toLocaleString();
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('INR');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Currency | null;
      if (saved === 'INR' || saved === 'USD') {
        setCurrencyState(saved);
      }
    } catch { }
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch { }
  }, []);

  const convert = useCallback((amountInInr: number) => {
    if (currency === 'USD') return amountInInr / USD_TO_INR;
    return amountInInr;
  }, [currency]);

  const convertToUsd = useCallback((amountInInr: number) => amountInInr / USD_TO_INR, []);

  const formatMoney = useCallback((amountInInr: number) => {
    const n = convert(amountInInr);
    if (currency === 'USD') return `$${n.toFixed(2)}`;
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n); } catch { }
    return `₹${n.toFixed(2)}`;
  }, [convert, currency]);

  const formatMoneyCompact = useCallback((amountInInr: number) => {
    const n = convert(amountInInr);
    if (currency === 'USD') return `$${compact(n)}`;
    return `₹${compact(n)}`;
  }, [convert, currency]);

  const formatMoneyDirect = useCallback((amountInNative: number) => {
    if (currency === 'USD') return `$${amountInNative.toFixed(2)}`;
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amountInNative); } catch { }
    return `₹${amountInNative.toFixed(2)}`;
  }, [currency]);

  const formatMoneyDirectCompact = useCallback((amountInNative: number) => {
    if (currency === 'USD') return `$${compact(amountInNative)}`;
    return `₹${compact(amountInNative)}`;
  }, [currency]);

  const value = useMemo<Ctx>(() => ({
    currency,
    setCurrency,
    usdToInr: USD_TO_INR,
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
      usdToInr: USD_TO_INR,
      convert: (val: number) => (typeof val === 'number' && !isNaN(val) ? val : 0),
      formatMoneyCompact: (val: number) => {
        const n = typeof val === 'number' && !isNaN(val) ? val : 0;
        return `₹${compact(n)}`;
      },
      formatMoney: (val: number) => {
        const n = typeof val === 'number' && !isNaN(val) ? val : 0;
        return `₹${n.toFixed(2)}`;
      },
      convertToUsd: (val: number) => (typeof val === 'number' && !isNaN(val) ? val / USD_TO_INR : 0),
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
