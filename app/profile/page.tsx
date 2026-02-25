"use client";

import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { PhoneInput } from '@/app/components/ui/phone-input';
import { CurrencySelect } from '@/app/components/ui/currency-select';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function Page() {
  const { user, logout, loading, refreshUser, convertPrice, currencySymbol } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'edit' | 'password'>('overview');
  
  const [formData, setFormData] = useState({
     name: '',
     email: '',
     username: '',
     phone: '',
     currency: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
        phone: user.mobile || '',
        currency: user.currency || 'USD',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setIsSubmitting(true);

      try {
          const payload = {
              name: formData.name,
              email: formData.email,
              mobile: formData.phone,
              currency: formData.currency,
          };

          const res = await fetch(`/api/profile`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
          });

          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Failed to update profile');
          }

          toast.success('Profile updated successfully');
          await refreshUser();
          setViewMode('overview');
      } catch (error: any) {
          console.error(error);
          toast.error(error.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: passwordData.currentPassword,
          password: passwordData.newPassword
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setViewMode('overview');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const walletBalance = user.balance !== undefined ? convertPrice(user.balance) : `${currencySymbol}0.00`;
  const totalSpend = (user.totalSpend !== undefined && user.totalSpend !== null) ? convertPrice(user.totalSpend) : `${currencySymbol}0.00`;
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
              {viewMode === 'overview' && (
                <a 
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        setViewMode('edit');
                    }} 
                    className="edit-link"
                >
                    <Image src="/profile/edit.png" alt="Edit" width={20} height={20} />
                </a>
              )}
            </div>
            <p className="user-email">{user.email}</p>
          </div>

          <button className='signout' onClick={() => logout()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ff5f5f' }}>
            Sign Out <Image src="/profile/sign-out.png" alt="Sign Out" width={20} height={20} />
          </button>
        </div>
      </div>

      <div className={`profile-container ${viewMode !== 'overview' ? 'edit-profile' : ''}`}>
        
        {/* VIEW: OVERVIEW */}
        {viewMode === 'overview' && (
            <>
                <div className="account-overview">
                <h2>Account Overview</h2>
                <div className="profile-wallet-container">
                    <div className="top-container">
                    <div className="balance-container">
                        <p className="balance-label">Wallet Balance</p>
                        <p className="balance-amount">{walletBalance}</p>
                    </div>
                    </div>
                    <div className="bottom-container">
                    <div className="stats">
                        <p>Total Spend</p>
                        <span>{totalSpend}</span>
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
                    <li onClick={() => setViewMode('password')}>
                        <a><Image src="/profile/change-password.png" alt="Change Password" width={20} height={20} />Change Password</a>
                    </li>
                    <li><Link href="/profile/support"><Image src="/profile/support.png" alt="Support" width={20} height={20} />Contact Support</Link></li>
                    <li><Link href="/orders"><Image src="/bottom-nav/history.png" alt="Orders History" width={20} height={20} />Orders History</Link></li>
                    <li><Link href="/wallet"><Image src="/bottom-nav/wallet.png" alt="Wallet" width={20} height={20} />Wallet</Link></li>
                </ul>
                </div>
            </>
        )}

        {/* VIEW: EDIT PROFILE */}
        {viewMode === 'edit' && (
            <div className="edit-overview">
                <div className="flex flex-row items-center gap-2 mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <button 
                    onClick={() => setViewMode('overview')}
                    className="bg-transparent border-none p-0 cursor-pointer text-white"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex' }}
                    >
                    <ArrowLeft size={20} />
                    </button>
                    <h2>Edit Profile</h2>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="item">
                        <label htmlFor="name">Name</label>
                        <input 
                            type="text" 
                            id="name" 
                            name="name" 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    <div className="item">
                        <label htmlFor="email">Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            value={formData.email} 
                            disabled 
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                        />
                    </div>
                    {/* Username is usually immutable or heavily restricted */}
                    <div className="item">
                        <label htmlFor="username">Username</label>
                        <input 
                            type="text" 
                            id="username" 
                            name="username" 
                            value={formData.username} 
                            disabled 
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                        />
                    </div>
                    <div className="inputs-row" style={{ display: 'flex', flexDirection: 'row', gap: '12px', width: '100% '}}>
                        <div className="phone-item" style={{ flex: '0 0 70%' }}>
                            <div className="item">
                                <label htmlFor="phone">Phone</label>
                                <PhoneInput 
                                    value={formData.phone} 
                                    onChange={(value) => setFormData(prev => ({...prev, phone: value || ''}))}
                                />
                            </div>
                        </div>
                        <div className="currency-item" style={{ flex: 1 }}>
                            <div className="item">
                                <label htmlFor="currency">Currency</label>
                                <CurrencySelect 
                                    value={formData.currency} 
                                    onChange={(value) => setFormData(prev => ({...prev, currency: value}))}
                                />
                            </div>
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        className="proceed" 
                        disabled={isSubmitting}
                        style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin h-5 w-5"/> : <span className="order-amount">Save Changes</span>}
                    </button>
                </form>
            </div>
        )}

        {/* VIEW: CHANGE PASSWORD */}
        {viewMode === 'password' && (
            <div className="edit-overview">
                 <div className="flex flex-row items-center gap-2 mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <button 
                    onClick={() => setViewMode('overview')}
                    className="bg-transparent border-none p-0 cursor-pointer text-white"
                     style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', display: 'flex' }}
                    >
                    <ArrowLeft size={20} />
                    </button>
                    <h2>{user?.hasPassword ? 'Change Password' : 'Set Password'}</h2>
                 </div>

                 <form onSubmit={handlePasswordSubmit}>
                    {/* Only show old password if user HAS a password */}
                    {user?.hasPassword && (
                        <div className="item">
                            <label>Current Password</label>
                            <input
                                type="password"
                                placeholder="Enter current password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                    )}

                    <div className="item">
                        <label>New Password</label>
                        <input
                            type="password"
                            placeholder="Enter new password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            disabled={isSubmitting}
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="item">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            disabled={isSubmitting}
                            required
                            minLength={6}
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="proceed" 
                        disabled={isSubmitting}
                         style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    >
                        {isSubmitting ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Updating...</span>
                            </div>
                        ) : (
                            <span className="order-amount">{user?.hasPassword ? 'Update Password' : 'Set Password'}</span>
                        )}
                    </button>
                 </form>
            </div>
        )}

      </div>
    </div>
  )
}