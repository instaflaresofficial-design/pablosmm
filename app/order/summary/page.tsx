import QuantitySlider from '@/components/order/QuantitySlider'
import SearchContainer from '@/components/order/SearchContainer'
import Preview from '@/components/preview/Preview'
import React from 'react'

const page = () => {
  return (
    <div className='summary-container'>
        <Preview />
        <QuantitySlider />
        <SearchContainer />
    </div>
  )
}

export default page