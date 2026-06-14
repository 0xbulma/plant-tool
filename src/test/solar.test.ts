import { describe, expect, it } from "vitest";
import { PARIS } from "@/lib/location";
import {
  clearSkyPPFD,
  dayLengthHours,
  potentialDLI,
  solarDeclination,
  solarElevation,
  solarNoonElevation,
} from "@/lib/solar";

// Dates UTC déterministes (la position du Soleil ne dépend que de l'instant).
const SUMMER_SOLSTICE = new Date(Date.UTC(2026, 5, 21, 12, 0));
const WINTER_SOLSTICE = new Date(Date.UTC(2026, 11, 21, 12, 0));
const EQUINOX = new Date(Date.UTC(2026, 2, 20, 12, 0));

describe("solarDeclination", () => {
  it("vaut ±23.44° aux solstices", () => {
    expect(solarDeclination(SUMMER_SOLSTICE) * (180 / Math.PI)).toBeCloseTo(
      23.44,
      1,
    );
    expect(solarDeclination(WINTER_SOLSTICE) * (180 / Math.PI)).toBeCloseTo(
      -23.44,
      1,
    );
  });

  it("est proche de 0° à l'équinoxe", () => {
    expect(Math.abs(solarDeclination(EQUINOX) * (180 / Math.PI))).toBeLessThan(
      1.5,
    );
  });
});

describe("solarNoonElevation (Paris)", () => {
  it("reproduit les hauteurs solaires connues à midi", () => {
    // 90 − |lat − déclinaison| : 64.6° / 41.1° / 17.7° pour Paris.
    expect(solarNoonElevation(PARIS, SUMMER_SOLSTICE)).toBeCloseTo(64.6, 0);
    expect(solarNoonElevation(PARIS, EQUINOX)).toBeCloseTo(41.1, 0);
    expect(solarNoonElevation(PARIS, WINTER_SOLSTICE)).toBeCloseTo(17.7, 0);
  });
});

describe("solarElevation", () => {
  it("est négative en pleine nuit à Paris", () => {
    const midnight = new Date(Date.UTC(2026, 0, 15, 2, 0)); // ~3 h locale
    expect(solarElevation(PARIS, midnight)).toBeLessThan(0);
  });

  it("est élevée à midi solaire d'été", () => {
    expect(solarElevation(PARIS, SUMMER_SOLSTICE)).toBeGreaterThan(60);
  });
});

describe("dayLengthHours (Paris)", () => {
  it("≈ 16 h au solstice d'été, ≈ 8 h au solstice d'hiver", () => {
    expect(dayLengthHours(PARIS, SUMMER_SOLSTICE)).toBeGreaterThan(15.5);
    expect(dayLengthHours(PARIS, SUMMER_SOLSTICE)).toBeLessThan(16.3);
    expect(dayLengthHours(PARIS, WINTER_SOLSTICE)).toBeGreaterThan(7.7);
    expect(dayLengthHours(PARIS, WINTER_SOLSTICE)).toBeLessThan(8.5);
  });
});

describe("clearSkyPPFD", () => {
  it("est nul quand le Soleil est sous l'horizon", () => {
    expect(clearSkyPPFD(0)).toBe(0);
    expect(clearSkyPPFD(-10)).toBe(0);
  });

  it("croît avec l'élévation solaire", () => {
    expect(clearSkyPPFD(60)).toBeGreaterThan(clearSkyPPFD(20));
  });

  it("donne ~900 µmol/m²/s au zénith d'été parisien", () => {
    const ppfd = clearSkyPPFD(solarNoonElevation(PARIS, SUMMER_SOLSTICE));
    expect(ppfd).toBeGreaterThan(800);
    expect(ppfd).toBeLessThan(1000);
  });
});

describe("potentialDLI (Paris)", () => {
  it("est bien plus élevé l'été que l'hiver", () => {
    const summer = potentialDLI(PARIS, SUMMER_SOLSTICE);
    const winter = potentialDLI(PARIS, WINTER_SOLSTICE);
    expect(summer).toBeGreaterThan(25);
    expect(winter).toBeLessThan(12);
    expect(summer).toBeGreaterThan(winter);
  });
});
