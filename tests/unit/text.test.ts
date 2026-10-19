import { describe, expect, it } from "vitest";
import { normalizeText, slugify, cleanUserText } from "@/lib/utils/text";
import { formatPKR, formatNumber } from "@/lib/utils/format";

describe("text utilities", () => {
  it("normalizes Latin and Urdu text for search", () => {
    expect(normalizeText("  Zero-9  ")).toBe("zero 9");
    expect(normalizeText("Chāwal")).toBe("chawal");
    expect(normalizeText("چاوَل")).toBe("چاول");
  });
  it("slugifies", () => {
    expect(slugify("Super Basmati (1121)")).toBe("super-basmati-1121");
    expect(slugify("چاول")).toBe("item");
  });
  it("strips html from user text", () => {
    expect(cleanUserText("<b>hello</b> <script>x</script>")).toBe("hello x");
  });
  it("formats PKR", () => {
    expect(formatPKR(125000)).toBe("Rs. 125,000");
    expect(formatNumber("1234.5")).toBe("1,234.5");
    expect(formatPKR(null)).toBe("");
  });
});
