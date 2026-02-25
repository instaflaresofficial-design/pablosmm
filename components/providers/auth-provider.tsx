"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getApiBaseUrl } from "@/lib/config";
import { toast } from "sonner";
import { useCurrency } from "@/components/layout/CurrencyProvider";

// User Type (reuse from admin or define here)
export interface User {
    id: number;
    name: string; // Full Name
    username: string;
    email: string;
    mobile: string;
    role: string;
    currency?: string;
    balance: number;
    avatar_url?: string;
    totalSpend: number;
    orderCount: number;
    stats?: {
        active: number;
        completed: number;
        failed: number;
    };
    hasPassword?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    convertPrice: (amountInInr: number) => string;
    currencySymbol: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [fxRate, setFxRate] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const { setCurrency } = useCurrency();

    useEffect(() => {
        if (user?.currency) {
            setCurrency(user.currency as any);
        }
    }, [user?.currency, setCurrency]);

    const fetchUser = async (redirectOnFailure = false) => {
        try {
            // console.log('[AuthProvider] fetchUser: Starting...');
            const url = `${getApiBaseUrl()}/auth/me`;
            
            const res = await fetch(url, {
                credentials: "include",
            });
            
            if (res.ok) {
                const data = await res.json();
                // console.log('[AuthProvider] fetchUser: Success, user:', data.user);
                setUser(data.user);
                if (data.fxRate) {
                    setFxRate(data.fxRate);
                }
            } else {
                setUser(null);
                if (redirectOnFailure) {
                    // Logic to handle session expiry if needed
                }
            }
        } catch (error) {
            console.error("[AuthProvider] fetchUser: FAILED with error:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const login = async (credentials: any) => {
        try {
            console.log('[AuthProvider] login: Starting with credentials:', { email: credentials.email });
            console.log('[AuthProvider] API Base URL:', getApiBaseUrl());
            const url = `${getApiBaseUrl()}/auth/login`;
            console.log('[AuthProvider] POST to:', url);
            
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials),
                credentials: "include",
            });

            console.log('[AuthProvider] login: Response status:', res.status);

            if (!res.ok) {
                // Read body as text first (can only read once)
                const responseText = await res.text();
                let errorMessage = 'Login failed';
                
                try {
                    // Try to parse as JSON
                    const err = JSON.parse(responseText);
                    errorMessage = err.error || err.message || responseText;
                } catch (e) {
                    // Not JSON, use the text directly
                    errorMessage = responseText || 'Login failed';
                }
                
                throw new Error(errorMessage);
            }

            await fetchUser();
            toast.success("Welcome back!");
            router.push("/profile");
        } catch (error: any) {
            console.error('[AuthProvider] login: FAILED with error:', error);
            toast.error(error.message);
            throw error;
        }
    };

    const register = async (data: any) => {
        try {
            const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Registration failed");
            }

            toast.success("Account created! Please login.");
            router.push("/login"); // Or auto-login
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await fetch(`${getApiBaseUrl()}/auth/logout`, {
                method: "POST",
                credentials: "include",
            });
            setUser(null);
            router.push("/login");
            toast.success("Logged out successfully");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const convertPrice = (amountInInr: number) => {
        if (!user || user.currency === 'INR') {
            return `₹${amountInInr.toFixed(2)}`;
        }
        if (user.currency === 'USD') {
            const currentFxRate = fxRate || 82.5; // fallback tightly coupled to the API logic down the line if strictly needed
            const usd = amountInInr / currentFxRate;
            return `$${usd.toFixed(usd < 0.01 ? 4 : 2)}`;
        }
        return `₹${amountInInr.toFixed(2)}`;
    };

    const currencySymbol = user?.currency === 'INR' ? '₹' : '$';

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: () => fetchUser(), convertPrice, currencySymbol }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
