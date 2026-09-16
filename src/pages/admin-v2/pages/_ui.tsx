import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-admin-card text-admin-fg rounded-2xl border border-admin-border shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
  /** kept for backwards compatibility, ignored — colors come from the admin theme */
  accent?: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-admin-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-admin-fg">{value}</div>
      {hint && <div className="mt-1 text-xs text-admin-muted">{hint}</div>}
      <div className="mt-4 h-1 rounded-full bg-admin-accent/20">
        <div className="h-full w-1/3 rounded-full bg-admin-accent" />
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
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="text-base font-semibold text-admin-fg">{title}</h2>
        {subtitle && <p className="text-sm text-admin-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const styles =
    variant === "primary"
      ? "bg-admin-primary text-admin-primary-fg hover:opacity-90"
      : variant === "danger"
        ? "bg-admin-danger/10 text-admin-danger hover:bg-admin-danger/20"
        : "border border-admin-border text-admin-fg hover:bg-admin-fg/5";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
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
      <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 text-2xl bg-admin-accent/15">
        ✨
      </div>
      <h3 className="text-base font-semibold text-admin-fg">{title}</h3>
      <p className="text-sm text-admin-muted mt-1 max-w-md mx-auto">{description}</p>
      {cta && (
        <div className="mt-5 flex justify-center">
          <Btn onClick={cta.onClick}>{cta.label}</Btn>
        </div>
      )}
    </Card>
  );
}

export function LoadingState({ label = "Завантаження…" }: { label?: string }) {
  return (
    <Card className="p-10 text-center">
      <p className="text-sm text-admin-muted animate-pulse">{label}</p>
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="p-6 border-admin-danger/40">
      <h3 className="text-sm font-semibold text-admin-danger">Не вдалося завантажити</h3>
      <p className="text-sm text-admin-muted mt-1 break-words">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Btn variant="ghost" onClick={onRetry}>
            Спробувати ще раз
          </Btn>
        </div>
      )}
    </Card>
  );
}

export function ComingSoon({ phase, description }: { phase: string; description: string }) {
  return (
    <Card className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-admin-accent/20 text-admin-fg">
          {phase}
        </span>
        <h3 className="text-base font-semibold text-admin-fg">В розробці</h3>
      </div>
      <p className="text-sm text-admin-muted">{description}</p>
    </Card>
  );
}

/** Horizontal sub-tab strip used by grouped admin sections. */
export function SubTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string; icon?: any }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-5 p-1 rounded-2xl bg-admin-fg/5 border border-admin-border w-fit max-w-full">
      {tabs.map(({ key, label, icon: Icon }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? "bg-admin-card text-admin-fg shadow-sm border border-admin-border"
                : "text-admin-muted hover:text-admin-fg"
            }`}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
