/**
 * EVOAIQU — shared input validation
 *
 * Small, dependency-free checks used by API routes and pages across features.
 */

/**
 * Matches a UUID in canonical 8-4-4-4-12 hex form, case-insensitive.
 * No `g` flag, so the shared instance has no `lastIndex` state and is safe to reuse.
 */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
