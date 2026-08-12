const KlarPrivacy = () => (
  <div className="standalone-scroll min-h-[100dvh] bg-klar-bg font-klar-body text-klar-pearl">
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-6">
      <a href="/" className="text-sm text-klar-aqua hover:underline">
        ← На головну
      </a>
      <h1 className="mt-6 font-klar-display text-4xl font-semibold">Політика конфіденційності</h1>
      <p className="mt-3 text-sm text-klar-pearl/50">Оновлено: 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-klar-pearl/75">
        <section>
          <h2 className="font-klar-display text-2xl text-klar-pearl">1. Які дані ми збираємо</h2>
          <p className="mt-2">
            Через форму заявки ми збираємо: імʼя, номер телефону, за бажанням — нік у Telegram та
            електронну пошту, вказаний рівень німецької, а також технічні мітки переходу (UTM) і
            дату надсилання заявки.
          </p>
        </section>

        <section>
          <h2 className="font-klar-display text-2xl text-klar-pearl">2. Мета обробки</h2>
          <p className="mt-2">
            Дані використовуються виключно для звʼязку з вами щодо індивідуальних занять з
            німецької мови: узгодження пробного заняття, розкладу та умов навчання.
          </p>
        </section>

        <section>
          <h2 className="font-klar-display text-2xl text-klar-pearl">3. Передача даних</h2>
          <p className="mt-2">
            Ми не продаємо і не передаємо ваші дані третім особам, крім технічних сервісів,
            необхідних для роботи сайту (хостинг, база даних, сервіс сповіщень у Telegram, сервіс
            аналітики Meta Pixel).
          </p>
        </section>

        <section>
          <h2 className="font-klar-display text-2xl text-klar-pearl">4. Термін зберігання</h2>
          <p className="mt-2">
            Дані зберігаються стільки, скільки необхідно для комунікації та ведення навчання, або
            до моменту вашого запиту на видалення.
          </p>
        </section>

        <section>
          <h2 className="font-klar-display text-2xl text-klar-pearl">5. Ваші права</h2>
          <p className="mt-2">
            Ви можете запросити доступ до своїх даних, їх виправлення або видалення, а також
            відкликати згоду на обробку — напишіть нам у Telegram, зазначений у вашій заявці.
          </p>
        </section>

        <section>
          <h2 className="font-klar-display text-2xl text-klar-pearl">6. Згода</h2>
          <p className="mt-2">
            Надсилаючи заявку, ви підтверджуєте згоду на обробку персональних даних відповідно до
            цієї Політики. Продовження користування сайтом також означає, що ви ознайомились із її
            умовами.
          </p>
        </section>
      </div>
    </div>
  </div>
);

export default KlarPrivacy;
