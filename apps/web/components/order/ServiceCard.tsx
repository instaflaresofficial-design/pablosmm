import React from 'react'
import Image from 'next/image'
import type { NormalizedSmmService } from '@/types/smm'
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

  const tags = []
  if (service.refill) tags.push({ label: '30 Days Refill', icon: '/icons/refill-tag.png', className: 'refill' }) // Example, can be dynamic
  if ((service as any).drop === 'non_drop') tags.push({ label: 'Non Drop', icon: '/icons/shield-tag.png', className: 'nondrop' })
  if (service.averageTime && service.averageTime < 600) tags.push({ label: 'Instant', icon: '/icons/bolt-tag.png', className: 'instant' })
  if (service.category?.toLowerCase().includes('indian') || service.displayName?.toLowerCase().includes('indian')) {
    tags.push({ label: 'Indian', icon: '/icons/flag-in.png', className: 'region' })
  }

  // Use platform icon
  const getIcon = () => {
    switch (service.platform) {
      case 'instagram': return '/icons/instagram-circle.png'
      case 'tiktok': return '/icons/tiktok-circle.png'
      case 'youtube': return '/icons/youtube-circle.png'
      case 'telegram': return '/icons/telegram-circle.png'
      case 'x': return '/icons/twitter-circle.png'
      default: return '/icons/instagram-circle.png' // fallback
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
          <Image src={getIcon()} alt={service.platform || 'platform'} width={32} height={32} className="platform-icon" />
          <div className="title-block">
            <h3 className="title">{title}</h3>
            <div className="stats-row">
              <span className="star">⭐</span>
              <span className="rating">{rating} Ratings</span>
              <span className="dot">•</span>
              <span className="ordered">Ordered by 500+</span>
            </div>
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
          <Image src="/icons/link.png" alt="Link" width={16} height={16} />
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
