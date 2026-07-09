"use client"
import React, { useEffect, useMemo } from 'react'
import Image from 'next/image';
import { serviceCategories } from '@/lib/constants';
import { useNormalizedServices } from '@/lib/useServices';
import type { Platform, ServiceType } from '@/types/smm';

interface ServiceCategory {
  name: string;
  alt: string;
  icon: string;
}

type PlatformKey = keyof typeof serviceCategories;

interface ServiceSelectorProps {
  activePlatform: PlatformKey | Platform;
  activeService: string;
  onServiceChange: (service: string) => void;
}

const ServiceSelector: React.FC<ServiceSelectorProps> = ({ activePlatform = 'instagram', activeService, onServiceChange }) => {
  // Static catalog (for icons/labels)
  const staticServices: ServiceCategory[] = serviceCategories[activePlatform as PlatformKey] || [];
  const { services: normalized } = useNormalizedServices();

  // Compute available service types from live API for the selected platform
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    if (!normalized?.length) return set;
    for (const s of normalized) {
      if (String(s.platform) === String(activePlatform)) set.add(s.type);
    }
    return set;
  }, [normalized, activePlatform]);

  // Filter static services to only show types available for the platform if we have data
  const servicesToShow = useMemo(() => {
    if (!availableTypes || availableTypes.size === 0) return staticServices;
    return staticServices.filter((svc) => availableTypes.has(svc.name));
  }, [staticServices, availableTypes]);

  // Ensure activeService is valid when platform changes or data loads
  useEffect(() => {
    const names = servicesToShow.map((s) => s.name);
    if (names.length && !names.includes(activeService)) {
      onServiceChange(names[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlatform, servicesToShow.length]);

  const handleServiceClick = (serviceName: string) => {
    onServiceChange(serviceName);
  };

  return (
    <div className='platform-container'>
      <div className="text-container">
        <span>STEP-2</span>
        <h3>What do you want to boost?</h3>
      </div>
      <div className="platforms">
        {servicesToShow.map((service) => (
          <div
            key={service.name}
            className={`service-card ${activeService === service.name ? 'active' : ''}`}
            onClick={() => handleServiceClick(service.name)}
          >
            <Image
              src={`/services/${service.icon}${activeService === service.name ? '-active' : ''}.png`}
              alt={service.alt}
              width={80}
              height={80}
            />
            <span className={`${activeService === service.name ? 'active' : ''}`}>{service.alt}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceSelector;