"use client";
import React, { useState } from 'react';

// Order Components
import PlatformSelector from '@/components/order/PlatformSelector';
import ServiceSelector from '@/components/order/ServiceSelector';
import VariantSelector from '@/components/order/VariantSelector';
import LinkInput from '@/components/order/LinkInput';

// Summary Components
import QuantitySlider from '@/components/order/QuantitySlider';
import SearchContainer from '@/components/order/SearchContainer';
import ServiceCard from '@/components/order/ServiceCard';
import FollowerPreview from '@/components/preview/FollowerPreview';
import type { NormalizedSmmService, Platform, ServiceType, Variant } from '@/types/smm';

const mockServices: NormalizedSmmService[] = [
  { id: '1', platform: 'instagram', type: 'followers', variant: 'any', providerName: 'Provider A', category: 'High Quality', ratePer1000: 1.20, displayName: 'HQ Followers', min: 100, max: 10000, refill: true, dripfeed: false, cancel: false, averageTime: 300, tags: ['recommended'] },
  { id: '2', platform: 'instagram', type: 'followers', variant: 'any', providerName: 'Provider B', category: 'Fast', ratePer1000: 0.80, displayName: 'Fast Followers', min: 50, max: 50000, refill: false, dripfeed: false, cancel: false, averageTime: 60, tags: ['cheapest'] },
  { id: '3', platform: 'instagram', type: 'followers', variant: 'any', providerName: 'Provider C', category: 'Premium', ratePer1000: 2.50, displayName: 'Premium Real Followers', min: 200, max: 5000, refill: true, dripfeed: false, cancel: false, averageTime: 600, tags: ['premium'] },
];

const Howworks = () => {
  // Interactive States
  const [step, setStep] = useState(1);
  const [activePlatform, setActivePlatform] = useState<Platform>('instagram');
  const [activeService, setActiveService] = useState<ServiceType>('followers');
  const [activeVariant, setActiveVariant] = useState<Variant>('any');
  const [link, setLink] = useState('');
  const [currentView, setCurrentView] = useState<'order' | 'summary'>('order');
  
  // Summary States
  const [quantity, setQuantity] = useState(1000);
  const [category, setCategory] = useState<'recommended' | 'cheapest' | 'premium'>('recommended');
  const [selIndex, setSelIndex] = useState(-1);
  const [showSuccess, setShowSuccess] = useState(false);

  const filteredServices = mockServices.filter(s => {
     if (category === 'recommended' && !s.tags?.includes('recommended')) return false;
     if (category === 'cheapest' && !s.tags?.includes('cheapest')) return false;
     if (category === 'premium' && !s.tags?.includes('premium')) return false;
     return true;
  });

  const handleNextStep = () => {
    if (step === 1 && link.length > 5) {
      setStep(2);
      setCurrentView('summary');
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3 && selIndex !== -1) {
      setStep(4);
      setShowSuccess(true);
    }
  };

  const getHeadline = () => {
    if (step === 1) return { title: <>Select a service<br/>& paste link</>, subtitle: "No passwords required. Try interacting below!" };
    if (step === 2) return { title: <>Drag to set<br/>quantity</>, subtitle: "Precise control over your order" };
    if (step === 3) return { title: <>Discover the<br/>best services</>, subtitle: "Select a service to proceed" };
    return { title: <>Done in<br/>seconds</>, subtitle: "Sit back and watch it grow" };
  };

  const currentHeadline = getHeadline();

  return (
    <section className="how-works-section why-us-section" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: '64px' }}>
      
      <div className="text-container" style={{ textAlign: 'center', margin: '32px 0 24px 0' }}>
         <div>
           <h4 style={{ color: '#00f2fe', fontFamily: 'GB', marginBottom: '12px', fontSize: '13px', letterSpacing: '1px' }}>STEP {step} OF 4</h4>
           <h3 style={{ fontSize: '28px', lineHeight: '1.2', margin: '0', color: '#fff' }}>{currentHeadline.title}</h3>
           <p style={{ color: '#888', marginTop: '12px', fontSize: '15px' }}>{currentHeadline.subtitle}</p>
         </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        
        {/* iPhone Wrapper */}
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          
          <div 
            className="phone-mockup"
            style={{
              width: '100%',
              maxWidth: '320px', // Reasonable max-width so it's never huge
              aspectRatio: '375 / 812', // Perfect iPhone aspect ratio
              background: '#0a0a0a',
              borderRadius: '36px', 
              border: '8px solid #1a1a1a', 
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* The iPhone Notch */}
            <div style={{
              position: 'absolute',
              top: '-1px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100px',
              height: '24px',
              background: '#1a1a1a',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px',
              zIndex: 999
            }} />
            
            {/* Dynamic App Content */}
            {currentView === 'order' ? (
              <div 
                key="order-view"
                className="order-page"
                style={{ padding: '36px 12px 24px 12px', height: '100%', overflowY: 'auto', background: '#0a0a0a' }}
              >
                <PlatformSelector onPlatformChange={(p) => setActivePlatform(p as Platform)} activePlatform={activePlatform} />
                <ServiceSelector activeService={activeService} activePlatform={activePlatform} onServiceChange={(s) => setActiveService(s as ServiceType)} />
                <VariantSelector platform={activePlatform as Platform} serviceType={activeService as ServiceType} activeVariant={activeVariant} onVariantChange={(v) => setActiveVariant(v)} />
                
                <div>
                  <LinkInput 
                    onLinkChange={setLink} 
                    onContinue={handleNextStep} 
                    value={link} 
                    isSimulated={false} // Make it truly interactive!
                  />
                </div>
                
                {link.length > 5 && (
                  <div style={{ marginTop: '24px', textAlign: 'center' }}>
                     <button onClick={handleNextStep} style={{ background: '#fff', color: '#000', padding: '12px 24px', borderRadius: '12px', fontFamily: 'GB', fontSize: '1rem', width: '100%' }}>
                       Next Step
                     </button>
                  </div>
                )}
              </div>
            ) : (
              <div
                key="summary-view"
                className="summary-container"
                style={{ height: '100%', overflowY: 'auto', position: 'relative', background: '#0a0a0a', paddingBottom: '100px' }}
              >
                <div style={{ paddingTop: '40px' }}>
                  <FollowerPreview
                    primary={12500 + quantity}
                    following={329}
                    posts={45}
                    username="pablosmmhq"
                    avatarUrl="/bg.png"
                  />
                  
                  <div className="slider-container" style={{ padding: '0 16px 16px' }}>
                    <QuantitySlider
                      value={quantity}
                      min={100}
                      max={50000}
                      pricePerUnit={0.0012}
                      onChange={(q) => { setQuantity(q); if(step === 2) handleNextStep(); }}
                      activeCategory={category}
                      onCategoryChange={(c) => setCategory(c as any)}
                      onModeChange={() => {}}
                      onBudgetChange={() => {}}
                      showComments={false}
                      comments={[]}
                      setComments={() => {}}
                      onOrder={() => {}}
                      ordering={false}
                      orderStatus={null}
                    />
                  </div>

                  <div className="service-list-container">
                    <SearchContainer value="" onChange={() => {}} onFilterClick={() => {}} />
                    
                    <div className="category-tabs">
                      <button onClick={() => setCategory('recommended')} className={`tab-btn ${category === 'recommended' ? 'active' : ''}`}>Best Rated</button>
                      <button onClick={() => setCategory('cheapest')} className={`tab-btn ${category === 'cheapest' ? 'active' : ''}`}>Cheapest</button>
                      <button onClick={() => setCategory('premium')} className={`tab-btn ${category === 'premium' ? 'active' : ''}`}>Premium</button>
                    </div>

                    <div className="services-list" style={{ padding: '0 16px' }}>
                      {filteredServices.map((s, idx) => (
                        <ServiceCard 
                          key={s.id} 
                          service={s} 
                          quantity={quantity} 
                          mode="qty"
                          budgetUsd={0}
                          link={link} 
                          isSelected={idx === selIndex}
                          onSelect={() => {
                            setSelIndex(idx);
                            handleNextStep();
                          }}
                          onViewDetails={() => {}} 
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {showSuccess && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(2,2,3,0.9)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 100
                    }}
                  >
                     <div style={{ background: '#1a1a1a', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #333' }}>
                       <h2 style={{ color: '#fff', marginBottom: '8px' }}>Order Placed!</h2>
                       <p style={{ color: '#888' }}>Your followers will arrive shortly.</p>
                       <button onClick={() => { setShowSuccess(false); setStep(1); setCurrentView('order'); setLink(''); }} style={{ marginTop: '16px', padding: '8px 16px', background: '#333', color: '#fff', borderRadius: '8px' }}>Restart Demo</button>
                     </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Howworks;