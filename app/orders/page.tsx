import OrdersCard from '@/components/layout/OrdersCard'
import React from 'react'

const page = () => {
  return (
    <div className='orders-page'>
        <div className="tabs-container">
            <h2>Order History</h2>
            <div className="tabs">
                <div className="tab active">All</div>
                <div className="tab">Active</div>
                <div className="tab">Completed</div>
                <div className="tab">Failed</div>
            </div>
        </div>
       
        <OrdersCard />
  
    </div>
  )
}

export default page