import { Card, SectionHeader } from "./_ui";
import { Sparkles, Database, Key, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Налаштування" subtitle="Швидкі посилання на існуючі інструменти" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">AI-модель</h3>
              <p className="text-sm text-slate-500 mt-1">
                Для генерації курсу — <b>google/gemini-2.5-flash</b>.<br />
                Для вправ — <b>google/gemini-3-flash-preview</b>.
              </p>
              <p className="text-xs text-slate-400 mt-2">Ключ керується Lovable Cloud автоматично.</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Легасі-адмін</h3>
              <p className="text-sm text-slate-500 mt-1">
                Детальний редактор топіків, слів, вправ, чатів, магазину.
              </p>
              <Link to="/admin/legacy" className="inline-block mt-3 text-sm font-medium" style={{ color: "#4F46E5" }}>
                Відкрити →
              </Link>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Академія</h3>
              <p className="text-sm text-slate-500 mt-1">
                Публічна сторінка курсів для студентів.
              </p>
              <Link to="/academy" className="inline-block mt-3 text-sm font-medium" style={{ color: "#4F46E5" }}>
                Відкрити →
              </Link>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: "linear-gradient(135deg,#6B7280,#374151)" }}>
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Секрети & API</h3>
              <p className="text-sm text-slate-500 mt-1">
                Керуй ключами через Backend панель Lovable.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
