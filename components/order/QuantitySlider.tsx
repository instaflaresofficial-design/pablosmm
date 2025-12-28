"use client";
import React, { useRef, useMemo, useState, useEffect } from "react";
import { lightImpact, selectionTick, isMobileDevice } from "@/lib/haptics";

interface QuantitySliderProps {
  min?: number;
  max?: number;
  pricePerUnit?: number;
  onChange?: (quantity: number) => void;
  // Optional category filter UI just below sliderInfo
  activeCategory?: 'recommended' | 'cheapest' | 'premium';
  onCategoryChange?: (c: 'recommended' | 'cheapest' | 'premium') => void;
}

const QuantitySlider: React.FC<QuantitySliderProps> = ({
  min = 50,
  max = 50000,
  pricePerUnit = 0.3,
  onChange,
  activeCategory,
  onCategoryChange,
}) => {
  const [quantity, setQuantity] = useState<number>(10000);
  const [fillPercentage, setFillPercentage] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingValue, setEditingValue] = useState<string>("");

  const lastPulseRef = useRef<number>(0);
  const PULSE_COOLDOWN = 40; // ms

  const isMobile = useMemo(() => isMobileDevice(), []);

  const triggerFeedback = () => {
    if (!isMobile) return;
    const now = Date.now();
    if (now - lastPulseRef.current < PULSE_COOLDOWN) return;
    lastPulseRef.current = now;
    selectionTick();
  };

  useEffect(() => {
    const pct = ((quantity - min) / (max - min)) * 100;
    setFillPercentage(pct);
  }, [quantity, min, max]);

  useEffect(() => {
    if (!isEditing) setEditingValue(String(quantity));
  }, [quantity, isEditing]);

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(value)) {
      setQuantity(value);
      onChange?.(value);
    }
    triggerFeedback();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setQuantity(value);
    onChange?.(value);
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

  const totalPrice = (quantity * pricePerUnit).toFixed(0);

  return (
    <div className="slider-container">
      <div className="sliderWrapper">
        <div className="sliderFill" style={{ width: `${fillPercentage}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          value={quantity}
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
        <div className="sliderQuantity">
          <input
            type="text"
            name="quantity"
            className="value"
            value={isEditing ? editingValue : quantity.toLocaleString()}
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
              setQuantity(clamped);
              onChange?.(clamped);
              setIsEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
          <span className="label">quantity</span>
        </div>

        <div className="info-container">
          <div className="slider-info">
            <span className="label">MIN/MAX</span>
            <span className="value">{min.toLocaleString()}/{max.toLocaleString()}</span>
          </div>
          <div className="slider-info">
            <span className="label">PRICE</span>
            <span className="value">₹{totalPrice}</span>
          </div>
        </div>
      </div>

      {/* {onCategoryChange && (
        <div className="sliderFilters" role="tablist" aria-label="Service categories">
          {(
            [
              { key: 'recommended', label: 'Top Rated' },
              { key: 'cheapest', label: 'Cheapest' },
              { key: 'premium', label: 'Premium' },
            ] as const
          ).map((b) => (
            <button
              key={b.key}
              role="tab"
              aria-selected={activeCategory === b.key}
              className={`tab ${activeCategory === b.key ? 'active' : ''}`}
              onClick={() => onCategoryChange(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>
      )} */}
    </div>
  );
};

export default QuantitySlider;