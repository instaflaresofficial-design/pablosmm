"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import PlatformSelector from '@/components/order/PlatformSelector';
import ServiceSelector from '@/components/order/ServiceSelector';
import { serviceCategories } from '@/lib/constants';
import LinkInput from '@/components/order/LinkInput';

type Platform = keyof typeof serviceCategories;

const page = () => {
  const router = useRouter(); // Initialize router
  const [activePlatform, setActivePlatform] = useState<Platform>('instagram');
  const [activeService, setActiveService] = useState<string>('followers');
  const [link, setLink] = useState<string>('');

  const handlePlatformChange = (platformName: string) => {
    setActivePlatform(platformName as Platform);
  };

  const handleServiceChange = (serviceName: string) => {
    setActiveService(serviceName);
  };

  const handleLinkChange = (newLink: string) => {
    setLink(newLink);
  };

  const handleContinue = () => {
    // Redirect to the desired URL with the parameters
    router.push(`/order/summary?platform=${activePlatform}&service=${activeService}&link=${encodeURIComponent(link)}`);
  };

  return (
    <div className="order-page">
      <PlatformSelector onPlatformChange={handlePlatformChange} activePlatform={activePlatform} />
      <ServiceSelector activeService={activeService} activePlatform={activePlatform} onServiceChange={handleServiceChange} />
      <LinkInput onLinkChange={handleLinkChange} onContinue={handleContinue} />
    </div>
  );
};

export default page;