import { describe, expect, it } from "vitest";
import { cleanProfile, normalizeWebsite } from "@/lib/profile";

describe("normalizeWebsite", () => {
  it("adds https to a bare domain", () => {
    expect(normalizeWebsite("example.com")).toBe("https://example.com/");
  });
  it("treats blank as no website", () => {
    expect(normalizeWebsite("  ")).toBeNull();
  });
  it("rejects non-web links", () => {
    expect(() => normalizeWebsite("javascript:alert(1)")).toThrow();
  });
});

describe("cleanProfile", () => {
  it("rejects a bio over 500 characters", () => {
    expect(() => cleanProfile({ bio: "a".repeat(501) })).toThrow(/500/);
  });
  it("accepts a 500 character bio and blanks become null", () => {
    const out = cleanProfile({ bio: "a".repeat(500), location: "  " });
    expect(out.bio).toHaveLength(500);
    expect(out.location).toBeNull();
  });
});
