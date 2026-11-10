/**
 * Instant feedback shown while a route's server content loads.
 * Used by the loading.tsx files; kept tiny so it can be prefetched and shown
 * the moment a link is clicked.
 */
export function PageLoading() {
  return (
    <div
      className="min-h-[50vh] flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="w-9 h-9 rounded-full border-[3px] border-[#39DFFF]/20 border-t-[#39DFFF] animate-spin" />
      <span className="text-xs font-mono uppercase tracking-wider text-[#8B98B5]">Loading…</span>
    </div>
  );
}
