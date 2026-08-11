"use client";
import React, { useEffect, useMemo } from 'react';
import { useNormalizedServices } from '@/lib/useServices';
import type { Platform, ServiceType, Variant } from '@/types/smm';

interface VariantSelectorProps {
  platform: Platform;
  serviceType: ServiceType;
  activeVariant: Variant;
  onVariantChange: (v: Variant) => void;
}

const VARIANT_ORDER: Variant[] = [
  'any', 'custom', 'random', 'post', 'reel', 'story', 'comments', 
  'igtv', 'video', 'live', 'short', 'channel', 'community', 
  'adword', 'future', 'tweet', 'premium', 'group'
];

const getVariantLabel = (v: string, platform?: string, serviceType?: string): string => {
  if (platform === 'instagram') {
    if (serviceType === 'followers') {
      if (v === 'any' || v === 'profile') return 'Profile / Account';
      if (v === 'channel') return 'Broadcast Channel';
    }
    if (serviceType === 'likes') {
      if (v === 'post' || v === 'any') return 'Posts';
      if (v === 'reel') return 'Reels';
      if (v === 'story') return 'Story';
      if (v === 'comments') return 'Comment Likes';
    }
    if (serviceType === 'views') {
      if (v === 'reel' || v === 'any') return 'Reels / IGTV / Video';
      if (v === 'post') return 'Posts / Reach';
      if (v === 'story') return 'Story Views';
      if (v === 'dashboard') return 'Dashboard / Profile Views';
    }
    if (serviceType === 'comments') {
      if (v === 'custom') return 'Custom Comments';
      if (v === 'random' || v === 'any') return 'Random Comments';
    }
  }

  if (platform === 'youtube') {
    if (serviceType === 'views') {
      if (v === 'video' || v === 'any') return 'Regular Video Views';
      if (v === 'short') return 'Shorts Views';
      if (v === 'live') return 'Live Stream Concurrent';
      if (v === 'adword') return 'Google AdWords Views';
    }
    if (serviceType === 'likes') {
      if (v === 'video' || v === 'any') return 'Video Likes';
      if (v === 'short') return 'Shorts Likes';
      if (v === 'community') return 'Community Post Likes';
    }
  }

  if (platform === 'telegram') {
    if (serviceType === 'followers') {
      if (v === 'any' || v === 'channel') return 'Public Channel Members';
      if (v === 'group') return 'Private Group Members';
      if (v === 'premium') return 'Telegram Premium Members';
    }
    if (serviceType === 'views') {
      if (v === 'post' || v === 'any') return 'Single Post Views';
      if (v === 'future') return 'Auto Future Posts Views';
    }
  }

  if (platform === 'facebook') {
    if (serviceType === 'views') {
      if (v === 'reel') return 'Reels Views';
      if (v === 'video' || v === 'any') return 'Video Views';
      if (v === 'story') return 'Story Views';
      if (v === 'live') return 'Live Stream Views';
    }
  }

  if (platform === 'tiktok') {
    if (serviceType === 'views') {
      if (v === 'video' || v === 'any') return 'Video Views';
      if (v === 'live') return 'Live Stream Views';
    }
  }

  if (platform === 'x') {
    if (serviceType === 'views') {
      if (v === 'tweet' || v === 'any') return 'Tweet Views';
      if (v === 'video') return 'Video Views';
    }
  }

  switch (v) {
    case 'any':
      return 'All / General';
    case 'custom':
      return 'Custom Comments';
    case 'random':
      return 'Random Comments';
    case 'post':
      return 'Posts';
    case 'reel':
      return 'Reels';
    case 'story':
      return 'Story';
    case 'comments':
      return 'Comment Likes';
    case 'live':
      return 'Live Stream';
    case 'channel':
      return 'Channel / Broadcast';
    case 'igtv':
      return 'IGTV';
    case 'video':
      return 'Video';
    case 'short':
      return 'Shorts';
    case 'community':
      return 'Community Post';
    case 'adword':
      return 'AdWords Views';
    case 'future':
      return 'Auto Future Posts';
    case 'premium':
      return 'Premium Members';
    case 'group':
      return 'Group Members';
    default:
      return String(v).charAt(0).toUpperCase() + String(v).slice(1);
  }
};

const VariantSelector: React.FC<VariantSelectorProps> = ({ platform, serviceType, activeVariant, onVariantChange }) => {
  const { services } = useNormalizedServices();

  const variants = useMemo(() => {
    // Specific platform rules
    if (platform === 'instagram' && serviceType === 'followers') return ['any', 'channel'] as Variant[];
    if (platform === 'instagram' && serviceType === 'likes') return ['post', 'reel', 'story', 'comments'] as Variant[];
    if (platform === 'instagram' && serviceType === 'views') return ['reel', 'post', 'story', 'dashboard'] as Variant[];
    if (platform === 'instagram' && serviceType === 'comments') return ['custom', 'random'] as Variant[];

    if (platform === 'youtube' && serviceType === 'views') return ['video', 'short', 'live', 'adword'] as Variant[];
    if (platform === 'youtube' && serviceType === 'likes') return ['video', 'short', 'community'] as Variant[];

    if (platform === 'telegram' && serviceType === 'followers') return ['any', 'group', 'premium'] as Variant[];
    if (platform === 'telegram' && serviceType === 'views') return ['post', 'future'] as Variant[];

    if (platform === 'facebook' && serviceType === 'views') return ['video', 'reel', 'story', 'live'] as Variant[];
    if (platform === 'tiktok' && serviceType === 'views') return ['video', 'live'] as Variant[];
    if (platform === 'x' && serviceType === 'views') return ['tweet', 'video'] as Variant[];

    const set = new Set<Variant>();
    for (const s of services) {
      if (s.platform === platform && s.type === serviceType) set.add(s.variant);
    }

    const arr = Array.from(set);
    arr.sort((a, b) => VARIANT_ORDER.indexOf(a) - VARIANT_ORDER.indexOf(b));
    return arr as Variant[];
  }, [services, platform, serviceType]);

  // Reset invalid active variant
  useEffect(() => {
    if (variants.length > 0 && !variants.includes(activeVariant)) {
      onVariantChange(variants[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, serviceType, variants.length]);

  // If there is 1 or 0 variants available, hide this section completely so "Any" doesn't appear disconnected
  if (variants.length <= 1) return null;

  return (
    <div className="platform-container">
      <div className="text-container">
        <span>STEP-2.1</span>
        <h3>Choose Sub-Category / Option</h3>
      </div>
      <div className="platforms">
        {variants.map((v) => {
          const label = getVariantLabel(v, platform, serviceType);
          const isActive = activeVariant === v;
          return (
            <div
              key={v}
              className={`service-card ${isActive ? 'active' : ''}`}
              onClick={() => onVariantChange(v)}
            >
              <span className={isActive ? 'active' : ''}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VariantSelector;
