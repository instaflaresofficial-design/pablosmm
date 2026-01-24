import Image from 'next/image'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function Page() {
  const session = await getServerSession(authOptions as any);
  if (!session?.user?.email) {
    // show a minimal unauthenticated view
    return (
      <div className='profile-page'>
        <p>Please sign in to view your profile. <Link href="/auth/login">Sign in</Link></p>
      </div>
    );
  }

  const email = session.user.email;
  const user = await prisma.user.findUnique({ where: { email }, include: { wallet: true } });

  const displayName = user?.name || session.user.name || email.split('@')[0];
  const walletBalance = ((user?.wallet?.balance ?? 0) / 100).toFixed(2);

  return (
    <div className='profile-page'>
      <div className="user-container">
        <Image className='profile-img' src="/profile/profile.png" alt="User" width={100} height={100} />
        <div className="text-container">
          <div className="user-info-container">
            <div className="username">
              <h3>{displayName}</h3>
              <Link href="/profile/edit" className="edit-link"><Image src="/profile/edit.png" alt="Edit" width={20} height={20} /></Link>
            </div>
            <p className="user-email">{email}</p>
          </div>

            <Link className='signout' href="/logout">Sign Out <Image src="/profile/sign-out.png" alt="Sign Out" width={20} height={20} /></Link>
        </div>
      </div>
      <div className="profile-container">
        <div className="account-overview">
          <h2>Account Overview</h2>
          <div className="profile-wallet-container">
            <div className="top-container">
              <div className="balance-container">
                <p className="balance-label">Wallet Balance</p>
                <p className="balance-amount">${walletBalance}</p>
              </div>
              <select className="currency-select" defaultValue="INR">
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </div>
            <div className="bottom-container">
              <div className="stats">
                <p>Total Spend</p>
                <span>—</span>
              </div>
              <div className="stats">
                <p>Completed Orders</p>
                <span>—</span>
              </div>
            </div>
          </div>
          <div className="stats-container">
            <div className="stat">
              <p className="stat-label">Active Orders</p>
              <p className="stat-value">—</p>
            </div>
            <div className="stat">
              <p className="stat-label">Failed/Refunded Orders</p>
              <p className="stat-value">—</p>
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