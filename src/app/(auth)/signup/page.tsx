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
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" className="text-[#167D78]" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
