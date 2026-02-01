"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
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

  // Backend user.balance is already a float
  const balance = user ? `₹${user.balance.toFixed(2)}` : "—";

  // Stats
  const completedOrders = (user.orderCount !== undefined) ? user.orderCount : 0;
  const totalSpend = (user.totalSpend !== undefined) ? `₹${user.totalSpend.toFixed(2)}` : "₹0.00";

  return (
    <div className="home-page">
      <div className="home-wallet-container">
        <div className="balance-container">
          <p className="label">Wallet Balance</p>
          <h2 className="value">{balance}</h2>
        </div>
        <div className="bottom-container">
          <p>Total Spend :<span>{totalSpend}</span></p>
          <Link className="add-container" href="/wallet/add">
            <p>Add Money</p>
            <div className="glow"></div>
          </Link>
        </div>
      </div>
      <div className="order-stats-container">
        <div className="stat-card">
          <p className="stat-label">Active Orders</p>
          <p className="stat-value">0</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Completed Orders</p>
          <p className="stat-value">{completedOrders}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Failed Orders</p>
          <p className="stat-value">0</p>
        </div>
      </div>
      <div className="divider-container">
        <div className="divider-line"></div>
        <p className="divider-text">Place Order</p>
        <div className="divider-line"></div>
      </div>
      <Link href="/order" className="place-order-button">
        <Image
          src="/bottom-nav/boost-active.png"
          alt="Boost Icon"
          width={16}
          height={16}
        />
        <span>Place New Order</span>
      </Link>
      <ul className="setting-list">
        <li><Link href="/profile/support"><Image src="/profile/support.png" alt="Support" width={20} height={20} />Contact Support</Link></li>
        <li><Link href="/orders"><Image src="/bottom-nav/history.png" alt="Orders History" width={20} height={20} />Orders History</Link></li>
        <li><Link href="/wallet"><Image src="/bottom-nav/wallet.png" alt="Wallet" width={20} height={20} />Wallet</Link></li>
      </ul>
    </div>
  );
}
