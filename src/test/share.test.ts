import { describe, expect, it } from "vitest";
import { folderAsText, isValidShareToken, newShareToken } from "@/lib/share";

describe("folder share links", () => {
  it("creates unguessable 32-character tokens that the shared page accepts", () => {
    const a = newShareToken();
    const b = newShareToken();
    expect(a).toMatch(/^[a-f0-9]{32}$/);
    expect(a).not.toBe(b);
    expect(isValidShareToken(a)).toBe(true);
  });

  it("rejects short or malformed tokens", () => {
    expect(isValidShareToken("abc123")).toBe(false);
    expect(isValidShareToken("../../etc/passwd/aaaaaaaaaaaa")).toBe(false);
  });

  it("lists every link in the folder when shared as text", () => {
    const text = folderAsText("Design", [
      { title: "Figma", url: "https://figma.com" },
      { title: "A note", url: null },
    ]);
    expect(text).toContain("https://figma.com");
    expect(text).toContain("A note");
    expect(text).toContain("2 items");
  });
});
