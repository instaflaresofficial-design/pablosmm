"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getApiBaseUrl } from "@/lib/config";
import { toast } from "sonner";

// User Type (reuse from admin or define here)
export interface User {
    id: number;
    name: string; // Full Name
    username: string;
    email: string;
    mobile: string;
    role: string;
    balance: number;
    avatar_url?: string;
    totalSpend: number;
    orderCount: number;
    stats?: {
        active: number;
        completed: number;
        failed: number;
    };
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const fetchUser = async (redirectOnFailure = false) => {
        try {
            const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setUser(null);
                if (redirectOnFailure) {
                    // Logic to handle session expiry if needed
                }
            }
        } catch (error) {
            console.error("Failed to fetch user:", error);
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
            const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials),
                credentials: "include",
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Login failed");
            }

            await fetchUser();
            toast.success("Welcome back!");
            router.push("/profile");
        } catch (error: any) {
            console.error(error);
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

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: () => fetchUser() }}>
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
