"use client";
import React, { useEffect, useMemo } from 'react';
import { useNormalizedServices } from '@/lib/useServices';
import type { Platform, ServiceType, Variant } from '@/types/smm';

interface VariantSelectorProps {
  platform: Platform;
  serviceType: ServiceType;
  activeVariant: Variant;
  onVariantChange: (v: Variant) => void;
}

const VARIANT_ORDER: Variant[] = ['any', 'post', 'reel', 'story', 'igtv', 'video', 'live', 'short'];

const VariantSelector: React.FC<VariantSelectorProps> = ({ platform, serviceType, activeVariant, onVariantChange }) => {
  const { services } = useNormalizedServices();

  const variants = useMemo(() => {
    const set = new Set<Variant>();
    for (const s of services) {
      if (s.platform === platform && s.type === serviceType) set.add(s.variant);
    }
    const arr = Array.from(set);
    arr.sort((a, b) => VARIANT_ORDER.indexOf(a) - VARIANT_ORDER.indexOf(b));
    // Ensure 'any' is always present as a default option
    return (arr.includes('any') ? arr : ['any', ...arr]) as Variant[];
  }, [services, platform, serviceType]);

  // Reset invalid active variant
  useEffect(() => {
    if (!variants.includes(activeVariant)) onVariantChange(variants[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, serviceType, variants.length]);

  if (!variants.length) return null;

  return (
    <div className="platform-container">
      <div className="text-container">
        <span>STEP-2.1</span>
        <h3>Choose content type (optional)</h3>
      </div>
      <div className="platforms">
        {variants.map((v) => {
          const label = v === 'any' ? 'Any' : v.charAt(0).toUpperCase() + v.slice(1);
          const isActive = activeVariant === v;
          return (
            <div
              key={v}
              className={`service-card ${isActive ? 'active' : ''}`}
              onClick={() => onVariantChange(v)}
            >
              <span className={isActive ? 'active' : ''}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VariantSelector;
