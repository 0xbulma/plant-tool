/**
 * Position solaire et lumière de ciel clair — modèle NOAA.
 *
 * Équations reprises du NOAA Solar Calculator (NOAA Global Monitoring Lab,
 * https://gml.noaa.gov/grad/solcalc/ et /azel.html) : série de Spencer (1971)
 * pour la déclinaison et l'équation du temps, puis angle horaire et élévation
 * solaire. Tout est calculé en TEMPS UTC (lu directement sur l'objet Date) : la
 * position du Soleil ne dépend que de l'instant absolu et de la position
 * géographique, donc le fuseau du navigateur n'intervient jamais.
 *
 * L'estimation PAR/PPFD de ciel clair est volontairement simple (transmittance
 * globale 0.75, fraction PAR 0.48, 2.02 µmol/J). Elle donne un MAJORANT de la
 * lumière disponible par beau temps — il n'y a pas de flux météo en direct.
 * Réfs : fraction PAR ~0.45–0.50 du rayonnement global
 *   https://www.sciencedirect.com/science/article/abs/pii/S0168192308002104 ;
 * conversion énergie→photons ~2.0 µmol/J pour le solaire
 *   https://www.apogeeinstruments.com/conversion-instantaneous-ppfd-to-integrated-ppfd/
 */
import { clamp } from "@/lib/flowerPower";
import type { GeoLocation } from "@/lib/location";

const DEG = Math.PI / 180;

/** µmol/m²/s soutenu 24 h → mol/m²/jour (= 86400 s / 1e6). Même facteur que
 *  `convertSunlight`, qui exprime la mesure live dans cette unité « DLI-proxy ». */
export const DLI_PROXY = 0.0864;

function dayOfYearUTC(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - startOfYear) / 86_400_000);
}

/** Angle fractionnaire de l'année γ (radians), méthode NOAA. */
function fractionalYear(date: Date): number {
  const doy = dayOfYearUTC(date);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  return ((2 * Math.PI) / 365) * (doy - 1 + (hour - 12) / 24);
}

/** Déclinaison solaire (radians) — série de Spencer (1971). */
export function solarDeclination(date: Date): number {
  const g = fractionalYear(date);
  return (
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g)
  );
}

/** Équation du temps (minutes) — série de Spencer (1971). */
export function equationOfTime(date: Date): number {
  const g = fractionalYear(date);
  return (
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g))
  );
}

/** Élévation solaire (degrés au-dessus de l'horizon) à l'instant donné. */
export function solarElevation(loc: GeoLocation, date: Date): number {
  const decl = solarDeclination(date);
  const eqTime = equationOfTime(date);
  const utcMinutes =
    date.getUTCHours() * 60 +
    date.getUTCMinutes() +
    date.getUTCSeconds() / 60;
  // Temps solaire vrai (minutes) ; fuseau = 0 car on raisonne en UTC.
  const trueSolarTime = utcMinutes + eqTime + 4 * loc.lon;
  const hourAngle = (trueSolarTime / 4 - 180) * DEG; // 0 au midi solaire
  const lat = loc.lat * DEG;
  const cosZenith =
    Math.sin(lat) * Math.sin(decl) +
    Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
  const zenith = Math.acos(clamp(cosZenith, -1, 1));
  return 90 - zenith / DEG;
}

/** Élévation solaire au midi solaire (angle horaire = 0), en degrés. */
export function solarNoonElevation(loc: GeoLocation, date: Date): number {
  const declDeg = solarDeclination(date) / DEG;
  return 90 - Math.abs(loc.lat - declDeg);
}

/** Durée du jour (heures), géométrique (centre du Soleil à l'horizon). */
export function dayLengthHours(loc: GeoLocation, date: Date): number {
  const decl = solarDeclination(date);
  const lat = loc.lat * DEG;
  const cosHourAngle = clamp(-Math.tan(lat) * Math.tan(decl), -1, 1);
  return (2 * (Math.acos(cosHourAngle) / DEG)) / 15;
}

const SOLAR_CONSTANT = 1361; // W/m² — constante solaire
const CLEAR_SKY_TRANSMITTANCE = 0.75; // atténuation atmosphérique par beau temps
const PAR_FRACTION = 0.48; // part du rayonnement global dans le PAR (400–700 nm)
const UMOL_PER_JOULE = 2.02; // énergie → photons, lumière solaire

/** PPFD de ciel clair (µmol/m²/s) pour une élévation solaire donnée (degrés). */
export function clearSkyPPFD(elevationDeg: number): number {
  if (elevationDeg <= 0) return 0;
  const exo = SOLAR_CONSTANT * Math.sin(elevationDeg * DEG); // hors-atmosphère, horizontal
  const ghi = exo * CLEAR_SKY_TRANSMITTANCE; // global au sol (beau temps)
  return ghi * PAR_FRACTION * UMOL_PER_JOULE; // → PPFD
}

// Cache borné : un lieu fixe (Paris) ne produit qu'une poignée de clés/jour ;
// on évince la plus ancienne au-delà de quelques jours pour éviter une
// croissance illimitée sur une session longue.
const DLI_CACHE_MAX = 8;
const dliCache = new Map<string, number>();

/**
 * DLI potentiel de ciel clair (mol/m²/jour) pour la date/lieu donnés : intègre
 * le PPFD de ciel clair toutes les 10 min sur 24 h. Majorant « plein soleil ».
 */
export function potentialDLI(loc: GeoLocation, date: Date): number {
  const key = `${loc.lat},${loc.lon},${dayOfYearUTC(date)}`;
  const cached = dliCache.get(key);
  if (cached != null) return cached;

  const stepMin = 10;
  const dayStartUTC = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  let molPerM2 = 0;
  for (let minute = 0; minute < 24 * 60; minute += stepMin) {
    const t = new Date(dayStartUTC + minute * 60_000);
    const ppfd = clearSkyPPFD(solarElevation(loc, t)); // µmol/m²/s
    molPerM2 += (ppfd * stepMin * 60) / 1_000_000; // mol/m² sur l'intervalle
  }

  if (dliCache.size >= DLI_CACHE_MAX) {
    const oldest = dliCache.keys().next().value;
    if (oldest !== undefined) dliCache.delete(oldest);
  }
  dliCache.set(key, molPerM2);
  return molPerM2;
}
