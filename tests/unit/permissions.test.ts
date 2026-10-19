import { describe, expect, it } from "vitest";
import { hasPermission, isAdmin, permissionsFor, PERMISSIONS } from "@/lib/authz/permissions";

describe("role based permissions", () => {
  it("buyers and sellers have no admin permissions", () => {
    expect(permissionsFor(["buyer", "seller"]).size).toBe(0);
    expect(isAdmin(["buyer", "seller"])).toBe(false);
  });
  it("super admin has every permission", () => {
    expect(permissionsFor(["super_admin"]).size).toBe(PERMISSIONS.length);
  });
  it("scoped admin roles are limited", () => {
    expect(hasPermission(["price_editor"], "prices.publish")).toBe(true);
    expect(hasPermission(["price_editor"], "users.manage")).toBe(false);
    expect(hasPermission(["listing_moderator"], "listings.moderate")).toBe(true);
    expect(hasPermission(["listing_moderator"], "settings.manage")).toBe(false);
    expect(hasPermission(["content_editor"], "seo.manage")).toBe(true);
    expect(isAdmin(["support_agent"])).toBe(true);
  });
});
