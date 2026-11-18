"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

/** Settings row that ends the current session (same flow as the profile tab). */
export function SignOutRow({ className }: { className?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Quiet fallback
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <button type="button" onClick={handleLogout} className={className} id="settings-sign-out">
      <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-[#F5EADC] text-[#1E1B24]">
        <LogOut className="h-5 w-5" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-sm text-[#1E1B24]">Sign out</span>
        <span className="block text-xs text-[#6E6878]">End your current session on this device</span>
      </span>
    </button>
  );
}
