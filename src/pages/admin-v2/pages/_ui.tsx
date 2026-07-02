import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "#4F46E5",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
      <div className="mt-4 h-1 rounded-full" style={{ background: accent, opacity: 0.15 }}>
        <div className="h-full w-1/3 rounded-full" style={{ background: accent }} />
      </div>
    </Card>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <Card className="p-10 text-center">
      <div
        className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 text-2xl"
        style={{ background: "#EEF2FF", color: "#4F46E5" }}
      >
        ✨
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{description}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-5 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: "#4F46E5" }}
        >
          {cta.label}
        </button>
      )}
    </Card>
  );
}

export function ComingSoon({ phase, description }: { phase: string; description: string }) {
  return (
    <Card className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "#F3E8FF", color: "#6B21A8" }}
        >
          {phase}
        </span>
        <h3 className="text-base font-semibold text-slate-900">В розробці</h3>
      </div>
      <p className="text-sm text-slate-500">{description}</p>
    </Card>
  );
}
