import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";
import { Spinner } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your free EVOAIQU account and start playing games with friends.",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <div className="min-h-screen w-full max-w-full flex flex-col bg-[#070B25] text-[#F5F7FF] relative overflow-x-hidden selection:bg-[#39DFFF]/30 selection:text-white">
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center py-20">
          <Spinner size="lg" className="text-[#39DFFF]" />
        </div>
      }>
        <SignupForm />
      </Suspense>
    </div>
  );
}
