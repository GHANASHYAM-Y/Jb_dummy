import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/core/auth/SignupForm";
import { Spinner } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your free EVOAIQU account and start playing games with friends.",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <div className="min-h-screen w-full max-w-full flex flex-col bg-[#FFF6EC] text-[#1E1B24] overflow-x-hidden">
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center py-20">
          <Spinner size="lg" className="text-[#FF5A3C]" />
        </div>
      }>
        <SignupForm />
      </Suspense>
    </div>
  );
}
