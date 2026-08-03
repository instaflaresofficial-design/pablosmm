"use client";
import React, { useEffect, useRef } from 'react';
import Image from 'next/image';

const DUMMY_ORDERS = [
  { id: 1,  location: 'Mumbai, India',      time: '2s ago',   platform: 'Instagram', service: 'Instagram Followers',    price: '₹149',  status: 'Completed', flag: '/landing/flags/india.png',    icon: '/landing/icons/instagram.png' },
  { id: 2,  location: 'New York, USA',      time: '4s ago',   platform: 'YouTube',   service: 'YouTube Views',          price: '$4.99', status: 'Active',    flag: '/landing/flags/USA.png',      icon: '/landing/icons/youtube.png' },
  { id: 3,  location: 'Delhi, India',       time: '7s ago',   platform: 'Telegram',  service: 'Telegram Members',       price: '₹89',   status: 'Completed', flag: '/landing/flags/india.png',    icon: '/landing/icons/telegram.png' },
  { id: 4,  location: 'Los Angeles, USA',   time: '11s ago',  platform: 'Instagram', service: 'Instagram Likes',        price: '$2.99', status: 'Active',    flag: '/landing/flags/USA.png',      icon: '/landing/icons/instagram.png' },
  { id: 5,  location: 'Bangalore, India',   time: '14s ago',  platform: 'YouTube',   service: 'YouTube Subscribers',    price: '₹299',  status: 'Active',    flag: '/landing/flags/india.png',    icon: '/landing/icons/youtube.png' },
  { id: 6,  location: 'Toronto, Canada',    time: '18s ago',  platform: 'TikTok',    service: 'TikTok Followers',       price: '$3.49', status: 'Completed', flag: '/landing/flags/Canada.png',   icon: '/landing/icons/tiktok.png' },
  { id: 7,  location: 'Hyderabad, India',   time: '22s ago',  platform: 'Instagram', service: 'Instagram Story Views',  price: '₹199',  status: 'Active',    flag: '/landing/flags/india.png',    icon: '/landing/icons/instagram.png' },
  { id: 8,  location: 'Berlin, Germany',    time: '26s ago',  platform: 'Spotify',   service: 'Spotify Streams',        price: '$3.99', status: 'Completed', flag: '/landing/flags/Germany.png',  icon: '/landing/icons/spotify.png' },
  { id: 9,  location: 'Chennai, India',     time: '30s ago',  platform: 'WhatsApp',  service: 'WhatsApp Members',       price: '₹399',  status: 'Completed', flag: '/landing/flags/india.png',    icon: '/landing/icons/whatsapp.png' },
  { id: 10, location: 'Chicago, USA',       time: '34s ago',  platform: 'Twitch',    service: 'Twitch Followers',       price: '$2.49', status: 'Active',    flag: '/landing/flags/USA.png',      icon: '/landing/icons/twitch.png' },
  { id: 11, location: 'Pune, India',        time: '38s ago',  platform: 'TikTok',    service: 'TikTok Likes',           price: '₹249',  status: 'Active',    flag: '/landing/flags/india.png',    icon: '/landing/icons/tiktok.png' },
  { id: 12, location: 'Paris, France',      time: '43s ago',  platform: 'X',         service: 'X Followers',            price: '$2.99', status: 'Completed', flag: '/landing/flags/France.png',   icon: '/landing/icons/x.png' },
  { id: 13, location: 'Kolkata, India',     time: '47s ago',  platform: 'Instagram', service: 'Instagram Reels Views',  price: '₹149',  status: 'Completed', flag: '/landing/flags/india.png',    icon: '/landing/icons/instagram.png' },
  { id: 14, location: 'Houston, USA',       time: '52s ago',  platform: 'YouTube',   service: 'YouTube Subscribers',    price: '$6.99', status: 'Active',    flag: '/landing/flags/USA.png',      icon: '/landing/icons/youtube.png' },
  { id: 15, location: 'Madrid, Spain',      time: '56s ago',  platform: 'Snapchat',  service: 'Snapchat Followers',     price: '$1.99', status: 'Completed', flag: '/landing/flags/Spain.png',    icon: '/landing/icons/snapchat.png' },
  { id: 16, location: 'New Delhi, India',   time: '1m ago',   platform: 'LinkedIn',  service: 'LinkedIn Connections',   price: '₹499',  status: 'Active',    flag: '/landing/flags/india.png',    icon: '/landing/icons/linkedin.png' },
  { id: 17, location: 'Rome, Italy',        time: '1m ago',   platform: 'Facebook',  service: 'Facebook Page Likes',    price: '$1.99', status: 'Completed', flag: '/landing/flags/Italy.png',    icon: '/landing/icons/facebook.png' },
  { id: 18, location: 'Stockholm, Sweden',  time: '1m ago',   platform: 'Spotify',   service: 'Spotify Playlist Saves', price: '$3.49', status: 'Active',    flag: '/landing/flags/Sweden.png',   icon: '/landing/icons/spotify.png' },
  { id: 19, location: 'Miami, USA',         time: '2m ago',   platform: 'Discord',   service: 'Discord Members',        price: '$4.49', status: 'Completed', flag: '/landing/flags/USA.png',      icon: '/landing/icons/discord.png' },
  { id: 20, location: 'Ahmedabad, India',   time: '2m ago',   platform: 'Telegram',  service: 'Telegram Members',       price: '₹89',   status: 'Completed', flag: '/landing/flags/india.png',    icon: '/landing/icons/telegram.png' },
];

const LiveOrders = () => {
  const rowRef         = useRef<HTMLDivElement>(null);
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const earthRef       = useRef<HTMLDivElement>(null);
  const sectionRef     = useRef<HTMLDivElement>(null);
  const videoRef       = useRef<HTMLVideoElement>(null);

  // ── Shooting stars animation ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    // ── Tiny background star field (seeded once) ──────────────────────
    type BGStar = { x: number; y: number; size: number; opacity: number; vy: number };
    const bgStars: BGStar[] = Array.from({ length: 450 }, () => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      size:    Math.random() * 0.5 + 0.3,    // 0.3–0.8 px
      opacity: Math.random() * 0.30 + 0.20,  // 0.20–0.50 — more visible
      vy:      -(Math.random() * 0.15 + 0.05),
    }));

    // ── Shooting meteors ──────────────────────────────────────────────
    type Meteor = {
      x: number; y: number;
      vx: number; vy: number;
      length: number;
      opacity: number;
      lineWidth: number;
      frameDelay: number;
    };

    const spawnMeteor = (): Meteor => {
      // Angle 35–60° from horizontal — all going up-right
      const angleDeg = 35 + Math.random() * 25;
      const angleRad = (angleDeg * Math.PI) / 180;
      const speed    = Math.random() * 5 + 3;
      return {
        x:          Math.random() * canvas.width * 0.85,
        y:          canvas.height + Math.random() * 60,
        vx:         speed * Math.cos(angleRad),
        vy:         -speed * Math.sin(angleRad),
        length:     Math.random() * 110 + 60,
        opacity:    Math.random() * 0.45 + 0.45,
        lineWidth:  Math.random() * 1.1 + 0.4,
        frameDelay: Math.floor(Math.random() * 40),   // 0–40 frame initial spread
      };
    };

    const meteors: Meteor[] = Array.from({ length: 12 }, spawnMeteor);

    let rafId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background dots (drift slowly upward)
      for (const s of bgStars) {
        s.y += s.vy;
        if (s.y < -2) { s.y = canvas.height + 2; s.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`;
        ctx.fill();
      }

      // Draw meteors
      for (const m of meteors) {
        if (m.frameDelay > 0) { m.frameDelay--; continue; }

        m.x += m.vx;
        m.y += m.vy;

        // Out of bounds → respawn at bottom with a new random delay
        if (m.x > canvas.width + 60 || m.y < -60) {
          Object.assign(m, spawnMeteor());
          m.frameDelay = Math.floor(Math.random() * 40 + 5); // 5–45 frames (∼0.5s at 60fps)
          continue;
        }

        // Edge-fade: smoothly reduce opacity near top & right boundaries
        const fadeZone = 90;
        const fadeX    = m.x > canvas.width  - fadeZone ? (canvas.width  - m.x) / fadeZone : 1;
        const fadeY    = m.y < fadeZone                  ? m.y / fadeZone                   : 1;
        const edgeFade = Math.max(0, Math.min(1, Math.min(fadeX, fadeY)));
        const drawOp   = m.opacity * edgeFade;

        if (drawOp < 0.02) continue; // fully faded, skip draw

        const speed      = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
        const tailFactor = m.length / speed;
        const tailX = m.x - m.vx * tailFactor;
        const tailY = m.y - m.vy * tailFactor;

        // Gradient trail: transparent tail → bright head
        const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        grad.addColorStop(0,    'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.45, `rgba(160, 80, 255, ${drawOp * 0.18})`);  // purple mid-trail
        grad.addColorStop(0.78, `rgba(200, 140, 255, ${drawOp * 0.35})`); // lighter purple near head
        grad.addColorStop(1,    `rgba(255, 255, 255, ${drawOp})`);

        // Sharp gradient streak — no circular blob, no round cap
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = m.lineWidth;
        ctx.lineCap     = 'butt';            // sharp ends
        ctx.shadowColor = 'rgba(180, 80, 255, 0.75)';  // purple glow
        ctx.shadowBlur  = 4 * edgeFade;
        ctx.stroke();
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // ── Earth scroll parallax ────────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    const earth   = earthRef.current;
    if (!section || !earth) return;

    const onScroll = () => {
      const { top, height } = section.getBoundingClientRect();
      const vh = window.innerHeight;

      // progress: 0 = section just entering viewport bottom, 1 = section top at viewport top
      const progress = Math.max(0, Math.min(1, (vh - top) / (vh + height * 0.4)));

      // Earth starts 70px below natural position and rises into place
      const ty = 70 * (1 - progress);
      earth.style.transform = `translateY(${ty}px)`;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set initial state
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Video playback rate (slow Earth rotation) ────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyRate = () => { video.playbackRate = 0.5; };
    applyRate();
    // Re-apply on every play event — some browsers reset rate on loop
    video.addEventListener('play', applyRate);
    return () => video.removeEventListener('play', applyRate);
  }, []);

  // ── Card center highlight ────────────────────────────────────────────
  useEffect(() => {
    let animationFrameId: number;

    const checkCenter = () => {
      if (rowRef.current) {
        const cards = rowRef.current.querySelectorAll('.live-card');
        const viewportCenter = window.innerWidth / 2;

        cards.forEach((card) => {
          const rect = card.getBoundingClientRect();
          const cardCenter = rect.left + rect.width / 2;
          const distance = Math.abs(viewportCenter - cardCenter);

          // If the card is within 100px of the center of the screen
          const htmlCard = card as HTMLElement;
          if (distance < 100) {
            htmlCard.style.transform = 'scale(1.12)';
            htmlCard.style.background = '#131318';
            htmlCard.style.borderColor = 'transparent';
            htmlCard.style.zIndex = '5';
          } else {
            htmlCard.style.transform = 'scale(1)';
            htmlCard.style.background = '#111115';
            htmlCard.style.borderColor = 'transparent';
            htmlCard.style.zIndex = '1';
          }
        });
      }
      animationFrameId = requestAnimationFrame(checkCenter);
    };

    animationFrameId = requestAnimationFrame(checkCenter);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className='live-orders-section' ref={sectionRef}>
      {/* Diagonal star field */}
      <canvas ref={canvasRef} className="stars-canvas" />

      <div className="live-orders-content">
        <div className="status-badge live-network-badge completed">
          <div className="glow completed"></div>
          <span className="active">LIVE NETWORK</span>
        </div>
        
        <h2 className="live-orders-title">
          REAL<br />
          GROWTH<br />
          AROUND THE<br />
          WORLD
        </h2>
        
        <p className="live-orders-subtitle">
          Thousands of orders are<br />
          processed every day.
        </p>

        <div className="live-orders-row-container">
          <div className="target-corners-wrapper">
            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />
          </div>
          
          <div className="live-orders-row-mask"></div>
          <div className="live-orders-row marquee-anim" ref={rowRef}>
            {[...DUMMY_ORDERS, ...DUMMY_ORDERS].map((order, idx) => {
              return (
                <div key={idx} className="live-card">
                  <div className="card-header">
                    <div className="location">
                      <Image src={order.flag} alt={order.location} width={20} height={20} />
                      <span className="city">{order.location}</span>
                    </div>
                    <span className="time">{order.time}</span>
                  </div>
                  <div className="service">
                    <Image src={order.icon} alt={order.platform} width={16} height={16} />
                    <span>{order.service}</span>
                  </div>
                  <div className="footer">
                    <span className="price">{order.price}</span>
                    <span className={`status ${order.status.toLowerCase()}`}>{order.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="earth-video-wrapper" ref={earthRef}>
        <video 
          ref={videoRef}
          autoPlay 
          loop 
          muted 
          playsInline 
          className="earth-video"
          suppressHydrationWarning
          onCanPlay={() => { if (videoRef.current) videoRef.current.playbackRate = 0.5; }}
        >
          <source src="/landing/earth.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  )
}

export default LiveOrders;