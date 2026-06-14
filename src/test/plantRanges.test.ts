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
  it("classe dans / trop humide / détrempé / trop sec", () => {
    const m = (v: number) =>
      evaluatePlant(plant("magnolia"), makeReading({ soilMoisture: v }), JULY)
        .soilMoisture;
    expect(m(45).status).toBe("ok"); // idéal 35–52 en été
    expect(m(54).status).toBe("warn"); // un peu trop humide (>52, <57)
    expect(m(58).status).toBe("bad"); // détrempé (≥57) — pourriture
    expect(m(20).status).toBe("warn"); // trop sec : avertissement, pas critique
  });

  it("abaisse la cible et resserre le seuil critique en repos hivernal", () => {
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
    // Même lecture (52 %) : correcte l'été, critique l'hiver (resserrement).
    const s52 = evaluatePlant(plant("magnolia"), makeReading({ soilMoisture: 52 }), JULY).soilMoisture;
    const w52 = evaluatePlant(plant("magnolia"), makeReading({ soilMoisture: 52 }), JANUARY).soilMoisture;
    expect(s52.status).toBe("ok");
    expect(w52.status).toBe("bad");
    // En hiver, une plante bien dans la bande renvoie la note de repos.
    const winterOk = evaluatePlant(plant("magnolia"), makeReading({ soilMoisture: 35 }), JANUARY).soilMoisture;
    expect(winterOk.status).toBe("ok");
    expect(winterOk.note).toMatch(/repos/i);
  });
});

describe("sur-arrosage (sécurité)", () => {
  it("déclenche 'bad' (pourriture) sous le plafond capteur de 60 % pour chaque plante", () => {
    for (const id of ["citronnier", "lilas", "olivier", "magnolia", "erable-japon"]) {
      const ev = evaluatePlant(plant(id), makeReading({ soilMoisture: 59 }), JULY)
        .soilMoisture;
      expect(ev.status).toBe("bad");
      expect(ev.note).toMatch(/pourriture/i);
    }
  });

  it("alerte plus tôt pour l'olivier (le plus sensible) que pour le magnolia", () => {
    const olive = evaluatePlant(plant("olivier"), makeReading({ soilMoisture: 47 }), JULY).soilMoisture;
    const magnolia = evaluatePlant(plant("magnolia"), makeReading({ soilMoisture: 47 }), JULY).soilMoisture;
    expect(olive.status).toBe("bad"); // 47 ≥ 46 (seuil critique olivier)
    expect(magnolia.status).not.toBe("bad"); // 47 dans la bande magnolia
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
    expect(t(40).status).toBe("bad"); // au-dessus de la limite de chaleur (38 °C)
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

  it("signale une lumière trop forte (brûlure) ou insuffisante", () => {
    const erable = (v: number) =>
      evaluatePlant(
        plant("erable-japon"),
        makeReading({ sunlight: v }),
        SUMMER_NOON_UTC,
      ).light;
    const strong = erable(200); // bien au-dessus de la bande (érable = mi-ombre)
    expect(strong.status).toBe("bad");
    expect(strong.note).toMatch(/brûlure/i);
    expect(erable(2).status).toBe("warn"); // lumière insuffisante pour l'instant
  });
});

describe("fertilité (indice relatif)", () => {
  it("place une lecture modérée dans la bande d'un gourmand (citronnier)", () => {
    // soilEC 350 → indice ~20 ; bande gourmand 12–30.
    const f = evaluatePlant(plant("citronnier"), makeReading({ soilEC: 350 }), JULY)
      .fertilizer;
    expect(f.status).toBe("ok");
  });

  it("signale la sur-fertilisation (stress salin / brûlure)", () => {
    // Peu-gourmand (lilas, critique 30) et gourmand (citronnier, critique 48).
    expect(
      evaluatePlant(plant("lilas"), makeReading({ soilEC: 700 }), JULY).fertilizer
        .status,
    ).toBe("bad"); // indice ~40 ≥ 30
    expect(
      evaluatePlant(plant("citronnier"), makeReading({ soilEC: 1000 }), JULY)
        .fertilizer.status,
    ).toBe("bad"); // indice ~56 ≥ 48
  });

  it("tolère un indice bas en repos hivernal (ne pas fertiliser)", () => {
    const f = evaluatePlant(plant("lilas"), makeReading({ soilEC: 200 }), JANUARY)
      .fertilizer;
    expect(f.status).toBe("ok");
    expect(f.note).toMatch(/repos/i);
  });

  it("resserre le seuil de sur-fertilisation en hiver", () => {
    // Indice ~44 : élevé (warn) l'été, critique (bad) l'hiver pour un gourmand
    // (critique 48 en saison, 40 en repos).
    const summer = evaluatePlant(plant("citronnier"), makeReading({ soilEC: 780 }), JULY)
      .fertilizer;
    const winter = evaluatePlant(plant("citronnier"), makeReading({ soilEC: 780 }), JANUARY)
      .fertilizer;
    expect(summer.status).toBe("warn");
    expect(winter.status).toBe("bad");
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
