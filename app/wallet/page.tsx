"use client";

import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function Page() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Backend user.balance is already a float (e.g. 10.50)
  const balance = user.balance.toFixed(2);
  const displayName = user.name || user.username || user.email.split('@')[0];
  const avatarUrl = user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;

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
            <img src={avatarUrl} alt="Profile Icon" width={32} height={32} style={{ borderRadius: '50%' }} />
          </div>
          <span>{displayName}'s Wallet</span>
        </div>
      </div>
      <div className="wallet-container">
        <div className="balance-section">
          {/* Using Rupee symbol as per payment methods context */}
          <span className="balance-label">₹{balance}</span>
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
        <Link href="/wallet/add" style={{ width: '100%' }}><button>Add Money</button></Link>
      </div>
    </div>
  )
}