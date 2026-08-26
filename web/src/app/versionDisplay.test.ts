import { describe, it, expect } from "vitest";

import { relAge, deriveVersionDisplay } from "./versionDisplay";

describe("relAge", () => {
  it("formats seconds / minutes / hours / days", () => {
    expect(relAge(5_000)).toBe("5s ago");
    expect(relAge(3 * 60_000)).toBe("3m ago");
    expect(relAge(2 * 3_600_000)).toBe("2h ago");
    expect(relAge(3 * 86_400_000)).toBe("3d ago");
  });
  it("returns a dash for negative / non-finite ages", () => {
    expect(relAge(-1)).toBe("—");
    expect(relAge(NaN)).toBe("—");
  });
});

describe("deriveVersionDisplay", () => {
  const buildTime = "2026-07-05T11:55:00Z";

  it("labels the build and uses the injected build time", () => {
    const now = Date.parse("2026-07-05T12:00:00Z"); // 5 min after dev start
    const d = deriveVersionDisplay(buildTime, now);
    expect(d.label).toBe("LOCAL");
    expect(d.fresh).toBe(true);
    expect(d.detail).toBe("started 5m ago");
  });

  it("is fresh exactly under, and stale exactly at, the 10-minute boundary", () => {
    const t0 = Date.parse(buildTime);
    expect(deriveVersionDisplay(buildTime, t0 + 9 * 60_000 + 59_000).fresh).toBe(true);
    expect(deriveVersionDisplay(buildTime, t0 + 10 * 60_000).fresh).toBe(false);
  });

  it("degrades gracefully when the build time is unparseable", () => {
    const d = deriveVersionDisplay("", Date.now());
    expect(d.fresh).toBe(false);
    expect(d.ageLabel).toBe("—");
  });
});
