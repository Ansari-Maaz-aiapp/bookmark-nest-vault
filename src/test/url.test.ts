import { describe, expect, it } from "vitest";
import { detectKind, normalizeUrl } from "@/lib/url";
import { isBlockedHost } from "@/lib/ssrf";

describe("duplicate detection normalization", () => {
  it("treats www and tracking params as the same link", () => {
    const a = normalizeUrl("https://example.com/article");
    expect(normalizeUrl("https://www.example.com/article")).toBe(a);
    expect(normalizeUrl("https://example.com/article?utm_source=newsletter")).toBe(a);
    expect(normalizeUrl("example.com/article/")).toBe(a);
  });
  it("keeps query params that change content", () => {
    expect(normalizeUrl("https://example.com/search?q=react")).not.toBe(
      normalizeUrl("https://example.com/search?q=vue"),
    );
  });
  it("matches youtu.be short links to watch URLs", () => {
    expect(normalizeUrl("https://youtu.be/abc123")).toBe(
      normalizeUrl("https://www.youtube.com/watch?v=abc123&utm_medium=x"),
    );
  });
  it("detects resource types", () => {
    expect(detectKind("https://github.com/facebook/react")).toBe("repo");
    expect(detectKind("https://youtube.com/watch?v=1")).toBe("video");
    expect(detectKind("https://x.com/file.pdf")).toBe("pdf");
  });
});

describe("metadata fetch safety", () => {
  it("blocks localhost and private network addresses", () => {
    for (const h of ["localhost", "127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "169.254.169.254", "[::1]", "foo.internal"]) {
      expect(isBlockedHost(h)).toBe(true);
    }
    expect(isBlockedHost("example.com")).toBe(false);
  });
});
