import React from 'react'
import Image from 'next/image'
import type { NormalizedSmmService } from '@/types/smm'
import { getServiceTags } from '@/lib/serviceTags'
import { useCurrency } from '../layout/CurrencyProvider'

interface ServiceCardProps {
  service: NormalizedSmmService
  quantity: number
  mode?: 'qty' | 'amount'
  budgetUsd?: number
  link: string
  onViewDetails: (service: NormalizedSmmService) => void
  isSelected?: boolean
  onSelect?: (service: NormalizedSmmService) => void
}

export default function ServiceCard({ service, quantity, mode = 'qty', budgetUsd, link, onViewDetails, isSelected, onSelect }: ServiceCardProps) {
  const { formatMoneyCompact } = useCurrency()
  
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
    switch (service.platform) {
      case 'instagram': return '/orders/platforms/instagram.png'
      case 'tiktok': return '/orders/platforms/tiktok.png'
      case 'youtube': return '/orders/platforms/youtube.png'
      case 'telegram': return '/orders/platforms/telegram.png'
      case 'x': return '/orders/platforms/x.png'
      default: return '/orders/platforms/instagram.png' // fallback
    }
  }

  // If title doesn't include variant/type, build it up, otherwise use displayName
  const title = service.displayName || `${service.platform} ${service.type} - ${service.displayId || service.id}`
  const rating = (Math.random() * (5.0 - 4.5) + 4.5).toFixed(1) // Placeholder since we don't have real ratings

  return (
    <div 
      className={`service-list-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect?.(service)}
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
    >
      <div className="card-header">
        <div className="left">
          <div className="platform-wrapper">
            <Image src={getIcon()} alt={service.platform || 'platform'} width={32} height={32} className="platform-icon" />
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
              <span className="quantity-label">For {formatMoneyCompact(priceInUsd)}</span>
            </>
          ) : (
            <>
              <h2 className="price">{formatMoneyCompact(priceInUsd)}</h2>
              <span className="quantity-label">For {displayQuantity.toLocaleString()} Quantity</span>
            </>
          )}
        </div>
      </div>

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

      <div className="specs-row">
        <span>Starts: {service.averageTime ? `${Math.round(service.averageTime/60)} mins` : '0-10 mins'}</span>
        <span>Speed: {(service as any).speed || '50K/day'}</span>
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
