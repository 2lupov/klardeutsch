import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground px-4 py-8 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>

      <h1 className="text-3xl font-display font-bold mb-6">Политика конфиденциальности</h1>
      <p className="text-xs text-muted-foreground mb-6">Последнее обновление: {new Date().toLocaleDateString("ru-RU")}</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground [&_h2]:text-foreground [&_h2]:font-display [&_h2]:text-lg [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed">
        <h2>1. Общие положения</h2>
        <p>Настоящая Политика конфиденциальности определяет порядок обработки персональных данных пользователей онлайн-школы немецкого языка KLAR (далее — «Школа», «мы»).</p>

        <h2>2. Какие данные мы собираем</h2>
        <p>При регистрации и использовании Школы мы можем собирать следующие данные:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Адрес электронной почты</li>
          <li>Никнейм (отображаемое имя)</li>
          <li>Данные об учебном прогрессе (пройденные уроки, результаты квизов)</li>
          <li>Техническая информация (IP-адрес, тип устройства, браузер)</li>
        </ul>

        <h2>3. Цели обработки данных</h2>
        <p>Мы обрабатываем данные исключительно для:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Обеспечения работы учебной платформы</li>
          <li>Сохранения прогресса обучения</li>
          <li>Персонализации учебного процесса с помощью AI</li>
          <li>Формирования рейтингов и достижений</li>
          <li>Отправки уведомлений о прогрессе (при согласии)</li>
        </ul>

        <h2>4. Хранение и защита данных</h2>
        <p>Данные хранятся на защищённых серверах. Мы применяем шифрование и современные методы защиты для предотвращения несанкционированного доступа.</p>

        <h2>5. Передача данных третьим лицам</h2>
        <p>Мы не продаём и не передаём персональные данные третьим лицам, за исключением случаев, предусмотренных законодательством.</p>

        <h2>6. Cookies</h2>
        <p>Мы используем технические cookies для обеспечения работы сервиса (авторизация, сохранение настроек). Аналитические cookies не используются.</p>

        <h2>7. Права пользователя</h2>
        <p>Вы имеете право запросить удаление ваших данных, обратившись по адресу, указанному в разделе «Контакты».</p>

        <h2>8. Контакты</h2>
        <p>По вопросам обработки данных: <span className="text-foreground">support@klardeutsch.com</span></p>
      </div>
    </div>
  );
};

export default Privacy;
