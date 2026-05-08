import { describe, expect, it } from "vitest";
import { compareSchemaVersion } from "./schema-version";

const cmp = (a: string, b: string) => {
  const pa = a.split(".").map(n => parseInt(n, 10));
  const pb = b.split(".").map(n => parseInt(n, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
};

describe("compareSchemaVersion", () => {
  it("returns 'unstamped' for blank/missing stamp", () => {
    expect(compareSchemaVersion("", "2.6.0", cmp)).toBe("unstamped");
    expect(compareSchemaVersion(undefined, "2.6.0", cmp)).toBe("unstamped");
    expect(compareSchemaVersion(null, "2.6.0", cmp)).toBe("unstamped");
  });

  it("returns 'ok' when stamp matches", () => {
    expect(compareSchemaVersion("2.6.0", "2.6.0", cmp)).toBe("ok");
  });

  it("returns 'lag' when stamp is older than current", () => {
    expect(compareSchemaVersion("2.5.0", "2.6.0", cmp)).toBe("lag");
    expect(compareSchemaVersion("1.0.0", "2.6.0", cmp)).toBe("lag");
  });

  it("returns 'ahead' when stamp is newer than current — downgrade case", () => {
    expect(compareSchemaVersion("2.7.0", "2.6.0", cmp)).toBe("ahead");
  });
});
