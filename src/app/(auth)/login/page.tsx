import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your EVOAIQU account to play games and assign challenges.",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" className="text-[#167D78]" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
