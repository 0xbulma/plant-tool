import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SensorCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  raw?: number;
};

export function SensorCard({
  icon: Icon,
  label,
  value,
  unit,
  raw,
}: SensorCardProps) {
  return (
    <Card>
      <CardHeader>
        <Icon className="size-5 text-primary" aria-hidden />
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tabular-nums">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        {raw !== undefined && (
          <p className="mt-1.5 text-xs text-muted-foreground/70">brut {raw}</p>
        )}
      </CardContent>
    </Card>
  );
}
