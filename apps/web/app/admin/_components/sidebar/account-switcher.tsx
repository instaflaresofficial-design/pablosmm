"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, LogOut, Shield } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/admin/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
import { getInitials } from "@/lib/admin/utils";

export function AccountSwitcher({
  users,
}: {
  readonly users?: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly avatar: string;
    readonly role: string;
  }>;
}) {
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    username: string;
    role: string;
  }>({
    name: "Administrator",
    email: "admin@pablosmm.com",
    username: "admin",
    role: "admin",
  });

  useEffect(() => {
    apiClient
      .get<{ user: any }>("/auth/me")
      .then((res) => {
        if (res && res.user) {
          setCurrentUser({
            name: res.user.name || res.user.username || "Administrator",
            email: res.user.email || "admin@pablosmm.com",
            username: res.user.username || "admin",
            role: res.user.role || "admin",
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout", {});
    } catch {}
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-9 rounded-lg cursor-pointer border border-primary/20 hover:border-primary/40 transition-colors">
          <AvatarImage src={undefined} alt={currentUser.name} />
          <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
            {getInitials(currentUser.name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <div className="flex items-center gap-2 p-2">
          <Avatar className="size-9 rounded-lg bg-primary/10 text-primary font-bold">
            <AvatarFallback className="rounded-lg">{getInitials(currentUser.name)}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-foreground">{currentUser.name}</span>
            <span className="truncate text-xs text-muted-foreground flex items-center gap-1 font-mono">
              <Shield className="w-3 h-3 text-emerald-500" />
              {currentUser.role}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-2">
            <BadgeCheck className="w-4 h-4 text-primary" />
            <div className="flex flex-col text-xs">
              <span className="font-medium">{currentUser.email}</span>
              <span className="text-[10px] text-muted-foreground">ID: {currentUser.username}</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive gap-2 cursor-pointer" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
          Lock Admin Panel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
