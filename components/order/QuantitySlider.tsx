"use client";
import React, { useRef, useMemo, useState, useEffect } from "react";
import { useCurrency } from "@/components/layout/CurrencyProvider";
import { lightImpact, selectionTick, isMobileDevice } from "@/lib/haptics";
import Image from "next/image";

interface QuantitySliderProps {
  min?: number;
  max?: number;
  pricePerUnit?: number;
  onChange?: (quantity: number) => void;
  // Optional category filter UI just below sliderInfo
  activeCategory?: 'recommended' | 'cheapest' | 'premium';
  onCategoryChange?: (c: 'recommended' | 'cheapest' | 'premium') => void;
  onOrder?: () => Promise<void> | void;
  ordering?: boolean;
  orderStatus?: string | null;
  // Comment props
  comments?: string[];
  setComments?: (c: string[]) => void;
  showComments?: boolean;
}

import CommentInput from "./CommentInput";

const QuantitySlider: React.FC<QuantitySliderProps> = ({
  min = 50,
  max = 50000,
  pricePerUnit = 0.3,
  onChange,
  activeCategory,
  onCategoryChange,
  onOrder,
  ordering,
  orderStatus,
  comments = [],
  setComments,
  showComments = false,
}) => {
  const { formatMoneyCompact, convert, currency, usdToInr, convertToUsd } = useCurrency();
  const [quantity, setQuantity] = useState<number>(1000);
  const [fillPercentage, setFillPercentage] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingValue, setEditingValue] = useState<string>("");
  const [mode, setMode] = useState<'qty' | 'amount'>("qty");
  const [budgetEditing, setBudgetEditing] = useState<boolean>(false);
  const [budgetValue, setBudgetValue] = useState<string>("");

  const lastPulseRef = useRef<number>(0);
  const PULSE_COOLDOWN = 40; // ms

  const isMobile = useMemo(() => isMobileDevice(), []);

  // Choose a dynamic step based on the current value (or min if not set yet)
  const stepFor = (v: number) => {
    if (v < 100) return 10;
    if (v < 1000) return 50;
    if (v < 10000) return 100;
    if (v < 100000) return 500;
    return 1000;
  };

  const snapToStep = (v: number) => {
    const step = stepFor(v);
    const snapped = Math.round((v - min) / step) * step + min;
    return Math.max(min, Math.min(max, snapped));
  };

  const formatCompact = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
    return n.toLocaleString();
  };

  const formatINR = (n: number) => {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
    } catch {
      return `$${n.toFixed(2)}`;
    }
  };

  const triggerFeedback = () => {
    if (!isMobile) return;
    const now = Date.now();
    if (now - lastPulseRef.current < PULSE_COOLDOWN) return;
    lastPulseRef.current = now;
    selectionTick();
  };

  useEffect(() => {
    const range = max - min;
    const pct = range <= 0 ? 100 : ((quantity - min) / range) * 100;
    setFillPercentage(Math.max(0, Math.min(100, pct)));
  }, [quantity, min, max]);

  // When service (min/max) changes, clamp or reset the quantity to keep in range
  const prevRange = useRef<{ min: number; max: number }>({ min, max });
  useEffect(() => {
    const changed = prevRange.current.min !== min || prevRange.current.max !== max;
    if (changed) {
      // Prefer resetting to min if current is out of new range; else keep snapped value
      const clamped = Math.max(min, Math.min(max, quantity));
      const snapped = snapToStep(clamped);
      setQuantity(snapped);
      if (!isEditing) setEditingValue(String(snapped));
      prevRange.current = { min, max };
    }
  }, [min, max]);

  useEffect(() => {
    if (!isEditing) setEditingValue(String(quantity));
  }, [quantity, isEditing]);

  // Keep budget input in sync with quantity when not editing budget
  useEffect(() => {
    if (mode === 'amount' && !budgetEditing) {
      const nActive = convert(totalPriceNumberUsd);
      setBudgetValue(String(Math.round(nActive)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, budgetEditing, quantity, pricePerUnit, currency]);

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const raw = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(raw)) {
      const snapped = snapToStep(raw);
      setQuantity(snapped);
      onChange?.(snapped);
    }
    triggerFeedback();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10);
    const snapped = isNaN(raw) ? min : snapToStep(raw);
    setQuantity(snapped);
    onChange?.(snapped);
    triggerFeedback();
  };

  const handleTouchStart = () => {
    if (!isMobile) return;
    // immediate feedback and unlock audio on iOS
    lightImpact();
  };
  const handleTouchMove = () => triggerFeedback();

  const handlePointerDown = () => { if (isMobile) lightImpact(); };
  const handlePointerUp = () => triggerFeedback();

  const totalPriceNumberUsd = quantity * pricePerUnit; // pricePerUnit provided in USD per unit
  const totalPriceCompact = formatMoneyCompact(totalPriceNumberUsd);
  const isFixed = min === max;
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  // When range changes and we are in amount mode, recompute quantity from budget
  useEffect(() => {
    if (mode === 'amount') {
      const nActive = parseFloat(budgetValue || '0');
      const budgetUsd = convertToUsd(nActive);
      const q = Math.floor(budgetUsd / pricePerUnit);
      const snapped = snapToStep(Math.max(min, Math.min(max, isFinite(q) ? q : min)));
      setQuantity(snapped);
      onChange?.(snapped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max]);

  // Compute preview quantity for current budget while typing in amount mode
  const previewQuantity = React.useMemo(() => {
    if (mode !== 'amount') return quantity;
    const nActive = budgetEditing ? parseFloat(budgetValue || '0') : convert(totalPriceNumberUsd);
    const budgetUsd = budgetEditing ? convertToUsd(nActive) : totalPriceNumberUsd;
    const q = Math.floor((isFinite(budgetUsd) && pricePerUnit > 0) ? budgetUsd / pricePerUnit : min);
    const snapped = snapToStep(Math.max(min, Math.min(max, isFinite(q) ? q : min)));
    return snapped;
  }, [mode, budgetEditing, budgetValue, convert, totalPriceNumberUsd, currency, usdToInr, pricePerUnit, min, max, quantity]);

  return (
    <div className="slider-container">
      <div className="sliderWrapper">
        <div className="sliderFill" style={{ width: `${fillPercentage}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          value={quantity}
          step={1}
          disabled={isFixed}
          onInput={handleInput}            // fires continuously while sliding (mobile-friendly)
          onChange={handleChange}          // extra safety
          onTouchStart={handleTouchStart}  // unlock + initial feedback
          onTouchMove={handleTouchMove}    // continuous feedback on iOS
          onPointerDown={handlePointerDown} // Android/modern browsers
          onPointerUp={handlePointerUp}
          className="slider"
        />
      </div>

      <div className="sliderInfo">
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
          {mode === 'qty' ? (
            <div className="sliderQuantity">
              <input
                type="text"
                name="quantity"
                className="value"
                value={isEditing ? editingValue : formatCompact(quantity)}
                onFocus={() => {
                  setIsEditing(true);
                  setEditingValue(String(quantity));
                }}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/[^\d]/g, "");
                  setEditingValue(digitsOnly);
                }}
                onBlur={() => {
                  const parsed = parseInt(editingValue || String(min), 10);
                  const clamped = Math.min(max, Math.max(min, isNaN(parsed) ? min : parsed));
                  const snapped = snapToStep(clamped);
                  setQuantity(snapped);
                  onChange?.(snapped);
                  setIsEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                readOnly={isFixed}
              />
              <span className="label">quantity</span>
            </div>
          ) : (
            <div className="sliderQuantity budgetBox">
              <span className="currency-symbol">{currencySymbol}</span>
              <input
                type="text"
                name="budget"
                className="value"
                value={budgetEditing ? budgetValue : String(Math.round(convert(totalPriceNumberUsd)))}
                onFocus={() => {
                  setBudgetEditing(true);
                  setBudgetValue(String(Math.round(convert(totalPriceNumberUsd))));
                }}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/[^\d]/g, "");
                  setBudgetValue(digitsOnly);
                }}
                onBlur={() => {
                  const nActive = parseFloat(budgetValue || '0');
                  const budgetUsd = convertToUsd(nActive);
                  const q = Math.floor(budgetUsd / pricePerUnit);
                  const snapped = snapToStep(Math.max(min, Math.min(max, isFinite(q) ? q : min)));
                  setQuantity(snapped);
                  onChange?.(snapped);
                  setBudgetEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                readOnly={isFixed}
              />
              <span className="label">amount</span>
            </div>
          )}

          <button
            className="switch-btn"
            onClick={() => {
              setMode(mode === 'qty' ? 'amount' : 'qty');
              if (isMobile) lightImpact();
            }}
            aria-label="Toggle input mode"
          >
            <Image src="/switch.png" alt="Switch" width={24} height={24} />
          </button>
        </div>

        <div className="info-container">
          <div className="slider-info">
            <span className="label">MIN/MAX</span>
            <span className="value">{formatCompact(min)}/{formatCompact(max)}</span>
          </div>
          {mode !== 'amount' && (
            <div className="slider-info">
              <span className="label">PRICE</span>
              <span className="value">{totalPriceCompact}</span>
            </div>
          )}
          {mode === 'amount' && (
            <div className="slider-info">
              <span className="label">QTY</span>
              <span className="value">{formatCompact(previewQuantity)}</span>
            </div>
          )}
        </div>
      </div>

      {showComments && setComments && (
        <CommentInput
          targetQuantity={quantity}
          comments={comments}
          setComments={setComments}
        />
      )}

      {/* Order button injected here as requested */}
      {typeof onOrder === 'function' && (
        <div className="order-actions" style={{ marginTop: '-10px' }}>
          <button
            className="btn-order"
            onClick={() => { if (!ordering) onOrder(); }}
            disabled={ordering}
            aria-live="polite"
          >
            {ordering ? 'Ordering…' : (
              <span>place order for <span className="order-amount">{currency === 'INR' ? formatINR(convert(totalPriceNumberUsd)) : `$${(convert(totalPriceNumberUsd)).toFixed(2)}`}</span></span>
            )}
          </button>
        </div>
      )}

      {/* status toasts are handled globally via react-hot-toast in the summary page */}
    </div>
  );
};

export default QuantitySlider;
