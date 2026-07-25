'use client'
import React, { useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'motion/react'

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
            <div className="card service">
                <div className="text-container">
                    <h4>Instant Delivery</h4>
                    <p>Orders start within minutes.</p>
                </div>
                <div className="img-container">
                    <Image src="/landing/icons/rocket.png" alt="Rocket" width={50} height={50} />
                </div>
            </div>
            <div className="card support">
                <div className="text-container">
                    <h4>Instant Delivery</h4>
                    <p>Orders start within minutes.</p>
                </div>
                <div className="img-container">
                    <Image src="/landing/icons/rocket.png" alt="Rocket" width={50} height={50} />
                </div>
            </div>
        </div>
    </div>
  )
}

export default Whyus