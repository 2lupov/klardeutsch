import { Card, SectionHeader } from "./_ui";
import { Sparkles, Key, BookOpen, Palette } from "lucide-react";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Налаштування" subtitle="Як працює адмінка та куди підключені сервіси" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-admin-accent/20 text-admin-fg shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-admin-fg">AI-генерація</h3>
              <p className="text-sm text-admin-muted mt-1">
                Тексти, курси, уроки, вправи й домашка — модель <b>openai/gpt-6-astra</b>.<br />
                Розпізнавання сторінок підручника з фото — <b>google/gemini-3.7-flash</b>.
              </p>
              <p className="text-xs text-admin-muted mt-2">
                Доступ до моделей керується автоматично, окремий ключ не потрібен.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-admin-accent/20 text-admin-fg shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-admin-fg">Тема</h3>
              <p className="text-sm text-admin-muted mt-1">
                Світла й темна теми перемикаються кнопкою у верхній панелі. Вибір
                запам'ятовується для цього браузера.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-admin-accent/20 text-admin-fg shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-admin-fg">Академія</h3>
              <p className="text-sm text-admin-muted mt-1">Публічна сторінка курсів для студентів.</p>
              <Link to="/academy" className="inline-block mt-3 text-sm font-medium text-admin-fg underline">
                Відкрити →
              </Link>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-admin-accent/20 text-admin-fg shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-admin-fg">Ключі та інтеграції</h3>
              <p className="text-sm text-admin-muted mt-1">
                Платежі, Telegram-бот і листи налаштовані на боці бекенду. Нові ключі
                додаються там же — в адмінці вони не зберігаються.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
