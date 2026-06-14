# 🍁 Érable du Japon — *Acer palmatum* (Japanese maple)

> **Over-watering sensitivity: 4 / 5 (moderate).** Wants **moist but well-drained**
> soil and consistent moisture, never waterlogged — but its bigger documented risk
> on a sunny, windy Paris terrace is **leaf scorch / drying out**, not root rot.
> Fully hardy in Paris. Prefers dappled / part shade.

`id: "erable-japon"` · profile in [`src/data/plants.ts`](../../../src/data/plants.ts).

## App profile (with rationale)

| Field | Value | Rationale / source |
|---|---|---|
| `dli` | **8–15 mol/m²/j** | Part / dappled shade — lowest band (full hot sun scorches). [MBG](https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b974) |
| `optimalC` | 15–22 °C | Cool, moist; heat-sensitive. |
| `minTempC` | −18 °C | Hardy (USDA zone 5/6). |
| `heatLimitC` | **30 °C** | Lowest heat ceiling — foliage scorches in hot sun. |
| `frostTender` | false | Hardy in Paris. |
| `vwc` | 33–50 % | Consistent moisture, well-drained. |
| `vwcCritical` | 56 % | Second-highest — moderate wet tolerance. |
| `feeder` | light | Slow-growing; little feeding needed. |
| `ecMScm` | 1.0–1.5 | Documentary. |

## Botanical profile

- **Light.** **Partial / dappled shade.** New foliage scorches in full sun,
  especially in heat or if the soil dries — hence the low `dli` band and low
  `heatLimitC`. Avoid hot afternoon sun. ([MBG](https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b974), [RHS](https://www.rhs.org.uk/plants/acer/japanese-maples/growing-guide))
- **Temperature / hardiness.** Hardy to ~−18 °C; dislikes hot, dry, windy sites.
- **Watering.** *"Moist but well-drained"* — keep **consistently moist, never
  waterlogged**, and let containers *begin* to dry between waterings. Shallow
  roots; easier to over- than under-water in heavy soil, but on a terrace the
  classic symptom is scorch from drying out.
- **Feeding.** **Light** — once in spring before leaves emerge; mature trees may
  need none. Avoid high-nitrogen (coarse growth).
- **Soil / container.** Loam-based, slightly acidic, well-drained (~25 % sharp
  sand); **mulch to keep roots cool and moist.**

## Care warnings the app encodes

- **Light/scorch:** the low `dli` band and `heatLimitC = 30 °C` mean strong sun
  and high heat flag earlier than for the sun-lovers; `evaluateLight` returns
  `bad` ("Lumière trop forte — risque de brûlure") well above its band.
- **Over-watering:** `vwcCritical = 56 %` — moderate; still reachable below 60 %.
- **Drying out:** `vwc.min = 33` so low readings warn "Trop sec" in season — the
  more likely real-world problem here.

## Seasonal notes (Paris)

- **Spring:** feed once before leaf-out; keep evenly moist as leaves emerge.
- **Summer:** **part shade + mulch**; consistent moisture; biggest risk is
  scorch/drying, so don't let it dry out.
- **Winter:** hardy; keep just-damp (winter tightening applies).

## Confidence

Sun preference (part shade), hardiness, scorch sensitivity and "moist but
well-drained" are **published**. The `vwc` band, `vwcCritical` and the DLI band
are a **reasoned mapping**.

## Sources
- Missouri Botanical Garden — *Acer palmatum*: <https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b974>
- RHS — Japanese maples growing guide: <https://www.rhs.org.uk/plants/acer/japanese-maples/growing-guide>
