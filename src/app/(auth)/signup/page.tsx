import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your free EVOAIQU account and start playing games with friends.",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8F4] evo-bg-mesh text-[#203331]">
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" className="text-[#167D78]" />
        </div>
      }>
        <SignupForm />
      </Suspense>
    </div>
  );
}
