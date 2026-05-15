"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LogIn, LogOut, Settings, User } from "lucide-react";

export function NavBar() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-slate-200 bg-[#FDFCFD]/80 backdrop-blur-md px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">Dashboard</span>
          <span className="text-sm text-slate-400">/</span>
          <span className="text-sm text-slate-500">Overview</span>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {loading ? (
          <span className="text-xs text-slate-400">...</span>
        ) : user ? (
          <>
            <Link
              href="/settings"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              <User size={13} />
              {user.name || user.email}
            </Link>

            <div className="w-px h-4 bg-slate-200" />

            <button
              onClick={async () => {
                await logout();
                router.push("/auth/login");
              }}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={13} />
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              <LogIn size={13} />
              Login
            </Link>

            <Link
              href="/auth/register"
              className="flex items-center gap-1.5 rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-pink-700 shadow-sm"
            >
              Sign Up
            </Link>
          </>
        )}

        <div className="w-px h-4 bg-slate-200" />

        <span className="text-xs font-mono text-slate-400">
          v0.1.0
        </span>
      </div>
    </header>
  );
}
