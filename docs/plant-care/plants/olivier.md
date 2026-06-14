# 🫒 Olivier — *Olea europaea* (olive)

> **Over-watering sensitivity: 1 / 5 (HIGHEST).** The driest-preferring plant in
> the set. Sources are blunt: olives "don't like wet feet," suffer far more from
> over-watering than drought, and **waterlogged winter compost / root rot is the
> single most common cause of decline.** Frost-tender in a Paris pot.

`id: "olivier"` · profile in [`src/data/plants.ts`](../../../src/data/plants.ts).

## App profile (with rationale)

| Field | Value | Rationale / source |
|---|---|---|
| `dli` | 22–32 mol/m²/j | Full Mediterranean sun. Category→band. |
| `optimalC` | 20–30 °C | Mediterranean growth optimum. |
| `minTempC` | −9 °C | Cold-hardy cultivars ~−9/−10 °C established. [MBG](https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=283004) |
| `heatLimitC` | 40 °C | Very heat-tolerant. |
| `frostTender` | **true** | In a pot, roots far more exposed — protect below ~−5 °C. |
| `vwc` | **15–35 %** | Lowest band of the set — "soak then let dry well." |
| `vwcCritical` | **46 %** | Lowest critical threshold — warns earliest about wet soil. |
| `feeder` | light | Mediterranean, adapted to lean soils. |
| `ecMScm` | 1.0–1.8 | Documentary. |

## Botanical profile

- **Light.** Full sun, essential. ([MBG](https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=283004), [RHS](https://www.rhs.org.uk/fruit/olives/grow-your-own))
- **Temperature / hardiness.** Hardy to roughly −9/−10 °C once established for
  cold-hardy cultivars (e.g. Arbequina). In a **container** the roots are 1–2
  zones more exposed; protect (wrap / move to a cold but frost-free spot) below
  about −5 °C. Needs a cool winter (< 10 °C for ~2 months) to flower.
- **Watering.** **Drought-tolerant; the most over-watering-sensitive here.**
  Soak, then **let it dry well** before watering again. RHS: raise pots on feet
  to drain freely, use a **gritty, loam-based compost**, and **do not water in
  winter.** In summer a terrace pot dries fast, so under-watering becomes the
  practical risk *then* — but the dominant danger is cool/wet winter compost.
- **Feeding.** Light/moderate — balanced liquid feed monthly in the growing
  season for fruit. No notable over-feeding risk.
- **Soil / container.** Free-draining gritty Mediterranean mix; pot feet;
  **never a waterlogged pot.**

## Care warnings the app encodes

- **Over-watering:** lowest `vwcCritical` (46 %, tighter still in winter) → fires
  `bad` earliest of all plants. This is deliberate — olive is rank 1.
- **Frost:** `frostTender` → advisory Oct–Apr / near −9 °C.

## Seasonal notes (Paris)

- **Spring–summer:** full sun; soak-and-dry; water can be frequent in heat.
- **Autumn–winter:** **stop watering**; protect the pot from hard frost; keep dry.

## Confidence

Sun, hardiness and the "hates wet feet" classification are **published**. The
exact `vwc` band and `vwcCritical = 46` are a **conservative mapping** chosen to
warn earliest, consistent with olive being the most over-watering-sensitive plant.

## Sources
- Missouri Botanical Garden — *Olea europaea*: <https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=283004>
- RHS — How to grow olives: <https://www.rhs.org.uk/fruit/olives/grow-your-own>
