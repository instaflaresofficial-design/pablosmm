'use client'
import React, { useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'motion/react'
import SearchContainer from '@/components/order/SearchContainer'
import ServiceCard from '@/components/order/ServiceCard'
import type { NormalizedSmmService } from '@/types/smm'

const socialIcons = [
    { src: "/landing/icons/youtube.png", alt: "Youtube" },
    { src: "/landing/icons/instagram.png", alt: "Instagram" },
    { src: "/landing/icons/facebook.png", alt: "Facebook" },
    { src: "/landing/icons/tiktok.png", alt: "Tiktok" },
    { src: "/landing/icons/twitch.png", alt: "Twitch" },
    { src: "/landing/icons/telegram.png", alt: "Telegram" },
    { src: "/landing/icons/spotify.png", alt: "Spotify" },
    { src: "/landing/icons/x.png", alt: "X" },
    { src: "/landing/icons/reddit.png", alt: "Reddit" },
    { src: "/landing/icons/linkedin.png", alt: "Linkedin" },
    { src: "/landing/icons/discord.png", alt: "Discord" },
    { src: "/landing/icons/pinterest.png", alt: "Pinterest" },
    { src: "/landing/icons/snapchat.png", alt: "Snapchat" }
]

const mockServices: NormalizedSmmService[] = [
  {
    id: 'mock-1',
    platform: 'instagram',
    type: 'followers',
    variant: 'any',
    providerName: 'PabloSMM',
    category: 'High Quality',
    ratePer1000: 1.50,
    displayName: 'IG Followers [HQ]',
    min: 10,
    max: 10000,
    refill: true,
    dripfeed: false,
    cancel: false,
    averageTime: 120,
    tags: ['Best Rated']
  },
  {
    id: 'mock-2',
    platform: 'instagram',
    type: 'likes',
    variant: 'any',
    providerName: 'PabloSMM Cheap',
    category: 'Fast',
    ratePer1000: 0.10,
    displayName: 'IG Likes [Fast]',
    min: 50,
    max: 50000,
    refill: false,
    dripfeed: false,
    cancel: false,
    averageTime: 10,
    tags: ['Cheapest']
  }
];

const CursorPointer = ({ activeCategory }: { activeCategory: string }) => {
  const getX = (cat: string) => {
    switch(cat) {
      case 'recommended': return '15%';
      case 'cheapest': return '50%';
      case 'premium': return '85%';
      default: return '15%';
    }
  }

  return (
    <motion.div
      initial={false}
      animate={{ 
        left: getX(activeCategory),
        y: '12px',
        scale: [1, 0.8, 1]
      }}
      transition={{ 
        left: { type: 'spring', stiffness: 150, damping: 20 },
        scale: { duration: 0.3, delay: 0.2 },
        y: { type: 'spring', stiffness: 150, damping: 20 }
      }}
      style={{
        position: 'absolute',
        top: 0,
        zIndex: 50,
        pointerEvents: 'none',
        marginLeft: '-12px'
      }}
    >
      <motion.div style={{ width: 'fit-content' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 0px 8px rgba(209,186,255,0.6))' }}>
          <path d="M4 3L20 11.5L12.5 14L9 21.5L4 3Z" fill="url(#futuristic-cursor)" stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round"/>
          <defs>
            <linearGradient id="futuristic-cursor" x1="4" y1="3" x2="20" y2="21.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#d1baff"/>
              <stop offset="1" stopColor="#7550e5"/>
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
    </motion.div>
  )
}

const AnimatedServiceList = () => {
  const [category, setCategory] = useState<'recommended' | 'cheapest' | 'premium'>('recommended');
  
  React.useEffect(() => {
    const cats: ('recommended' | 'cheapest' | 'premium')[] = ['recommended', 'cheapest', 'premium'];
    const interval = setInterval(() => {
      setCategory(prev => {
        const nextIdx = (cats.indexOf(prev) + 1) % cats.length;
        return cats[nextIdx];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="summary-container" style={{ padding: 0, margin: 0, width: '100%', pointerEvents: 'none' }}>
      <div className="service-list-container" style={{ padding: 0, gap: '2px' }}>
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
          }}
        >
          <SearchContainer value="" onChange={() => {}} onFilterClick={() => {}} />
        </motion.div>
        
        <motion.div 
          className="category-tabs"
          style={{ position: 'relative' }}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
          }}
        >
          <CursorPointer activeCategory={category} />
          <button className={`tab-btn ${category === 'recommended' ? 'active' : ''}`}>Best Rated</button>
          <button className={`tab-btn ${category === 'cheapest' ? 'active' : ''}`}>Cheapest</button>
          <button className={`tab-btn ${category === 'premium' ? 'active' : ''}`}>Premium</button>
        </motion.div>
      </div>
    </div>
  )
}

const Whyus = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const rootRef = useRef<HTMLElement | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  React.useEffect(() => {
    rootRef.current = document.querySelector('.root') as HTMLElement
    setIsMounted(true)
  }, [])
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: isMounted ? (rootRef as React.RefObject<HTMLElement>) : undefined,
    offset: ["start end", "end start"]
  })

  // We want the top one to move left, so it goes from 0% to -50%
  const x1 = useTransform(scrollYProgress, [0, 9], ["0%", "-50%"])
  // We want the bottom one to move right, so it goes from -50% to 0%
  const x2 = useTransform(scrollYProgress, [0, 9], ["-50%", "0%"])
  
  const rotateInstant = useTransform(scrollYProgress, [0, 1], [0, 360])
  const xRefill = useTransform(scrollYProgress, [0, 1], [100, 0])

  return (
    <div className='why-us-section' ref={containerRef}>
        <div className="text-container">
            <h3>Why<br />choose<br />PabloSMM</h3>
            <p>Supports more than 50+ platforms</p>
        </div>
        <div className="why-us-socials-container">
            <motion.div className="row" style={{ x: x1 }}>
                {[...socialIcons, ...socialIcons, ...socialIcons].map((icon, index) => (
                    <Image key={`row1-${index}`} src={icon.src} alt={icon.alt} width={50} height={50} />
                ))}
            </motion.div>
            <motion.div className="row" style={{ x: x2 }}>
                {[...socialIcons, ...socialIcons, ...socialIcons].map((icon, index) => (
                    <Image key={`row2-${index}`} src={icon.src} alt={icon.alt} width={50} height={50} />
                ))}
            </motion.div>
        </div>
        <div className="why-us-cards-container">
            <div className="card delivery">
                <div className="text-container">
                    <h4>Instant Delivery</h4>
                    <p>Orders start within minutes.</p>
                </div>
                <motion.div className="img-container" style={{ rotate: rotateInstant }}>
                    <img src="/landing/why-us/instant.png" alt="Instant" />
                </motion.div>
            </div>
            <div className="card refill">
                <div className="text-container">
                    <h4>Refill Protection</h4>
                    <p>Automatic refills available.</p>
                </div>
                <motion.div className="img-container" style={{ x: xRefill }}>
                    <img src="/landing/why-us/refill.png" alt="Refill" />
                </motion.div>
            </div>
            <div className="card service" style={{ overflow: 'hidden' }}>
                <div className="text-container" style={{ zIndex: 10, position: 'relative' }}>
                    <h4>Smart Services Discovery</h4>
                    <p>Find the best services easily.</p>
                </div>
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: false, amount: 0.5 }}
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { 
                      opacity: 1, 
                      transition: { duration: 0.5, staggerChildren: 0.2 }
                    }
                  }}
                  style={{ 
                    position: 'absolute', 
                    top: '-34px',
                    right: '0px',
                    width: '120%', 
                    height: '240px', 
                    borderRadius: '16px', 
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 1,
                    transform: 'scale(0.85)',
                    transformOrigin: 'bottom right'
                  }}
                >
                    <AnimatedServiceList />

                    {/* Glow Effect */}
                    <motion.div 
                       variants={{
                         hidden: { opacity: 0 },
                         visible: { opacity: 1, transition: { duration: 1.5, delay: 0.6 } }
                       }}
                       style={{
                         position: 'absolute',
                         bottom: '40px',
                         right: '60px',
                         width: '150px',
                         height: '150px',
                         background: 'radial-gradient(circle, rgba(168,144,255,0.25) 0%, rgba(0,0,0,0) 70%)',
                         filter: 'blur(30px)',
                         zIndex: -1,
                         pointerEvents: 'none'
                       }}
                    />
                </motion.div>
            </div>
        </div>
    </div>
  )
}

export default Whyus