"use client"
import Image from 'next/image'
import React from 'react'
import { platforms } from '@/lib/constants';
import { serviceCategories } from '@/lib/constants';

type Platform = keyof typeof serviceCategories;

interface PlatformSelectorProps {
  activePlatform: Platform;
  onPlatformChange: (platform: string) => void;
}

const PlatformSelector: React.FC<PlatformSelectorProps> = ({ activePlatform, onPlatformChange }) => {
  const handlePlatformClick = (platformName: string) => {
    console.log('Platform clicked:', platformName);
    onPlatformChange(platformName);
  };

  return (
    <div className='platform-container'>
      <div className="text-container">
        <span>STEP-1</span>
        <h3>Choose the platform you want to boost.</h3>
      </div>
      <div className="platforms">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className={`platform-card ${activePlatform === platform.name ? 'active' : ''}`}
            onClick={() => handlePlatformClick(platform.name)}
          >
            <Image
              src={`/platforms/${platform.name}${activePlatform === platform.name ? '-active' : ''}.png`}
              alt={platform.alt}
              width={80}
              height={80}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default PlatformSelector