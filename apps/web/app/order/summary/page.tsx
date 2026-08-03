"use client";
import QuantitySlider from '@/components/order/QuantitySlider'
import SearchContainer from '@/components/order/SearchContainer'
import ServiceInfoPanel from '@/components/order/ServiceInfo'
import Preview from '@/components/preview/Preview'
import { useNormalizedServices } from '@/lib/useServices'
import { useSearchParams } from 'next/navigation'
import React, { Suspense, useMemo, useState, startTransition, useRef } from 'react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { toast } from 'sonner'
import type { Platform, ServiceType, Variant, NormalizedSmmService } from '@/types/smm'
import FollowerPreview from '@/components/preview/FollowerPreview';
import PostPreview from '@/components/preview/PostPreview';
import ServiceCard from '@/components/order/ServiceCard';
import Image from 'next/image';
import { useMetadata } from '@/lib/useMetadata';
import { getApiBaseUrl } from '@/lib/config';
import { createPortal } from 'react-dom';
import { getServiceTags } from '@/lib/serviceTags';

const GEO_OPTIONS = [
  { value: 'All', label: 'All Regions' },
  { value: 'Indian', label: 'Indian' },
  { value: 'USA', label: 'USA' },
  { value: 'Global', label: 'Global' },
];

const SPEED_OPTIONS = [
  { value: 'All', label: 'All Speeds' },
  { value: 'Instant', label: 'Instant' },
  { value: 'Fast', label: 'Fast' },
  { value: 'Normal Speed', label: 'Normal Speed' },
];

const REFILL_OPTIONS = [
  { value: 'All', label: 'All Refills' },
  { value: 'Available', label: 'Available' },
  { value: 'No Refill', label: 'No Refill' },
];

const DROP_OPTIONS = [
  { value: 'All', label: 'All Drop Types' },
  { value: 'Non Drop', label: 'Non Drop' },
  { value: 'May Drop', label: 'May Drop' },
];

type FilterType = 'geo' | 'speed' | 'refill' | 'drop' | 'all' | null;

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
  const { platform, service, variant, link } = useSelectionFromQuery();
  const { services: all, loading } = useNormalizedServices();
  const { metadata, loading: metaLoading } = useMetadata(link, service);
  const [quantity, setQuantity] = useState<number>(1000);
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<Category>('recommended');
  const [sliderMode, setSliderMode] = useState<'qty' | 'amount'>('qty');
  const [budgetUsd, setBudgetUsd] = useState<number>(0);
  const [selIndex, setSelIndex] = useState<number>(0);
  const [comments, setComments] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState<string>('');
  
  // Modal state for Service Details
  const [selectedService, setSelectedService] = useState<NormalizedSmmService | null>(null);

  // Filter Drawer State
  const [activeDrawer, setActiveDrawer] = useState<FilterType>(null);
  const [geoFilter, setGeoFilter] = useState('All');
  const [speedFilter, setSpeedFilter] = useState('All');
  const [refillFilter, setRefillFilter] = useState('All');
  const [dropFilter, setDropFilter] = useState('All');
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = useMemo(() => {
    const bySearch = search.trim().toLowerCase();
    let list;
    if (bySearch) {
      list = all.filter((s) => {
        const hay = `${s.displayId ?? ''} ${s.source ?? ''} ${s.providerName} ${s.type} ${s.category}`.toLowerCase();
        return hay.includes(bySearch);
      });
    } else {
      list = all.filter((s) => {
        if (s.platform !== platform || s.type !== service) return false;
        if (variant === 'any') return true;
        if (variant === 'custom') {
          const name = (s.displayName || s.providerName || '').toLowerCase();
          return s.variant === 'custom' || name.includes('custom') || (s.category || '').toLowerCase().includes('custom');
        }
        if (variant === 'random') {
          const name = (s.displayName || s.providerName || '').toLowerCase();
          return s.variant === 'random' || s.variant === 'any' || (!name.includes('custom') && !(s.category || '').toLowerCase().includes('custom'));
        }
        return s.variant === variant;
      });
    }

    // Apply Drawer Filters
    if (geoFilter !== 'All' || speedFilter !== 'All' || refillFilter !== 'All' || dropFilter !== 'All') {
      list = list.filter(s => {
        const tags = getServiceTags(s);
        if (geoFilter !== 'All' && tags.geo !== geoFilter) return false;
        if (speedFilter !== 'All' && tags.speed !== speedFilter) return false;
        if (refillFilter !== 'All' && tags.refill !== refillFilter) return false;
        if (dropFilter !== 'All' && tags.drop !== dropFilter) return false;
        return true;
      });
    }

    const searched = list;
    if (category === 'cheapest') return [...searched].sort((a, b) => a.ratePer1000 - b.ratePer1000);
    if (category === 'premium') return [...searched].sort((a, b) => b.ratePer1000 - a.ratePer1000);
    return [...searched].sort((a, b) => {
      const refillScore = (Number(b.refill) - Number(a.refill)) * 100;
      const priceScore = Math.sign((a.ratePer1000 - b.ratePer1000));
      const timeA = a.averageTime ?? 9999; const timeB = b.averageTime ?? 9999;
      return refillScore || priceScore || (timeA - timeB);
    });
  }, [all, platform, service, variant, search, category, geoFilter, speedFilter, refillFilter, dropFilter]);

  const selected = filtered[Math.min(selIndex, Math.max(filtered.length - 1, 0))] || null;
  const min = selected?.min || 50;
  const max = selected?.max || 50000;
  const pricePerUnit = (selected?.ratePer1000 || 0) / 1000;

  // Reset index when result set changes
  React.useEffect(() => { setSelIndex(0); }, [platform, service, variant, category, search]);

  // Order state
  const [ordering, setOrdering] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  const showComments = useMemo(() => {
    if (!selected) return false;
    const name = (selected.displayName || selected.providerName || '').toLowerCase();
    const cat = (selected.category || '').toLowerCase();
    return service === 'comments' && (name.includes('custom') || cat.includes('custom'));
  }, [selected, service]);

  async function handleOrder() {
    if (!selected) return setOrderStatus('No service selected');

    if (showComments) {
      if (comments.length === 0) {
        toast.error('Please add at least one comment');
        return;
      }
      if (comments.length < quantity) {
        toast.error(`Please add ${quantity - comments.length} more comments or use Smart Fill`);
        return;
      }
    }

    if (selected.customInputRequired && !customInput.trim()) {
      toast.error(`Please enter ${selected.customInputLabel || 'required input / answer'}`);
      return;
    }

    setConfirmOpen(true);
  }

  // Wrapper for list card click
  const handleViewDetails = (service: NormalizedSmmService) => {
    const idx = filtered.findIndex((s) => s.id === service.id);
    if (idx !== -1) setSelIndex(idx);
    setSelectedService(service);
  };

  const handleSelectService = (service: NormalizedSmmService) => {
    const idx = filtered.findIndex((s) => s.id === service.id);
    if (idx !== -1) setSelIndex(idx);
  };

  // confirm modal state and handler
  const [confirmOpen, setConfirmOpen] = useState(false);
  async function doConfirmedOrder() {
    if (!selected) {
      setOrderStatus('No service selected');
      setConfirmOpen(false);
      return;
    }
    setConfirmOpen(false);
    setOrdering(true);
    setOrderStatus(null);
    try {
      const payload: any = {
        serviceId: selected.id,
        sourceServiceId: selected.sourceServiceId,
        quantity,
        link,
      };

      if (showComments && comments.length > 0) {
        payload.comments = comments.join('\n');
      }

      if (selected.customInputRequired || customInput.trim()) {
        payload.customInput = customInput.trim();
        payload.answer = customInput.trim();
      }

      const res = await fetch(`${getApiBaseUrl()}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      let body;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        body = await res.json();
      } else {
        const text = await res.text();
        body = { error: text || res.statusText };
      }

      // Handle Provider Error (nested inside success/failed response)
      // body.status is "failed" when provider rejected, "success" when all went well
      if (body?.status === "failed" && body?.order?.error) {
        const providerError = String(body.order.error);
        if (providerError.toLowerCase().includes('balance')) {
          toast.error("Insufficient Balance on Provider", {
            description: "We are out of balance on the main server. Please contact support.",
            duration: 5000,
          });
          setOrderStatus(`Provider Error: ${providerError}`);
          return;
        }
        toast.error("Order Failed", { description: providerError });
        setOrderStatus(`Provider Error: ${providerError}`);
        return;
      }

      if (res.status === 402 || (body?.error && body.error.includes("Insufficient balance"))) {
        toast.error("Insufficient Balance", {
          description: "You need to recharge your wallet to place this order.",
          action: {
            label: "Add Funds",
            onClick: () => window.location.href = '/wallet'
          },
          duration: 6000,
        });
        setOrderStatus("Insufficient balance. Please recharge.");
      } else if (res.status === 401) {
        toast.error("Session Expired", { description: "Please login again." });
        setOrderStatus("Session expired. Please login again.");
      } else if (!res.ok) {
        const msg = String(body?.error || JSON.stringify(body));
        toast.error("Order Failed", { description: msg });
        setOrderStatus(msg);
      } else if (body?.status === "success") {
        // Explicit success check — always show green toast
        toast.success("🎉 Order Placed Successfully!", {
          description: "Your order has been submitted and is being processed.",
          duration: 4000,
        });
        setOrderStatus("Order submitted successfully.");
      } else if (body?.error) {
        toast.error("Error", { description: body.error });
        setOrderStatus(body.error);
      } else {
        toast.success("Order Placed Successfully!");
        setOrderStatus("Order submitted successfully.");
      }
    } catch (err: any) {
      setOrderStatus(`Request failed: ${err?.message ?? String(err)}`);
      toast.error("Request Failed", { description: err?.message });
    } finally {
      setOrdering(false);
    }
  }

  const handleSelect = (value: string, type: 'geo' | 'speed' | 'refill' | 'drop') => {
    if (type === 'geo') setGeoFilter(value);
    if (type === 'speed') setSpeedFilter(value);
    if (type === 'refill') setRefillFilter(value);
    if (type === 'drop') setDropFilter(value);
  };

  const renderFilterDrawer = () => {
    if (!mounted || !activeDrawer) return null;

    return createPortal(
      <>
        <div className="filter-overlay" onClick={() => setActiveDrawer(null)} />
        <div className="filter-drawer">
          <div className="drawer-handle" />
          <div className="drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Filters</h3>
            {(geoFilter !== 'All' || speedFilter !== 'All' || refillFilter !== 'All' || dropFilter !== 'All') && (
              <button 
                onClick={() => { setGeoFilter('All'); setSpeedFilter('All'); setRefillFilter('All'); setDropFilter('All'); }}
                style={{ background: 'none', border: 'none', color: '#a890ff', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'GM' }}
              >
                Clear All
              </button>
            )}
          </div>
          <div className="drawer-sections">
            <div className="drawer-filter-section">
              <h4>Geo (Region)</h4>
              <div className="filter-chips">
                {GEO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`filter-chip ${geoFilter === opt.value ? 'selected' : ''}`}
                    onClick={() => handleSelect(opt.value, 'geo')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="drawer-filter-section">
              <h4>Speed</h4>
              <div className="filter-chips">
                {SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`filter-chip ${speedFilter === opt.value ? 'selected' : ''}`}
                    onClick={() => handleSelect(opt.value, 'speed')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="drawer-filter-section">
              <h4>Refill</h4>
              <div className="filter-chips">
                {REFILL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`filter-chip ${refillFilter === opt.value ? 'selected' : ''}`}
                    onClick={() => handleSelect(opt.value, 'refill')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="drawer-filter-section">
              <h4>Drop / Non Drop</h4>
              <div className="filter-chips">
                {DROP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`filter-chip ${dropFilter === opt.value ? 'selected' : ''}`}
                    onClick={() => handleSelect(opt.value, 'drop')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="drawer-footer">
              <button className="apply-btn" onClick={() => setActiveDrawer(null)}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </>,
      document.body
    );
  };

  const triggerRef = useRef<HTMLDivElement>(null);
  const [sliderAtBottom, setSliderAtBottom] = useState(false);

  React.useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && entry.boundingClientRect.top < 50) {
          setSliderAtBottom(true);
        } else if (entry.isIntersecting) {
          setSliderAtBottom(false);
        }
      },
      {
        threshold: 0,
        rootMargin: "0px"
      }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className='summary-container'>



      {service === 'followers' ? (
        <FollowerPreview
          primary={service === 'followers' ? (metadata?.followers || 0) + quantity : (metadata?.followers || 0)}
          following={metadata?.following || 0}
          posts={metadata?.posts || 0}
          primaryLabel={(() => {
            if (platform === 'youtube') return 'subscribers';
            if (platform === 'telegram') return 'members';
            return 'followers';
          })()}
          postsLabel={platform === 'youtube' ? 'videos' : 'posts'}
          followingLabel={platform === 'youtube' ? 'subscribed' : 'following'}
          username={(() => {
            if (link) {
              try {
                const u = new URL(link);
                const seg = (u.pathname || '').split('/').filter(Boolean).pop();
                if (seg) return decodeURIComponent(seg.replace(/@/, ''));
                const user = u.searchParams.get('u') || u.searchParams.get('user');
                if (user) return user;
              } catch {
                return link.split('/').filter(Boolean).pop() || 'example_user';
              }
            }
            return 'example_user';
          })()}
          avatarUrl={metadata?.image || '/bg.png'}
          className={`preview ${platform} ${service}`}
          isLoading={metaLoading}
        />
      ) : (
        <PostPreview metric={service} metricCount={quantity} username={link || 'example_post'} imageUrl={metadata?.image} isLoading={metaLoading} />
      )}
      
      {/* TOP SLIDER */}
      <div className={`sticky-slider-wrapper top-slider ${sliderAtBottom ? 'hidden' : 'visible'}`}>
        <QuantitySlider
          value={quantity}
          mode={sliderMode}
          min={min}
          max={max}
          pricePerUnit={pricePerUnit}
          onChange={(val) => startTransition(() => setQuantity(val))}
          activeCategory={category}
          onCategoryChange={setCategory}
          onModeChange={setSliderMode}
          onBudgetChange={setBudgetUsd}
          showComments={showComments}
          comments={comments}
          setComments={setComments}
          onOrder={handleOrder}
          ordering={ordering}
          orderStatus={orderStatus}
        />
      </div>


      <div className="service-list-container">
        <div ref={triggerRef} style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, pointerEvents: 'none' }} />
        <div style={{ display: selectedService ? 'none' : 'block' }}>
          <div className="search-wrapper">
            <SearchContainer value={search} onChange={setSearch} onFilterClick={() => setActiveDrawer('all')} />
          </div>
          
          <div className="category-tabs">
            <button className={`tab-btn ${category === 'recommended' ? 'active' : ''}`} onClick={() => setCategory('recommended')}>Best Rated</button>
            <button className={`tab-btn ${category === 'cheapest' ? 'active' : ''}`} onClick={() => setCategory('cheapest')}>Cheapest</button>
            <button className={`tab-btn ${category === 'premium' ? 'active' : ''}`} onClick={() => setCategory('premium')}>Premium</button>
          </div>

          <div className="showing-label">
            <span>Showing <strong>{filtered.length}</strong> services</span>
          </div>

          <div className="services-list">
            {filtered.map((s, idx) => (
              <ServiceCard 
                key={s.id} 
                service={s} 
                quantity={quantity} 
                mode={sliderMode}
                budgetUsd={budgetUsd}
                link={link} 
                isSelected={idx === selIndex}
                onSelect={handleSelectService}
                onViewDetails={handleViewDetails} 
              />
            ))}
          </div>
        </div>

        {selectedService && (
          <div className="service-details-inline">
            <ServiceInfoPanel
              services={filtered}
              index={selIndex}
              onChangeIndex={(i) => {
                setSelIndex(i);
                setSelectedService(filtered[i]);
              }}
              activeCategory={category}
              onCategoryChange={setCategory}
              onClose={() => setSelectedService(null)}
            />
          </div>
        )}
      </div>

      <div className={`sticky-slider-wrapper bottom-slider ${sliderAtBottom ? 'visible' : 'hidden'}`}>
        <QuantitySlider
          value={quantity}
          mode={sliderMode}
          min={min}
          max={max}
          pricePerUnit={pricePerUnit}
          onChange={(val) => startTransition(() => setQuantity(val))}
          activeCategory={category}
          onCategoryChange={setCategory}
          onModeChange={setSliderMode}
          onBudgetChange={setBudgetUsd}
          showComments={showComments}
          comments={comments}
          setComments={setComments}
          customInputRequired={selected?.customInputRequired}
          customInputLabel={selected?.customInputLabel}
          customInput={customInput}
          setCustomInput={setCustomInput}
          onOrder={handleOrder}
          ordering={ordering}
          orderStatus={orderStatus}
        />
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Place order"
        message={`Place order for ${quantity} units on ${selected?.displayName || 'this service'}?`}
        confirmLabel="Place order"
        onConfirm={doConfirmedOrder}
        onCancel={() => setConfirmOpen(false)}
      />
      {renderFilterDrawer()}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SummaryContent />
    </Suspense>
  );
}