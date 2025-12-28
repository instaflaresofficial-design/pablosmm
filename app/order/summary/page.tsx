"use client";
import QuantitySlider from '@/components/order/QuantitySlider'
import SearchContainer from '@/components/order/SearchContainer'
import ServiceInfoPanel from '@/components/order/ServiceInfo'
import Preview from '@/components/preview/Preview'
import { useNormalizedServices } from '@/lib/useServices'
import { useSearchParams } from 'next/navigation'
import React, { Suspense, useMemo, useState } from 'react'
import type { Platform, ServiceType, Variant } from '@/types/smm'

// Hook that reads URL search params. Must be used within a <Suspense> boundary in Next.js app router.
function useSelectionFromQuery() {
  const params = useSearchParams();
  const platform = (params.get('platform') || 'instagram') as Platform;
  const service = (params.get('service') || 'likes') as ServiceType;
  const variant = (params.get('variant') || 'any') as Variant;
  const link = params.get('link') || '';
  return { platform, service, variant, link };
}

type Category = 'recommended' | 'cheapest' | 'premium';

// Isolated content placed under Suspense to satisfy useSearchParams requirements during prerender/hydration
const SummaryContent = () => {
  const { platform, service, variant } = useSelectionFromQuery();
  const { services: all, loading } = useNormalizedServices();
  const [quantity, setQuantity] = useState<number>(1000);
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<Category>('recommended');
  const [selIndex, setSelIndex] = useState<number>(0);

  const filtered = useMemo(() => {
    const list = all.filter((s) => s.platform === platform && s.type === service && (variant === 'any' || s.variant === variant));
    const bySearch = search.trim().toLowerCase();
    const searched = bySearch ? list.filter((s) => s.providerName.toLowerCase().includes(bySearch)) : list;
    if (category === 'cheapest') return [...searched].sort((a, b) => a.ratePer1000 - b.ratePer1000);
    if (category === 'premium') return [...searched].sort((a, b) => b.ratePer1000 - a.ratePer1000);
    // recommended: prefer refill, then good price median-ish, then lower average time
    return [...searched].sort((a, b) => {
      const refillScore = (Number(b.refill) - Number(a.refill)) * 100;
      const priceScore = Math.sign((a.ratePer1000 - b.ratePer1000));
      const timeA = a.averageTime ?? 9999; const timeB = b.averageTime ?? 9999;
      const timeScore = timeA - timeB;
      return refillScore || priceScore || timeScore;
    });
  }, [all, platform, service, variant, search, category]);

  const selected = filtered[Math.min(selIndex, Math.max(filtered.length - 1, 0))] || null;
  const min = selected?.min || 50;
  const max = selected?.max || 50000;
  const pricePerUnit = (selected?.ratePer1000 || 0) / 1000;
  // Reset index when result set changes
  React.useEffect(() => { setSelIndex(0); }, [platform, service, variant, category, search]);

  return (
    <div className='summary-container'>
        <Preview />
        <QuantitySlider
          min={min}
          max={max}
          pricePerUnit={pricePerUnit}
          onChange={setQuantity}
          activeCategory={category}
          onCategoryChange={setCategory}
        />
        <SearchContainer value={search} onChange={setSearch} />
        <ServiceInfoPanel
          services={filtered}
          index={selIndex}
          onChangeIndex={setSelIndex}
          activeCategory={category}
          onCategoryChange={setCategory}
        />
    </div>
  )
}
// Page component wraps the content in Suspense to avoid CSR bailout errors for useSearchParams
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SummaryContent />
    </Suspense>
  );
}