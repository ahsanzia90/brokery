import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/messages/en.json";
import ur from "@/lib/i18n/messages/ur.json";
import { createTranslator } from "@/lib/i18n/translate";

describe("translations", () => {
  it("urdu dictionary has every english key", () => {
    const missing = Object.keys(en).filter((k) => !(k in ur));
    expect(missing).toEqual([]);
  });
  it("interpolates variables and falls back to english", () => {
    const t = createTranslator("ur");
    expect(t("auth.codeSent", { phone: "+92 300" })).toContain("+92 300");
    expect(createTranslator("ur")("nonexistent.key")).toBe("nonexistent.key");
  });
});
