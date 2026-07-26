import Hero from '@/components/landing/Hero'
import Howworks from '@/components/landing/Howworks'
import Whyus from '@/components/landing/Whyus'
import Header from '@/components/layout/Header'
import React from 'react'

const LandingPage = () => {
  return (
    <div className='root landing'>
        <Header />
        <Hero />
        <Whyus />
        <Howworks />
    </div>
  )
}

export default LandingPage