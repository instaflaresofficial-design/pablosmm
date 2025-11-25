"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import BottomSheet from "@/components/modal/BottomSheet";
import React from "react";

const NO_NAV = ["/wallet"]; // add more routes here

const matches = (p: string, base: string) => p === base || p.startsWith(base + "/");

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = NO_NAV.some((r) => matches(pathname, r));

  return (
    <>
      <div className={`root ${hideNav ? "no-bottom-nav" : ""}`}>
        {!hideNav && <Header />}
        {children}
      </div>
      {!hideNav && <BottomSheet />}
    </>
  );
}