/**
 * Shared layout for (auth) route group — wraps login/signup in the
 * centered auth shell without the main navbar (auth pages have their
 * own minimal header).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen max-w-full overflow-x-hidden flex flex-col bg-[#F7F8F4] evo-bg-mesh text-[#203331]">
      {children}
    </div>
  );
}
