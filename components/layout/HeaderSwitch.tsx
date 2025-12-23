"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";

export default function HeaderSwitch() {
  const p = usePathname();
  const hide =
    p === "/wallet" ||
    p.startsWith("/wallet/") ||
    p === "/profile" ||
    p.startsWith("/profile/");

  if (hide) return null;
  return <Header />;
}