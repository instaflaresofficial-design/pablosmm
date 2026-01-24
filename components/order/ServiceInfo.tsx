"use client";
import Image from 'next/image'
import React from 'react'
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import type { NormalizedSmmService } from '@/types/smm'
import { useCurrency } from '@/components/layout/CurrencyProvider'

interface Props {
  services?: NormalizedSmmService[];
  index?: number;
  onChangeIndex?: (i: number) => void;
  service?: NormalizedSmmService | null;
  activeCategory?: 'recommended' | 'cheapest' | 'premium';
  onCategoryChange?: (c: 'recommended' | 'cheapest' | 'premium') => void;
}

export default function ServiceInfo({ services, index = 0, onChangeIndex, service: single, activeCategory, onCategoryChange }: Props) {
  const { formatMoneyCompact } = useCurrency();
  const total = services?.length ?? 0;
  const current = single ?? (total > 0 ? services![Math.min(index, total - 1)] : null);

  const platformIcon = current ? `/platforms/${current.platform}-white.png` : '/platforms/instagram-white.png';
  // Raw provider payload for more robust extraction
  const raw: any = current?.raw || {};
  // Extract description if available from provider payload
  const rawDesc: string | undefined = raw?.description || raw?.desc || raw?.details || raw?.note;
  const description: string = (rawDesc && String(rawDesc).trim()) || current?.displayName || current?.providerName || 'No description available.';

  // Helper extractors for common raw keys (some providers differ)
  function getRawBool(keys: string[]): boolean | undefined {
    for (const k of keys) {
      const v = raw?.[k] ?? (current as any)?.[k];
      if (v === undefined) continue;
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (['yes', 'y', 'true', '1', 'available'].includes(s)) return true;
        if (['no', 'n', 'false', '0', 'not available', 'unavailable'].includes(s)) return false;
      }
      if (typeof v === 'number') return v !== 0;
    }
    return undefined;
  }

  function getRawNumber(keys: string[]): number | undefined {
    for (const k of keys) {
      const v = raw?.[k] ?? (current as any)?.[k];
      if (v === undefined || v === null) continue;
      const n = Number(String(v).replace(/[^0-9.-]+/g, ''));
      if (!Number.isNaN(n)) return n;
    }
    return undefined;
  }

  function getRawString(keys: string[]): string | undefined {
    for (const k of keys) {
      const v = raw?.[k] ?? (current as any)?.[k];
      if (v === undefined || v === null) continue;
      return String(v).trim();
    }
    return undefined;
  }

  // Derived fields with fallbacks: prefer NormalizedSmmService values, then raw payload
  const rate = current ? (current.ratePer1000 ?? getRawNumber(['ratePer1000','rate','price','cost'])) : 0.4;
  const refillFlag = current?.refill ?? getRawBool(['refill','has_refill','guarantee','lifetime_refill','refilled']) ?? false;
  const refillText = refillFlag ? 'Available' : 'Not Available';
  const cancelFlag = current?.cancel ?? getRawBool(['cancel','cancellable','can_cancel','refundable']) ?? false;
  const cancelText = cancelFlag ? 'Available' : 'Not Available';
  const avgTime = current?.averageTime ?? getRawNumber(['averageTime','avg_time','average_time','start','start_time','estimated_time']) ?? null;
  const hay = `${current?.providerName || ''} ${description} ${getRawString(['country','target','targets','location']) || ''}`.toLowerCase();
  const lines = description.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
  const bulletPattern = /^(\d+\.|[-•*])\s+/;
  const bulletCount = lines.filter((l) => bulletPattern.test(l)).length;
  const descNode = bulletCount >= 2 ? (
    <ul className="desc-list">
      {lines.map((l, i) => (
        <li key={i}>{l.replace(bulletPattern, '')}</li>
      ))}
    </ul>
  ) : (
    <>
      {description.split(/\r?\n+/).map((part, i, arr) => (
        <React.Fragment key={i}>
          {part}
          {i < arr.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </>
  );

  function classifySpeed(minutes: number | null, text: string): string {
    if (/instant|0-?\s*min|immediate/.test(text)) return 'Instant';
    if (minutes != null) {
      if (minutes <= 10) return 'Instant';
      if (minutes <= 60) return 'Fast';
      if (minutes <= 360) return 'Medium';
      return 'Slow';
    }
    if (/super\s*fast|very\s*fast|fast\b/.test(text)) return 'Fast';
    if (/slow|delayed|queue/.test(text)) return 'Slow';
    return 'Unknown';
  }

  function classifyQuality(text: string): string {
    const t = text.toLowerCase();
    if (/\b(hq|high\s*quality|real|organic|active)\b/.test(t)) return 'High';
    if (/\b(mix|mixed|normal|standard|avg|average)\b/.test(t)) return 'Standard';
    if (/\b(bot|cheap|low\s*quality)\b/.test(t)) return 'Low';
    if (/\b(ultra|vip|elite|premium|pro|super)\b/.test(t)) return 'Premium';
    return 'Unknown';
  }

  function extractTargeting(text: string): string {
    if (/(india|indian|\bIN\b|🇮🇳)/.test(text)) return 'India';
    if (/(united\s*states|usa|\bUS\b|🇺🇸)/.test(text)) return 'USA';
    if (/(united\s*kingdom|uk|🇬🇧)/.test(text)) return 'UK';
    if (/(turkey|turkish|\bTR\b|🇹🇷)/.test(text)) return 'Turkey';
    if (/(brazil|\bBR\b|🇧🇷)/.test(text)) return 'Brazil';
    if (/(indonesia|\bID\b|🇮🇩)/.test(text)) return 'Indonesia';
    if (/(global|worldwide|international)/.test(text)) return 'Global';
    return 'Global';
  }

  function classifyStability(text: string, hasRefill: boolean): string {
    const t = text.toLowerCase();
    // Explicit non-drop / guarantee mentions
    if (/\b(non[-\s]?drop|no\s*drop|drop\s*protection|lifetime\s*refill|guarantee|guaranteed)\b/.test(t)) return 'Non-Drop';
    // If provider advertises refill/guarantee flags elsewhere, consider likely stable
    if (hasRefill) return 'Likely Stable';
    if (/\b(low\s*drop|low-drop|low drop|high\s*retention|stable service|stable)\b/.test(t)) return 'Likely Stable';
    // Explicit warning phrases
    if (/\b(may\s*drop|may\s*lose|possible\s*drop|will\s*drop|drops?\s*(after|within|in)?)\b/.test(t)) return 'May Drop';
    return 'Unknown';
  }

  const speedLabel = classifySpeed(avgTime, hay);
  const qualityLabel = classifyQuality(hay);
  // Prefer raw country/target if provided
  const targetingFromRaw = getRawString(['country','target','targets','location']);
  const targetingLabel = targetingFromRaw ? targetingFromRaw : extractTargeting(hay);
  const stabilityLabel = classifyStability(hay, !!refillFlag);
  function formatDuration(mins: number | null | undefined): string {
    if (mins == null || Number.isNaN(Number(mins))) return 'N/A';
    const m = Math.round(Number(mins));
    if (m <= 0) return 'Instant';
    if (m >= 60) {
      const hours = m / 60;
      // If whole hours, show integer, else one decimal
      if (m % 60 === 0) return `${Math.round(hours)} hr${Math.round(hours) > 1 ? 's' : ''}`;
      return `${hours.toFixed(1)} hrs`;
    }
    return `${m} min`;
  }
  const formattedAvgTime = avgTime ? formatDuration(avgTime) : 'N/A';
  const startLabel = avgTime ? formattedAvgTime : (speedLabel === 'Instant' ? 'Instant' : 'N/A');
  const serviceTypeLabel = current ? `${String(current.type || '')}${current.variant && current.variant !== 'any' ? ' · ' + String(current.variant) : ''}` : 'Likes/Reactions';
  function capitalize(s?: string) { if (!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1); }
  const platformLabel = capitalize(current?.platform ?? 'instagram');
  const title = current ? `${current.providerName} · ${current.sourceServiceId ?? current.id}` : 'Service';

  return (
    <div className='service-info-container'>
        {total > 0 && onChangeIndex && (
          <>
            {onCategoryChange && (
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
            )}
            <div className="order-summary">
            <div className="pager">
              <span className="pager-count">{(index % total) + 1}/{total}</span>
              <div className="pager-controls">
                <button
                  className="control"
                  onClick={() => onChangeIndex(((index - 1 + total) % total))}
                  aria-label="Previous"
                >
                  <FiArrowLeft className="control-icon" aria-hidden />
                </button>
                <button
                  className="control"
                  onClick={() => onChangeIndex(((index + 1) % total))}
                  aria-label="Next"
                >
                  <FiArrowRight className="control-icon" aria-hidden />
                </button>
              </div>
            </div>
            <h3 className='service-info-title'>{title}</h3>
            </div>
          </>
        )}
        {!onChangeIndex && (
          <h3 className='service-info-title'>{title}</h3>
        )}
        <div className="details-grid">
            <div className="detail-item">
                <span className="detail-label">PLATFORM</span>
                <Image src={platformIcon} alt='Platform' width={20} height={20} />
            </div>
            <div className="detail-item">
                <span className="detail-label">RATE/1K</span>
              <span className="detail-value">{formatMoneyCompact(rate)}</span>
            </div>
            <div className="detail-item">
                <span className="detail-label">SERVICE TYPE</span>
                <span className="detail-value">{current ? current.type : 'Likes/Reactions'}</span>
            </div>
            <div className="detail-item">
                <span className="detail-label">DRIPFEED</span>
                <span className="detail-value">{current?.dripfeed ? 'Available' : 'Not Available'}</span>
            </div>
            <div className="detail-item">
                <span className="detail-label">CANCEL</span>
                <span className="detail-value">{cancelText}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">AVG TIME</span>
              <span className="detail-value">{formattedAvgTime}</span>
            </div>
        </div>
        <div className="cards-container">
            <div className="card-info start-time">
              <div className="text-container start-time">
                <span className='label'>Start Time</span>
              <h2 className='value'>{startLabel}</h2>
              </div>
            </div>
            <div className="card-info speed">
                <div className="text-container">
                    <span className='label'>Speed</span>
                <h2 className='value'>{speedLabel}</h2>
                </div>
            </div>
            <div className="card-info targeting">
                <div className="text-container">
                    <span className='label'>Targeting</span>
                <h2 className='value'>{targetingLabel}</h2>
                </div>
            </div>
            <div className="card-info refill">
                <div className="text-container">
                    <span className='label'>Refill</span>
                <h2 className='value'>{refillText}</h2>
                </div>
            </div>
            <div className="card-info quality">
                <div className="text-container">
                    <span className='label'>Quality</span>
                <h2 className='value'>{qualityLabel}</h2>
                </div>
            </div>
            <div className="card-info stability">
                <div className="text-container">
                    <span className='label'>Stability</span>
                <h2 className='value'>{stabilityLabel}</h2>
                </div>
            </div>
        </div>
        <div className="description-container">
            <h3 className='description-title'>Description</h3>
            <div className='description-text'>
              {descNode}
            </div>
        </div>
    </div>
  )
}