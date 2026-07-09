"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";

// Header should be visible on all user pages, except profile/wallet
export default function HeaderSwitch() {
  const pathname = usePathname();
  if (pathname.startsWith('/profile') || pathname.startsWith('/wallet')) return null;
  return <Header />;
}