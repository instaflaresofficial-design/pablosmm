"use client";

import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function Page() {
  const { user, logout, loading } = useAuth();
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

  if (!user) return null; // Logic handled by useEffect

  // Helper to format currency (assuming user.balance is already float in USD or whatever, logic says defaults to INR in UI?)
  // The backend sends balance as float.
  const walletBalance = user.balance.toFixed(2);
  const totalSpend = (user.totalSpend !== undefined && user.totalSpend !== null) ? user.totalSpend.toFixed(2) : "0.00";
  // Fallback to orderCount if stats undefined (old backend)
  const completedOrders = user.stats?.completed !== undefined ? user.stats.completed : (user.orderCount || 0);
  const activeOrders = user.stats?.active || 0;
  const failedOrders = user.stats?.failed || 0;

  const displayName = user.name || user.username || user.email.split('@')[0];
  const avatarUrl = user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;

  return (
    <div className='profile-page'>
      <div className="user-container">
        <img
          className='profile-img'
          src={avatarUrl}
          alt="User"
          width={100}
          height={100}
          style={{ borderRadius: '50%' }}
        />

        <div className="text-container">
          <div className="user-info-container">
            <div className="username">
              <h3>{displayName}</h3>
              <Link href="/profile/edit" className="edit-link"><Image src="/profile/edit.png" alt="Edit" width={20} height={20} /></Link>
            </div>
            <p className="user-email">{user.email}</p>
          </div>

          <button className='signout' onClick={() => logout()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ff5f5f' }}>
            Sign Out <Image src="/profile/sign-out.png" alt="Sign Out" width={20} height={20} />
          </button>
        </div>
      </div>
      <div className="profile-container">
        <div className="account-overview">
          <h2>Account Overview</h2>
          <div className="profile-wallet-container">
            <div className="top-container">
              <div className="balance-container">
                <p className="balance-label">Wallet Balance</p>
                <p className="balance-amount">₹{walletBalance}</p>
              </div>
              {/* Currency Select Placeholder - can be functional later */}
              {/* <div className="currency-badge">INR</div> */}
            </div>
            <div className="bottom-container">
              <div className="stats">
                <p>Total Spend</p>
                <span>₹{totalSpend}</span>
              </div>
              <div className="stats">
                <p>Completed Orders</p>
                <span>{completedOrders}</span>
              </div>
            </div>
          </div>
          <div className="stats-container">
            <div className="stat">
              <p className="stat-label">Active Orders</p>
              <p className="stat-value">{activeOrders}</p>
            </div>
            <div className="stat">
              <p className="stat-label">Failed/Refunded Orders</p>
              <p className="stat-value">{failedOrders}</p>
            </div>
          </div>
        </div>
        <div className="account-settings">
          <h2>Account Settings</h2>
          <ul className="setting-list">
            <li><Link href="/profile/change-password"><Image src="/profile/change-password.png" alt="Change Password" width={20} height={20} />Change Password</Link></li>
            <li><Link href="/profile/support"><Image src="/profile/support.png" alt="Support" width={20} height={20} />Contact Support</Link></li>
            <li><Link href="/orders"><Image src="/bottom-nav/history.png" alt="Orders History" width={20} height={20} />Orders History</Link></li>
            <li><Link href="/wallet"><Image src="/bottom-nav/wallet.png" alt="Wallet" width={20} height={20} />Wallet</Link></li>
          </ul>
        </div>
      </div>
    </div>
  )
}