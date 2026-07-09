"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/components/providers/auth-provider";
import { Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/lib/config";

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username too long").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  mobile: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    try {
      await registerUser(data);
    } catch (error) {
      // Handled in provider
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-header">
        <h1>Create Account</h1>
        <p>Join us today! Enter your details below.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        <button type="button" className="google-btn" onClick={() => window.location.href = `${getApiBaseUrl()}/auth/google/login`}>
          <img src="/logos/google.svg" alt="Google" />
          Sign up with Google
        </button>

        <div className="divider">
          <div className="line"></div>
          <span>OR</span>
          <div className="line"></div>
        </div>

        <div className="input-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            placeholder="John Doe"
            {...register("fullName")}
            disabled={isLoading}
          />
          {errors.fullName && (
            <span className="error-msg">{errors.fullName.message}</span>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            placeholder="johndoe"
            {...register("username")}
            disabled={isLoading}
          />
          {errors.username && (
            <span className="error-msg">{errors.username.message}</span>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="mobile">Mobile Number (Optional)</label>
          <input
            id="mobile"
            type="tel"
            placeholder="+1 234 567 890"
            {...register("mobile")}
            disabled={isLoading}
          />
        </div>

        <div className="input-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="john@example.com"
            {...register("email")}
            disabled={isLoading}
          />
          {errors.email && (
            <span className="error-msg">{errors.email.message}</span>
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
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>

        <div className="auth-footer">
          Already have an account?
          <Link href="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}