# 🍋 Citronnier — *Citrus × limon* (lemon)

> **Over-watering sensitivity: 2 / 5 (high).** Frost-tender — must overwinter
> indoors in Paris. Heavy feeder. The RHS explicitly names over-watering as one
> of the commonest ways to kill a potted citrus.

`id: "citronnier"` · profile in [`src/data/plants.ts`](../../../src/data/plants.ts).

## App profile (with rationale)

| Field | Value | Rationale / source |
|---|---|---|
| `dli` | 20–30 mol/m²/j | Full sun (light afternoon shade in heat). Category→band. [RHS](https://www.rhs.org.uk/fruit/citrus/grow-your-own) |
| `optimalC` | 21–30 °C | Citrus growth optimum. |
| `minTempC` | −3 °C | Foliage/fruit damaged below ~−3 °C; bring in < 5 °C. [RHS](https://www.rhs.org.uk/fruit/citrus/grow-your-own) |
| `heatLimitC` | 38 °C | Heat-stress ceiling. |
| `frostTender` | **true** | Not hardy in Paris — overwinter > 5 °C. |
| `vwc` | 25–42 % | "Keep just moist, err on the dry side in winter." |
| `vwcCritical` | **50 %** | High over-watering sensitivity → conservative ceiling well under 60 %. |
| `feeder` | heavy | Citrus are hungry; the real risk is *under*-feeding. |
| `ecMScm` | 1.5–2.5 | Documentary. |

## Botanical profile

- **Light.** Full sun; give light shade only in the hottest afternoon sun.
  ([RHS](https://www.rhs.org.uk/fruit/citrus/grow-your-own))
- **Temperature / hardiness.** Not frost-hardy. Tolerates brief dips but foliage
  and fruit are damaged below roughly −3 °C; in a Paris pot it must come indoors
  before the first frosts and overwinter cool but frost-free (≈ 5–10 °C).
- **Watering.** Keep the compost *just moist* in summer; **let the surface dry
  before watering in winter and err on the dry side.** RHS: *"Overwatering in
  winter is one of the commonest problems… never leave pots standing in water, as
  this can cause the roots to rot."* Yellowing / shedding leaves is the classic
  over-watering sign.
- **Feeding.** **Heavy feeder.** High-nitrogen summer citrus feed (late
  Mar–Oct), balanced winter feed (Nov–mid-Mar). Under-feeding → yellow leaves /
  no fruit. ([RHS](https://www.rhs.org.uk/fruit/citrus/grow-your-own))
- **Soil / container.** Free-draining; RHS suggests ~20 % sharp sand/grit. Never
  stand the pot in a water-filled saucer.

## Care warnings the app encodes

- **Over-watering (winter especially):** the `vwcCritical = 50 %` guard fires
  `bad` ("Trop humide — risque de pourriture") below the sensor ceiling, and
  winter tightening lowers it further. This is the #1 killer for potted citrus.
- **Frost:** `frostTender` → frost advisory across Oct–Apr in Paris and when air
  temp nears −3 °C → "rentrer ou protéger".
- **Under-feeding:** in the growing season a low fertility index warns "nourrir".

## Seasonal notes (Paris)

- **Spring–summer:** outdoors, full sun; water freely but let the top dry; feed
  every 4–6 weeks.
- **Autumn:** bring indoors before first frost (~mid-Oct).
- **Winter:** cool, bright, frost-free; water sparingly (over-watering risk peaks).

## Confidence

Temperature/hardiness, sun category and feeding class are **published**. The
`vwc` band and `vwcCritical` are a **reasoned mapping** from RHS watering guidance
+ the over-watering ranking; the fertility index is **relative/uncalibrated**.

## Sources
- RHS — How to grow citrus: <https://www.rhs.org.uk/fruit/citrus/grow-your-own>
- Missouri Botanical Garden — Citrus limon (PlantFinder).
