"use client"
import React, { useState } from 'react'
import PlatformSelector from '@/components/order/PlatformSelector'
import ServiceSelector from '@/components/order/ServiceSelector'
import { serviceCategories } from '@/lib/constants';
import LinkInput from '@/components/order/LinkInput';

type Platform = keyof typeof serviceCategories;

const page = () => {
  const [activePlatform, setActivePlatform] = useState<Platform>('instagram');

  const handlePlatformChange = (platformName: string) => {
    setActivePlatform(platformName as Platform);
  };

  return (
    <div className="order-page">
      <PlatformSelector onPlatformChange={handlePlatformChange} activePlatform={activePlatform} />
      <ServiceSelector activePlatform={activePlatform} />
      <LinkInput />
    </div>
  );
};

export default page;