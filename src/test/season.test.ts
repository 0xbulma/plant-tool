import { describe, expect, it } from "vitest";
import { isFrostRisk, isGrowingSeason } from "@/lib/season";

describe("isGrowingSeason", () => {
  it("est vraie en plein été et fausse en plein hiver", () => {
    expect(isGrowingSeason(new Date(2026, 6, 15))).toBe(true); // juillet
    expect(isGrowingSeason(new Date(2026, 0, 15))).toBe(false); // janvier
  });
});

describe("isFrostRisk", () => {
  it("couvre la fenêtre froide (octobre → avril)", () => {
    expect(isFrostRisk(new Date(2026, 0, 15))).toBe(true); // janvier
    expect(isFrostRisk(new Date(2026, 11, 15))).toBe(true); // décembre
    expect(isFrostRisk(new Date(2026, 9, 15))).toBe(true); // octobre
    expect(isFrostRisk(new Date(2026, 6, 15))).toBe(false); // juillet
  });
});
