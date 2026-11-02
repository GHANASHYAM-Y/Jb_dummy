import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign In | EVOAIQU",
  description: "Sign in to your EVOAIQU account to play games and assign challenges.",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-[#070B25]">
        <Spinner size="lg" className="text-[#39DFFF]" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
