"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, FileText, Server, Layers } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/admin/ui/sidebar";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import { Badge } from "@/components/admin/ui/badge";

export function ProviderSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.sidebarVariant,
      sidebarCollapsible: s.sidebarCollapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader className="border-b px-4 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-tight text-foreground">Provider Portal</span>
                <span className="text-[11px] text-muted-foreground font-medium">Partner Verification</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
            Verification Tools
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-1 space-y-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive className="font-medium text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Service Audit & Edits</span>
                  <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    Active
                  </Badge>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Server className="w-3.5 h-3.5 text-emerald-500" />
          <span>API Connection Stable</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
