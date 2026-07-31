import Hero from '@/components/landing/Hero'
import Howworks from '@/components/landing/Howworks'
import Whyus from '@/components/landing/Whyus'
import InstallApp from '@/components/landing/InstallApp'
import Header from '@/components/layout/Header'
import React from 'react'
import LiveOrders from '@/components/landing/LiveOrders'

const LandingPage = () => {
  return (
    <div className='root landing'>
        <Header />
        <Hero />
        <Whyus />
        <Howworks />
        <InstallApp />
        <LiveOrders />
        {/* Scroll cushion: lets the root scroll all the way through the Howworks section */}
        <div style={{ height: 'calc(100dvh - var(--bottom-nav-h, 96px))', flexShrink: 0 }} />
    </div>
  )
}

export default LandingPage