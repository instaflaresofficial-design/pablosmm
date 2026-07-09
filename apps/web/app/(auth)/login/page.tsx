"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/components/providers/auth-provider";
import { Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/lib/config";

const loginSchema = z.object({
  login: z.string().min(1, "Email or Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data);
    } catch (error) {
      // Error handling is done in AuthProvider
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-header">
        <h1>Sign In</h1>
        <p>Welcome back! Please login to continue.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        <button type="button" className="google-btn" onClick={() => window.location.href = `${getApiBaseUrl()}/auth/google/login`}>
          <img src="/logos/google.svg" alt="Google" />
          Sign in with Google
        </button>

        <div className="divider">
          <div className="line"></div>
          <span>OR</span>
          <div className="line"></div>
        </div>

        <div className="input-group">
          <label htmlFor="login">Email or Username</label>
          <input
            id="login"
            type="text"
            placeholder="john@example.com"
            {...register("login")}
            disabled={isLoading}
          />
          {errors.login && (
            <span className="error-msg">{errors.login.message}</span>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register("password")}
            disabled={isLoading}
          />
          {errors.password && (
            <span className="error-msg">{errors.password.message}</span>
          )}
        </div>

        <button className="btn-primary submit-btn" type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Signing In..." : "Sign In"}
        </button>

        <div className="auth-footer">
          Don't have an account?
          <Link href="/signup">Sign up</Link>
        </div>
      </form>
    </div>
  );
}