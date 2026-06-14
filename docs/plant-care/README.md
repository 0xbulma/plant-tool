# Plant-care model — implementer's guide

This document explains **how the app decides whether a sensor reading is "in
range" for a plant**, the **science and Parrot-sensor specifics** behind every
threshold, and **how to add a new plant**. It pairs with one file per plant:

- [🍋 Citronnier](./plants/citronnier.md) — lemon (frost-tender, heavy feeder)
- [💜 Lilas](./plants/lilas.md) — lilac (hardy; over-*feeding* is the risk)
- [🫒 Olivier](./plants/olivier.md) — olive (most over-watering-sensitive)
- [🌸 Magnolia](./plants/magnolia.md) — saucer magnolia (wants consistent moisture)
- [🍁 Érable du Japon](./plants/erable-japon.md) — Japanese maple (part shade, scorch-prone)

> **Honesty first.** Some values are *published* (temperature/hardiness, sun
> exposure, the sensor's spec, container-substrate water physics). Others are a
> *reasoned mapping* because per-species numbers are **not published**
> horticulturally (soil-moisture % bands, the DLI category→band mapping, and the
> fertility/EC bands — the sensor's EC is uncalibrated). Each plant file and each
> code comment flags which is which. **Over-watering is treated as the critical
> failure mode** and its detection is deliberately conservative.

---

## 1. The sensor — Parrot Flower Power (model 5119A)

Read over Web Bluetooth in [`src/lib/flowerPower.ts`](../../src/lib/flowerPower.ts).
Conversions/UUIDs come from the reference library
[`node-flower-power`](https://github.com/sandeepmistry/node-flower-power) and the
archived Parrot BLE spec.

| Metric | Char. UUID (`39e1fa0x…`) | Unit in app | Notes |
|---|---|---|---|
| Soil moisture | `…fa05` | **% VWC (0–60)** | Native sensor range, **±3 %**. See §1.1. |
| Soil temperature | `…fa03` | °C | Cubic poly, clamped −10…55. |
| Air temperature | `…fa04` | °C | Same conversion. |
| Sunlight | `…fa01` | **mol/m²/j (DLI-proxy)** | Instantaneous light expressed as a 24 h DLI (`×0.0864`). Approximate. See §4. |
| Soil EC ("fertilité") | `…fa02` | **relative index 0–100** | Raw uint16, **uncalibrated**. See §1.2. |
| Battery | `0x2a19` | % | — |

### 1.1 What the 0–60 % VWC scale means (critical for over-watering)

The Parrot soil-humidity channel is **native 0–60 % VWC, ±3 %** (Xaver/Esposito
et al. 2020, *Geosci. Instrum. Method. Data Syst.* 9:117,
<https://gi.copernicus.org/articles/9/117/2020/>). On a **peat-based potting
mix** this scale maps almost exactly onto reality:

- **~60 % VWC ≈ container capacity** — the mix is saturated, air-filled porosity
  (AFP) drops below the ~10 % minimum, roots suffocate → **root-rot zone**.
- **~25 % VWC ≈ permanent wilting point** ("too dry").
- Plant-available water ≈ 35 % of volume; re-water around the low-40s %.
  (UC ANR / *Nursery Management*,
  <https://www.nurserymag.com/article/moisture-retention-curve/>; AFP ≥10 % rule,
  <https://ucanr.edu/blogs/blogcore/postdetail.cfm?postnum=29450>.)

Two consequences the app relies on:

1. **Over-watering is detectable *below* 60 %.** Waterlogging risk rises as VWC
   climbs into the ~50–60 % band, so every plant's `vwcCritical` is set **below
   60** and warns *before* true saturation. (A previous version used
   `idealMax + 8`, which exceeded 60 for moisture-loving plants and so **never
   fired** — see the git history; this is why `vwcCritical` is now explicit.)
2. **The dry end is the unreliable end.** The sensor *over-reads in dry soil*
   (calibrated against mineral silty-clay-loam, not peat), and is accurate when
   wet. So a "too wet" reading is trustworthy; a "too dry" reading is only ever a
   **warning**, never "critical".

> **Calibrated channels (primary) + gain fallback.** A GATT probe of a real
> Hawaii (fw 2.0.3) found the sensor exposes its **own calibrated** soil moisture
> (`fa09`), air temperature (`fa0a`) and light/DLI (`fa0b`) as float32. `readSensors`
> **prefers those** when present (Parrot's own calibration). When they're absent,
> it falls back to the raw formulas — and for soil moisture, to a hardcoded
> sensor-wide **gain** (`SOIL_MOISTURE_CAL_RAW 356 → SOIL_MOISTURE_CAL_VWC 55`,
> from a saturated pot that read brut 356 ≈ 18 % when truly ~55 %). The EC channel
> has **no** calibrated equivalent, so fertility stays raw/relative. See the
> [calibration TIB](../tibs/TIB-2026-06-14-calibrate-watering-and-fertilizer-thresholds-against-ground-truth.md).

### 1.2 Why fertility is a *relative* index, not mS/cm

There is **no reliable raw→mS/cm conversion** for the Parrot soil-EC
characteristic. `node-flower-power` literally ships
`// TODO: convert raw (0 - 1771) to 0 to 10 (mS/cm)` and returns the raw value
unchanged; the only calibrated EC the device exposes is the firmware's float32
`calibrated Ecb` / `Ec porous` characteristics (`…fa0d` / `…fa0e`, firmware
≥ 1.1.0), which this app does not read.

So [`fertilityIndex`](../../src/lib/flowerPower.ts) normalises the raw value on
the **documented hint** `EC_RAW_FULL_SCALE = 1771 ≈ 10 mS/cm`, giving a relative
**0–100 index where ~10 ≈ 1 mS/cm**. Treat it as a **trend/relative** signal, not
a physical measurement. The raw value is shown next to it in the UI for
recalibration on real hardware. (Parrot BLE spec; node-flower-power; EC bands
from NC State pour-through & UConn SME tables — see §6.)

---

## 2. How "in range" is decided

[`src/lib/plantRanges.ts`](../../src/lib/plantRanges.ts) exports
`evaluatePlant(plant, reading, now, loc)` → one `MetricEvaluation` per gated
metric. Each evaluation has a **status**:

| Status | Meaning | UI |
|---|---|---|
| `ok` | inside the ideal band | green cursor, "✓ dans la plage" |
| `warn` | outside ideal but not dangerous | amber cursor, "! hors plage" |
| `bad` | dangerous (over-watered, frost, salt stress, scorch) | red cursor, "✕ critique" |
| `na` | not evaluable (night for light, no reading) | grey, contextual note |

Four metrics are gated: **soil moisture, air temperature, light, fertility**.
Soil temperature and battery are shown but not gated.

### 2.1 Soil moisture (the safety-critical one)

`evaluateMoisture`:

- Ideal band = `plant.vwc` (lower bound relaxed ~3 % for large pots / slow drying).
- **`value ≥ vwcCritical` → `bad`** ("Trop humide — risque de pourriture"). This
  is the over-watering guard; `vwcCritical < 60` so it is always reachable.
- `value > idealMax` → `warn` ("Un peu trop humide").
- `value < idealMin` → `warn` in growing season ("Trop sec"); **`ok` in winter
  dormancy** (drier is normal, and the dry reading is already an over-estimate).
- **Winter tightening:** in dormancy the ideal band shifts down `WINTER_BAND_DROP`
  (8 %) and `vwcCritical` drops `WINTER_WET_TIGHTEN` (6 %) — cold + wet + resting
  roots is the classic root-rot setup (Iowa State, UMN extension).

### 2.2 Air temperature

`evaluateAirTemp`: ideal band = `plant.optimalC`; `bad` below `minTempC` (hardiness)
or above `heatLimitC`; `warn` between. The **frost advisory** (`frostAdvisory`)
is separate: for `frostTender` plants it fires in the Paris frost window
(Oct–Apr) or when the live temp nears `minTempC + 3`.

### 2.3 Light

`evaluateLight` is the genuinely **time/date/location-driven** metric (§4). The
plant's daily DLI need is scaled to the clear-sky light available *right now* in
Paris and compared, in the sensor's DLI-proxy unit, to the live reading. At night
(sun ≤ 3°) it returns `na` ("Nuit — éclairage non évalué").

### 2.4 Fertility

`evaluateFertilizer`: bands from `FEEDER_INDEX[plant.feeder]` on the 0–100 index
(~10 ≈ 1 mS/cm). `value ≥ critical` → `bad` ("Trop fertilisé — risque de
brûlure"); over the band → `warn`; under the band → `warn` (feed) in season.
Winter tightens the over-fert threshold by `WINTER_FERT_TIGHTEN` (8) and never
prompts feeding (salts accumulate without uptake).

---

## 3. The metric data structure (`PlantProfile`)

Defined in [`src/data/plants.ts`](../../src/data/plants.ts):

```ts
type PlantProfile = {
  id; nameFr; nameLatin; emoji;
  dli: { min; max };          // mol/m²/j — sun category → band (NOT per-species published)
  minTempC; heatLimitC;       // °C hardiness / heat-stress limit
  optimalC: { min; max };     // °C growing optimum
  frostTender: boolean;       // needs winter protection in Paris (lemon, olive)
  vwc: { min; max };          // % VWC ideal band (growing season)
  vwcCritical: number;        // % VWC over-watering threshold (< 60, reachable)
  feeder: "light"|"moderate"|"heavy";
  ecMScm: { min; max };       // documentary only (index is what's evaluated)
  note: string;               // short FR care tip shown in UI
};
```

---

## 4. Time / date / location model

- [`src/lib/solar.ts`](../../src/lib/solar.ts) — NOAA solar position (Spencer-1971
  declination + equation of time), `solarElevation`, `dayLengthHours`,
  `clearSkyPPFD` (1361 W/m² × 0.75 transmittance × 0.48 PAR fraction × 2.02 µmol/J),
  and `potentialDLI` (integrates clear-sky PPFD over the day). Pure, no deps.
  Assumes **clear sky** → an upper bound (no live weather feed).
- [`src/lib/season.ts`](../../src/lib/season.ts) — `isGrowingSeason` (Apr–Sep) and
  `isFrostRisk` (Oct–Apr) for Paris (Météo-France normals, last frost ~early May,
  first ~mid-Oct).
- [`src/lib/location.ts`](../../src/lib/location.ts) — `PARIS = { 48.8566, 2.3522 }`.

---

## 5. Deriving thresholds (the recipe)

**Soil moisture.** Anchor to the substrate physics (container capacity ~60 %,
wilting ~25 %). Place the **ideal band** by the plant's documented watering
preference; place **`vwcCritical`** by its **over-watering sensitivity rank**
(see §6) — the more a source warns about wet feet / root rot, the lower the
critical threshold. Keep `idealMax < vwcCritical < 60`.

Current ladder (growing season):

| Plant | Over-watering sensitivity | `vwc` band | `vwcCritical` |
|---|---|---|---|
| Olivier | 1 (highest) | 15–35 | 46 |
| Citronnier | 2 | 25–42 | 50 |
| Lilas | 3 | 28–45 | 52 |
| Érable du Japon | 4 | 33–50 | 56 |
| Magnolia | 5 (lowest) | 35–52 | 57 |

**Light (DLI).** Map the published sun category to a DLI band using greenhouse
DLI research (Purdue/MSU: low <10, medium 10–20, high 20–30+ mol/m²/j). This is a
**category→band mapping, not a per-species published DLI.**

**Fertility (EC).** Index = `raw / 1771 × 100` (~10 ≈ 1 mS/cm). Bands from
container-EC guidance (pour-through ideal 0.5–2.0 mS/cm; salt stress > ~3.5 mS/cm
SME / >2 pour-through), widened by feeder class. `FEEDER_INDEX`: light 5–20
(crit 30), moderate 8–25 (crit 38), heavy 12–30 (crit 48).

**Temperature / hardiness.** Use published USDA zones + documented cold tolerance
and growth optimum directly.

---

## 6. Adding a new plant

1. **Research** the plant from authoritative sources (RHS, Missouri Botanical
   Garden, university extension, USDA hardiness). Write a `plants/<id>.md` file
   following an existing one as a template — including a source URL per figure.
2. **Classify** it:
   - Sun category → `dli` band (§5).
   - USDA zone / cold tolerance → `minTempC`; heat-stress limit → `heatLimitC`;
     growth optimum → `optimalC`. Set `frostTender` if not reliably hardy in a
     Paris pot.
   - Watering preference → `vwc` ideal band; **over-watering sensitivity →
     `vwcCritical`** (insert into the §5 ladder; keep it < 60).
   - Feeder class → `feeder` (and `ecMScm` for documentation).
3. **Add** the entry to `PLANTS` in `src/data/plants.ts` with source-cited
   comments. The selector picks it up automatically.
4. **Verify:** `npm run lint && npm test`. `src/test/plants.test.ts` enforces the
   structural invariants (`vwc.max < vwcCritical < 60`, etc.); add a behavioural
   case to `src/test/plantRanges.test.ts` if the plant introduces a new edge.

---

## 7. Over-watering safety — the property that must hold

For **every** plant, a sustained high reading **≤ 60 % VWC** must reach `bad`
(over-watered). This is guarded by `vwcCritical < 60` and asserted in
`src/test/plantRanges.test.ts` ("sur-arrosage (sécurité)"). Do not raise any
`vwcCritical` to 60 or above, and do not reintroduce an `idealMax + offset`
formula for the critical threshold.

---

## 8. Confidence summary

| Value | Confidence | Basis |
|---|---|---|
| Sensor 0–60 % VWC, ±3 %, dry over-read | **High** | Xaver/Esposito 2020 |
| Container capacity ~60 %, wilting ~25 %, AFP ≥10 % | **High** | UC ANR, ASHS, ISHS |
| Per-species `vwc` band & `vwcCritical` | **Mapped** | Watering preference + sensitivity rank |
| No raw→mS/cm EC conversion; 1771≈10 mS/cm hint | **High / Low** | node-flower-power TODO (existence high, scaling low) |
| EC interpretation bands | **High but method-dependent** | NC State pour-through, UConn SME, UMass |
| Hardiness / optimal temps / sun category | **High** | RHS, MBG, USDA |
| DLI band per sun category | **Mapped** | Purdue/MSU DLI research |
| NOAA solar model | **High** | NOAA / Spencer 1971 |

---

## 9. Master source list

- Parrot Flower Power evaluation — Xaver/Esposito et al. 2020, Geosci. Instrum. 9:117 — <https://gi.copernicus.org/articles/9/117/2020/>
- Parrot BLE spec (archived) — <https://web.archive.org/web/2018/https://developer.parrot.com/docs/FlowerPower/FlowerPower-BLE.pdf>
- node-flower-power — <https://github.com/sandeepmistry/node-flower-power> · <https://github.com/Parrot-Developers/node-flower-power>
- Container substrate water (CC/PWP/available water) — <https://www.nurserymag.com/article/moisture-retention-curve/>
- Air-filled porosity / waterlogging — <https://ucanr.edu/blogs/blogcore/postdetail.cfm?postnum=29450>
- Root rot & winter risk — <https://yardandgarden.extension.iastate.edu/article/2014/02-14/rootrot.html> · <https://extension.umn.edu/yard-and-garden-news/watering-houseplants>
- EC pour-through (container ornamentals) — <https://content.ces.ncsu.edu/the-pour-through-extraction-procedure-a-nutrient-management-tool-for-nursery-crops>
- EC SME interpretation (Warncke) — <https://soiltesting.cahnr.uconn.edu/interpretation-of-sme-results-for-greenhouse-media/>
- EC salt-sensitivity tiers — <https://www.umass.edu/agriculture-food-environment/greenhouse-floriculture/fact-sheets/soluble-salts-electrical-conductivity-ec-for-greenhouse-crops>
- DLI category mapping — Purdue Extension HO-238 (greenhouse DLI)
- NOAA solar calculator — <https://gml.noaa.gov/grad/solcalc/>
- Paris climate normals — Météo-France Paris-Montsouris 1991–2020

---

## 10. Glossary

- **VWC** — Volumetric Water Content (% of soil volume that is water).
- **Container capacity** — water a pot holds after watering + free drainage (the
  potted-plant analogue of field capacity); ~60 % VWC for peat mix.
- **AFP** — Air-Filled Porosity; must stay ≥ ~10 % or roots suffocate.
- **DLI** — Daily Light Integral (mol/m²/day of PAR photons).
- **PPFD** — Photosynthetic Photon Flux Density (µmol/m²/s of PAR).
- **EC** — Electrical Conductivity (proxy for dissolved fertiliser salts);
  1 mS/cm = 1 dS/m.
- **DLI-proxy** — this app expresses the live light reading as a 24 h DLI
  (`PPFD × 0.0864`); see `convertSunlight`.
