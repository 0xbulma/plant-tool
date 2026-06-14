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
- 🧪 Fertilité / EC (valeur brute)
- 🔋 Niveau de batterie

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
  lib/flowerPower.ts        UUID GATT, formules de conversion, connexion BLE
  hooks/useFlowerPower.ts   état React + polling des mesures (3 s)
  components/ui/            primitives shadcn (button, card, badge)
  components/SensorCard.tsx carte de mesure
  App.tsx                   tableau de bord
  test/                     tests Vitest (conversions + rendu)
```

## Détails techniques

UUID GATT et formules de conversion repris de la librairie de référence
[`node-flower-power`](https://github.com/sandeepmistry/node-flower-power) (le
portail développeur officiel de Parrot a été décommissionné ; voir au besoin une
[archive de la spec BLE](https://web.archive.org/web/2018/https://developer.parrot.com/docs/FlowerPower/FlowerPower-BLE.pdf)).
Les valeurs **brutes** sont affichées sous chaque mesure pour permettre de
recalibrer les formules si besoin (notamment luminosité et EC, marquées
approximatives dans la lib d'origine).
