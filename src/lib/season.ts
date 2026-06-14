/**
 * Saison de croissance et fenêtre de risque de gel à Paris.
 *
 * Normales Météo-France 1991–2020, Paris-Montsouris :
 * https://donneespubliques.meteofrance.fr/FichesClim/FICHECLIM_75114001.pdf
 * Dernières gelées ~ début mai, premières ~ mi-octobre ; saison de croissance
 * active ~ avril→septembre. La fenêtre de gel est élargie (oct.→avr.) car les
 * plantes gélives en pot (racines peu isolées) doivent être protégées tôt.
 */

/** Vrai pendant la saison de croissance active (avril → septembre). */
export function isGrowingSeason(date: Date): boolean {
  const month = date.getMonth(); // 0 = janvier
  return month >= 3 && month <= 8;
}

/** Vrai pendant la fenêtre où le gel est possible à Paris (octobre → avril). */
export function isFrostRisk(date: Date): boolean {
  const month = date.getMonth();
  return month >= 9 || month <= 3;
}
