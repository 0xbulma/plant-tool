/**
 * Profils des plantes suivies — terrasse parisienne, grands pots.
 *
 * Provenance des valeurs (laissée en commentaire, non affichée dans l'UI) :
 *
 *  • Catégorie d'exposition (plein soleil / mi-ombre) : RHS et Missouri
 *    Botanical Garden Plant Finder (directement publiée).
 *  • Bande DLI (mol/m²/jour) : MAPPING catégorie → bande, d'après la littérature
 *    serre Purdue/Michigan State (faible <10, moyen 10–20, fort 20–30+).
 *    Ce n'est PAS un DLI publié par espèce. Réf : Purdue Extension HO-238.
 *  • Rusticité / températures : zones USDA + tolérances au froid publiées
 *    (RHS, Missouri Bot. Garden, fiches espèces).
 *  • Bande d'humidité (% VWC) : MAPPING d'une préférence d'arrosage qualitative
 *    (RHS / Missouri Bot. Garden) vers une bande VWC, calée sur les repères de
 *    culture en conteneur (~40–60 % à saturation, ~25 % point de flétrissement).
 *    Les seuils VWC par espèce ne sont pas publiés horticolement.
 *  • Classe de fertilisation (léger / modéré / gourmand) : RHS / extensions.
 *    L'EC en mS/cm est indicatif (cf. fertilityIndex, capteur non calibré).
 *
 * Sources principales :
 *  Citrus   https://www.rhs.org.uk/plants/citrus/growing-guide
 *  Lilas    https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=282932
 *  Olivier  https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=283004
 *  Magnolia https://www.rhs.org.uk/plants/magnolia/growing-guide
 *  Érable   https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b974
 */

export type FeederCategory = "light" | "moderate" | "heavy";

export type PlantProfile = {
  id: string;
  nameFr: string;
  nameLatin: string;
  emoji: string;
  /** Bande DLI cible, mol/m²/jour (catégorie d'exposition → bande). */
  dli: { min: number; max: number };
  /** Tolérance minimale au froid, °C (rusticité). */
  minTempC: number;
  /** Limite haute de stress thermique, °C. */
  heatLimitC: number;
  /** Plage de température optimale de croissance, °C. */
  optimalC: { min: number; max: number };
  /** Vrai si gélive en pot à Paris → à rentrer / protéger l'hiver. */
  frostTender: boolean;
  /** Bande d'humidité du sol cible, % VWC. */
  vwc: { min: number; max: number };
  /** Classe de fertilisation (gourmandise en engrais). */
  feeder: FeederCategory;
  /** EC indicatif en mS/cm (documentaire — non affiché tel quel). */
  ecMScm: { min: number; max: number };
  /** Conseil court (FR). */
  note: string;
};

export const PLANTS: PlantProfile[] = [
  {
    id: "citronnier",
    nameFr: "Citronnier",
    nameLatin: "Citrus × limon",
    emoji: "🍋",
    // Plein soleil (avec ombrage l'après-midi très chaud) → DLI fort.
    dli: { min: 20, max: 30 },
    minTempC: -3, // dégâts sous ~-3 °C ; à rentrer dès <5 °C — non rustique à Paris
    heatLimitC: 38,
    optimalC: { min: 21, max: 30 },
    frostTender: true,
    // « Garder humide sans détremper, laisser sécher la surface » → modéré.
    vwc: { min: 35, max: 52 },
    feeder: "heavy", // agrume gourmand : nourrir toutes les 4–6 sem. en saison
    ecMScm: { min: 1.5, max: 2.5 },
    note: "Non rustique : rentrer avant les gelées (hiverner >5 °C). Gourmand en engrais en saison.",
  },
  {
    id: "lilas",
    nameFr: "Lilas",
    nameLatin: "Syringa vulgaris",
    emoji: "💜",
    dli: { min: 18, max: 28 }, // plein soleil pour bien fleurir
    minTempC: -34, // très rustique (zone 3)
    heatLimitC: 32,
    optimalC: { min: 15, max: 25 },
    frostTender: false,
    // « Légèrement humide mais jamais détrempé ; n'aime pas les pieds mouillés. »
    vwc: { min: 30, max: 48 },
    feeder: "light", // peu gourmand : trop d'azote = feuilles, peu de fleurs
    ecMScm: { min: 1.0, max: 1.5 },
    note: "Rustique. Craint l'excès d'eau et d'engrais (sinon peu de fleurs).",
  },
  {
    id: "olivier",
    nameFr: "Olivier",
    nameLatin: "Olea europaea",
    emoji: "🫒",
    dli: { min: 22, max: 32 }, // plein soleil méditerranéen
    minTempC: -9, // cultivars rustiques ~-9/-10 °C ; en pot, protéger sous ~-5 °C
    heatLimitC: 40,
    optimalC: { min: 20, max: 30 },
    frostTender: true, // en pot à Paris : limite de rusticité, protéger l'hiver
    // « Tolérant à la sécheresse, laisser bien sécher entre deux arrosages. »
    vwc: { min: 20, max: 40 },
    feeder: "light",
    ecMScm: { min: 1.0, max: 1.8 },
    note: "Méditerranéen : laisser sécher entre arrosages. Protéger le pot sous -5 °C.",
  },
  {
    id: "magnolia",
    nameFr: "Magnolia",
    nameLatin: "Magnolia × soulangeana",
    emoji: "🌸",
    dli: { min: 12, max: 22 }, // soleil à mi-ombre
    minTempC: -20, // rustique (zone 5)
    heatLimitC: 32,
    optimalC: { min: 15, max: 25 },
    frostTender: false,
    // « Garder régulièrement humide mais drainé, ni sec ni détrempé. »
    vwc: { min: 38, max: 55 },
    feeder: "moderate",
    ecMScm: { min: 1.2, max: 2.0 },
    note: "Rustique. Sol frais et régulier ; éviter le plein sud (débourrement trop précoce).",
  },
  {
    id: "erable-japon",
    nameFr: "Érable du Japon",
    nameLatin: "Acer palmatum",
    emoji: "🍁",
    dli: { min: 8, max: 15 }, // mi-ombre / ombre tamisée (soleil brûlant = feuilles grillées)
    minTempC: -18, // rustique (zone 5/6)
    heatLimitC: 30, // brûlure du feuillage en plein soleil chaud
    optimalC: { min: 15, max: 22 },
    frostTender: false,
    // « Humidité régulière mais jamais détrempé ; racines superficielles. »
    vwc: { min: 38, max: 55 },
    feeder: "light",
    ecMScm: { min: 1.0, max: 1.5 },
    note: "Mi-ombre : éviter le soleil de l'après-midi (brûlure). Sol frais, jamais détrempé.",
  },
];

export function getPlant(id: string): PlantProfile | undefined {
  return PLANTS.find((p) => p.id === id);
}
