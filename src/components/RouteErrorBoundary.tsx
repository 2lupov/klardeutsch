import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * Ловить помилки рендера, щоб ученик не бачив білий екран посеред уроку.
 * Скидається при переході на іншу сторінку. Помилка завантаження шматка коду
 * (після оновлення сайту) вирішується перезавантаженням.
 */
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RouteErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const chunk = /Loading chunk|dynamically imported module|Importing a module script failed/i.test(this.state.error.message || "");
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="font-display text-xl font-bold text-foreground">
          {chunk ? "Вийшла нова версія сайту" : "Щось пішло не так"}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {chunk
            ? "Оновіть сторінку, щоб продовжити. Ваша робота в уроці збережена."
            : "Це не ваша помилка. Спробуйте ще раз — якщо повториться, напишіть викладачу."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => (chunk ? window.location.reload() : this.setState({ error: null }))}
            className="rounded-xl bg-primary px-5 py-3 font-display font-bold text-primary-foreground"
          >
            {chunk ? "Оновити" : "Спробувати ще раз"}
          </button>
          <button
            onClick={() => window.location.assign("/")}
            className="rounded-xl border border-border px-5 py-3 font-display font-medium text-foreground"
          >
            На головну
          </button>
        </div>
      </div>
    );
  }
}

export default function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  // key: при переході на іншу сторінку помилка скидається
  return <Boundary key={pathname}>{children}</Boundary>;
}
