import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-background text-foreground px-4 py-8 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>

      <h1 className="text-3xl font-display font-bold mb-6">Публичная оферта</h1>
      <p className="text-xs text-muted-foreground mb-6">Последнее обновление: {new Date().toLocaleDateString("ru-RU")}</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground [&_h2]:text-foreground [&_h2]:font-display [&_h2]:text-lg [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed">
        <h2>1. Общие положения</h2>
        <p>Настоящая оферта является официальным предложением онлайн-школы KLAR (далее — «Школа») о предоставлении услуг по обучению немецкому языку посредством веб-приложения.</p>
        <p>Регистрация на платформе и/или использование сервиса означает полное принятие условий настоящей оферты.</p>

        <h2>2. Предмет оферты</h2>
        <p>Школа предоставляет доступ к:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Учебным материалам (карточки, квизы, тексты для чтения и аудирования)</li>
          <li>AI-функциям (анализ ошибок, диалоги)</li>
          <li>Системе прогресса (XP, достижения, рейтинг)</li>
          <li>Магазину авторских заданий</li>
        </ul>

        <h2>3. Порядок оказания услуг</h2>
        <p>Доступ к основным функциям Школы предоставляется бесплатно после регистрации. Дополнительные авторские задания доступны за внутреннюю валюту (монеты), которую можно заработать в процессе обучения.</p>

        <h2>4. Права и обязанности сторон</h2>
        <p><strong className="text-foreground">Школа обязуется:</strong></p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Обеспечивать доступ к платформе 24/7 (за исключением технических работ)</li>
          <li>Сохранять прогресс обучения пользователя</li>
          <li>Защищать персональные данные</li>
        </ul>
        <p><strong className="text-foreground">Пользователь обязуется:</strong></p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Предоставлять достоверные данные при регистрации</li>
          <li>Не распространять учебные материалы</li>
          <li>Соблюдать правила платформы</li>
        </ul>

        <h2>5. Ограничение ответственности</h2>
        <p>Школа не гарантирует конкретных результатов обучения. Результат зависит от регулярности и усилий пользователя.</p>

        <h2>6. Интеллектуальная собственность</h2>
        <p>Все материалы платформы (тексты, вопросы, дизайн) являются интеллектуальной собственностью Школы и защищены авторским правом.</p>

        <h2>7. Изменение условий</h2>
        <p>Школа вправе изменять условия оферты. Актуальная версия всегда доступна на странице /terms.</p>

        <h2>8. Контакты</h2>
        <p>По вопросам: <span className="text-foreground">support@klardeutsch.com</span></p>
      </div>
    </div>
  );
};

export default Terms;
