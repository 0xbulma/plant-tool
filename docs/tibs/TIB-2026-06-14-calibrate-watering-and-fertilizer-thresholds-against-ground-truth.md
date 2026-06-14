# TIB-2026-06-14: Calibrate watering and fertilizer thresholds against ground truth

| Field             | Value                                              |
| ----------------- | -------------------------------------------------- |
| **Status**        | Proposed                                           |
| **Date**          | 2026-06-14                                         |
| **Author**        | @0xbulma                                           |
| **Scope**         | App: flower-power-reader                            |

---

## Context

The plant selector evaluates four sensor metrics against per-plant "ideal"
ranges (see [`docs/plant-care/`](../plant-care/README.md)). Two of those ranges —
**soil moisture (% VWC)** and **fertility (soil EC)** — are currently **reasoned
mappings, not measured calibrations**, and the user has flagged correctness here
as critical (over-watering kills potted plants).

What we established while building them:

- **Moisture.** The Parrot 0–60 % VWC scale is a *calibrated* output, but it was
  calibrated against mineral silty-clay-loam, **over-reads in dry soil**, and is
  only accurate at the wet end (Xaver/Esposito et al. 2020). Our per-plant `vwc`
  bands and `vwcCritical` thresholds are mapped from documented watering
  preferences + an over-watering sensitivity ranking — defensible, but not
  verified against the actual water status of any specific pot.
- **Fertility.** Worse: the raw soil-EC characteristic (`39e1fa02`) is
  **uncalibrated**. `node-flower-power` ships `// TODO: convert raw (0-1771) to
  0 to 10 (mS/cm)` and never implemented it. Our index is `raw / 1771 × 100` —
  a relative signal anchored to that documented hint, **not a physical mS/cm
  value**. No amount of constant-tuning makes it physically correct.

Decision driver: the user wants the per-plant **state to remain hardcoded** (no
live, per-pot user-calibration UI for now), but wants a recorded path to make
the watering and fertility numbers *verifiably* correct in a future upgrade.

## Goals / Non-Goals

**Goals**

- Define a deterministic, **hardcoded-compatible** path to make fertility a real
  physical measurement (mS/cm) rather than an uncalibrated relative index.
- Define a repeatable, low-cost procedure to **validate** the moisture
  thresholds against ground truth, and to bake *measured* anchors into the
  hardcoded plant profiles when available.
- Preserve the over-watering safety invariant (critical threshold reachable
  below 60 % VWC) throughout.

**Non-Goals**

- **No live per-pot user-calibration feature.** State stays hardcoded in
  `src/data/plants.ts`; we do not add a calibration capture UI or per-device
  `localStorage` state in this upgrade.
- Not replacing or re-flashing the sensor, and not adding a live weather feed
  (clear-sky light model is out of scope here).
- Not changing the temperature/light models — this TIB is moisture + fertility.

## Current Solution

Hardcoded, in `src/data/plants.ts` + `src/lib/plantRanges.ts`:

- Moisture: `vwc: {min,max}` ideal band + `vwcCritical` (over-watering), with
  winter tightening. Mapped from watering preference + sensitivity rank.
  `convertSoilMoisture` now also applies a general one-point gain calibration
  (see Track B).
- Fertility: `fertilityIndex(raw) = clamp(raw / 1771 × 100, 0, 100)` →
  `FEEDER_INDEX` bands (light/moderate/heavy) on the 0–100 index. The card is
  labelled "indice" `/100`; the raw value is shown alongside for recalibration.

By default (do nothing): fertility stays a relative index that *looks* like a
pass/fail gauge but cannot back up an absolute claim, and moisture bands stay
unverified estimates.

## Proposed Solution

Two independent tracks, both keeping the profile state hardcoded.

### Track A — Fertility: read the device's calibrated EC characteristic (primary)

Firmware ≥ 1.1.0 exposes calibrated EC as **float32, in real units**:

- `39e1fa0e` — *calibrated Ec porous* (preferred; soil-solution EC)
- `39e1fa0d` — *calibrated Ecb* (bulk EC)

Plan:

1. At connect time, attempt to resolve `39e1fa0e` (then `39e1fa0d`) from the live
   service. Read as `Float32` (little-endian).
2. If present, expose `soilEcMScm: number | null` on `SensorReading` and gate
   fertility on **hardcoded, published mS/cm bands** instead of the relative
   index. Authoritative bands (container ornamentals): ideal ≈ 0.5–2.0 mS/cm
   (pour-through, NC State); "too high" warn ≈ 2 mS/cm (pour-through) / 3.5 mS/cm
   (SME); salt-stress/critical ≈ 5 mS/cm SME, lower for salt-sensitive feeders.
   Keep the feeder-class differentiation (light feeders warn earlier).
3. If the characteristic is **absent**, fall back to the current relative index,
   and surface a small "relatif / non calibré" hint so the UI never overclaims.

This is fully compatible with "hardcoded state": it is a fixed code path keyed on
device capability, not a user calibration step. It is the single change most
likely to make fertility genuinely correct.

### Track B — Moisture: general one-point gain calibration (adopted)

Field observation (2026-06-14) contradicted "the sensor % is already
calibrated": a saturated magnolia pot (just watered, soil black/wet) read
**brut 356 → ~18 % VWC**, when the true value is **~55 %** (container capacity).
The generic node-flower-power conversion under-reads ~3× on real substrate.

**Adopted (general — not per-pot — and hardcoded):** a single-point GAIN
calibration in `convertSoilMoisture`. `SOIL_MOISTURE_CAL_RAW = 356` maps to
`SOIL_MOISTURE_CAL_VWC = 55`, so `gain = 55 / poly(356) ≈ 3.13`, applied to the
raw polynomial before clamping to [0,60]. One point only (gain through a zero
origin): it is exact at saturation and fixes the wet end (the
over-watering-critical end), but distorts the mid/low range until a dry anchor is
added. The per-plant `vwc`/`vwcCritical` bands are unchanged — they now sit on a
correctly-scaled axis.

**Refinement (deferred):** capture a "dry" reading (raw at first wilt / air-dry)
to upgrade to a two-point affine calibration, optionally gravimetrically
cross-checked, and document the procedure in `docs/plant-care/calibration.md`.

The over-watering invariant (`vwcCritical < 60`, asserted in
`src/test/plantRanges.test.ts`) still holds on the calibrated scale.

### Implementation Phases

- **Phase 1 — Fertility calibrated read (Track A):** resolve `39e1fa0e`/`fa0d`,
  add `soilEcMScm` to `SensorReading`, gate on hardcoded mS/cm bands with
  graceful fallback + "non calibré" hint. Ship behind capability detection.
- **Phase 2 — Calibration procedure doc (Track B):** write
  `docs/plant-care/calibration.md` (two-point + gravimetric + EC-pen pour-through).
- **Phase 3 — Bake measured anchors:** once measured on real hardware, update the
  hardcoded `vwc`/`vwcCritical` (and fertility bands if EC-pen calibrated) and
  cite measurements in the per-plant docs.

## Considered Alternatives

### Alternative 1: Hardcode a `raw → mS/cm` conversion formula

Derive fertility mS/cm from the raw `39e1fa02` value with a fixed formula (e.g.
the linear `raw / 177`).

**Why rejected:** The TODO hint (`0–1771 ≈ 0–10 mS/cm`) is unvalidated and the
true response is non-linear and temperature/moisture-dependent. A hardcoded
formula would present a *fabricated* physical number — exactly the false
precision we want to avoid. The device's own calibrated characteristic is the
honest source.

### Alternative 2: Live per-pot user calibration (capture "saturé"/"sec" in the UI)

Let the user tap to record container-capacity and dry readings per pot, store in
`localStorage`, derive per-pot bands.

**Why rejected (for now):** The user explicitly wants the state hardcoded. This
is recorded under Future Considerations as a possible later feature, not part of
this upgrade.

### Alternative 3: Manual EC-pen calibration baked into constants

Use a cheap EC pen + pour-through to build a `raw → mS/cm` curve for the app's
reference substrate and hardcode it.

**Why rejected as primary (kept as fallback):** Viable when firmware lacks the
calibrated characteristic, but it is substrate-specific and laborious. Track A
(device calibrated value) is preferred when available; this is the documented
fallback in `calibration.md`.

## Assumptions & Constraints

- The Parrot firmware exposes `39e1fa0e`/`39e1fa0d` only on **≥ 1.1.0**; older
  firmware forces the relative-index fallback. Must detect, not assume.
- Even the device's calibrated EC is a probe estimate, not a lab extract — bands
  remain guidance with a feeder-sensitivity and winter caveat.
- Moisture calibration is **per substrate**; measured anchors apply to the app's
  reference potting mix, not arbitrary soils.
- Over-watering remains the critical failure mode; conservatism is preserved.

## Dependencies

- Parrot Flower Power BLE spec (calibrated EC characteristics) and
  [`node-flower-power`](https://github.com/sandeepmistry/node-flower-power).
- Reads firmware revision (`0x2a26`) to gate Track A.

## Observability

- Log/show both the **raw** EC value and the **calibrated** mS/cm (when present)
  so readings can be recalibrated and the fallback path is auditable.
- Surface the active fertility mode in the UI ("mS/cm calibré" vs "indice
  relatif") so the data-confidence level is never hidden.

## Future Considerations

- **Live per-pot calibration** (Alternative 2) if hardcoded anchors prove too
  coarse across pots/substrates.
- Per-substrate moisture profiles if the user runs markedly different mixes.
- A cached "calibrated EC absent" flag to avoid re-probing each connect.

## Open Questions

- ~~Does the target device expose `39e1fa0e`/`39e1fa0d`?~~ **Answered (2026-06-14):
  NO.** A GATT probe of the test device (Flower Power "Hawaii", firmware
  `2016-09-14_hawaii-2.0.3`) shows the live service exposes `fa01–fa07`, `fa09`,
  `fa0a`, `fa0b` — **no `fa0c`/`fa0d`/`fa0e`**. Calibrated EC is unavailable on
  this hardware ⇒ **Phase 1 (Track A primary) is not viable here**; fertility
  stays the relative index, and real mS/cm would require an EC pen (Track A
  fallback). The `firmware ≥ 1.1.0 ⇒ calibrated EC` assumption does not hold for
  Hawaii.
- ~~The extra live characteristics `fa09`/`fa0a`/`fa0b` — what are they?~~
  **Answered (2026-06-14):** read as float32 they are the sensor's **own
  calibrated** measurements — `fa09` = soil moisture (% VWC), `fa0a` = air
  temperature (°C), `fa0b` = light/DLI (mol/m²/j). Confirmed by matching `fa0a`
  ≈ 23.2 °C and `fa0b` ≈ 0.42 to the raw-formula values; `fa09` by elimination
  (Parrot calibrates moisture/temp/light, not EC). **`readSensors` now prefers
  these** (with raw-formula + gain fallback). This supersedes the Track B gain as
  the primary moisture source on devices that expose `fa09`.

## References

- [Plant-care model — implementer's guide](../plant-care/README.md)
- Parrot Flower Power evaluation — <https://gi.copernicus.org/articles/9/117/2020/>
- node-flower-power — <https://github.com/sandeepmistry/node-flower-power>
- EC pour-through interpretation (NC State) — <https://content.ces.ncsu.edu/the-pour-through-extraction-procedure-a-nutrient-management-tool-for-nursery-crops>
- EC SME interpretation (UConn / Warncke) — <https://soiltesting.cahnr.uconn.edu/interpretation-of-sme-results-for-greenhouse-media/>

## Addenda

### 2026-06-14 — General one-point soil-moisture gain calibration shipped

**Author:** @0xbulma

A saturated pot reading brut 356 → ~18 % VWC (true ~55 %) confirmed the generic
node-flower-power conversion under-reads ~3×. Adopted a general (not per-pot)
one-point gain calibration in `convertSoilMoisture` (Track B):
`SOIL_MOISTURE_CAL_RAW = 356` → `SOIL_MOISTURE_CAL_VWC = 55`. The two-point
refinement (dry anchor) remains the deferred follow-up.

### 2026-06-14 — Sensor's own calibrated channels wired as primary

**Author:** @0xbulma

A GATT probe of the Hawaii (fw 2.0.3) found **no** calibrated EC (`fa0d`/`fa0e`
absent) — fertility stays the relative index — but the live service exposes the
sensor's own calibrated **soil moisture (`fa09`)**, **air temperature (`fa0a`)**
and **light/DLI (`fa0b`)** as float32. `readSensors` now **prefers these** when
present, falling back to the raw formulas (and the one-point gain for moisture)
otherwise. The gain calibration above is now the *fallback*, not the primary
moisture source.

<!--
TIB conventions:
- Once accepted, do not substantively edit this TIB. If the decision needs to change,
  create a new TIB that supersedes this one and update the Status/Superseded by fields.
- Addenda may be appended to record operational updates that affect
  how the TIB is applied without changing the decision itself.
- TIB identifiers use CalVer (YYYY-MM-DD) based on the date the TIB was first drafted.
- A TIB is a *proposal* until its Status becomes Accepted. Once accepted, the rule the
  TIB decides on is codified in the relevant section of your project's central
  conventions doc (e.g., AGENTS.md or CLAUDE.md); the TIB stays as the dated record
  of how the decision was reached. TIBs feed the conventions doc — they do not
  override it.
-->
