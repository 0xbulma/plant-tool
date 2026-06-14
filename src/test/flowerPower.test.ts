import { describe, expect, it } from "vitest";
import {
  clamp,
  convertSoilMoisture,
  convertSunlight,
  convertTemperature,
  isWebBluetoothAvailable,
  readBatteryLevel,
  readSensors,
  type LiveCharacteristics,
} from "@/lib/flowerPower";

/** Stub characteristic whose readValue() yields a little-endian uint16. */
function u16Char(value: number): BluetoothRemoteGATTCharacteristic {
  return {
    readValue: async () => {
      const dv = new DataView(new ArrayBuffer(2));
      dv.setUint16(0, value, true);
      return dv;
    },
  } as unknown as BluetoothRemoteGATTCharacteristic;
}

/** Stub characteristic whose readValue() yields a single uint8 (battery). */
function u8Char(value: number): BluetoothRemoteGATTCharacteristic {
  return {
    readValue: async () => {
      const dv = new DataView(new ArrayBuffer(1));
      dv.setUint8(0, value);
      return dv;
    },
  } as unknown as BluetoothRemoteGATTCharacteristic;
}

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

describe("readSensors", () => {
  it("décode les valeurs brutes little-endian et applique les conversions", async () => {
    const chars: LiveCharacteristics = {
      soilMoisture: u16Char(400),
      soilTemperature: u16Char(500),
      airTemperature: u16Char(500),
      sunlight: u16Char(1000),
      soilEC: u16Char(123),
    };
    const r = await readSensors(chars);

    expect(r.raw.soilMoisture).toBe(400);
    expect(r.raw.soilEC).toBe(123);
    expect(r.soilEC).toBe(123); // EC passe en brut, sans conversion
    expect(r.soilTemperature).toBeCloseTo(10.71, 1);
    expect(r.soilMoisture).toBeGreaterThan(20);
    expect(r.soilMoisture).toBeLessThan(25);
  });

  it("décode correctement un uint16 multi-octets (endianness)", async () => {
    // 0x0102 = 258 ; vérifie que l'octet de poids faible est lu en premier.
    const r = await readSensors({ soilEC: u16Char(258) });
    expect(r.raw.soilEC).toBe(258);
  });

  it("renvoie null (pas 0) pour une caractéristique absente", async () => {
    const r = await readSensors({});
    expect(r.raw.soilMoisture).toBeNull();
    expect(r.soilMoisture).toBeNull();
    expect(r.sunlight).toBeNull();
    expect(r.soilEC).toBeNull();
  });
});

describe("readBatteryLevel", () => {
  it("renvoie null quand aucune caractéristique batterie n'est présente", async () => {
    expect(await readBatteryLevel({})).toBeNull();
  });

  it("renvoie l'octet de niveau de batterie", async () => {
    expect(await readBatteryLevel({ battery: u8Char(88) })).toBe(88);
  });
});
