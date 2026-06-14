# 🌸 Magnolia — *Magnolia × soulangeana* (saucer magnolia)

> **Over-watering sensitivity: 5 / 5 (lowest).** The "Goldilocks" plant: it is
> explicitly *intolerant of soil extremes — dry **or** wet* — and genuinely wants
> **consistent, year-round moisture**. It is the least over-watering-phobic of the
> set, but still never boggy. Fully hardy in Paris.

`id: "magnolia"` · profile in [`src/data/plants.ts`](../../../src/data/plants.ts).

## App profile (with rationale)

| Field | Value | Rationale / source |
|---|---|---|
| `dli` | 12–22 mol/m²/j | Full sun to partial shade. Category→band. [RHS](https://www.rhs.org.uk/plants/magnolia/growing-guide) |
| `optimalC` | 15–25 °C | Cool-to-moderate, moist conditions. |
| `minTempC` | −20 °C | Hardy (USDA zone 4–5). |
| `heatLimitC` | 32 °C | — |
| `frostTender` | false | Hardy in Paris (but late frosts can nip open flowers). |
| `vwc` | **35–52 %** | Highest band — wants consistent moisture. |
| `vwcCritical` | **57 %** | Highest critical threshold — tolerates the wet side best. |
| `feeder` | moderate | — |
| `ecMScm` | 1.2–2.0 | Documentary. |

## Botanical profile

- **Light.** Full sun to partial shade; shelter from strong wind. Avoid hot
  south-facing walls (premature budbreak → frost-damaged flowers).
  ([MBG](https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=a885))
- **Temperature / hardiness.** Hardy to ~−20 °C. The vulnerability is **open
  flowers to late spring frost**, not the plant itself.
- **Watering.** *"Moist, organically rich, well-drained loams… generally
  intolerant of soil extremes (dry or wet)… appreciates consistent and regular
  moisture throughout the year."* So: evenly damp, **never saucer-wet**, never
  bone-dry. ([MBG](https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=a885))
- **Feeding.** Moderate; in early spring as growth begins.
- **Soil / container.** Moisture-retentive but well-drained, organic-rich,
  slightly acidic; mulch to hold moisture.

## Care warnings the app encodes

- **Over-watering:** highest `vwcCritical` (57 %) — it tolerates the wet end best,
  but the guard is still **below 60 %** so true saturation flags `bad`.
- **Drying out is also a risk:** its `vwc.min = 35` is the highest of the set, so a
  reading below it warns "Trop sec" in season — appropriate for a moisture-lover.
- **No frost advisory** for the plant; siting guidance (avoid south wall) is
  botanical, not encoded.

## Seasonal notes (Paris)

- **Spring:** flowers early; keep evenly moist; protect blooms from late frost if
  practical.
- **Summer:** consistent moisture, mulched; never let it dry out fully.
- **Winter:** hardy; keep just-damp, not wet (winter tightening applies).

## Confidence

Sun, hardiness and "intolerant of extremes / consistent moisture" are
**published**. The `vwc` band and `vwcCritical = 57` are a **reasoned mapping**
placing it at the moist, least-sensitive end of the ladder.

## Sources
- Missouri Botanical Garden — *Magnolia × soulangeana*: <https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=a885>
- RHS — Magnolia growing guide: <https://www.rhs.org.uk/plants/magnolia/growing-guide>
