import { describe, expect, it } from "vitest";
import { PLANTS, getPlant } from "@/data/plants";

describe("PLANTS", () => {
  it("contient les 5 plantes attendues, identifiants uniques", () => {
    const ids = PLANTS.map((p) => p.id);
    expect(ids).toEqual([
      "citronnier",
      "lilas",
      "olivier",
      "magnolia",
      "erable-japon",
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a des bandes bien formées (min < max) pour chaque plante", () => {
    for (const p of PLANTS) {
      expect(p.dli.min).toBeLessThan(p.dli.max);
      expect(p.vwc.min).toBeLessThan(p.vwc.max);
      expect(p.ecMScm.min).toBeLessThan(p.ecMScm.max);
      expect(p.optimalC.min).toBeLessThan(p.optimalC.max);
      expect(p.minTempC).toBeLessThan(p.optimalC.min);
      expect(p.optimalC.max).toBeLessThanOrEqual(p.heatLimitC);
      expect(p.vwc.min).toBeGreaterThanOrEqual(0);
      expect(p.vwc.max).toBeLessThanOrEqual(60); // borne capteur VWC
      // Sur-arrosage : seuil critique au-dessus de l'idéal ET atteignable < 60 %.
      expect(p.vwc.max).toBeLessThan(p.vwcCritical);
      expect(p.vwcCritical).toBeLessThan(60);
    }
  });

  it("marque le citronnier et l'olivier comme gélifs", () => {
    expect(getPlant("citronnier")?.frostTender).toBe(true);
    expect(getPlant("olivier")?.frostTender).toBe(true);
    expect(getPlant("lilas")?.frostTender).toBe(false);
    expect(getPlant("magnolia")?.frostTender).toBe(false);
    expect(getPlant("erable-japon")?.frostTender).toBe(false);
  });

  it("getPlant renvoie undefined pour un identifiant inconnu", () => {
    expect(getPlant("inconnu")).toBeUndefined();
  });
});
