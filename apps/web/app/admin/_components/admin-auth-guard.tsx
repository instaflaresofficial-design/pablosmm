"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, Lock, User, Eye, EyeOff, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";

interface AdminUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
}

export function AdminAuthGuard({ children }: { readonly children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [loginInput, setLoginInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      setChecking(true);
      const res = await apiClient.get<{ user: AdminUser }>("/auth/me");
      if (res && res.user && res.user.role === "admin") {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setChecking(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim() || !passwordInput) {
      setErrorMsg("Please enter your Admin ID and password");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await apiClient.post<{ status: string; user: AdminUser }>("/admin/login", {
        login: loginInput.trim(),
        password: passwordInput,
      });

      if (res && res.user && res.user.role === "admin") {
        toast.success("Admin Authentication Successful");
        setUser(res.user);
      } else {
        setErrorMsg("Access Denied: Account lacks Administrator privileges");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid Admin ID or Password");
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Loading state
  if (checking) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <Loader2 className="absolute -top-2 -right-2 h-6 w-6 animate-spin text-primary" />
        </div>
        <p className="text-sm font-medium text-muted-foreground tracking-wide">
          Verifying Admin Credentials...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated / Non-Admin -> Render Secure Login Screen Gate
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#090D16] text-white p-4 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-[128px] pointer-events-none" />

        <div className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden relative z-10">
          {/* Header Banner */}
          <div className="p-6 pb-4 text-center border-b border-border/50 bg-muted/20">
            <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/20 border border-primary/30 flex items-center justify-center shadow-inner">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              PabloSMM Admin Portal
            </h1>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-500" /> Secure Administrator Verification Required
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAdminLogin} className="p-6 space-y-5">
            {errorMsg && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium animate-in fade-in slide-in-from-top-1">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-id" className="text-xs font-semibold text-foreground">
                Admin Username or Email
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-id"
                  type="text"
                  placeholder="Enter admin ID or email"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="pl-9 bg-background/50 h-11 border-border/60 focus:border-primary text-sm font-medium rounded-xl"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-password" className="text-xs font-semibold text-foreground">
                  Admin Password
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="pl-9 pr-10 bg-background/50 h-11 border-border/60 focus:border-primary text-sm font-medium rounded-xl"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 text-sm font-bold gap-2 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-700 text-white shadow-lg shadow-primary/20 rounded-xl transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Authenticate & Open Admin
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-muted-foreground/70 font-mono">
                Encrypted Session • IP Logged & Monitored
              </span>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 3. Authenticated Admin -> Render Dashboard
  return <>{children}</>;
}
