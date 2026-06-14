/**
 * Position géographique utilisée pour le modèle solaire et saisonnier.
 *
 * Le capteur n'expose pas de GPS : on fixe le lieu (Paris) en dur. Les plantes
 * sont sur une terrasse extérieure, donc le Soleil de plein ciel s'applique.
 */
export type GeoLocation = {
  name: string;
  /** Latitude en degrés décimaux (Nord positif). */
  lat: number;
  /** Longitude en degrés décimaux (Est positif). */
  lon: number;
};

/** Paris — Météo-France station Paris-Montsouris. */
export const PARIS: GeoLocation = {
  name: "Paris",
  lat: 48.8566,
  lon: 2.3522,
};
