import Image from 'next/image'
import React from 'react'

const ServiceInfo = () => {
  return (
    <div className='service-info-container'>
        <h3 className='service-info-title'>Instagram Likes [ 5k Per Hours | Instant | Fast | Non Drop ] [ 30 Days Refill]</h3>
        <div className="details-grid">
            <div className="detail-item">
                <span className="detail-label">PLATFORM</span>
                <Image src='/platforms/instagram-active.png' alt='Instagram' width={20} height={20} />
            </div>
            <div className="detail-item">
                <span className="detail-label">RATE/1K</span>
                <span className="detail-value">$0.4</span>
            </div>
            <div className="detail-item">
                <span className="detail-label">SERVICE TYPE</span>
                <span className="detail-value">Likes/Reactions</span>
            </div>
            <div className="detail-item">
                <span className="detail-label">DRIPFEED</span>
                <span className="detail-value">Not Available</span>
            </div>
            <div className="detail-item">
                <span className="detail-label">CANCEL</span>
                <span className="detail-value">Available</span>
            </div>
            <div className="detail-item">
                <span className="detail-label">COMPLETE TIME</span>
                <span className="detail-value">45mins</span>
            </div>
        </div>
        <div className="cards-container">
            <div className="card-info start-time">
                <div className="text-container start-time">
                    <span className='label'>Start Time</span>
                    <h2 className='value'>Instant</h2>
                </div>
            </div>
            <div className="card-info speed">
                <div className="text-container">
                    <span className='label'>Speed</span>
                    <h2 className='value'>50K/Day</h2>
                </div>
            </div>
            <div className="card-info targeting">
                <div className="text-container">
                    <span className='label'>Targeting</span>
                    <h2 className='value'>Global</h2>
                </div>
            </div>
            <div className="card-info refill">
                <div className="text-container">
                    <span className='label'>Refill</span>
                    <h2 className='value'>30 Days</h2>
                </div>
            </div>
            <div className="card-info quality">
                <div className="text-container">
                    <span className='label'>Quality</span>
                    <h2 className='value'>HQ/Mix</h2>
                </div>
            </div>
            <div className="card-info stability">
                <div className="text-container">
                    <span className='label'>Stability</span>
                    <h2 className='value'>Non Drop</h2>
                </div>
            </div>
        </div>
    </div>
  )
}

export default ServiceInfo