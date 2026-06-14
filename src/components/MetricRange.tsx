import { cn } from "@/lib/utils";
import type { MetricEvaluation, MetricStatus } from "@/lib/plantRanges";

const CURSOR_COLOR: Record<MetricStatus, string> = {
  ok: "bg-primary",
  warn: "bg-warning",
  bad: "bg-destructive",
  na: "bg-muted-foreground",
};

const STATUS_LABEL: Record<MetricStatus, string> = {
  ok: "dans la plage idéale",
  warn: "hors de la plage idéale",
  bad: "valeur critique",
  na: "non évaluée",
};

// Repère NON coloré (glyphe + mot) du statut : le statut ne doit pas dépendre
// de la seule couleur du curseur (WCAG 1.4.1, daltonisme).
const STATUS_BADGE: Record<MetricStatus, string> = {
  ok: "✓ dans la plage",
  warn: "! hors plage",
  bad: "✕ critique",
  na: "",
};

const STATUS_TEXT_COLOR: Record<MetricStatus, string> = {
  ok: "text-primary",
  warn: "text-warning",
  bad: "text-destructive",
  na: "text-muted-foreground",
};

const pct = (value: number, min: number, max: number): number =>
  max <= min ? 0 : Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

const fmt = (n: number): string =>
  Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1);

/** Règle horizontale : bande idéale (vert) + curseur à la valeur mesurée. */
export function MetricRange({ evaluation }: { evaluation: MetricEvaluation }) {
  const { status, value, unit, axisMin, axisMax, idealMin, idealMax, note } =
    evaluation;

  const showBand = idealMax > idealMin;
  const bandLeft = pct(idealMin, axisMin, axisMax);
  const bandWidth = pct(idealMax, axisMin, axisMax) - bandLeft;
  const cursor = value == null ? null : pct(value, axisMin, axisMax);
  const unitSuffix = unit ? ` ${unit}` : "";

  const caption =
    note ??
    (showBand ? `Idéal ${fmt(idealMin)}–${fmt(idealMax)}${unitSuffix}` : "—");

  return (
    <div className="mt-3">
      <div
        className="relative h-2 rounded-full bg-muted"
        role="img"
        aria-label={`Mesure ${STATUS_LABEL[status]}. ${caption}`}
      >
        {showBand && (
          <div
            className="absolute inset-y-0 rounded-full bg-primary/25"
            style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
            aria-hidden
          />
        )}
        {cursor != null && (
          <div
            className={cn(
              "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card",
              CURSOR_COLOR[status],
            )}
            style={{ left: `${cursor}%` }}
            aria-hidden
          />
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {value != null && status !== "na" && (
          <span className={cn("mr-1.5 font-medium", STATUS_TEXT_COLOR[status])}>
            {STATUS_BADGE[status]}
          </span>
        )}
        {caption}
      </p>
    </div>
  );
}
