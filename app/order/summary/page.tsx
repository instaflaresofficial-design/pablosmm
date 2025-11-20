import QuantitySlider from '@/components/order/QuantitySlider'
import SearchContainer from '@/components/order/SearchContainer'
import ServiceInfo from '@/components/order/ServiceInfo'
import Preview from '@/components/preview/Preview'
import React from 'react'

const page = () => {
  return (
    <div className='summary-container'>
        <Preview />
        <QuantitySlider />
        <SearchContainer />
        <ServiceInfo />
    </div>
  )
}

export default page