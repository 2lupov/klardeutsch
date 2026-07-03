import { Link } from "react-router-dom";
import { Calendar, Library, Users, PlayCircle, ClipboardCheck, Sparkles, LayoutList } from "lucide-react";

const CARDS = [
  { to: "/teach/schedule", icon: Calendar, title: "Розклад на сьогодні", desc: "Найближчі уроки і групи" },
  { to: "/teach/lessons", icon: LayoutList, title: "Конструктор уроку", desc: "Збирай уроки з блоків бібліотеки, drag-and-drop + AI" },
  { to: "/teach/class", icon: PlayCircle, title: "Провести урок", desc: "Live-клас з дошкою та таймлайном" },
  { to: "/teach/library", icon: Library, title: "Бібліотека матеріалів", desc: "Слайди, вправи, відео, діалоги" },
  { to: "/teach/students", icon: Users, title: "Мої учні", desc: "Групи, прогрес, картки учнів" },
  { to: "/teach/homework", icon: ClipboardCheck, title: "Домашні завдання", desc: "Призначення та перевірка" },
];

export default function TeachDashboard() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Ласкаво просимо у Teach Space</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Це початковий каркас робочого простору вчителя KLAR. Далі підключаємо бібліотеку матеріалів,
              drag-and-drop конструктор уроку та live-клас з дошкою.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group rounded-2xl border border-border bg-card/60 p-5 hover:border-primary/40 hover:bg-card transition"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition">
                <c.icon className="w-5 h-5 text-foreground group-hover:text-primary transition" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-foreground">{c.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
