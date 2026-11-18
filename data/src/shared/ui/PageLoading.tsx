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
      <span className="flex items-end gap-2" aria-hidden="true">
        <span className="w-3.5 h-3.5 rounded-full bg-[#FF5A3C] animate-bounce [animation-delay:-0.3s]" />
        <span className="w-3.5 h-3.5 rounded-full bg-[#FFC23D] animate-bounce [animation-delay:-0.15s]" />
        <span className="w-3.5 h-3.5 rounded-full bg-[#8C7BFF] animate-bounce" />
      </span>
      <span className="font-display font-bold text-base text-[#6E6878]">Loading…</span>
    </div>
  );
}
