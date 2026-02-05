"use client";
import QuantitySlider from '@/components/order/QuantitySlider'
import SearchContainer from '@/components/order/SearchContainer'
import ServiceInfoPanel from '@/components/order/ServiceInfo'
import Preview from '@/components/preview/Preview'
import { useNormalizedServices } from '@/lib/useServices'
import { useSearchParams } from 'next/navigation'
import React, { Suspense, useMemo, useState } from 'react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { toast } from 'sonner'
import type { Platform, ServiceType, Variant } from '@/types/smm'
import FollowerPreview from '@/components/preview/FollowerPreview';
import PostPreview from '@/components/preview/PostPreview';
import { useMetadata } from '@/lib/useMetadata';
import { getApiBaseUrl } from '@/lib/config';

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
  const [selIndex, setSelIndex] = useState<number>(0);
  const [comments, setComments] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const bySearch = search.trim().toLowerCase();
    let list;
    if (bySearch) {
      list = all.filter((s) => {
        const hay = `${s.displayId ?? ''} ${s.source ?? ''} ${s.providerName} ${s.type} ${s.category}`.toLowerCase();
        return hay.includes(bySearch);
      });
    } else {
      list = all.filter((s) => s.platform === platform && s.type === service && (variant === 'any' || s.variant === variant));
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

  // useEffect removed to avoid double toasts

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
      const payload: any = {
        serviceId: selected.id,
        sourceServiceId: selected.sourceServiceId,
        quantity,
        link,
      };

      if (showComments && comments.length > 0) {
        payload.comments = comments.join('\n');
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

      // Handle Provider Error (nested inside success response)
      if (body?.order?.error) {
        const providerError = body.order.error;
        if (typeof providerError === 'string' && providerError.toLowerCase().includes('balance')) {
          toast.error("Insufficient Balance on Provider", {
            description: "We are out of balance on the main server. Please contact support.",
            duration: 5000,
          });
          setOrderStatus(`Provider Error: ${providerError}`);
          return;
        }
        // General provider error
        toast.error("Order Failed (Provider)", { description: providerError });
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
        showComments={showComments}
        comments={comments}
        setComments={setComments}
      />
      <SearchContainer value={search} onChange={setSearch} />
      <ServiceInfoPanel
        services={filtered}
        index={selIndex}
        onChangeIndex={setSelIndex}
        activeCategory={category}
        onCategoryChange={setCategory}
      />
      <ConfirmModal
        open={confirmOpen}
        title="Place order"
        message={`Place order for ${quantity} units on ${selected?.displayName || 'this service'}?`}
        confirmLabel="Place order"
        onConfirm={doConfirmedOrder}
        onCancel={() => setConfirmOpen(false)}
      />
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