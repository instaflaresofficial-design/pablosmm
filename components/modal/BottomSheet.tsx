"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const BottomSheet: React.FC = () => {
  const pathname = usePathname();

  const match = (base: string) =>
    pathname === base || pathname.startsWith(`${base}/`);

   const isHome = pathname === "/";
  const isOrders = match("/orders");
  const isBoost = match("/order"); // only /order or /order/*
  const isWallet = match("/wallet");
  const isProfile = match("/profile");

  return (
    <div className="bottom-navigation">
      <Link href="/" className={`nav-item ${isHome ? "active" : ""}`} aria-current={isHome ? "page" : undefined}>
        <Image src="/bottom-nav/home.png" alt="Home" width={24} height={24} />
        <span className="label">Home</span>
      </Link>

      <Link href="/orders" className={`nav-item ${isOrders ? "active" : ""}`} aria-current={isOrders ? "page" : undefined}>
        <Image src="/bottom-nav/history.png" alt="Orders" width={24} height={24} />
        <span className="label">Orders</span>
      </Link>

      <Link href="/order" className={`nav-item boost ${isBoost ? "active" : ""}`} aria-current={isBoost ? "page" : undefined}>
        <Image
          src={isBoost ? "/bottom-nav/boost-active.png" : "/bottom-nav/boost.png"}
          alt="Boost"
          width={24}
          height={24}
          priority
        />
        {/* boost label intentionally hidden per design */}
      </Link>

      <Link href="/wallet" className={`nav-item ${isWallet ? "active" : ""}`} aria-current={isWallet ? "page" : undefined}>
        <Image src="/bottom-nav/wallet.png" alt="Wallet" width={24} height={24} />
        <span className="label">Wallet</span>
      </Link>

      <Link href="/profile" className={`nav-item ${isProfile ? "active" : ""}`} aria-current={isProfile ? "page" : undefined}>
        <Image src="/bottom-nav/profile.png" alt="Profile" width={24} height={24} />
        <span className="label">Profile</span>
      </Link>
    </div>
  );
};

export default BottomSheet;