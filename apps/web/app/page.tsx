import Hero from '@/components/landing/Hero'
import Whyus from '@/components/landing/Whyus'
import Header from '@/components/layout/Header'
import React from 'react'

const LandingPage = () => {
  return (
    <div className='root landing'>
        <Header />
        <Hero />
        <Whyus />
    </div>
  )
}

export default LandingPage