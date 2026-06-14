import { describe, expect, it } from "vitest";
import { getPlant } from "@/data/plants";
import { evaluatePlant, frostAdvisory } from "@/lib/plantRanges";
import type { SensorReading } from "@/lib/flowerPower";

const plant = (id: string) => getPlant(id)!;

function makeReading(partial: Partial<Omit<SensorReading, "raw">>): SensorReading {
  return {
    soilMoisture: null,
    soilTemperature: null,
    airTemperature: null,
    sunlight: null,
    soilEC: null,
    ...partial,
    raw: {
      soilMoisture: null,
      soilTemperature: null,
      airTemperature: null,
      sunlight: null,
      soilEC: null,
    },
  };
}

// Saison via getMonth() en heure locale ; lumière via l'instant UTC.
const JULY = new Date(2026, 6, 15, 12);
const JANUARY = new Date(2026, 0, 15, 12);
const SUMMER_NOON_UTC = new Date(Date.UTC(2026, 6, 15, 11, 0));
const WINTER_NIGHT_UTC = new Date(Date.UTC(2026, 0, 15, 2, 0));

describe("humidité du sol", () => {
  it("classe correctement dans / au-dessus / très en dessous de la bande", () => {
    const m = (v: number) =>
      evaluatePlant(plant("magnolia"), makeReading({ soilMoisture: v }), JULY)
        .soilMoisture;
    expect(m(45).status).toBe("ok"); // 35–55 en été
    expect(m(65).status).toBe("bad"); // détrempé
    expect(m(20).status).toBe("bad"); // très sec en pleine croissance
  });

  it("abaisse la cible en repos hivernal (date-dépendant)", () => {
    const summer = evaluatePlant(
      plant("magnolia"),
      makeReading({ soilMoisture: 45 }),
      JULY,
    ).soilMoisture;
    const winter = evaluatePlant(
      plant("magnolia"),
      makeReading({ soilMoisture: 45 }),
      JANUARY,
    ).soilMoisture;
    expect(summer.idealMax).toBeGreaterThan(winter.idealMax);
    expect(summer.idealMin).toBeGreaterThan(winter.idealMin);
    expect(winter.note).toMatch(/repos/i);
  });
});

describe("température de l'air", () => {
  it("ok dans l'optimum, critique sous le minimum de rusticité", () => {
    const t = (v: number) =>
      evaluatePlant(plant("citronnier"), makeReading({ airTemperature: v }), JULY)
        .airTemperature;
    expect(t(25).status).toBe("ok"); // optimum 21–30
    expect(t(15).status).toBe("warn"); // sous l'optimum mais sans danger
    expect(t(-5).status).toBe("bad"); // sous le minimum (-3 °C)
  });
});

describe("lumière (heure / date / lieu)", () => {
  it("n'est pas évaluée la nuit", () => {
    const light = evaluatePlant(
      plant("erable-japon"),
      makeReading({ sunlight: 5 }),
      WINTER_NIGHT_UTC,
    ).light;
    expect(light.status).toBe("na");
    expect(light.note).toMatch(/nuit/i);
  });

  it("est évaluée en plein jour", () => {
    const light = evaluatePlant(
      plant("lilas"),
      makeReading({ sunlight: 50 }),
      SUMMER_NOON_UTC,
    ).light;
    expect(light.status).not.toBe("na");
    expect(light.idealMax).toBeGreaterThan(light.idealMin);
  });
});

describe("fertilité (indice relatif)", () => {
  it("place un gourmand (citronnier) dans la bande haute", () => {
    const f = evaluatePlant(
      plant("citronnier"),
      makeReading({ soilEC: 1400 }), // indice ≈ 70/100
      JULY,
    ).fertilizer;
    expect(f.status).toBe("ok");
  });

  it("signale un excès pour un peu-gourmand (lilas)", () => {
    const f = evaluatePlant(plant("lilas"), makeReading({ soilEC: 1400 }), JULY)
      .fertilizer;
    expect(f.status).toBe("bad"); // bien au-dessus de la bande légère
  });

  it("tolère un indice bas en repos hivernal", () => {
    const f = evaluatePlant(
      plant("lilas"),
      makeReading({ soilEC: 200 }),
      JANUARY,
    ).fertilizer;
    expect(f.status).toBe("ok");
    expect(f.note).toMatch(/repos/i);
  });
});

describe("frostAdvisory", () => {
  it("alerte pour une plante gélive en saison froide", () => {
    expect(frostAdvisory(plant("citronnier"), null, JANUARY)).toMatch(/gel/i);
  });

  it("n'alerte pas pour une plante rustique", () => {
    expect(frostAdvisory(plant("magnolia"), null, JANUARY)).toBeNull();
  });

  it("n'alerte pas une plante gélive par temps doux hors saison froide", () => {
    expect(frostAdvisory(plant("citronnier"), 25, JULY)).toBeNull();
  });

  it("alerte si la température mesurée frôle le minimum, même l'été", () => {
    expect(frostAdvisory(plant("olivier"), -8, JULY)).toMatch(/gel/i);
  });
});
