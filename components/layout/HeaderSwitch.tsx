"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";

export default function HeaderSwitch() {
  const p = usePathname();
  const hide = p === "/wallet" || p.startsWith("/wallet/");

  if (hide) return null;
  return <Header />;
}