import { PersonStanding } from "lucide-react";

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="mb-5 flex flex-col items-center gap-1 text-center">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <PersonStanding className="size-5" />
        </span>
        <span className="font-heading text-2xl font-bold tracking-tight">
          PoseOff
        </span>
      </div>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
