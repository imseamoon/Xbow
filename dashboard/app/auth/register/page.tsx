"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Alert, Spinner } from "@/components/ui";
import { Shield } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, name, password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Brand */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 shadow-sm">
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Create Account</h1>
          <p className="mt-1 text-sm text-slate-500">Get started with RedSentinel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
            />
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
          >
            {loading ? <><Spinner size={14} /> Creating account...</> : "Create Account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium text-pink-600 hover:text-pink-700 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
