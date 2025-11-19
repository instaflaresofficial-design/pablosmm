"use client";
import React, { useState, useEffect } from "react";
// import styles from "@/styles/QuantitySlider.module.css";

interface QuantitySliderProps {
  min?: number;
  max?: number;
  pricePerUnit?: number;
  onChange?: (quantity: number) => void;
}

const QuantitySlider: React.FC<QuantitySliderProps> = ({
  min = 50,
  max = 50000,
  pricePerUnit = 0.3,
  onChange,
}) => {
  const [quantity, setQuantity] = useState<number>(10000);
  const [fillPercentage, setFillPercentage] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingValue, setEditingValue] = useState<string>('');
  
  useEffect(() => {
    const percentage = ((quantity - min) / (max - min)) * 100;
    setFillPercentage(percentage);
  }, [quantity, min, max]);
  
  useEffect(() => {
    // keep the editing value in sync when not actively editing
    if (!isEditing) setEditingValue(String(quantity));
  }, [quantity, isEditing]);
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setQuantity(value);
    onChange?.(value);
  };

  const totalPrice = (quantity * pricePerUnit).toFixed(0);

  return (
    <div className='slider-container'>
      {/* Slider Container */}
      <div className='sliderWrapper'>
        {/* Filled Progress Bar */}
        <div 
          className='sliderFill'
          style={{ width: `${fillPercentage}%` }}
        ></div>

        {/* Actual Input Range */}
        <input
          type="range"
          min={min}
          max={max}
          value={quantity}
          onChange={handleSliderChange}
          className='slider'
        />
      </div>

      {/* Info Row */}
      <div className='sliderInfo'>
        <div className='sliderQuantity'>
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
              // allow only digits while typing (avoid commas/formatting interfering)
              const digitsOnly = e.target.value.replace(/[^\d]/g, "");
              setEditingValue(digitsOnly);
            }}
            onBlur={() => {
              // commit on blur: parse, clamp and update quantity + slider
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
          <span className='label'>quantity</span>
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
    </div>
  );
};

export default QuantitySlider;