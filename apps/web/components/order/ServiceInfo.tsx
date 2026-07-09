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
  const description: string = current?.displayDescription || (rawDesc && String(rawDesc).trim()) || 'No description available.';

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
  const rate = current ? (current.ratePer1000 ?? getRawNumber(['ratePer1000', 'rate', 'price', 'cost'])) : 0.4;
  const refillFlag = current?.refill ?? getRawBool(['refill', 'has_refill', 'guarantee', 'lifetime_refill', 'refilled']) ?? false;
  const refillText = refillFlag ? 'Available' : 'Not Available';
  const cancelFlag = current?.cancel ?? getRawBool(['cancel', 'cancellable', 'can_cancel', 'refundable']) ?? false;
  const cancelText = cancelFlag ? 'Available' : 'Not Available';
  const avgTime = current?.averageTime ?? getRawNumber(['averageTime', 'avg_time', 'average_time', 'start', 'start_time', 'estimated_time']) ?? null;
  const hay = `${current?.providerName || ''} ${description} ${getRawString(['country', 'target', 'targets', 'location']) || ''}`.toLowerCase();
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    // Handle **bold**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} className="font-bold text-foreground text-[13px]">{part.slice(2, -2)}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const descNode = (
    <div className="description-content space-y-1">
      {description.split(/\r?\n/).map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        // Detection for list items provided by AI (preserves AI bullets)
        const isListItem = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed);

        return (
          <div
            key={i}
            className={`leading-relaxed text-[12.5px] transition-all duration-200 ${isListItem ? 'pl-2 opacity-90' : 'font-semibold text-foreground/90 mt-2'
              }`}
          >
            {renderFormattedText(line)}
          </div>
        );
      })}
    </div>
  );

  // ============================================================================
  // ROBUST EXTRACTION UTILITIES
  // ============================================================================

  /**
   * Extract value from "Key: Value" or "Key - Value" patterns
   */
  function extractKeyValue(text: string, keys: string[]): string | null {
    for (const key of keys) {
      const pattern = new RegExp(`(?:^|\\n)\\s*(?:[🔗⏱✅♻️🇪🇸🇮🇳🇺🇸🚀]\\s*)?${key}\\s*[:|-]\\s*([^\\n]+)`, 'im');
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Clean and normalize time strings
   */
  function normalizeTimeString(raw: string): string {
    const cleaned = raw
      .replace(/[🚀⏱✅♻️🇪🇸🇮🇳🇺🇸🇬🇧🇹🇷🇧🇷🇮🇩🇷🇺🇩🇪🇫🇷🇳🇵🇳🇬]/g, '')
      .replace(/max\s+\d+k/gi, '')
      .replace(/day\s+\d+k/gi, '')
      .replace(/\|/g, '')
      .trim();

    // Extract time patterns: "0-10 minutes" or "1-2 hours"
    const rangeMatch = cleaned.match(/(\d+)\s*[-–—]\s*(\d+)\s*(min|minutes|hour|hours|hr|hrs|day|days)/i);
    if (rangeMatch) {
      const [, start, end, unit] = rangeMatch;
      const u = unit.toLowerCase().startsWith('h') ? 'hr' : (unit.toLowerCase().startsWith('d') ? 'day' : 'min');
      return `${start}-${end} ${u}`;
    }

    // Single value: "10 minutes"
    const singleMatch = cleaned.match(/(\d+)\s*(min|minutes|hour|hours|hr|hrs|day|days)/i);
    if (singleMatch) {
      const [, val, unit] = singleMatch;
      const u = unit.toLowerCase().startsWith('h') ? 'hr' : (unit.toLowerCase().startsWith('d') ? 'day' : 'min');
      return `${val} ${u}`;
    }

    if (/instant|immediate|^0$/i.test(cleaned)) return 'Instant';

    return cleaned || 'N/A';
  }

  /**
   * Extract location/country with priority for explicit patterns
   */
  function extractLocation(text: string): string {
    const explicit = extractKeyValue(text, ['Location', 'Country', 'Target', 'Targeting']);
    if (explicit) {
      const cleaned = explicit.replace(/[🇪🇸🇮🇳🇺🇸🇬🇧🇹🇷🇧🇷🇮🇩🇷🇺🇩🇪🇫🇷🇳🇵🇳🇬]/g, '').trim();
      if (cleaned) return cleaned;
    }

    // Fallback to text analysis
    if (/(spain|spanish|🇪🇸)/i.test(text)) return 'Spain';
    if (/(india|indian|🇮🇳)/i.test(text)) return 'India';
    if (/(united\s*states|usa|american|🇺🇸)/i.test(text)) return 'USA';
    if (/(united\s*kingdom|uk|british|🇬🇧)/i.test(text)) return 'UK';
    if (/(turkey|turkish|🇹🇷)/i.test(text)) return 'Turkey';
    if (/(brazil|brazilian|🇧🇷)/i.test(text)) return 'Brazil';
    if (/(indonesia|indonesian|🇮🇩)/i.test(text)) return 'Indonesia';
    if (/(russia|russian|🇷🇺)/i.test(text)) return 'Russia';
    if (/(germany|german|🇩🇪)/i.test(text)) return 'Germany';
    if (/(france|french|🇫🇷)/i.test(text)) return 'France';
    if (/(nepal|nepali|🇳🇵)/i.test(text)) return 'Nepal';
    if (/(nigeria|nigerian|🇳🇬)/i.test(text)) return 'Nigeria';
    if (/(global|worldwide|international)/i.test(text)) return 'Global';
    return 'Global';
  }

  /**
   * Extract quality with priority for explicit patterns
   */
  function extractQualityEnhanced(text: string): string {
    const explicit = extractKeyValue(text, ['Quality']);
    if (explicit) {
      if (/100%|real|organic|active/i.test(explicit)) return 'Real';
      if (/high|hq/i.test(explicit)) return 'High';
      if (/premium|vip/i.test(explicit)) return 'Premium';
    }

    // Fallback to text analysis
    const t = text.toLowerCase();

    // Check generic/mix FIRST to avoid partial matches on "quality"
    if (/\b(mix|mixed|normal|standard|medium|average)\b/i.test(t)) return 'Standard';
    if (/\b(bot|fake|low)\b/i.test(t)) return 'Low';

    // Then check premium/high
    if (/(100%\s*real|real\s+accounts|organic|active\s+users|genuine)/i.test(t)) return 'Real';
    if (/\b(vip|elite|premium|pro|super|exclusive)\b/i.test(t)) return 'Premium';
    if (/\b(hq|high\s*quality|\bhigh\b)\b/i.test(t)) return 'High';

    return 'Standard';
  }

  /**
   * Extract refill period
   */
  function extractRefillPeriod(text: string): string | null {
    const explicit = extractKeyValue(text, ['Refill', 'Guarantee', 'Warranty']);
    if (explicit) {
      const match = explicit.match(/(\d+)\s*(day|days|month|months|year|years)/i);
      if (match) return `${match[1]} ${match[2].toLowerCase()}`;
      if (/lifetime|permanent|forever/i.test(explicit)) return 'Lifetime';
    }
    const match = text.match(/(?:R|refill|guarantee)\s*(\d+)\s*(day|days|month|months)/i);
    if (match) return `${match[1]} ${match[2].toLowerCase()}`;
    return null;
  }

  /**
   * Classify speed
   */
  function extractSpeed(minutes: number | null, text: string): string {
    if (/instant|immediate|0\s*[-–]\s*\d+\s*min/i.test(text)) return 'Instant';
    if (minutes != null && minutes <= 10) return 'Instant';
    if (minutes != null && minutes <= 60) return 'Fast';
    if (minutes != null && minutes <= 360) return 'Medium';
    if (minutes != null) return 'Slow';
    if (/fast|quick|rapid/i.test(text)) return 'Fast';
    if (/slow|delayed/i.test(text)) return 'Slow';
    return 'Normal';
  }

  /**
   * Extract stability/drop info
   */
  function extractStability(text: string, hasRefill: boolean): string {
    const t = text.toLowerCase();

    // Check specific drop conditions explicitly
    if (/\b(non[-\s]?drop|no\s*drop|drop\s*protection|zero\s*drop)\b/i.test(t)) return 'Non-Drop';
    if (/\b(may\s*drop|may\s*lose|possible\s*drop|will\s*drop|high\s*drop|drops?\s*(?:after|within|in))\b/i.test(t)) return 'May Drop';
    if (/\b(low\s*drop|low-drop)\b/i.test(t)) return 'Low Drop';
    if (/\b(normal\s*drop)\b/i.test(t)) return 'Normal Drop';

    // If nothing mentioned, return standard
    return 'Standard';
  }

  const speedLabel = extractSpeed(avgTime, hay);
  const qualityLabel = current?.quality || extractQualityEnhanced(hay);
  // Prefer raw country/target if provided
  const targetingFromRaw = getRawString(['country', 'target', 'targets', 'location']);
  const targetingLabel = current?.targeting || (targetingFromRaw ? targetingFromRaw : extractLocation(hay));

  const refillPeriod = extractRefillPeriod(hay);
  // User requested to use API flag strictly for Refill card
  // const refillText = refillPeriod ? refillPeriod : (refillFlag ? 'Available' : 'Not Available');

  // Stability shows drop nature OR refill period if specialized
  const stabilityLabel = current?.stability || (extractStability(hay, !!refillFlag) === 'Stable' && refillPeriod
    ? `Refill: ${refillPeriod}`
    : extractStability(hay, !!refillFlag));

  function formatDuration(mins: number | null | undefined): string {
    if (mins == null || Number.isNaN(Number(mins))) return '';
    const m = Math.round(Number(mins));
    if (m <= 0) return 'Instant';
    if (m >= 60) {
      const hours = m / 60;
      if (m % 60 === 0) return `${Math.round(hours)} hr${Math.round(hours) > 1 ? 's' : ''}`;
      return `${hours.toFixed(1)} hrs`;
    }
    return `${m} min`;
  }

  // Extract explicit start time from description if avgTime isn't available
  const explicitStart = extractKeyValue(hay, ['Start Time', 'Start', 'Time']);
  const normalizedStart = explicitStart ? normalizeTimeString(explicitStart) : null;

  const formattedAvgTime = avgTime ? formatDuration(avgTime) : (normalizedStart || (speedLabel === 'Instant' ? 'Instant' : 'N/A'));
  const startLabel = formattedAvgTime || 'N/A';
  const serviceTypeLabel = current ? `${String(current.type || '')}${current.variant && current.variant !== 'any' ? ' · ' + String(current.variant) : ''}` : 'Likes/Reactions';
  function capitalize(s?: string) { if (!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1); }
  const platformLabel = capitalize(current?.platform ?? 'instagram');
  const title = current ? `${current.displayName || current.providerName || 'Service'} · ${current.displayId || ''}` : 'Service';

  return (
    <div className='service-info-container'>
      {total > 0 && onChangeIndex && (
        <>
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
          <div className="order-summary">
            <div className="pager">
              <button
                className="control prev"
                onClick={() => onChangeIndex(((index - 1 + total) % total))}
                aria-label="Previous"
              >
                <div className="btn-glow" />
                <FiArrowLeft className="control-icon" aria-hidden />
              </button>

              <div className="pager-count">
                <span className="current">{(index % total) + 1}</span>
                <span className="separator">/</span>
                <span className="total">{total}</span>
              </div>

              <button
                className="control next"
                onClick={() => onChangeIndex(((index + 1) % total))}
                aria-label="Next"
              >
                <div className="btn-glow" />
                <FiArrowRight className="control-icon" aria-hidden />
              </button>
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