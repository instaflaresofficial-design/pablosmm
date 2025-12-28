import Image from 'next/image'
import React from 'react'
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import type { NormalizedSmmService } from '@/types/smm'

interface Props {
  services?: NormalizedSmmService[];
  index?: number;
  onChangeIndex?: (i: number) => void;
  service?: NormalizedSmmService | null;
  activeCategory?: 'recommended' | 'cheapest' | 'premium';
  onCategoryChange?: (c: 'recommended' | 'cheapest' | 'premium') => void;
}

export default function ServiceInfo({ services, index = 0, onChangeIndex, service: single, activeCategory, onCategoryChange }: Props) {
  const total = services?.length ?? 0;
  const current = single ?? (total > 0 ? services![Math.min(index, total - 1)] : null);

  const platformIcon = current ? `/platforms/${current.platform}-white.png` : '/platforms/instagram-white.png';
  const rate = current ? (current.ratePer1000 || 0) : 0.4;
  const refillText = current ? (current.refill ? 'Available' : 'Not Available') : 'Not Available';
  const cancelText = current ? (current.cancel ? 'Available' : 'Not Available') : 'Available';
  const avgTime = current?.averageTime ?? null;
  const title = current
    ? `${current.platform.toUpperCase()} ${current.type.charAt(0).toUpperCase() + current.type.slice(1)}${current.variant !== 'any' ? ' · ' + current.variant.toUpperCase() : ''}`
    : 'Instagram Likes';

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
            <h3 className='service-info-title'>
              {title} {current?.providerName ? `[ ${current.providerName} ]` : ''} {current?.refill ? '[ Refill ]' : ''}
            </h3>
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
                <span className="detail-value">${rate.toFixed(2)}</span>
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
                <span className="detail-value">{avgTime ? `${avgTime} min` : 'N/A'}</span>
            </div>
        </div>
        <div className="cards-container">
            <div className="card-info start-time">
                <div className="text-container start-time">
                    <span className='label'>Start Time</span>
                    <h2 className='value'>{avgTime ? 'Fast' : 'Unknown'}</h2>
                </div>
            </div>
            <div className="card-info speed">
                <div className="text-container">
                    <span className='label'>Speed</span>
                    <h2 className='value'>N/A</h2>
                </div>
            </div>
            <div className="card-info targeting">
                <div className="text-container">
                    <span className='label'>Targeting</span>
                    <h2 className='value'>Global</h2>
                </div>
            </div>
            <div className="card-info refill">
                <div className="text-container">
                    <span className='label'>Refill</span>
                    <h2 className='value'>{current?.refill ? 'Yes' : 'No'}</h2>
                </div>
            </div>
            <div className="card-info quality">
                <div className="text-container">
                    <span className='label'>Quality</span>
                    <h2 className='value'>N/A</h2>
                </div>
            </div>
            <div className="card-info stability">
                <div className="text-container">
                    <span className='label'>Stability</span>
                    <h2 className='value'>{current?.refill ? 'Stable' : 'Risky'}</h2>
                </div>
            </div>
        </div>
        <div className="description-container">
            <h3 className='description-title'>Description</h3>
            <p className='description-text'>
              {current?.providerName || 'No description available.'}
            </p>
        </div>
    </div>
  )
}