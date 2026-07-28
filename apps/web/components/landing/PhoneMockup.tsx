"use client";
import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

// Order Components
import PlatformSelector from '@/components/order/PlatformSelector';
import ServiceSelector from '@/components/order/ServiceSelector';
import VariantSelector from '@/components/order/VariantSelector';
import LinkInput from '@/components/order/LinkInput';

// Summary Components
import QuantitySlider from '@/components/order/QuantitySlider';
import SearchContainer from '@/components/order/SearchContainer';
import ServiceCard from '@/components/order/ServiceCard';
import FollowerPreview from '@/components/preview/FollowerPreview';
import ServiceInfo from '@/components/order/ServiceInfo';
import type { NormalizedSmmService, Platform, ServiceType, Variant } from '@/types/smm';

const mockServices: NormalizedSmmService[] = [
  {
    id: 'ig-f-1',
    platform: 'instagram',
    type: 'followers',
    variant: 'any',
    displayName: 'Instagram Followers [Real / High Quality]',
    ratePer1000: 1.20,
    min: 100,
    max: 50000,
    category: 'recommended',
    providerName: 'Provider A',
    tags: ['recommended', 'premium', 'cheapest'],
    refill: true, dripfeed: false, cancel: false, averageTime: 600,
    displayDescription: 'High quality real Instagram followers. Fast delivery, non-drop, and 30 days refill guarantee. Starts in 0-10 minutes. Perfect for boosting engagement organically.'
  },
  {
    id: 'ig-f-2',
    platform: 'instagram',
    type: 'followers',
    variant: 'any',
    displayName: 'Instagram Followers [Instant / Cheap]',
    ratePer1000: 0.50,
    min: 50,
    max: 100000,
    category: 'recommended',
    providerName: 'Provider B',
    tags: ['recommended', 'premium', 'cheapest'],
    refill: false, dripfeed: false, cancel: false, averageTime: 60,
    displayDescription: 'Instant Instagram followers at the absolute cheapest price. Good for bulk numbers. Starts immediately, high speed delivery. 15 days refill.'
  }
];

const FuturisticCursor = ({ x, y }: { x: string; y: string }) => (
  <motion.div
    animate={{ left: x, top: y }}
    transition={{ type: 'spring', stiffness: 85, damping: 20, mass: 1.1 }}
    style={{ position: 'absolute', zIndex: 200, pointerEvents: 'none' }}
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      style={{ filter: 'drop-shadow(0 0 7px rgba(209,186,255,0.9))' }}>
      <path d="M4 3L20 11.5L12.5 14L9 21.5L4 3Z"
        fill="url(#hw-cursor-grad)" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
      <defs>
        <linearGradient id="hw-cursor-grad" x1="4" y1="3" x2="20" y2="21.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d1baff" />
          <stop offset="1" stopColor="#7550e5" />
        </linearGradient>
      </defs>
    </svg>
  </motion.div>
);

const IPhoneFrame = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        setScale(width / 390);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const aspectRatio = 1570 / 2932;
  const sl = `${(199 / 1570) * 100}%`;
  const st = '8%'; // Nudged up slightly
  const sw = `${(1171 / 1570) * 100}%`;
  const sh = `${(2427 / 2932) * 100}%`; // Restored to mathematically perfect height to prevent UI clipping

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', flexShrink: 0 }}>
      <div 
        ref={containerRef}
        style={{
          position: 'absolute', top: st, left: sl, width: sw, height: sh,
          overflow: 'hidden', background: '#0a0a0a', borderRadius: '8%', zIndex: 1
        }}
      >
        <div style={{
          width: 390, height: 808,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute', top: 0, left: 0
        }}>
          {/* Status bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 44,
            background: '#0a0a0a', zIndex: 10,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            padding: '0 14px 4px', pointerEvents: 'none',
          }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>9:41</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <svg width="14" height="10" viewBox="0 0 16 12" fill="white">
                <rect x="0" y="6" width="3" height="6" rx="1" />
                <rect x="4.5" y="4" width="3" height="8" rx="1" />
                <rect x="9" y="2" width="3" height="10" rx="1" />
                <rect x="13.5" y="0" width="2.5" height="12" rx="1" fillOpacity={0.4} />
              </svg>
              <svg width="18" height="9" viewBox="0 0 20 10" fill="none">
                <rect x="0.5" y="0.5" width="16" height="9" rx="2.5" stroke="white" strokeOpacity={0.4} />
                <rect x="1.5" y="1.5" width="11" height="7" rx="1.5" fill="white" />
                <path d="M17.5 3.5V6.5C18.3 6.2 19 5.7 19 5C19 4.3 18.3 3.8 17.5 3.5Z" fill="white" fillOpacity={0.4} />
              </svg>
            </div>
          </div>
          
          <div style={{
            position: 'absolute', top: 44, left: 0, right: 0, bottom: 20,
            overflowY: 'hidden', overflowX: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            {children}
          </div>

          <div style={{
            position: 'absolute', bottom: 6, left: '50%',
            transform: 'translateX(-50%)',
            width: 80, height: 4,
            background: 'rgba(255,255,255,0.28)', borderRadius: 2, zIndex: 10,
          }} />
        </div>
      </div>
      <Image
        src="/landing/iphone.png"
        alt="iPhone mockup"
        fill
        style={{ objectFit: 'fill', zIndex: 2, pointerEvents: 'none', userSelect: 'none' }}
        priority
      />
    </div>
  );
};

export type PhoneMockupProps = {
  step: number;
  activePlatform: Platform;
  activeService: ServiceType;
  activeVariant: Variant;
  link: string;
  quantity: number;
  category: string;
  selIndex: number;
  cursorX: string;
  cursorY: string;
  showCursor: boolean;
  showServiceInfo: boolean;
  showToast: boolean;
  ordering: boolean;
  innerScrollY?: number;
};

export default function PhoneMockup({
  step, activePlatform, activeService, activeVariant, link, quantity, category, selIndex, cursorX, cursorY, showCursor, showServiceInfo, showToast, ordering, innerScrollY = 0
}: PhoneMockupProps) {
  
  const activeCat = category;
  const filteredServices = mockServices.filter((s) => {
    if (activeCat === 'recommended' && !s.tags?.includes('recommended')) return false;
    if (activeCat === 'cheapest' && !s.tags?.includes('cheapest')) return false;
    if (activeCat === 'premium' && !s.tags?.includes('premium')) return false;
    return true;
  });

  return (
    <IPhoneFrame>
      <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
              style={{ y: -innerScrollY, pointerEvents: 'none', flex: 1, display: 'flex', flexDirection: 'column' }}
              className="order-page"
            >
              <PlatformSelector activePlatform={activePlatform} onPlatformChange={() => {}} />
              <ServiceSelector activeService={activeService} activePlatform={activePlatform} onServiceChange={() => {}} />
              <VariantSelector platform={activePlatform} serviceType={activeService} activeVariant={activeVariant} onVariantChange={() => {}} />
              <LinkInput onLinkChange={() => {}} onContinue={() => {}} value={link} isSimulated />
            </motion.div>
          )}

          {step >= 2 && (
            <motion.div key="s234"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}
              style={{ pointerEvents: 'none', flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
              className="summary-container"
            >
              <motion.div
                animate={{ y: step === 3 ? -320 : 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 120 }}
                style={{ display: 'flex', flexDirection: 'column', minHeight: 'max-content' }}
              >
                <div>
                  <FollowerPreview primary={12500 + quantity} following={329} posts={45} username="pablosmmhq" avatarUrl="/bg.png" />
                </div>
                <div className="sticky-slider-wrapper">
                  <QuantitySlider
                    value={quantity} min={100} max={50000} pricePerUnit={0.0012}
                    onChange={() => {}} activeCategory={category as any} onCategoryChange={() => {}}
                    onModeChange={() => {}} onBudgetChange={() => {}}
                    showComments={false} comments={[]} setComments={() => {}}
                    onOrder={() => {}} ordering={ordering} orderStatus={null}
                  />
                </div>
                <div className="service-list-container" style={{ padding: 0 }}>
                  <SearchContainer value="" onChange={() => {}} onFilterClick={() => {}} />
                  <div className="category-tabs">
                    <button className={`tab-btn ${activeCat === 'recommended' ? 'active' : ''}`}>Best Rated</button>
                    <button className={`tab-btn ${activeCat === 'cheapest' ? 'active' : ''}`}>Cheapest</button>
                    <button className={`tab-btn ${activeCat === 'premium' ? 'active' : ''}`}>Premium</button>
                  </div>
                  <div className="services-list">
                    {filteredServices.map((s, idx) => (
                      <ServiceCard key={s.id} service={s} quantity={quantity} mode="qty"
                        budgetUsd={0} link={link} isSelected={idx === selIndex}
                        onSelect={() => {}} onViewDetails={() => {}} />
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showServiceInfo && (
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'absolute', inset: 0, zIndex: 100, background: '#0a0a0a', overflowY: 'auto' }}
              className="summary-container"
            >
              <ServiceInfo services={mockServices} index={0} onClose={() => {}} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 12, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              style={{
                position: 'absolute', top: 12, left: 16, right: 16, zIndex: 300,
                background: '#09090b', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{ background: '#10b981', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div>
                <p style={{ margin: 0, color: '#fff', fontSize: 13, fontFamily: 'GM' }}>🎉 Order Placed Successfully!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showCursor && <FuturisticCursor x={cursorX} y={cursorY} />}
      </div>
    </IPhoneFrame>
  );
}
