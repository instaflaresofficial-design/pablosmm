"use client"
import React from 'react'
import Image from 'next/image';
import { serviceCategories } from '@/lib/constants';

interface ServiceCategory {
  name: string;
  alt: string;
  icon: string;
}

type Platform = keyof typeof serviceCategories;

interface ServiceSelectorProps {
  activePlatform: Platform;
  activeService: string;
  onServiceChange: (service: string) => void;
}

const ServiceSelector: React.FC<ServiceSelectorProps> = ({ activePlatform = 'instagram', activeService, onServiceChange }) => {
  // Ensure type safety
  const services: ServiceCategory[] = serviceCategories[activePlatform] || [];

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
        {services.map((service) => (
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