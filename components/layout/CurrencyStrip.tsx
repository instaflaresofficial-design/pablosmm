"use client";
import React from 'react';
import { useCurrency } from './CurrencyProvider';

export default function CurrencyStrip() {
  const { currency, setCurrency } = useCurrency();
  return (
    <div className="currency-strip" role="region" aria-label="Currency selector" style={{ display: 'none' }}>
      <div className="currency-strip-inner">
        <span className="label">Currency</span>
        <div className="switch">
          <button
            className={`pill ${currency === 'USD' ? 'active' : ''}`}
            onClick={() => setCurrency('USD')}
            aria-pressed={currency === 'USD'}
          >
            USD $
          </button>
          <button
            className={`pill ${currency === 'INR' ? 'active' : ''}`}
            onClick={() => setCurrency('INR')}
            aria-pressed={currency === 'INR'}
          >
            INR ₹
          </button>
        </div>
      </div>
    </div>
  );
}
