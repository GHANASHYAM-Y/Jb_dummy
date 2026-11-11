/**
 * EVOAIQU — tiny HTTP helpers shared by features.
 *
 * Dependency-free so they can be used from client components (postJson) and
 * route handlers (readJson) alike.
 */

/** POSTs JSON. `keepalive` lets the request finish while the page is closing. */
export function postJson(url: string, body?: unknown, keepalive = false) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive,
  });
}

/** Parses a JSON body, returning null when the body is missing or invalid. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
