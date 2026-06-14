/**
 * Profils des plantes suivies — terrasse parisienne, grands pots.
 *
 * Provenance des valeurs (commentaires, non affichés dans l'UI) :
 *
 *  • Exposition (plein soleil / mi-ombre) : RHS, Missouri Botanical Garden.
 *  • Bande DLI (mol/m²/jour) : MAPPING catégorie → bande (Purdue/MSU : faible <10,
 *    moyen 10–20, fort 20–30+). Pas un DLI publié par espèce.
 *  • Rusticité / températures : zones USDA + tolérances publiées (RHS, MBG).
 *
 *  • HUMIDITÉ DU SOL (% VWC) — le point le plus sensible (le sur-arrosage tue) :
 *    Le capteur Parrot mesure le VWC sur une échelle native 0–60 % (±3 %, cf.
 *    Xaver et al. 2020, Geosci. Instrum. 9:117). Sur un terreau tourbeux, cette
 *    échelle couvre quasi exactement le réel : ~60 % ≈ capacité au champ (sol
 *    saturé, porosité à l'air < 10 % → asphyxie/pourriture racinaire) et ~25 % ≈
 *    point de flétrissement (UC ANR / Nursery Mgmt). Le capteur SURESTIME en sol
 *    sec : l'extrémité humide (le danger) est donc la plus fiable.
 *    `vwc` = bande idéale (saison de croissance). `vwcCritical` = seuil de
 *    sur-arrosage (« détrempé/pourriture »), TOUJOURS atteignable sous 60 %.
 *    Classement de sensibilité au sur-arrosage (RHS/MBG, du + au − sensible) :
 *    olivier > citronnier > lilas > érable du Japon > magnolia — d'où des seuils
 *    `vwcCritical` croissants dans cet ordre.
 *
 *  • FERTILITÉ : le capteur n'expose qu'une EC brute NON calibrée (aucune
 *    conversion raw→mS/cm fiable ; cf. fertilityIndex). `feeder` règle la bande ;
 *    `ecMScm` est purement documentaire.
 *
 * Sources principales :
 *  Capteur  https://gi.copernicus.org/articles/9/117/2020/
 *  Substrat https://www.nurserymag.com/article/moisture-retention-curve/
 *  Citrus   https://www.rhs.org.uk/fruit/citrus/grow-your-own
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
  /** Bande d'humidité du sol idéale (saison de croissance), % VWC. */
  vwc: { min: number; max: number };
  /** Seuil de sur-arrosage / détrempé (% VWC) — pourriture racinaire. < 60. */
  vwcCritical: number;
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
    dli: { min: 20, max: 30 }, // plein soleil (ombrage l'après-midi très chaud)
    minTempC: -3, // dégâts sous ~-3 °C ; rentrer dès <5 °C — non rustique à Paris
    heatLimitC: 38,
    optimalC: { min: 21, max: 30 },
    frostTender: true,
    // RHS : « garder juste humide, laisser sécher la surface l'hiver, ne jamais
    // laisser le pot dans l'eau (pourriture) ». Sensible au sur-arrosage.
    vwc: { min: 25, max: 42 },
    vwcCritical: 50,
    feeder: "heavy", // agrume gourmand : nourrir toutes les 4–6 sem. en saison
    ecMScm: { min: 1.5, max: 2.5 },
    note: "Non rustique : rentrer avant les gelées (>5 °C). Sur-arrosage hivernal = pourriture.",
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
    // MBG : « humidité moyenne, bien drainé, éviter les sols détrempés ».
    vwc: { min: 28, max: 45 },
    vwcCritical: 52,
    feeder: "light", // peu gourmand : trop d'azote = feuilles, peu de fleurs
    ecMScm: { min: 1.0, max: 1.5 },
    note: "Rustique. Craint l'excès d'eau et d'azote (sinon peu de fleurs).",
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
    frostTender: true,
    // Le PLUS sensible au sur-arrosage : « n'aime pas les pieds mouillés »,
    // laisser bien sécher, pas d'arrosage l'hiver (RHS/MBG). Bande la plus basse.
    vwc: { min: 15, max: 35 },
    vwcCritical: 46,
    feeder: "light",
    ecMScm: { min: 1.0, max: 1.8 },
    note: "Méditerranéen : laisser bien sécher. Sur-arrosage = cause n°1 de dépérissement.",
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
    // MBG : « humidité régulière, bien drainé, intolérant aux extrêmes (sec OU
    // détrempé) ». Le moins sensible au sur-arrosage, mais jamais détrempé.
    vwc: { min: 35, max: 52 },
    vwcCritical: 57,
    feeder: "moderate",
    ecMScm: { min: 1.2, max: 2.0 },
    note: "Rustique. Sol frais et régulier ; ni sec ni détrempé.",
  },
  {
    id: "erable-japon",
    nameFr: "Érable du Japon",
    nameLatin: "Acer palmatum",
    emoji: "🍁",
    dli: { min: 8, max: 15 }, // mi-ombre / ombre tamisée (soleil chaud = brûlure)
    minTempC: -18, // rustique (zone 5/6)
    heatLimitC: 30,
    optimalC: { min: 15, max: 22 },
    frostTender: false,
    // RHS/MBG : « humide mais bien drainé, jamais détrempé » ; risque premier =
    // dessèchement/brûlure plutôt que pourriture. Humidité régulière.
    vwc: { min: 33, max: 50 },
    vwcCritical: 56,
    feeder: "light",
    ecMScm: { min: 1.0, max: 1.5 },
    note: "Mi-ombre : éviter le soleil de l'après-midi (brûlure). Sol frais, jamais détrempé.",
  },
];

export function getPlant(id: string): PlantProfile | undefined {
  return PLANTS.find((p) => p.id === id);
}
