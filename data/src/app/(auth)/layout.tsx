/**
 * Shared layout for (auth) route group — Concept B: cream canvas, no main
 * navbar (each auth form renders its own logo header inside AuthShell).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen max-w-full overflow-x-hidden flex flex-col">
      {children}
    </div>
  );
}
