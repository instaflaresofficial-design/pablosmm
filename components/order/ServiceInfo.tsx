import Image from 'next/image'
import React from 'react'

const ServiceInfo = () => {
  return (
    <div className='service-info-container'>
        <h3 className='service-info-title'>Instagram Likes [ 5k Per Hours | Instant | Fast | Non Drop ] [ 30 Days Refill]</h3>
        <div className="details-grid">
            <div className="detail-item">
                <span className="detail-label">PLATFORM</span>
                <Image src='/platforms/instagram-white.png' alt='Instagram' width={20} height={20} />
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
        <div className="description-container">
            <h3 className='description-title'>Description</h3>
            <p className='description-text'>
                ✔️ Highly Recommend By Admin  ◉ Get comments from the real-life millionaire's Instagram verified profile, followers starting from 150k - 3million (it will help to increase your sales and your visibility, best for branding purposes)  ◉ As a gesture, likes will be 100% free if you buy comments. (Available for both personal profiles & brands)  Specifications: -------------------------------------------------------------- 💎 Real-life millionaire's Instagram verified profile [Blue Tick] Will Comment On Your Post! ⏱️ Estimated Start Time: 0 - 24 Hours ⚡ Delivery Speed: 5-100/Day ✔️ Quality: Real Life Millionair's Verified Profiles -------------------------------------------------------------- ♻️ Non-Drop (Lifetime Guarantee)! ✅ --------------------------------------------------------------  Additional Information About This Service:  There’s nothing like actual, organic words of praise from actual Verified Instagram Profiles to get everyone to take notice.  That’s why we promote your account to vast, and exclusive Verified Instagram accounts to comment on your posts. The accounts that will follow you will vary from 150K – 3M followers and be verified by Instagram ( they are all real-life millionaire's ), which will increase your engagement through the roof.  Want to make your comment section more appealing? Consider trying out this service.
            </p>
        </div>
    </div>
  )
}

export default ServiceInfo