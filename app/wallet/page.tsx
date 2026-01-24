import Image from 'next/image'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function Page() {
  const session = await getServerSession(authOptions as any);
  if (!session?.user?.email) {
    return (
      <div className='wallet-page'>
        <p>Please <Link href="/auth/login">sign in</Link> to view your wallet.</p>
      </div>
    );
  }

  const email = session.user.email;
  const user = await prisma.user.findUnique({ where: { email }, include: { wallet: true } });
  const balance = ((user?.wallet?.balance ?? 0) / 100).toFixed(2);

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
            <span>{user?.name ?? email}'s Wallet</span>
          </div>      
        </div>
        <div className="wallet-container">
          <div className="balance-section">
            <span className="balance-label">${balance}</span>
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
          <Link href="/wallet/add"><button>Add Money</button></Link>
        </div>
    </div>
  )
}