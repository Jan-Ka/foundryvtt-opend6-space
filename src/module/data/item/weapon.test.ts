import { describe, expect, it } from "vitest";
import { migrateWeaponSource } from "./weapon-migration";

describe("migrateWeaponSource", () => {
  describe("range coercion (pre-#17 → 2.5.0+)", () => {
    it("re-stringifies numeric range fields left over from the old NumberField schema", () => {
      const source: Record<string, unknown> = {
        range: { short: 5, medium: 10, long: 25 },
      };
      migrateWeaponSource(source);
      expect(source.range).toEqual({ short: "5", medium: "10", long: "25" });
    });

    it("leaves attribute-relative range strings untouched", () => {
      const source: Record<string, unknown> = {
        range: { short: "AGI+2", medium: "AGI+4", long: "AGI+8" },
      };
      migrateWeaponSource(source);
      expect(source.range).toEqual({ short: "AGI+2", medium: "AGI+4", long: "AGI+8" });
    });

    it("backfills missing keys with '0'", () => {
      const source: Record<string, unknown> = { range: {} };
      migrateWeaponSource(source);
      expect(source.range).toEqual({ short: "0", medium: "0", long: "0" });
    });

    it("is a no-op when range is absent", () => {
      const source: Record<string, unknown> = { damaged: 0 };
      migrateWeaponSource(source);
      expect(source.range).toBeUndefined();
    });
  });

  describe("subtype localization (#42)", () => {
    it("replaces a stored i18n key with its localized form", () => {
      const source: Record<string, unknown> = { subtype: "NONEX_IST_OD6S.RANGED" };
      migrateWeaponSource(source, (k) => (k === "NONEX_IST_OD6S.RANGED" ? "Ranged" : k));
      expect(source.subtype).toBe("Ranged");
    });

    it("leaves an already-localized string untouched", () => {
      const source: Record<string, unknown> = { subtype: "Ranged" };
      migrateWeaponSource(source, () => "should-not-be-called");
      expect(source.subtype).toBe("Ranged");
    });

    it("leaves the key in place if localize returns the key (i18n not ready yet)", () => {
      const source: Record<string, unknown> = { subtype: "NONEX_IST_OD6S.RANGED" };
      migrateWeaponSource(source, (k) => k);
      expect(source.subtype).toBe("NONEX_IST_OD6S.RANGED");
    });

    it("is a no-op when localize is not provided", () => {
      const source: Record<string, unknown> = { subtype: "NONEX_IST_OD6S.RANGED" };
      migrateWeaponSource(source);
      expect(source.subtype).toBe("NONEX_IST_OD6S.RANGED");
    });

    it("does not touch non-OD6S subtype strings", () => {
      const source: Record<string, unknown> = { subtype: "custom-thing" };
      migrateWeaponSource(source, () => "wrong");
      expect(source.subtype).toBe("custom-thing");
    });
  });

  it("returns the same source object so callers can pass through to super.migrateData", () => {
    const source: Record<string, unknown> = { range: { short: 1, medium: 2, long: 3 } };
    expect(migrateWeaponSource(source)).toBe(source);
  });
});
