import { ChevronDown } from "lucide-react";
import { PLANTS } from "@/data/plants";
import { cn } from "@/lib/utils";

type PlantSelectorProps = {
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

/** Sélecteur de plante (select natif stylé, accessible et sans dépendance). */
export function PlantSelector({ value, onChange, className }: PlantSelectorProps) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm text-muted-foreground">Plante suivie</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-border bg-card px-4 pr-10 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {PLANTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.emoji} {p.nameFr} — {p.nameLatin}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
    </label>
  );
}
