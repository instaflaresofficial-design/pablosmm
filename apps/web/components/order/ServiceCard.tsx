import React from 'react'
import Image from 'next/image'
import type { NormalizedSmmService } from '@/types/smm'
import { getServiceTags } from '@/lib/serviceTags'
import { useCurrency } from '../layout/CurrencyProvider'
import type { ServiceGroup } from '@/lib/serviceGrouping'

interface ServiceCardProps {
  group: ServiceGroup
  quantity: number
  mode?: 'qty' | 'amount'
  budgetUsd?: number
  link: string
  onViewDetails: (service: NormalizedSmmService) => void
  selectedServiceId?: string
  onSelect?: (service: NormalizedSmmService) => void
}

export default function ServiceCard({ group, quantity, mode = 'qty', budgetUsd, link, onViewDetails, selectedServiceId, onSelect }: ServiceCardProps) {
  const { formatMoneyDirectCompact, formatMoneyDirect, convertToUsd } = useCurrency();
  
  // Find currently selected variant inside this group, or default to the first valid one
  const selectedVariant = group.variants.find(v => v.id === selectedServiceId) || group.variants[0];
  const service = selectedVariant.service;

  // Independent price calculation based on quantity or budgetUsd
  let displayQuantity = quantity
  let priceInUsd = (service.ratePer1000 / 1000) * displayQuantity

  if (mode === 'amount' && typeof budgetUsd === 'number') {
    const unitPrice = service.ratePer1000 / 1000
    if (unitPrice > 0) {
      const q = Math.floor(budgetUsd / unitPrice)
      
      displayQuantity = Math.max(service.min, Math.min(service.max, q))
      priceInUsd = displayQuantity * unitPrice
    }
  }

  const tagData = React.useMemo(() => getServiceTags(service), [service]);
  const tags = tagData.tags;

  // Use platform icon
  const getIcon = () => {
    switch (group.platform) {
      case 'instagram': return '/orders/platforms/instagram.png'
      case 'tiktok': return '/orders/platforms/tiktok.png'
      case 'youtube': return '/orders/platforms/youtube.png'
      case 'telegram': return '/orders/platforms/telegram.png'
      case 'x': return '/orders/platforms/x.png'
      default: return '/orders/platforms/instagram.png' // fallback
    }
  }

  const title = group.baseName || `${group.platform} ${group.type}`
  const rating = React.useMemo(() => {
    const seed = String(group.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (seed % 100) / 100; // 0.0 to 0.99
    return (random * 0.5 + 4.5).toFixed(1);
  }, [group.id]);

  const isGroupSelected = group.variants.some(v => v.id === selectedServiceId);
  const isGroupDisabled = quantity > group.max;

  const speedData = React.useMemo(() => {
    const avgTimeRaw = (service as any).average_time ?? service.averageTime;
    const minutes = (avgTimeRaw !== undefined && avgTimeRaw !== null && avgTimeRaw !== "" && avgTimeRaw !== "N/A") 
      ? (typeof avgTimeRaw === "number" ? avgTimeRaw : parseFloat(String(avgTimeRaw)))
      : NaN;

    let tierId = "unknown";
    let tierLabel = "? Unknown";
    let deliverySpeed = "N/A";
    let timeStr = "No data";

    const fullText = `${group.baseName || ''} ${service.displayName || service.providerName || ''} ${service.displayDescription || service.description || (service as any).desc || ''}`;
    
    // Parse explicit speed from text (e.g. 50K/Day)
    let statedQty: number | null = null;
    const speedMatch = fullText.match(/(\d+(?:\.\d+)?)\s*([kKmM])?\s*(?:\+|[+-]|\s*-\s*\d+\s*[kKmM]?)?\s*\/\s*(?:day|d)/i);
    if (speedMatch) {
      let val = parseFloat(speedMatch[1]);
      if (!isNaN(val)) {
        const unit = (speedMatch[2] || '').toLowerCase();
        if (unit === 'k') val *= 1000;
        if (unit === 'm') val *= 1000000;
        statedQty = val;
      }
    }

    const calcQty = (!isNaN(minutes) && minutes > 0) ? Math.round((1440 / minutes) * 1000) : null;

    const formatShort = (n: number) => {
      if (n >= 1000000) {
        const m = n / 1000000;
        return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
      }
      if (n >= 1000) {
        const k = n / 1000;
        return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
      }
      return `${n}`;
    };

    if (calcQty !== null && statedQty !== null) {
      const minQty = Math.min(calcQty, statedQty);
      const maxQty = Math.max(calcQty, statedQty);
      if (maxQty / minQty <= 1.3) {
        deliverySpeed = `~${formatShort(maxQty)}/Day`;
      } else {
        deliverySpeed = `~${formatShort(minQty)} - ${formatShort(maxQty)}/Day`;
      }
    } else if (calcQty !== null) {
      deliverySpeed = `~${formatShort(calcQty)}/Day`;
    } else if (statedQty !== null) {
      deliverySpeed = `~${formatShort(statedQty)}/Day`;
    }

    if (!isNaN(minutes) && minutes > 0) {
      if (minutes < 1) timeStr = "< 1 min";
      else if (minutes < 60) timeStr = `~${Math.round(minutes)} mins`;
      else if (minutes < 1440) {
        const hrs = minutes / 60;
        timeStr = hrs < 2 ? `~${Math.round(hrs * 10) / 10} hr` : `~${Math.round(hrs)} hrs`;
      } else {
        const days = minutes / 1440;
        timeStr = days < 2 ? `~${Math.round(days * 10) / 10} day` : `~${Math.round(days)} days`;
      }

      const platform = (service.platform || "").toLowerCase();
      const isYoutube = platform === "youtube";
      const thresholds = isYoutube ? { fast: 120, normal: 720, slow: 2880 } : { fast: 30, normal: 120, slow: 720 };

      if (minutes <= 10) { tierId = "instant"; tierLabel = "Instant"; }
      else if (minutes <= thresholds.fast) { tierId = "fast"; tierLabel = "Fast"; }
      else if (minutes <= thresholds.normal) { tierId = "normal"; tierLabel = "Normal"; }
      else if (minutes <= thresholds.slow) { tierId = "slow"; tierLabel = "Slow"; }
      else { tierId = "unstable"; tierLabel = "Unstable"; }
    } else if (statedQty !== null) {
      tierId = "fast";
      tierLabel = "Fast";
      timeStr = "< 30 mins";
    }
    
    return { tierId, tierLabel, deliverySpeed, timeStr, hasData: (!isNaN(minutes) && minutes > 0) || statedQty !== null };
  }, [service, group.baseName]);

  const handleCardClick = () => {
    if (isGroupDisabled) return;
    if (onSelect) onSelect(service);
  }

  return (
    <div 
      id={`service-${group.id}`}
      className={`service-list-card ${isGroupSelected ? 'selected' : ''} ${isGroupDisabled ? 'disabled' : ''}`}
      onClick={handleCardClick}
      style={{ cursor: onSelect && !isGroupDisabled ? 'pointer' : 'default', opacity: isGroupDisabled ? 0.5 : 1 }}
    >
      {speedData.hasData && (
        <div className="top-badges-row">
          <div className={`speed-badge left-badge ${speedData.tierId}`}>
            <span className="speed-dot"></span>
            <span className="speed-text">{speedData.tierLabel} | Starts in {speedData.timeStr}</span>
          </div>
          <div className="speed-badge right-badge">
            <span className="lightning-icon">⚡</span>
            <span className="speed-text">Speed: {speedData.deliverySpeed}</span>
          </div>
        </div>
      )}

      <div className="card-header">
        <div className="left">
          <div className="platform-wrapper">
            <Image src={getIcon()} alt={group.platform || 'platform'} width={32} height={32} className="platform-icon" />
            <h3 className="title">{title}</h3>
          </div>
          <div className="stats-row">
              <Image src="/star.png" alt="star" width={14} height={14} />
              <span className="rating">{rating} Ratings</span>
              <span className="dot">•</span>
              <span className="ordered">Ordered by 500+</span>
            </div>
        </div>
        <div className="right" style={{ textAlign: 'right' }}>
          {mode === 'amount' ? (
            <>
              <h2 className="price">
                {displayQuantity.toLocaleString()} <span style={{ fontSize: '0.6em', color: '#aaa', fontWeight: 'normal' }}>Qty</span>
              </h2>
              <span className="quantity-label">For {formatMoneyDirect(priceInUsd)}</span>
            </>
          ) : (
            <>
              <h2 className="price">{formatMoneyDirect(priceInUsd)}</h2>
              <span className="quantity-label">For {displayQuantity.toLocaleString()} Quantity</span>
            </>
          )}
        </div>
      </div>

      {(() => {
        const visibleVariants = group.variants.filter((v) => quantity <= v.service.max);
        if (visibleVariants.length <= 1) return null;

        return (
          <div className="variants-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px 24px 0 24px' }}>
            {visibleVariants.map((v) => {
              const isActive = v.id === selectedServiceId;
              const priceCompact = formatMoneyDirectCompact((v.sellPriceInr ?? v.service.ratePer1000) / 1000 * 1000); 
              
              return (
                <button 
                  key={v.id}
                  className={`variant-pill ${isActive ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelect) onSelect(v.service);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: isActive ? '1px solid #a890ff' : '1px solid rgba(255,255,255,0.1)',
                    background: isActive ? 'rgba(168, 144, 255, 0.1)' : 'transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{v.name}</span>
                  <span style={{ color: isActive ? '#a890ff' : '#888' }}>({priceCompact})</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      <div className="tags-row">
        {tags.map((t, idx) => (
          <div key={idx} className={`tag ${t.className}`}>
            {t.icon && <Image src={t.icon} alt="" width={14} height={14} />}
            <span>{t.label}</span>
          </div>
        ))}
        {tags.length === 0 && (
          <div className="tag basic">
            <span>Basic Service</span>
          </div>
        )}
      </div>

      <div className="card-footer">
        <div className="link-preview">
          <Image src="/orders/link.png" alt="Link" width={16} height={16} />
          <span className="link-text">{link || 'No link provided'}</span>
        </div>
        <button 
          className="view-details-btn" 
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(service);
          }}
        >
          View Details →
        </button>
      </div>
    </div>
  )
}
