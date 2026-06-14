/**
 * Évaluation « dans la plage idéale ? » pour chaque métrique d'une plante.
 *
 * La valeur de référence (« base value ») est dynamique : elle dépend de
 * l'HEURE, de la DATE et du LIEU (Paris) via le modèle solaire (lib/solar) et
 * la saison (lib/season) :
 *  • Lumière : bande attendue calée sur le Soleil de ciel clair à l'instant T
 *    (la nuit, pas d'évaluation) ;
 *  • Humidité / fertilité : cible décalée entre saison de croissance et repos ;
 *  • Température : bande = optimum physiologique de l'espèce (fixe), avec alerte
 *    gel pour les plantes gélives.
 */
import type { PlantProfile, FeederCategory } from "@/data/plants";
import type { SensorReading } from "@/lib/flowerPower";
import { fertilityIndex } from "@/lib/flowerPower";
import { PARIS, type GeoLocation } from "@/lib/location";
import { isFrostRisk, isGrowingSeason } from "@/lib/season";
import {
  clearSkyPPFD,
  DLI_PROXY,
  potentialDLI,
  solarElevation,
} from "@/lib/solar";

export type MetricKey =
  | "soilMoisture"
  | "airTemperature"
  | "light"
  | "fertilizer";

export type MetricStatus = "ok" | "warn" | "bad" | "na";

export type MetricEvaluation = {
  status: MetricStatus;
  /** Valeur affichée (mêmes unités que l'axe), ou null si non mesurée. */
  value: number | null;
  unit: string;
  axisMin: number;
  axisMax: number;
  idealMin: number;
  idealMax: number;
  /** Texte court de contexte (nuit, repos hivernal, etc.). */
  note?: string;
};

/**
 * Classe de fertilisation → bande sur l'indice relatif 0–100 (cf. fertilityIndex,
 * où ~10 ≈ 1 mS/cm via l'indice 1771≈10 mS/cm). Cibles calées sur l'EC idéale des
 * plantes en pot (0,5–2 mS/cm, pour-through NC State) ; `critical` = stress salin
 * / brûlure (~3–4,8 mS/cm, plus tôt pour les peu gourmandes). Approximatif.
 */
const FEEDER_INDEX: Record<
  FeederCategory,
  { min: number; max: number; critical: number }
> = {
  light: { min: 5, max: 20, critical: 30 },
  moderate: { min: 8, max: 25, critical: 38 },
  heavy: { min: 12, max: 30, critical: 48 },
};

// Repos hivernal : on resserre les seuils d'excès (eau et engrais) — racines au
// repos + froid = pourriture / sels accumulés — et on abaisse la cible d'humidité.
const WINTER_BAND_DROP = 8; // % VWC : cible d'humidité plus sèche l'hiver
const WINTER_WET_TIGHTEN = 6; // % VWC : alerte « trop humide » déclenchée plus tôt
const WINTER_FERT_TIGHTEN = 8; // points d'indice : sur-fertilisation alertée plus tôt

/** Note de repos hivernal hors saison de croissance, sinon aucune. */
function seasonNote(growing: boolean, message: string): string | undefined {
  return growing ? undefined : message;
}

/** En repos hivernal, abaisse un seuil critique d'un offset (sinon inchangé). */
function winterTighten(critical: number, growing: boolean, offset: number): number {
  return growing ? critical : critical - offset;
}

function evaluateMoisture(plant: PlantProfile, value: number | null, now: Date): MetricEvaluation {
  const growing = isGrowingSeason(now);
  // Grand pot : séchage lent → on tolère ~3 % plus bas sur la borne basse.
  let idealMin = Math.max(0, plant.vwc.min - 3);
  let idealMax = plant.vwc.max;
  // Seuil de SUR-ARROSAGE : atteignable sous 60 % VWC (≈ capacité au champ du
  // terreau) et resserré l'hiver. C'est le danger n°1 (pourriture racinaire).
  const critical = winterTighten(plant.vwcCritical, growing, WINTER_WET_TIGHTEN);
  if (!growing) {
    idealMin = Math.max(0, idealMin - WINTER_BAND_DROP);
    idealMax = Math.max(idealMin + 5, idealMax - WINTER_BAND_DROP);
  }

  const base = { value, unit: "% VWC", axisMin: 0, axisMax: 60, idealMin, idealMax };
  if (value == null) return { ...base, status: "na" };

  if (value >= critical) {
    return { ...base, status: "bad", note: "Trop humide — risque de pourriture" };
  }
  if (value > idealMax) {
    return { ...base, status: "warn", note: "Un peu trop humide — laisser sécher" };
  }
  if (value < idealMin) {
    // Le capteur surestime en sol sec : une lecture basse est déjà prudente. En
    // repos hivernal, un sol plus sec est normal → on n'alerte pas.
    return {
      ...base,
      status: growing ? "warn" : "ok",
      note: growing ? "Trop sec — arroser" : "Repos hivernal — laisser sécher",
    };
  }
  return { ...base, status: "ok", note: seasonNote(growing, "Repos hivernal — laisser sécher") };
}

function evaluateAirTemp(plant: PlantProfile, value: number | null): MetricEvaluation {
  const idealMin = plant.optimalC.min;
  const idealMax = plant.optimalC.max;
  const axisMin = Math.min(plant.minTempC - 2, 0);
  const axisMax = Math.max(plant.heatLimitC + 2, idealMax + 5);
  const base = { value, unit: "°C", axisMin, axisMax, idealMin, idealMax };
  if (value == null) return { ...base, status: "na" };

  let status: MetricStatus = "ok";
  if (value <= plant.minTempC || value >= plant.heatLimitC) status = "bad";
  else if (value < idealMin || value > idealMax) status = "warn";
  return { ...base, status };
}

function evaluateLight(
  plant: PlantProfile,
  value: number | null,
  now: Date,
  loc: GeoLocation,
): MetricEvaluation {
  const unit = "mol/m²/j";
  const elevation = solarElevation(loc, now);
  const fullSunProxy = clearSkyPPFD(elevation) * DLI_PROXY;

  // Nuit / crépuscule : la lumière disponible est nulle → pas d'évaluation.
  if (elevation <= 3 || fullSunProxy < 0.05) {
    return {
      status: "na",
      value,
      unit,
      axisMin: 0,
      axisMax: Math.max(0.5, value ?? 0.5),
      idealMin: 0,
      idealMax: 0,
      note: "Nuit — éclairage non évalué",
    };
  }

  // La bande DLI quotidienne de la plante, ramenée à la fraction de lumière
  // disponible MAINTENANT sous ciel clair : exprimée dans l'unité « DLI-proxy »
  // de la mesure live, donc directement comparable à `reading.sunlight`.
  const potential = potentialDLI(loc, now);
  const idealMin = (fullSunProxy * plant.dli.min) / potential;
  const idealMax = (fullSunProxy * plant.dli.max) / potential;
  const axisMin = 0;
  const axisMax = Math.max(fullSunProxy, idealMax, value ?? 0) * 1.05;
  const base = { value, unit, axisMin, axisMax, idealMin, idealMax };
  if (value == null) return { ...base, status: "na" };

  let status: MetricStatus = "ok";
  let note: string | undefined;
  if (value > idealMax * 1.5) {
    status = "bad"; // soleil trop fort (ex. érable du Japon) → brûlure
    note = "Lumière trop forte — risque de brûlure";
  } else if (value < idealMin) {
    status = "warn";
    note = "Lumière insuffisante pour l'instant";
  } else if (value > idealMax) {
    status = "warn";
  }
  return { ...base, status, note };
}

function evaluateFertilizer(
  plant: PlantProfile,
  rawEC: number | null,
  now: Date,
): MetricEvaluation {
  const { min: idealMin, max: idealMax, critical } = FEEDER_INDEX[plant.feeder];
  const growing = isGrowingSeason(now);
  const base = { unit: "", axisMin: 0, axisMax: 100, idealMin, idealMax };
  if (rawEC == null) return { ...base, value: null, status: "na" };

  const value = fertilityIndex(rawEC); // indice relatif 0–100 (~10 ≈ 1 mS/cm)
  // Sur-fertilisation = stress salin / brûlure ; danger accru l'hiver (sels
  // accumulés sans absorption) → seuil critique resserré.
  const criticalNow = winterTighten(critical, growing, WINTER_FERT_TIGHTEN);
  if (value >= criticalNow) {
    return { ...base, value, status: "bad", note: "Trop fertilisé — risque de brûlure" };
  }
  if (value > idealMax) {
    return {
      ...base,
      value,
      status: "warn",
      note: growing ? "Fertilité élevée" : "Repos — ne pas fertiliser",
    };
  }
  if (growing && value < idealMin) {
    return { ...base, value, status: "warn", note: "Fertilité faible — nourrir en saison" };
  }
  return { ...base, value, status: "ok", note: seasonNote(growing, "Repos — ne pas fertiliser") };
}

/** Évalue les 4 métriques suivies pour la plante et la lecture courante. */
export function evaluatePlant(
  plant: PlantProfile,
  reading: SensorReading | null,
  now: Date = new Date(),
  loc: GeoLocation = PARIS,
): Record<MetricKey, MetricEvaluation> {
  return {
    soilMoisture: evaluateMoisture(plant, reading?.soilMoisture ?? null, now),
    airTemperature: evaluateAirTemp(plant, reading?.airTemperature ?? null),
    light: evaluateLight(plant, reading?.sunlight ?? null, now, loc),
    fertilizer: evaluateFertilizer(plant, reading?.soilEC ?? null, now),
  };
}

/**
 * Message d'alerte gel pour les plantes gélives (citronnier, olivier en pot) :
 * en saison froide à Paris, ou si la température mesurée frôle leur minimum.
 */
export function frostAdvisory(
  plant: PlantProfile,
  airTemp: number | null,
  now: Date,
): string | null {
  if (!plant.frostTender) return null;
  const cold = airTemp != null && airTemp <= plant.minTempC + 3;
  if (isFrostRisk(now) || cold) {
    return `Risque de gel — rentrer ou protéger le ${plant.nameFr.toLowerCase()}.`;
  }
  return null;
}
