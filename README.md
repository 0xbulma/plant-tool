# 🌱 Flower Power — lecteur de capteur

App web pour lire en direct les données d'un capteur de plantes **Parrot Flower
Power** (modèle 5119A « Hawaii ») via **Web Bluetooth**, sans compte ni service
cloud Parrot (l'app officielle ayant disparu).

## Stack

- **React 19** + **Vite 8** (TypeScript)
- **Tailwind CSS v4** (plugin `@tailwindcss/vite`)
- **shadcn/ui** (Button, Card, Badge) + **lucide-react**
- **Vitest 4** + Testing Library (jsdom)

## Mesures affichées

- 💧 Humidité du sol (% VWC)
- 🌡️ Température du sol (°C)
- 🌤️ Température de l'air (°C)
- ☀️ Luminosité (mol/m²/j, approximative)
- 🧪 Fertilité (indice relatif /100, dérivé de l'EC brute)
- 🔋 Niveau de batterie

Un **sélecteur de plante** (citronnier, lilas, olivier, magnolia, érable du
Japon) ajoute pour chaque mesure un **curseur** indiquant si la valeur est dans
la plage idéale. Les cibles sont calculées selon l'heure, la date et le lieu
(Paris) : modèle solaire pour la lumière, saison pour l'arrosage et la
fertilisation, alerte gel pour les plantes gélives.

## Démarrage

```bash
npm install
npm run dev      # serveur de dev (https local non requis : localhost = contexte sécurisé)
npm run build    # typecheck (tsc -b) + build de production
npm run test     # Vitest (run unique)
npm run test:watch
```

Ouvre l'URL affichée dans **Chrome / Edge**, clique sur **Connecter le capteur**
et sélectionne le « Flower power ».

## Compatibilité navigateurs

Web Bluetooth nécessite un **contexte sécurisé** (HTTPS ou `localhost`) :

| Plateforme            | Support                                              |
|-----------------------|------------------------------------------------------|
| Chrome / Edge desktop | ✅ (Windows, macOS, Linux)                            |
| Chrome Android        | ✅                                                    |
| Safari / Chrome iOS   | ❌ non supporté — utiliser l'app **Bluefy** (App Store) |

## Déploiement

`npm run build` produit un dossier `dist/` 100 % statique, déployable sur
Vercel, GitHub Pages, Netlify… (HTTPS automatique, donc Web Bluetooth marche).

## Structure

```
src/
  lib/flowerPower.ts            UUID GATT, conversions, connexion BLE, indice de fertilité
  lib/solar.ts                  modèle solaire NOAA (élévation, PPFD/DLI ciel clair)
  lib/season.ts                 saison de croissance / fenêtre de gel (Paris)
  lib/plantRanges.ts            évaluation « dans la plage idéale ? » par métrique
  lib/location.ts               coordonnées de Paris
  data/plants.ts                profils des plantes (plages idéales, sources citées)
  hooks/useFlowerPower.ts       état React + polling des mesures (3 s)
  components/ui/                primitives shadcn (button, card, badge)
  components/SensorCard.tsx     carte de mesure
  components/PlantSelector.tsx  sélecteur de plante
  components/MetricRange.tsx    jauge de plage idéale (curseur)
  App.tsx                       tableau de bord
  test/                         tests Vitest (conversions + rendu)
```

## Modèle de soin des plantes

Les plages idéales par plante, leur justification (botanique + science du
substrat + spécificités du capteur Parrot) et la procédure pour **ajouter une
plante** sont documentées dans
[`docs/plant-care/`](docs/plant-care/README.md) — un guide général
(implémenteur) + un fichier par plante.

## Détails techniques

UUID GATT et formules de conversion repris de la librairie de référence
[`node-flower-power`](https://github.com/sandeepmistry/node-flower-power) (le
portail développeur officiel de Parrot a été décommissionné ; voir au besoin une
[archive de la spec BLE](https://web.archive.org/web/2018/https://developer.parrot.com/docs/FlowerPower/FlowerPower-BLE.pdf)).
Les valeurs **brutes** sont affichées sous chaque mesure pour permettre de
recalibrer les formules si besoin (notamment luminosité et EC, marquées
approximatives dans la lib d'origine).
