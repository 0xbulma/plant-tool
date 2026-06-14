# 💜 Lilas — *Syringa vulgaris* (common lilac)

> **Over-watering sensitivity: 3 / 5 (moderate-high).** Fully hardy in Paris.
> Its standout risk is **over-*feeding*, not over-watering**: too much nitrogen →
> lush leaves and **no flowers**. Dislikes soggy soil but is relatively
> drought-tolerant once established.

`id: "lilas"` · profile in [`src/data/plants.ts`](../../../src/data/plants.ts).

## App profile (with rationale)

| Field | Value | Rationale / source |
|---|---|---|
| `dli` | 18–28 mol/m²/j | Full sun for good bloom. Category→band. [MBG](https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=282932) |
| `optimalC` | 15–25 °C | Best in cool summers / cold winters; needs winter chill. |
| `minTempC` | −34 °C | Very hardy (USDA zone 3). |
| `heatLimitC` | 32 °C | — |
| `frostTender` | false | Fully hardy in Paris. |
| `vwc` | 28–45 % | "Medium moisture, well-drained; avoid soggy soils." |
| `vwcCritical` | 52 % | Mid ladder — dislikes wet feet but tolerates moisture better than citrus/olive. |
| `feeder` | **light** | Over-feeding (N) suppresses flowering. |
| `ecMScm` | 1.0–1.5 | Documentary. |

## Botanical profile

- **Light.** Full sun (tolerates light shade, but bloom is best in full sun).
  ([MBG](https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=282932))
- **Temperature / hardiness.** Extremely hardy (to ~−34 °C). Needs a winter chill
  period to set buds — Paris provides this. Prefers cool summers.
- **Watering.** *"Average, medium moisture, well-drained soil… avoid soggy
  soils."* Intolerant of wet sites; relatively drought-tolerant once established.
  A poor candidate for a pot that holds water.
- **Feeding.** **Light feeder — over-feeding is the real failure mode.** Excess
  nitrogen → leaves, not flowers. Fertilise **no more than once a year**, low-N /
  higher-P. ([UMD Extension](https://extension.umd.edu/resource/lilac-identify-and-manage-problems))
- **Soil / container.** Well-drained, neutral-to-slightly-alkaline; never soggy.

## Care warnings the app encodes

- **Over-watering:** `vwcCritical = 52 %` (mid ladder) → `bad` on soggy soil.
- **Over-feeding:** the fertility `critical` for a *light* feeder is low (index 30,
  ≈ 3 mS/cm) → a high reading flags `bad` ("Trop fertilisé") earlier than for the
  hungry citrus. This is the lilac-specific safety signal.
- **No frost advisory** (hardy).

## Seasonal notes (Paris)

- **Spring:** flowers; feed at most once, low-nitrogen.
- **Summer:** medium moisture, never soggy; tolerates dry spells.
- **Winter:** hardy outdoors; the chill is beneficial for next year's bloom.

## Confidence

Sun, hardiness and the "avoid soggy / don't over-feed" guidance are **published**.
The `vwc` band, `vwcCritical` and the feeder index bands are a **reasoned mapping**.

## Sources
- Missouri Botanical Garden — *Syringa vulgaris*: <https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=282932>
- University of Maryland Extension — Lilac problems / not flowering: <https://extension.umd.edu/resource/lilac-identify-and-manage-problems>
