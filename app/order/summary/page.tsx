"use client";
import QuantitySlider from '@/components/order/QuantitySlider'
import SearchContainer from '@/components/order/SearchContainer'
import ServiceInfoPanel from '@/components/order/ServiceInfo'
import Preview from '@/components/preview/Preview'
import { useNormalizedServices } from '@/lib/useServices'
import { useSearchParams } from 'next/navigation'
import React, { Suspense, useMemo, useState } from 'react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { Toaster, toast } from 'react-hot-toast'
import type { Platform, ServiceType, Variant } from '@/types/smm'
import FollowerPreview from '@/components/preview/FollowerPreview';
import PostPreview from '@/components/preview/PostPreview';

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
  const [quantity, setQuantity] = useState<number>(1000);
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<Category>('recommended');
  const [selIndex, setSelIndex] = useState<number>(0);

  const filtered = useMemo(() => {
    const bySearch = search.trim().toLowerCase();
    let list;
    if (bySearch) {
      // If there's an active search, ignore current platform/service/variant
      // and match across ids, provider name, type and category so users can
      // find services from any page and also search by service id.
      list = all.filter((s) => {
        const hay = `${s.id} ${s.sourceServiceId ?? ''} ${s.source ?? ''} ${s.providerName} ${s.type} ${s.category}`.toLowerCase();
        return hay.includes(bySearch);
      });
    } else {
      list = all.filter((s) => s.platform === platform && s.type === service && (variant === 'any' || s.variant === variant));
    }
    const searched = list;
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

  // Order state
  const [ordering, setOrdering] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  // show toast when orderStatus changes
  React.useEffect(() => {
    if (!orderStatus) return;
    if (orderStatus.startsWith('Error')) {
      toast.error(orderStatus);
    } else {
      toast.success(orderStatus);
    }
  }, [orderStatus]);

  async function handleOrder() {
    if (!selected) return setOrderStatus('No service selected');
    // open confirm modal instead of native confirm
    setConfirmOpen(true);
  }

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
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selected.id,
          sourceServiceId: selected.sourceServiceId,
          quantity,
          link,
        }),
      });
      const body = await res.json();
      // Handle HTTP 402 (payment required) specially
      if (res.status === 402) {
        const msg = (body?.error) ? `Payment required: ${body.error}` : 'Payment required';
        toast.error(
          <div>
            <div>{msg}</div>
            <div style={{ marginTop: 8 }}>
              <a href="/wallet" style={{ color: '#fff', textDecoration: 'underline' }}>Top up wallet</a>
            </div>
          </div>
        );
        setOrderStatus(msg);
      } else if (!res.ok) {
        const msg = `Error: ${body?.error ?? JSON.stringify(body)}`;
        toast.error(msg);
        setOrderStatus(msg);
      } else if (body?.error) {
        const msg = `Error: ${body.error}`;
        toast.error(msg);
        setOrderStatus(msg);
      } else {
        const msg = 'Order submitted — response received.';
        toast.success(msg);
        setOrderStatus(msg);
      }
    } catch (err: any) {
      setOrderStatus(`Request failed: ${err?.message ?? String(err)}`);
    } finally {
      setOrdering(false);
    }
  }

  return (
    <div className='summary-container'>
      <Toaster
        position="bottom-center"
        containerStyle={{ bottom: 28 }}
        toastOptions={{
          duration: 5000,
          style: {
            background: 'rgba(17,24,39,0.95)',
            color: '#fff',
            borderRadius: 8,
            padding: '10px 14px',
            boxShadow: '0 6px 18px rgba(2,6,23,0.35)',
            minWidth: 260,
            textAlign: 'center'
          },
          success: { style: { background: '#059669' } },
          error: { style: { background: '#dc2626' } }
        }}
      />
        {/* Preview: reflect selected quantity and platform/service */}
        {service === 'followers' ? (
          <FollowerPreview
            primary={quantity}
            primaryLabel={(() => {
              if (service === 'followers') {
                if (platform === 'youtube') return 'subscribers';
                if (platform === 'telegram') return 'members';
                return 'followers';
              }
              return service;
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
            className={`preview ${platform} ${service}`}
          />
        ) : (
          <PostPreview metric={service} metricCount={quantity} username={link || 'example_post'} />
        )}
        <QuantitySlider
          min={min}
          max={max}
          pricePerUnit={pricePerUnit}
          onChange={setQuantity}
          activeCategory={category}
          onCategoryChange={setCategory}
          onOrder={handleOrder}
          ordering={ordering}
          orderStatus={orderStatus}
        />
        {/* Order button moved into QuantitySlider via props */}
        <SearchContainer value={search} onChange={setSearch} />
        <ServiceInfoPanel
          services={filtered}
          index={selIndex}
          onChangeIndex={setSelIndex}
          activeCategory={category}
          onCategoryChange={setCategory}
        />
        {/* Pass order handler down to QuantitySlider via props */}
        <ConfirmModal
          open={confirmOpen}
          title="Place order"
          message={`Place order for ${quantity} units on ${selected?.providerName ?? ''}?`}
          confirmLabel="Place order"
          onConfirm={doConfirmedOrder}
          onCancel={() => setConfirmOpen(false)}
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