"use client"
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'


const page = () => {
  const router = useRouter();

  return (
    <div className='wallet-page'>
        <div className="top-nav">
          <Link className='back-btn' href="/order">
            <Image 
              src="/wallet/back.png"
              alt="Back Arrow"
              width={32}
              height={32}
            />
          </Link>
          <div className="profile-container">
            <div className="profile">
              <Image 
                src="/wallet/user.png"
                alt="Profile Icon"
                width={32}
                height={32}
              />
            </div>
            <span>Tracy's Wallet</span>
          </div>      
        </div>
        <div className="wallet-container">
          <div className="balance-section">
            <span className="balance-label">₹0.<span className='decimal'>00</span></span>
            <span className="balance-amount">wallet balance</span>
          </div>
        </div>
        <div className="methods-container">
          <p>ADD MONEY TO YOUR WALLET USING</p>
          <div className="methods">
            <Image 
              src="/wallet/upi.png"
              alt="UPI"
              width={120}
              height={40}
            />
            <Image 
              src="/wallet/rupay.png"
              alt="RuPay"
              width={120}
              height={40}
            />
            <Image 
              src="/wallet/visa.png"
              alt="Visa"
              width={120}
              height={40}
            />
            <Image 
              src="/wallet/mc.png"
              alt="MasterCard"
              width={120}
              height={40}
            />
            <Image 
              src="/wallet/usdt.png"
              alt="USDT"
              width={120}
              height={40}
            />
          </div>
          <button onClick={() => router.push('wallet/add')}>Add Money</button>
        </div>
    </div>
  )
}

export default page