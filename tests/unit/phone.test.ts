import { describe, expect, it } from "vitest";
import { formatPhoneDisplay, maskPhone, normalizePakistanPhone, whatsappLink } from "@/lib/utils/phone";

describe("Pakistani phone normalization", () => {
  it("accepts common local formats", () => {
    expect(normalizePakistanPhone("0300 1234567")).toBe("+923001234567");
    expect(normalizePakistanPhone("03001234567")).toBe("+923001234567");
    expect(normalizePakistanPhone("3001234567")).toBe("+923001234567");
    expect(normalizePakistanPhone("+92 300 1234567")).toBe("+923001234567");
    expect(normalizePakistanPhone("0092-300-1234567")).toBe("+923001234567");
  });
  it("rejects invalid numbers", () => {
    expect(normalizePakistanPhone("12345")).toBeNull();
    expect(normalizePakistanPhone("+14155551234")).toBeNull();
    expect(normalizePakistanPhone("")).toBeNull();
  });
  it("formats and masks", () => {
    expect(formatPhoneDisplay("+923001234567")).toBe("+92 300 1234567");
    expect(maskPhone("+923001234567")).toBe("+92300••••567");
    expect(whatsappLink("+923001234567", "hi")).toBe("https://wa.me/923001234567?text=hi");
  });
});
