"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import HeaderSwitch from '@/components/layout/HeaderSwitch';
import BottomSheet from '@/components/modal/BottomSheet';
import CurrencyStrip from '@/components/layout/CurrencyStrip';

export default function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const isAdmin = pathname.startsWith('/admin');
  if (isAdmin) {
    // Render admin routes without site shell
    return <>{children}</>;
  }
  return (
    <>
      <div className="root">
        <CurrencyStrip />
        <HeaderSwitch />
        {children}
      </div>
      <BottomSheet />
    </>
  );
}
