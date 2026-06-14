import { describe, expect, it } from "vitest";
import {
  clamp,
  convertSoilMoisture,
  convertSunlight,
  convertTemperature,
  isWebBluetoothAvailable,
} from "@/lib/flowerPower";

describe("clamp", () => {
  it("borne les valeurs dans l'intervalle", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
});

describe("convertTemperature", () => {
  it("renvoie une valeur réaliste pour une valeur brute médiane", () => {
    expect(convertTemperature(500)).toBeCloseTo(10.71, 1);
  });

  it("reste bornée entre -10 et 55 °C", () => {
    expect(convertTemperature(0)).toBe(-10); // formule < -10 → bornée
    expect(convertTemperature(100000)).toBe(55);
    for (const raw of [100, 300, 600, 900]) {
      const t = convertTemperature(raw);
      expect(t).toBeGreaterThanOrEqual(-10);
      expect(t).toBeLessThanOrEqual(55);
    }
  });
});

describe("convertSoilMoisture", () => {
  it("renvoie un pourcentage plausible", () => {
    const m = convertSoilMoisture(400);
    expect(m).toBeGreaterThan(20);
    expect(m).toBeLessThan(25);
  });

  it("reste bornée entre 0 et 60 %", () => {
    expect(convertSoilMoisture(0)).toBeGreaterThanOrEqual(0);
    expect(convertSoilMoisture(100000)).toBeLessThanOrEqual(60);
  });
});

describe("convertSunlight", () => {
  it("vaut 0 pour une valeur brute nulle ou négative", () => {
    expect(convertSunlight(0)).toBe(0);
    expect(convertSunlight(-5)).toBe(0);
  });

  it("décroît quand la valeur brute augmente (exposant négatif)", () => {
    expect(convertSunlight(500)).toBeGreaterThan(convertSunlight(1000));
  });

  it("renvoie une valeur positive", () => {
    expect(convertSunlight(1000)).toBeGreaterThan(0);
  });
});

describe("isWebBluetoothAvailable", () => {
  it("renvoie false sous jsdom (pas d'API Bluetooth)", () => {
    expect(isWebBluetoothAvailable()).toBe(false);
  });
});
