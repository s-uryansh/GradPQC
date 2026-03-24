"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Shield } from "lucide-react";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

type RegisterForm = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();

  async function onSubmit(data: RegisterForm) {
    setError(null);

    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Registration failed");
        return;
      }
      window.location.href = "/login";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full md:w-[420px] flex flex-col justify-center px-10 bg-white">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#8B1A1A] rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-xl text-[#8B1A1A]">GradPQC</div>
              <div className="text-xs text-gray-500">Quantum Migration Intelligence</div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
          <p className="text-sm text-gray-500">
            PNB PSB Hackathon 2026
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@pnb.bank.in"
              autoComplete="email"
              {...register("email", { required: true })}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-xs text-red-500">Valid email required</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 characters with number and symbol"
                autoComplete="new-password"
                {...register("password", { required: true, minLength: 8 })}
                className={errors.password ? "border-red-500 pr-10" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">
                Password must be at least 8 characters
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Repeat your password"
                autoComplete="new-password"
                {...register("confirmPassword", { required: true })}
                className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <a href="/login" className="text-[#8B1A1A] font-medium hover:underline">
              Sign in
            </a>
          </p>
        </form>

        <p className="mt-8 text-xs text-gray-400 text-center">
          Punjab National Bank · PSB Hackathon Series · In collaboration with IIT Kanpur
        </p>
      </div>

      <div className="hidden md:flex flex-1 bg-gradient-to-br from-[#8B1A1A] via-[#6B1414] to-[#3D0B0B] flex-col items-center justify-center p-12">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 rounded-full px-4 py-1.5 mb-8">
            <Shield className="h-4 w-4 text-amber-400" />
            <span className="text-amber-300 text-sm font-medium">PQC-Ready Platform</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            PSB Hackathon Series
          </h2>
          <p className="text-white/60 text-lg mb-2">
            In collaboration with IIT Kanpur
          </p>
          <h3 className="text-3xl font-bold text-amber-400 mb-6">
            PNB Cybersecurity<br />Hackathon 2026
          </h3>
          <p className="text-white/50 text-sm">
            Cyber Innovation Begins
          </p>
          <div className="grid grid-cols-3 gap-4 mt-12">
            {[
              { label: "Assets Scanned", value: "Live" },
              { label: "NIST Reference", value: "IR 8547" },
              { label: "PQC Standard", value: "FIPS 203" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 rounded-lg p-3">
                <div className="text-white font-bold text-lg">{value}</div>
                <div className="text-white/50 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}