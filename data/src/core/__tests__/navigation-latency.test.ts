/**
 * Navigation latency guards
 *  - Pages and layouts share one cached auth lookup per request (getServerUser)
 *    instead of each calling supabase.auth.getUser() over the network.
 *  - loading.tsx files give instant feedback after a click.
 *  - /challenges (a public route) shows guests a page instead of redirecting.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { describe, it, expect } from "vitest";

const root = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf-8");

const pageAndLayoutFiles = execSync("git ls-files -co --exclude-standard src/app", { cwd: root, encoding: "utf-8" })
  .split("\n")
  .filter((f) => /\/(page|layout)\.tsx$/.test(f));

describe("Navigation latency guards", () => {
  it("getServerUser is wrapped in React cache()", () => {
    const server = read("src/core/supabase/server.ts");
    expect(server).toContain('import { cache } from "react"');
    expect(server).toMatch(/export const getServerUser = cache\(/);
  });

  it("no page or layout calls supabase.auth.getUser() directly", () => {
    const offenders = pageAndLayoutFiles.filter((f) => read(f).includes("auth.getUser()"));
    expect(offenders).toEqual([]);
  });

  it("the protected layout uses the shared lookup", () => {
    expect(read("src/app/(protected)/layout.tsx")).toContain("getServerUser()");
  });

  it("has loading states at the root and in the protected section", () => {
    expect(fs.existsSync(path.join(root, "src/app/loading.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(root, "src/app/(protected)/loading.tsx"))).toBe(true);
  });

  it("/challenges shows guests a sign-in prompt instead of redirecting", () => {
    const page = read("src/app/(protected)/challenges/page.tsx");
    expect(page).not.toContain('redirect("/login?next=/challenges")');
    expect(page).toContain('href="/login?next=/challenges"');
  });
});
