import { ReactNode } from "react";
import { Construction } from "lucide-react";

interface Props { title: string; description: string; next?: ReactNode }

export default function TeachPlaceholder({ title, description, next }: Props) {
  return (
    <div className="rounded-3xl border border-border bg-card/60 p-8 lg:p-12">
      <div className="max-w-lg">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Construction className="w-6 h-6 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
        {next && (
          <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            <p className="font-bold text-foreground text-[11px] uppercase tracking-wider mb-1">Далі за планом</p>
            {next}
          </div>
        )}
      </div>
    </div>
  );
}
