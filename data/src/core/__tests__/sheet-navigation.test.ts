import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as SheetComponents from "@/shared/ui/sheet";

describe("shadcn/ui Sheet Primitive & Navbar Integration", () => {
  it("exports all expected Sheet primitive components", () => {
    expect(SheetComponents.Sheet).toBeDefined();
    expect(SheetComponents.SheetTrigger).toBeDefined();
    expect(SheetComponents.SheetContent).toBeDefined();
    expect(SheetComponents.SheetHeader).toBeDefined();
    expect(SheetComponents.SheetFooter).toBeDefined();
    expect(SheetComponents.SheetTitle).toBeDefined();
    expect(SheetComponents.SheetDescription).toBeDefined();
    expect(SheetComponents.SheetClose).toBeDefined();
    expect(SheetComponents.SheetOverlay).toBeDefined();
    expect(SheetComponents.SheetPortal).toBeDefined();
  });

  it("integrates Sheet into Navbar.tsx with accessible title and description", () => {
    const navbarPath = path.resolve(__dirname, "../navigation/Navbar.tsx");
    const navbarSource = fs.readFileSync(navbarPath, "utf-8");

    // Confirms Sheet components imported and used
    expect(navbarSource).toContain("from \"@/shared/ui/sheet\"");
    expect(navbarSource).toContain("<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>");
    expect(navbarSource).toContain("<SheetTrigger asChild>");
    expect(navbarSource).toContain("<SheetContent side=\"right\"");
    expect(navbarSource).toContain("<SheetHeader");
    expect(navbarSource).toContain("<SheetTitle");
    expect(navbarSource).toContain("<SheetDescription");

    // Confirms accessible labels and touch targets
    expect(navbarSource).toContain("aria-label=\"Open navigation menu\"");
    expect(navbarSource).toContain("min-h-[44px]");
  });

  it("preserves public and authenticated routes in Navbar", () => {
    const navbarPath = path.resolve(__dirname, "../navigation/Navbar.tsx");
    const navbarSource = fs.readFileSync(navbarPath, "utf-8");

    // Public routes
    expect(navbarSource).toContain('href: "/games"');
    expect(navbarSource).toContain('href: "/how-to-play"');
    expect(navbarSource).toContain('href: "/about"');
    expect(navbarSource).toContain('href="/login"');
    expect(navbarSource).toContain('href="/signup"');

    // Authenticated routes
    expect(navbarSource).toContain('href: "/chat"');
    expect(navbarSource).toContain('href: "/profile"');
    expect(navbarSource).toContain('href: "/friends"');
    expect(navbarSource).toContain('href="/settings"');
  });

  it("preserves Concept B styling and sign-out handler in Navbar", () => {
    const navbarPath = path.resolve(__dirname, "../navigation/Navbar.tsx");
    const navbarSource = fs.readFileSync(navbarPath, "utf-8");

    // Concept B palette
    expect(navbarSource).toContain("#FF5A3C"); // Tangerine
    expect(navbarSource).toContain("#FFE4DD"); // Coral tint
    expect(navbarSource).toContain("#FF5A3C"); // Tangerine
    expect(navbarSource).toContain("#EADBC8"); // Warm line

    // Sign out handler invoked
    expect(navbarSource).toContain("onLogout?.()");
  });
});
