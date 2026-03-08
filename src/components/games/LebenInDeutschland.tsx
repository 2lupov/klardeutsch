import { useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, FileText, Mail, Phone, Home, ChevronRight, RotateCcw, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Scenario = {
  id: string;
  icon: string;
  titleRu: string;
  titleUk: string;
  descRu: string;
  descUk: string;
  difficulty: "A2" | "B1" | "B2" | "C1";
  steps: ScenarioStep[];
};

type ScenarioStep = {
  type: "document" | "letter" | "dialogue" | "form";
  titleRu: string;
  titleUk: string;
  germanText: string;
  explanationRu: string;
  explanationUk: string;
  questions: StepQuestion[];
};

type StepQuestion = {
  questionRu: string;
  questionUk: string;
  type: "fill" | "choice";
  correctAnswer: string;
  options?: string[];
  hintRu?: string;
  hintUk?: string;
};

const scenarios: Scenario[] = [
  {
    id: "anmeldung",
    icon: "🏠",
    titleRu: "Anmeldung: Регистрация по месту жительства",
    titleUk: "Anmeldung: Реєстрація за місцем проживання",
    descRu: "Заполни анкету для прописки — первое, что нужно сделать в Германии",
    descUk: "Заповни анкету для реєстрації — перше, що потрібно зробити в Німеччині",
    difficulty: "A2",
    steps: [
      {
        type: "form",
        titleRu: "Анкета Anmeldung",
        titleUk: "Анкета Anmeldung",
        germanText: `ANMELDEFORMULAR
Bürgeramt Berlin-Mitte

Familienname: ___________
Vorname: ___________
Geburtsdatum: ___________
Staatsangehörigkeit: ___________
Neue Anschrift: ___________
Einzugsdatum: ___________

Unterschrift: ___________`,
        explanationRu: "Это стандартная форма регистрации. Familienname — фамилия, Vorname — имя, Geburtsdatum — дата рождения, Staatsangehörigkeit — гражданство, Neue Anschrift — новый адрес, Einzugsdatum — дата заселения.",
        explanationUk: "Це стандартна форма реєстрації. Familienname — прізвище, Vorname — ім'я, Geburtsdatum — дата народження, Staatsangehörigkeit — громадянство, Neue Anschrift — нова адреса, Einzugsdatum — дата заселення.",
        questions: [
          {
            questionRu: "Что означает «Familienname»?",
            questionUk: "Що означає «Familienname»?",
            type: "choice",
            correctAnswer: "Фамилия",
            options: ["Имя", "Фамилия", "Отчество", "Семейное положение"],
          },
          {
            questionRu: "Как по-немецки «дата рождения»?",
            questionUk: "Як німецькою «дата народження»?",
            type: "fill",
            correctAnswer: "Geburtsdatum",
            hintRu: "Geburt (рождение) + Datum (дата)",
            hintUk: "Geburt (народження) + Datum (дата)",
          },
          {
            questionRu: "Что такое «Einzugsdatum»?",
            questionUk: "Що таке «Einzugsdatum»?",
            type: "choice",
            correctAnswer: "Дата заселения",
            options: ["Дата рождения", "Дата заселения", "Дата выселения", "Дата подписания"],
          },
        ],
      },
      {
        type: "dialogue",
        titleRu: "В Bürgeramt",
        titleUk: "У Bürgeramt",
        germanText: `Beamter: Guten Tag. Haben Sie einen Termin?
Sie: Ja, um 10 Uhr. Mein Name ist _________.
Beamter: Haben Sie Ihren Mietvertrag dabei?
Sie: Ja, hier bitte.
Beamter: Und den Personalausweis oder Reisepass?
Sie: Hier ist mein _________.
Beamter: Danke. Füllen Sie bitte dieses Formular aus.`,
        explanationRu: "Termin — запись/встреча по времени, Mietvertrag — договор аренды, Personalausweis — удостоверение личности, Reisepass — загранпаспорт.",
        explanationUk: "Termin — запис/зустріч за часом, Mietvertrag — договір оренди, Personalausweis — посвідчення особи, Reisepass — закордонний паспорт.",
        questions: [
          {
            questionRu: "Что обязательно нужно принести в Bürgeramt?",
            questionUk: "Що обов'язково потрібно принести в Bürgeramt?",
            type: "choice",
            correctAnswer: "Mietvertrag",
            options: ["Führerschein", "Mietvertrag", "Geburtsurkunde", "Schulzeugnis"],
          },
          {
            questionRu: "Как по-немецки «загранпаспорт»?",
            questionUk: "Як німецькою «закордонний паспорт»?",
            type: "fill",
            correctAnswer: "Reisepass",
            hintRu: "Reise (путешествие) + Pass (паспорт)",
            hintUk: "Reise (подорож) + Pass (паспорт)",
          },
        ],
      },
    ],
  },
  {
    id: "kuendigung",
    icon: "✉️",
    titleRu: "Kündigung: Расторжение договора",
    titleUk: "Kündigung: Розірвання договору",
    descRu: "Напиши правильное заявление о расторжении договора",
    descUk: "Напиши правильну заяву про розірвання договору",
    difficulty: "B1",
    steps: [
      {
        type: "letter",
        titleRu: "Шаблон Kündigung",
        titleUk: "Шаблон Kündigung",
        germanText: `Max Mustermann
Musterstraße 1
10115 Berlin

An: Vodafone GmbH
Kundenservice
40099 Düsseldorf

Berlin, den 15. März 2026

Betreff: Kündigung meines Vertrags

Sehr geehrte Damen und Herren,

hiermit kündige ich meinen Vertrag mit der Kundennummer 123456789 
fristgerecht zum nächstmöglichen Zeitpunkt.

Bitte senden Sie mir eine schriftliche Bestätigung der Kündigung.

Mit freundlichen Grüßen
Max Mustermann`,
        explanationRu: "«Hiermit kündige ich» — стандартная формула расторжения. «Fristgerecht» — в установленный срок. «Nächstmöglicher Zeitpunkt» — ближайший возможный момент. «Bestätigung» — подтверждение.",
        explanationUk: "«Hiermit kündige ich» — стандартна формула розірвання. «Fristgerecht» — у встановлений термін. «Nächstmöglicher Zeitpunkt» — найближчий можливий момент. «Bestätigung» — підтвердження.",
        questions: [
          {
            questionRu: "Какая стандартная формула для расторжения договора?",
            questionUk: "Яка стандартна формула для розірвання договору?",
            type: "choice",
            correctAnswer: "Hiermit kündige ich meinen Vertrag",
            options: [
              "Ich möchte nicht mehr bezahlen",
              "Hiermit kündige ich meinen Vertrag",
              "Bitte löschen Sie mein Konto",
              "Ich brauche das nicht mehr",
            ],
          },
          {
            questionRu: "Что значит «fristgerecht»?",
            questionUk: "Що означає «fristgerecht»?",
            type: "choice",
            correctAnswer: "В установленный срок",
            options: ["Немедленно", "В установленный срок", "Через год", "Без уведомления"],
          },
          {
            questionRu: "Как попросить подтверждение?",
            questionUk: "Як попросити підтвердження?",
            type: "fill",
            correctAnswer: "Bestätigung",
            hintRu: "Bestätigung = подтверждение",
            hintUk: "Bestätigung = підтвердження",
          },
        ],
      },
    ],
  },
  {
    id: "finanzamt",
    icon: "📋",
    titleRu: "Письмо от Finanzamt",
    titleUk: "Лист від Finanzamt",
    descRu: "Разбери настоящее письмо от налоговой — не паникуй!",
    descUk: "Розбери справжнього листа від податкової — не панікуй!",
    difficulty: "B2",
    steps: [
      {
        type: "document",
        titleRu: "Письмо от Finanzamt",
        titleUk: "Лист від Finanzamt",
        germanText: `Finanzamt Berlin-Mitte
Steuernummer: 13/123/45678

Sehr geehrter Herr Mustermann,

Sie werden hiermit aufgefordert, Ihre Einkommensteuererklärung 
für das Kalenderjahr 2025 bis zum 31. Juli 2026 abzugeben.

Sollten Sie dieser Aufforderung nicht fristgerecht nachkommen, 
kann ein Verspätungszuschlag festgesetzt werden.

Bei Fragen wenden Sie sich bitte an Ihren zuständigen 
Sachbearbeiter (Durchwahl: 030 9024-XXXX).

Mit freundlichen Grüßen
Finanzamt Berlin-Mitte`,
        explanationRu: "Steuernummer — налоговый номер. Einkommensteuererklärung — декларация о доходах. Verspätungszuschlag — штраф за просрочку. Sachbearbeiter — ответственный сотрудник. Durchwahl — добавочный номер.",
        explanationUk: "Steuernummer — податковий номер. Einkommensteuererklärung — декларація про доходи. Verspätungszuschlag — штраф за прострочку. Sachbearbeiter — відповідальний працівник. Durchwahl — додатковий номер.",
        questions: [
          {
            questionRu: "Что требует Finanzamt в этом письме?",
            questionUk: "Що вимагає Finanzamt у цьому листі?",
            type: "choice",
            correctAnswer: "Подать налоговую декларацию",
            options: ["Заплатить штраф", "Подать налоговую декларацию", "Явиться лично", "Оплатить задолженность"],
          },
          {
            questionRu: "До какой даты нужно подать декларацию?",
            questionUk: "До якої дати потрібно подати декларацію?",
            type: "fill",
            correctAnswer: "31. Juli 2026",
            hintRu: "Найди дату в тексте",
            hintUk: "Знайди дату в тексті",
          },
          {
            questionRu: "Что такое «Verspätungszuschlag»?",
            questionUk: "Що таке «Verspätungszuschlag»?",
            type: "choice",
            correctAnswer: "Штраф за просрочку",
            options: ["Налоговый вычет", "Штраф за просрочку", "Скидка за раннюю подачу", "Дополнительный налог"],
          },
        ],
      },
    ],
  },
  {
    id: "hausverwaltung",
    icon: "🔧",
    titleRu: "Письмо в Hausverwaltung",
    titleUk: "Лист до Hausverwaltung",
    descRu: "Напиши жалобу управляющей компании — отопление не работает!",
    descUk: "Напиши скаргу управляючій компанії — опалення не працює!",
    difficulty: "B1",
    steps: [
      {
        type: "letter",
        titleRu: "Заявка на ремонт",
        titleUk: "Заявка на ремонт",
        germanText: `Sehr geehrte Damen und Herren,

ich bin Mieter der Wohnung in der Musterstraße 5, 3. OG links.

Seit dem 10. März funktioniert die Heizung in meinem 
Wohnzimmer nicht mehr. Die Raumtemperatur beträgt nur noch 
14 Grad. Ich bitte Sie, einen Handwerker so schnell wie 
möglich zu schicken.

Gemäß § 535 BGB sind Sie als Vermieter verpflichtet, die 
Mietsache in einem gebrauchsfähigen Zustand zu erhalten.

Sollte die Reparatur nicht innerhalb von 7 Tagen erfolgen, 
behalte ich mir eine Mietminderung vor.

Mit freundlichen Grüßen`,
        explanationRu: "Mieter — арендатор. OG (Obergeschoss) — этаж. Heizung — отопление. Handwerker — мастер/ремонтник. Mietminderung — снижение арендной платы. Vermieter — арендодатель.",
        explanationUk: "Mieter — орендар. OG (Obergeschoss) — поверх. Heizung — опалення. Handwerker — майстер. Mietminderung — зниження орендної плати. Vermieter — орендодавець.",
        questions: [
          {
            questionRu: "Как по-немецки «отопление»?",
            questionUk: "Як німецькою «опалення»?",
            type: "fill",
            correctAnswer: "Heizung",
            hintRu: "Heiz... (от heizen — отапливать)",
            hintUk: "Heiz... (від heizen — опалювати)",
          },
          {
            questionRu: "Что такое «Mietminderung»?",
            questionUk: "Що таке «Mietminderung»?",
            type: "choice",
            correctAnswer: "Снижение арендной платы",
            options: ["Повышение аренды", "Снижение арендной платы", "Расторжение договора", "Депозит"],
          },
          {
            questionRu: "Кого нужно вызвать для ремонта?",
            questionUk: "Кого потрібно викликати для ремонту?",
            type: "choice",
            correctAnswer: "Handwerker",
            options: ["Polizist", "Handwerker", "Nachbar", "Hausmeister"],
          },
        ],
      },
    ],
  },
  {
    id: "arzttermin",
    icon: "🏥",
    titleRu: "Arzttermin: Запись к врачу",
    titleUk: "Arzttermin: Запис до лікаря",
    descRu: "Запишись к врачу по телефону и объясни симптомы",
    descUk: "Запишись до лікаря по телефону та поясни симптоми",
    difficulty: "A2",
    steps: [
      {
        type: "dialogue",
        titleRu: "Звонок в Arztpraxis",
        titleUk: "Дзвінок до Arztpraxis",
        germanText: `Sprechstundenhilfe: Praxis Dr. Müller, guten Tag.
Sie: Guten Tag, ich möchte bitte einen Termin _________.
Sprechstundenhilfe: Sind Sie bereits Patient bei uns?
Sie: Nein, ich bin _________.
Sprechstundenhilfe: Was für Beschwerden haben Sie?
Sie: Ich habe seit drei Tagen _________ und Kopfschmerzen.
Sprechstundenhilfe: Können Sie morgen um 10 Uhr kommen?
Sie: Ja, das passt. Brauche ich meine _________?
Sprechstundenhilfe: Ja, bitte bringen Sie die mit.`,
        explanationRu: "Sprechstundenhilfe — ассистент врача. Termin vereinbaren — записаться на приём. Neupatient — новый пациент. Beschwerden — жалобы. Versichertenkarte (Gesundheitskarte) — страховая карта.",
        explanationUk: "Sprechstundenhilfe — асистент лікаря. Termin vereinbaren — записатися на прийом. Neupatient — новий пацієнт. Beschwerden — скарги. Versichertenkarte (Gesundheitskarte) — страхова картка.",
        questions: [
          {
            questionRu: "Как сказать «записаться на приём»?",
            questionUk: "Як сказати «записатися на прийом»?",
            type: "choice",
            correctAnswer: "Einen Termin vereinbaren",
            options: ["Einen Termin vereinbaren", "Einen Termin absagen", "Einen Termin verschieben", "Einen Termin vergessen"],
          },
          {
            questionRu: "Как представиться новым пациентом?",
            questionUk: "Як представитися новим пацієнтом?",
            type: "fill",
            correctAnswer: "Neupatient",
            hintRu: "Neu (новый) + Patient (пациент)",
            hintUk: "Neu (новий) + Patient (пацієнт)",
          },
          {
            questionRu: "Что нужно принести к врачу?",
            questionUk: "Що потрібно принести до лікаря?",
            type: "choice",
            correctAnswer: "Versichertenkarte",
            options: ["Führerschein", "Versichertenkarte", "Geburtsurkunde", "Mietvertrag"],
          },
        ],
      },
      {
        type: "dialogue",
        titleRu: "На приёме у врача",
        titleUk: "На прийомі у лікаря",
        germanText: `Arzt: Guten Tag, was kann ich für Sie tun?
Sie: Ich habe seit drei Tagen starke Halsschmerzen und Fieber.
Arzt: Haben Sie auch Husten?
Sie: Ja, besonders nachts.
Arzt: Nehmen Sie regelmäßig Medikamente ein?
Sie: Nein, keine.
Arzt: Ich verschreibe Ihnen ein Antibiotikum. Nehmen Sie dreimal 
     täglich eine Tablette nach dem Essen. Hier ist Ihr Rezept.
Sie: Danke. Muss ich nochmal wiederkommen?
Arzt: Ja, bitte kommen Sie in einer Woche zur Kontrolle.`,
        explanationRu: "Halsschmerzen — боль в горле. Fieber — температура/жар. Husten — кашель. Medikamente einnehmen — принимать лекарства. Rezept — рецепт. Kontrolle — контрольный осмотр.",
        explanationUk: "Halsschmerzen — біль у горлі. Fieber — температура. Husten — кашель. Medikamente einnehmen — приймати ліки. Rezept — рецепт. Kontrolle — контрольний огляд.",
        questions: [
          {
            questionRu: "Как по-немецки «боль в горле»?",
            questionUk: "Як німецькою «біль у горлі»?",
            type: "fill",
            correctAnswer: "Halsschmerzen",
            hintRu: "Hals (горло) + Schmerzen (боли)",
            hintUk: "Hals (горло) + Schmerzen (болі)",
          },
          {
            questionRu: "Что врач выписал пациенту?",
            questionUk: "Що лікар виписав пацієнту?",
            type: "choice",
            correctAnswer: "Rezept",
            options: ["Überweisung", "Rezept", "Attest", "Rechnung"],
          },
          {
            questionRu: "Сколько раз в день принимать таблетки?",
            questionUk: "Скільки разів на день приймати таблетки?",
            type: "choice",
            correctAnswer: "Dreimal täglich",
            options: ["Einmal täglich", "Zweimal täglich", "Dreimal täglich", "Viermal täglich"],
          },
        ],
      },
    ],
  },
  {
    id: "kontoeroeffnung",
    icon: "🏦",
    titleRu: "Kontoeröffnung: Открытие счёта",
    titleUk: "Kontoeröffnung: Відкриття рахунку",
    descRu: "Открой банковский счёт — без него в Германии никуда",
    descUk: "Відкрий банківський рахунок — без нього в Німеччині нікуди",
    difficulty: "B1",
    steps: [
      {
        type: "dialogue",
        titleRu: "В банке",
        titleUk: "У банку",
        germanText: `Berater: Herzlich willkommen! Wie kann ich Ihnen helfen?
Sie: Ich möchte gerne ein Girokonto eröffnen.
Berater: Haben Sie Ihren Reisepass und die Meldebescheinigung dabei?
Sie: Ja, hier bitte.
Berater: Möchten Sie ein kostenloses Konto oder unser Premiumkonto 
         mit Kreditkarte?
Sie: Was kostet das Premiumkonto?
Berater: 9,90 Euro monatlich. Dafür bekommen Sie eine Kreditkarte, 
         kostenlose Auslandsüberweisungen und einen Dispokredit.
Sie: Ich nehme erstmal das kostenlose Konto.
Berater: Gut. Dann brauche ich noch Ihre Steuer-ID und eine 
         Unterschrift hier und hier.`,
        explanationRu: "Girokonto — расчётный счёт. Meldebescheinigung — справка о регистрации. Überweisung — перевод. Dispokredit — овердрафт. Steuer-ID — налоговый идентификатор. Unterschrift — подпись.",
        explanationUk: "Girokonto — розрахунковий рахунок. Meldebescheinigung — довідка про реєстрацію. Überweisung — переказ. Dispokredit — овердрафт. Steuer-ID — податковий ідентифікатор. Unterschrift — підпис.",
        questions: [
          {
            questionRu: "Как по-немецки «расчётный счёт»?",
            questionUk: "Як німецькою «розрахунковий рахунок»?",
            type: "fill",
            correctAnswer: "Girokonto",
            hintRu: "Giro (оборот) + Konto (счёт)",
            hintUk: "Giro (оборот) + Konto (рахунок)",
          },
          {
            questionRu: "Какой документ, кроме паспорта, нужен для открытия счёта?",
            questionUk: "Який документ, крім паспорта, потрібен для відкриття рахунку?",
            type: "choice",
            correctAnswer: "Meldebescheinigung",
            options: ["Führerschein", "Meldebescheinigung", "Geburtsurkunde", "Arbeitsvertrag"],
          },
          {
            questionRu: "Что такое «Dispokredit»?",
            questionUk: "Що таке «Dispokredit»?",
            type: "choice",
            correctAnswer: "Овердрафт",
            options: ["Кредитная карта", "Овердрафт", "Ипотека", "Депозит"],
          },
        ],
      },
      {
        type: "document",
        titleRu: "Онлайн-банкинг: первый вход",
        titleUk: "Онлайн-банкінг: перший вхід",
        germanText: `Willkommen bei Ihrem Online-Banking!

Ihre Zugangsdaten:
- Kontonummer: DE89 3704 0044 0532 0130 00 (IBAN)
- BLZ / BIC: COBADEFFXXX
- Erstanmeldung: Benutzername + Start-PIN (per Post)

Bitte ändern Sie Ihre PIN beim ersten Login.

Für Überweisungen benötigen Sie eine TAN.
TAN-Verfahren: pushTAN (App) oder chipTAN (Kartenleser).

Bei Fragen: Kundenservice 0800 123 456 (kostenlos)`,
        explanationRu: "Zugangsdaten — данные для входа. IBAN — международный номер счёта. BIC — код банка. PIN — персональный код. TAN — одноразовый код для подтверждения операций. Überweisung — перевод.",
        explanationUk: "Zugangsdaten — дані для входу. IBAN — міжнародний номер рахунку. BIC — код банку. PIN — персональний код. TAN — одноразовий код для підтвердження операцій. Überweisung — переказ.",
        questions: [
          {
            questionRu: "Что нужно сделать при первом входе?",
            questionUk: "Що потрібно зробити при першому вході?",
            type: "choice",
            correctAnswer: "Сменить PIN",
            options: ["Заказать карту", "Сменить PIN", "Сделать перевод", "Позвонить в банк"],
          },
          {
            questionRu: "Что такое TAN?",
            questionUk: "Що таке TAN?",
            type: "choice",
            correctAnswer: "Одноразовый код подтверждения",
            options: ["Номер счёта", "Одноразовый код подтверждения", "Пароль для входа", "Номер карты"],
          },
        ],
      },
    ],
  },
  {
    id: "polizei",
    icon: "🚔",
    titleRu: "Разговор с полицией",
    titleUk: "Розмова з поліцією",
    descRu: "Сообщи о краже или ДТП — знай свои права и нужные слова",
    descUk: "Повідом про крадіжку або ДТП — знай свої права та потрібні слова",
    difficulty: "B1",
    steps: [
      {
        type: "dialogue",
        titleRu: "Заявление о краже",
        titleUk: "Заява про крадіжку",
        germanText: `Polizist: Guten Tag, wie kann ich Ihnen helfen?
Sie: Mir wurde mein Fahrrad gestohlen. Ich möchte eine 
     Anzeige erstatten.
Polizist: Wann und wo ist das passiert?
Sie: Heute Morgen, vor dem Supermarkt in der Schillerstraße.
Polizist: War das Fahrrad abgeschlossen?
Sie: Ja, mit einem Schloss. Das Schloss wurde aufgebrochen.
Polizist: Können Sie das Fahrrad beschreiben?
Sie: Es ist ein schwarzes Herrenrad, Marke Cube, 
     Rahmennummer 12345.
Polizist: Haben Sie die Kaufquittung oder eine Rechnung?
Sie: Ja, ich habe die Rechnung zu Hause.
Polizist: Gut. Ich nehme Ihre Daten auf. Bitte bringen 
          Sie die Rechnung vorbei. Sie bekommen ein 
          Aktenzeichen für Ihre Versicherung.`,
        explanationRu: "Anzeige erstatten — подать заявление. Schloss — замок. Aufbrechen — взломать. Rahmennummer — номер рамы. Kaufquittung — чек. Aktenzeichen — номер дела. Versicherung — страховка.",
        explanationUk: "Anzeige erstatten — подати заяву. Schloss — замок. Aufbrechen — зламати. Rahmennummer — номер рами. Kaufquittung — чек. Aktenzeichen — номер справи. Versicherung — страховка.",
        questions: [
          {
            questionRu: "Как сказать «подать заявление в полицию»?",
            questionUk: "Як сказати «подати заяву в поліцію»?",
            type: "choice",
            correctAnswer: "Eine Anzeige erstatten",
            options: ["Einen Antrag stellen", "Eine Anzeige erstatten", "Eine Beschwerde einreichen", "Einen Bericht schreiben"],
          },
          {
            questionRu: "Как по-немецки «замок» (на велосипеде)?",
            questionUk: "Як німецькою «замок» (на велосипеді)?",
            type: "fill",
            correctAnswer: "Schloss",
            hintRu: "Schloss — и замок-здание, и замок-запор",
            hintUk: "Schloss — і замок-будівля, і замок-запор",
          },
          {
            questionRu: "Что нужно для страховой компании?",
            questionUk: "Що потрібно для страхової компанії?",
            type: "choice",
            correctAnswer: "Aktenzeichen",
            options: ["Führerschein", "Aktenzeichen", "Mietvertrag", "Geburtsurkunde"],
          },
        ],
      },
      {
        type: "dialogue",
        titleRu: "ДТП: обмен данными",
        titleUk: "ДТП: обмін даними",
        germanText: `Polizist: Was ist passiert?
Sie: Ich hatte einen Unfall. Der andere Fahrer ist bei 
     Rot über die Ampel gefahren.
Polizist: Ist jemand verletzt?
Sie: Nein, zum Glück nicht. Nur Blechschaden.
Polizist: Haben Sie den Unfallbericht schon ausgefüllt?
Sie: Nein, noch nicht.
Polizist: Bitte tauschen Sie mit dem anderen Fahrer folgende 
          Daten aus: Name, Adresse, Versicherungsnummer 
          und Kennzeichen. Machen Sie Fotos vom Schaden.
Sie: Muss ich auch meine Versicherung informieren?
Polizist: Ja, innerhalb von einer Woche.`,
        explanationRu: "Unfall — авария/ДТП. Ampel — светофор. Blechschaden — повреждение кузова. Unfallbericht — протокол ДТП. Versicherungsnummer — номер страховки. Kennzeichen — номерной знак. Schaden — ущерб.",
        explanationUk: "Unfall — аварія/ДТП. Ampel — світлофор. Blechschaden — пошкодження кузова. Unfallbericht — протокол ДТП. Versicherungsnummer — номер страховки. Kennzeichen — номерний знак. Schaden — збиток.",
        questions: [
          {
            questionRu: "Как по-немецки «светофор»?",
            questionUk: "Як німецькою «світлофор»?",
            type: "fill",
            correctAnswer: "Ampel",
            hintRu: "Короткое слово на A...",
            hintUk: "Коротке слово на A...",
          },
          {
            questionRu: "Что такое «Blechschaden»?",
            questionUk: "Що таке «Blechschaden»?",
            type: "choice",
            correctAnswer: "Повреждение кузова",
            options: ["Повреждение кузова", "Травма водителя", "Разбитое стекло", "Спущенное колесо"],
          },
          {
            questionRu: "В какой срок нужно сообщить страховой?",
            questionUk: "У який термін потрібно повідомити страхову?",
            type: "choice",
            correctAnswer: "В течение недели",
            options: ["Сразу на месте", "В течение 24 часов", "В течение недели", "В течение месяца"],
          },
        ],
      },
    ],
  },
  {
    id: "wohnungssuche",
    icon: "🔑",
    titleRu: "Wohnungssuche: Поиск квартиры",
    titleUk: "Wohnungssuche: Пошук квартири",
    descRu: "Ответь на объявление, пройди Besichtigung и подпиши Mietvertrag",
    descUk: "Відповідай на оголошення, пройди Besichtigung і підпиши Mietvertrag",
    difficulty: "B1",
    steps: [
      {
        type: "document",
        titleRu: "Объявление о квартире",
        titleUk: "Оголошення про квартиру",
        germanText: `2-Zi.-Whg., Prenzlauer Berg, 55 m², 3. OG, Altbau

Kaltmiete: 650 € / Nebenkosten: 200 € / Kaution: 1.950 €
Bezugsfrei ab: 01.05.2026

Ausstattung: Einbauküche, Balkon, Dielenboden, 
Badewanne, Kellerabteil, Fahrradstellplatz

Haustiere nach Absprache. 
Besichtigung nur mit Termin.

Bitte senden Sie Ihre Bewerbungsunterlagen:
- Selbstauskunft
- Schufa-Auskunft
- Gehaltsnachweise (letzte 3 Monate)
- Mieterselbstauskunft`,
        explanationRu: "Zi. = Zimmer (комната). Kaltmiete — аренда без коммуналки. Nebenkosten — коммунальные платежи. Kaution — залог (обычно 3 Kaltmieten). Schufa — кредитная история. Gehaltsnachweise — справки о зарплате.",
        explanationUk: "Zi. = Zimmer (кімната). Kaltmiete — оренда без комуналки. Nebenkosten — комунальні платежі. Kaution — застава (зазвичай 3 Kaltmieten). Schufa — кредитна історія. Gehaltsnachweise — довідки про зарплату.",
        questions: [
          {
            questionRu: "Сколько составляет полная месячная аренда (Warmmiete)?",
            questionUk: "Скільки складає повна місячна оренда (Warmmiete)?",
            type: "choice",
            correctAnswer: "850 €",
            options: ["650 €", "850 €", "1.950 €", "200 €"],
          },
          {
            questionRu: "Что такое «Kaution»?",
            questionUk: "Що таке «Kaution»?",
            type: "choice",
            correctAnswer: "Залог",
            options: ["Первый месяц аренды", "Залог", "Комиссия маклера", "Страховка"],
          },
          {
            questionRu: "Как по-немецки «справка о зарплате»?",
            questionUk: "Як німецькою «довідка про зарплату»?",
            type: "fill",
            correctAnswer: "Gehaltsnachweis",
            hintRu: "Gehalt (зарплата) + Nachweis (подтверждение)",
            hintUk: "Gehalt (зарплата) + Nachweis (підтвердження)",
          },
        ],
      },
    ],
  },
  {
    id: "jobcenter",
    icon: "📂",
    titleRu: "Jobcenter: Пособие и документы",
    titleUk: "Jobcenter: Допомога та документи",
    descRu: "Разберись с Bürgergeld — какие документы нужны и что говорить",
    descUk: "Розберись з Bürgergeld — які документи потрібні та що говорити",
    difficulty: "B2",
    steps: [
      {
        type: "document",
        titleRu: "Письмо из Jobcenter",
        titleUk: "Лист із Jobcenter",
        germanText: `Jobcenter Berlin-Mitte
Ihr Zeichen: BG-123456

Einladung zur Vorsprache

Sehr geehrte/r Antragsteller/in,

Sie werden gebeten, am 20.04.2026 um 09:00 Uhr 
persönlich bei Ihrem Sachbearbeiter vorzusprechen.

Bitte bringen Sie folgende Unterlagen mit:
1. Personalausweis / Aufenthaltstitel
2. Mietvertrag + letzte Nebenkostenabrechnung
3. Kontoauszüge der letzten 3 Monate
4. Arbeitsvertrag oder Kündigung

Bei Nichterscheinen kann Ihre Leistung gekürzt werden.

Raum 3.15, 3. Etage`,
        explanationRu: "Vorsprache — личная явка. Antragsteller — заявитель. Aufenthaltstitel — вид на жительство. Kontoauszüge — выписки из банка. Nebenkostenabrechnung — расчёт коммунальных. Leistung — пособие. Kürzung — сокращение.",
        explanationUk: "Vorsprache — особиста явка. Antragsteller — заявник. Aufenthaltstitel — посвідка на проживання. Kontoauszüge — виписки з банку. Nebenkostenabrechnung — розрахунок комунальних. Leistung — допомога. Kürzung — скорочення.",
        questions: [
          {
            questionRu: "Что будет, если не прийти?",
            questionUk: "Що буде, якщо не прийти?",
            type: "choice",
            correctAnswer: "Пособие могут сократить",
            options: ["Ничего не будет", "Пособие могут сократить", "Придёт полиция", "Пришлют повторное письмо"],
          },
          {
            questionRu: "Как по-немецки «выписка из банка»?",
            questionUk: "Як німецькою «виписка з банку»?",
            type: "fill",
            correctAnswer: "Kontoauszug",
            hintRu: "Konto (счёт) + Auszug (выписка)",
            hintUk: "Konto (рахунок) + Auszug (виписка)",
          },
          {
            questionRu: "Что такое «Aufenthaltstitel»?",
            questionUk: "Що таке «Aufenthaltstitel»?",
            type: "choice",
            correctAnswer: "Вид на жительство",
            options: ["Водительские права", "Вид на жительство", "Рабочая виза", "Студенческий билет"],
          },
        ],
      },
    ],
  },
  {
    id: "einkaufen",
    icon: "🛒",
    titleRu: "Supermarkt & Reklamation",
    titleUk: "Supermarkt & Reklamation",
    descRu: "Верни товар, пойми чек и разберись с Pfand-системой",
    descUk: "Поверни товар, зрозумій чек і розберися з Pfand-системою",
    difficulty: "A2",
    steps: [
      {
        type: "document",
        titleRu: "Немецкий чек (Kassenbon)",
        titleUk: "Німецький чек (Kassenbon)",
        germanText: `REWE Markt GmbH
Schönhauser Allee 36, 10435 Berlin

Vollmilch 3,5%        1,19 €  B
Bio-Brot              3,49 €  B
Mineralwasser 6er     2,99 €  A
  davon Pfand         1,50 €
Butter                2,29 €  B
----------------------------
Summe                 9,96 €
  MwSt A (19%)        0,48 €
  MwSt B (7%)         0,46 €
----------------------------
EC-Kartenzahlung      9,96 €

Pfandrückgabe möglich!
Bon aufbewahren.`,
        explanationRu: "MwSt = Mehrwertsteuer (НДС). A = 19% (обычная ставка), B = 7% (на продукты). Pfand — залог за бутылки. Kassenbon — чек. EC-Karte — банковская карта. Aufbewahren — сохранить.",
        explanationUk: "MwSt = Mehrwertsteuer (ПДВ). A = 19% (звичайна ставка), B = 7% (на продукти). Pfand — застава за пляшки. Kassenbon — чек. EC-Karte — банківська картка. Aufbewahren — зберегти.",
        questions: [
          {
            questionRu: "Сколько составляет Pfand за воду?",
            questionUk: "Скільки складає Pfand за воду?",
            type: "choice",
            correctAnswer: "1,50 €",
            options: ["0,25 €", "0,50 €", "1,50 €", "2,99 €"],
          },
          {
            questionRu: "Что означает буква «B» на чеке?",
            questionUk: "Що означає літера «B» на чеку?",
            type: "choice",
            correctAnswer: "НДС 7% (продукты)",
            options: ["НДС 19%", "НДС 7% (продукты)", "Без НДС", "Скидка"],
          },
          {
            questionRu: "Как по-немецки «сохранить чек»?",
            questionUk: "Як німецькою «зберегти чек»?",
            type: "fill",
            correctAnswer: "Bon aufbewahren",
            hintRu: "Bon (чек) + aufbewahren (сохранить)",
            hintUk: "Bon (чек) + aufbewahren (зберегти)",
          },
        ],
      },
      {
        type: "dialogue",
        titleRu: "Возврат товара (Umtausch)",
        titleUk: "Повернення товару (Umtausch)",
        germanText: `Verkäufer: Hallo, wie kann ich Ihnen helfen?
Sie: Ich möchte diesen Toaster umtauschen. Er funktioniert nicht.
Verkäufer: Haben Sie den Kassenbon dabei?
Sie: Ja, hier. Ich habe ihn vor zwei Tagen gekauft.
Verkäufer: Möchten Sie einen Umtausch oder eine Erstattung?
Sie: Eine Erstattung, bitte.
Verkäufer: Kein Problem. Der Betrag wird auf Ihre Karte 
           zurückgebucht. Das dauert 3-5 Werktage.`,
        explanationRu: "Umtausch — обмен. Erstattung — возврат денег. Zurückbuchen — вернуть на карту. Werktage — рабочие дни (без выходных). Kassenbon — чек.",
        explanationUk: "Umtausch — обмін. Erstattung — повернення грошей. Zurückbuchen — повернути на картку. Werktage — робочі дні (без вихідних). Kassenbon — чек.",
        questions: [
          {
            questionRu: "Как по-немецки «возврат денег»?",
            questionUk: "Як німецькою «повернення грошей»?",
            type: "fill",
            correctAnswer: "Erstattung",
            hintRu: "Erstatt... (возмещение)",
            hintUk: "Erstatt... (відшкодування)",
          },
          {
            questionRu: "Сколько ждать возврат на карту?",
            questionUk: "Скільки чекати повернення на картку?",
            type: "choice",
            correctAnswer: "3-5 рабочих дней",
            options: ["Сразу", "1 день", "3-5 рабочих дней", "2 недели"],
          },
        ],
      },
    ],
  },
  {
    id: "apotheke",
    icon: "💊",
    titleRu: "Apotheke: В аптеке",
    titleUk: "Apotheke: В аптеці",
    descRu: "Купи лекарство по рецепту и без — знай, что спросить",
    descUk: "Купи ліки за рецептом і без — знай, що запитати",
    difficulty: "A2",
    steps: [
      {
        type: "dialogue",
        titleRu: "В аптеке с рецептом",
        titleUk: "В аптеці з рецептом",
        germanText: `Apotheker: Guten Tag, was darf es sein?
Sie: Guten Tag, ich habe ein Rezept von meinem Arzt.
Apotheker: Einen Moment... Das Medikament ist leider 
           nicht vorrätig. Ich kann es bis morgen bestellen.
Sie: Gibt es eine Alternative?
Apotheker: Ja, es gibt ein Generikum mit dem gleichen 
           Wirkstoff. Das ist auch günstiger.
Sie: Gut, dann nehme ich das. Muss ich etwas zuzahlen?
Apotheker: Ja, die Zuzahlung beträgt 5 Euro. 
           Der Rest wird von der Krankenkasse übernommen.
Sie: Gibt es Nebenwirkungen?
Apotheker: Mögliche Nebenwirkungen: Müdigkeit und 
           Magenbeschwerden. Lesen Sie den Beipackzettel.`,
        explanationRu: "Vorrätig — в наличии. Generikum — дженерик. Wirkstoff — действующее вещество. Zuzahlung — доплата. Krankenkasse — больничная касса (страховая). Nebenwirkungen — побочные эффекты. Beipackzettel — инструкция к лекарству.",
        explanationUk: "Vorrätig — в наявності. Generikum — дженерик. Wirkstoff — діюча речовина. Zuzahlung — доплата. Krankenkasse — лікарняна каса (страхова). Nebenwirkungen — побічні ефекти. Beipackzettel — інструкція до ліків.",
        questions: [
          {
            questionRu: "Что такое «Zuzahlung»?",
            questionUk: "Що таке «Zuzahlung»?",
            type: "choice",
            correctAnswer: "Доплата пациента",
            options: ["Полная стоимость", "Доплата пациента", "Скидка", "Страховой взнос"],
          },
          {
            questionRu: "Как по-немецки «побочные эффекты»?",
            questionUk: "Як німецькою «побічні ефекти»?",
            type: "fill",
            correctAnswer: "Nebenwirkungen",
            hintRu: "Neben (побочные) + Wirkungen (эффекты)",
            hintUk: "Neben (побічні) + Wirkungen (ефекти)",
          },
          {
            questionRu: "Что такое «Beipackzettel»?",
            questionUk: "Що таке «Beipackzettel»?",
            type: "choice",
            correctAnswer: "Инструкция к лекарству",
            options: ["Рецепт врача", "Инструкция к лекарству", "Чек из аптеки", "Страховой полис"],
          },
        ],
      },
    ],
  },
  {
    id: "post",
    icon: "📮",
    titleRu: "Post & Paket: Почта и посылки",
    titleUk: "Post & Paket: Пошта та посилки",
    descRu: "Отправь посылку, забери Einschreiben и пойми извещение",
    descUk: "Відправ посилку, забери Einschreiben і зрозумій повідомлення",
    difficulty: "A2",
    steps: [
      {
        type: "document",
        titleRu: "Извещение о посылке",
        titleUk: "Повідомлення про посилку",
        germanText: `BENACHRICHTIGUNG

Sehr geehrter Empfänger,

für Sie lag heute eine Sendung vor, die nicht zugestellt 
werden konnte (Empfänger nicht angetroffen).

Sendungsart: Einschreiben mit Rückschein
Absender: Ausländerbehörde Berlin
Sendungsnummer: RR 1234 5678 9 DE

Die Sendung kann ab morgen in Ihrer Postfiliale 
abgeholt werden:

Postfiliale 502, Kastanienallee 12
Öffnungszeiten: Mo-Fr 9-18, Sa 9-13

Bitte bringen Sie einen Lichtbildausweis mit.
Lagerfrist: 7 Werktage`,
        explanationRu: "Benachrichtigung — извещение. Empfänger — получатель. Zugestellt — доставлено. Einschreiben — заказное письмо. Rückschein — уведомление о вручении. Absender — отправитель. Lichtbildausweis — удостоверение с фото. Lagerfrist — срок хранения.",
        explanationUk: "Benachrichtigung — повідомлення. Empfänger — отримувач. Zugestellt — доставлено. Einschreiben — рекомендований лист. Rückschein — повідомлення про вручення. Absender — відправник. Lichtbildausweis — посвідчення з фото. Lagerfrist — термін зберігання.",
        questions: [
          {
            questionRu: "Кто отправитель письма?",
            questionUk: "Хто відправник листа?",
            type: "choice",
            correctAnswer: "Ausländerbehörde",
            options: ["Finanzamt", "Ausländerbehörde", "Jobcenter", "Krankenkasse"],
          },
          {
            questionRu: "Что нужно взять с собой на почту?",
            questionUk: "Що потрібно взяти з собою на пошту?",
            type: "fill",
            correctAnswer: "Lichtbildausweis",
            hintRu: "Lichtbild (фото) + Ausweis (удостоверение)",
            hintUk: "Lichtbild (фото) + Ausweis (посвідчення)",
          },
          {
            questionRu: "Сколько дней хранится посылка?",
            questionUk: "Скільки днів зберігається посилка?",
            type: "choice",
            correctAnswer: "7 рабочих дней",
            options: ["3 дня", "7 рабочих дней", "14 дней", "30 дней"],
          },
        ],
      },
      {
        type: "dialogue",
        titleRu: "Отправка посылки",
        titleUk: "Відправка посилки",
        germanText: `Postmitarbeiter: Guten Tag, was möchten Sie versenden?
Sie: Ich möchte dieses Paket nach Ukraine schicken.
Postmitarbeiter: Wie schwer ist es?
Sie: Ungefähr 3 Kilo.
Postmitarbeiter: Möchten Sie Standard- oder Expressversand?
Sie: Was kostet der Expressversand?
Postmitarbeiter: 45,99 Euro, Lieferzeit 3-5 Werktage. 
                 Standard kostet 15,99 Euro, dauert aber 
                 10-14 Werktage.
Sie: Standard, bitte. Kann ich das Paket versichern?
Postmitarbeiter: Ja, bis 500 Euro für 4,50 Euro extra.
Sie: Ja, bitte mit Versicherung.
Postmitarbeiter: Füllen Sie bitte die Zollinhaltserklärung aus.`,
        explanationRu: "Versenden — отправлять. Expressversand — экспресс-доставка. Lieferzeit — срок доставки. Versichern — застраховать. Zollinhaltserklärung — таможенная декларация содержимого.",
        explanationUk: "Versenden — відправляти. Expressversand — експрес-доставка. Lieferzeit — термін доставки. Versichern — застрахувати. Zollinhaltserklärung — митна декларація вмісту.",
        questions: [
          {
            questionRu: "Что нужно заполнить для международной посылки?",
            questionUk: "Що потрібно заповнити для міжнародної посилки?",
            type: "fill",
            correctAnswer: "Zollinhaltserklärung",
            hintRu: "Zoll (таможня) + Inhalt (содержимое) + Erklärung (декларация)",
            hintUk: "Zoll (митниця) + Inhalt (вміст) + Erklärung (декларація)",
          },
          {
            questionRu: "Сколько стоит страховка?",
            questionUk: "Скільки коштує страховка?",
            type: "choice",
            correctAnswer: "4,50 €",
            options: ["2,50 €", "4,50 €", "10,00 €", "15,99 €"],
          },
        ],
      },
    ],
  },
];

const LebenInDeutschland = ({ onBack }: { onBack: () => void }) => {
  const { t, lang } = useLanguage();
  const { isMobile } = usePlatform();
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [completed, setCompleted] = useState(false);

  const isRu = lang === "ru";

  const resetGame = () => {
    setSelectedScenario(null);
    setCurrentStep(0);
    setCurrentQuestion(0);
    setAnswers({});
    setShowResult(null);
    setInputValue("");
    setScore(0);
    setTotalAnswered(0);
    setShowExplanation(false);
    setCompleted(false);
  };

  const handleAnswer = (answer: string) => {
    if (showResult !== null) return;
    const step = selectedScenario!.steps[currentStep];
    const question = step.questions[currentQuestion];
    const isCorrect = answer.trim().toLowerCase() === question.correctAnswer.toLowerCase();
    
    setShowResult(isCorrect);
    setTotalAnswered((p) => p + 1);
    if (isCorrect) setScore((p) => p + 1);
  };

  const nextQuestion = () => {
    const step = selectedScenario!.steps[currentStep];
    if (currentQuestion + 1 < step.questions.length) {
      setCurrentQuestion((q) => q + 1);
      setShowResult(null);
      setInputValue("");
    } else if (currentStep + 1 < selectedScenario!.steps.length) {
      setCurrentStep((s) => s + 1);
      setCurrentQuestion(0);
      setShowResult(null);
      setInputValue("");
      setShowExplanation(false);
    } else {
      setCompleted(true);
    }
  };

  // ── Scenario list ──
  if (!selectedScenario) {
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </button>

        <h1 className="font-display text-xl font-bold text-foreground mb-1 flex items-center gap-2">
          🏛 {isRu ? "Жизнь в Германии" : "Життя в Німеччині"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {isRu
            ? "Реальные документы, письма и ситуации — то, что нужно каждый день"
            : "Реальні документи, листи та ситуації — те, що потрібно щодня"}
        </p>

        <div className="space-y-3">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedScenario(s)}
              className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl flex-shrink-0">
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {isRu ? s.titleRu : s.titleUk}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {s.difficulty}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isRu ? s.descRu : s.descUk}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Completed ──
  if (completed) {
    const pct = Math.round((score / totalAnswered) * 100);
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <div className="glass-card p-8 text-center space-y-4">
          <div className="text-5xl mb-2">{pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "📚"}</div>
          <h2 className="font-display text-xl font-bold text-foreground">
            {isRu ? "Сценарий пройден!" : "Сценарій пройдено!"}
          </h2>
          <p className="text-3xl font-bold text-primary">
            {score}/{totalAnswered}
          </p>
          <p className="text-sm text-muted-foreground">
            {pct >= 80
              ? isRu ? "Отлично! Ты готов к жизни в Германии 🇩🇪" : "Чудово! Ти готовий до життя в Німеччині 🇩🇪"
              : isRu ? "Повтори сценарий, чтобы запомнить лучше" : "Повтори сценарій, щоб запам'ятати краще"}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={resetGame} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              {isRu ? "К списку" : "До списку"}
            </Button>
            <Button onClick={() => { setCompleted(false); setCurrentStep(0); setCurrentQuestion(0); setShowResult(null); setInputValue(""); setScore(0); setTotalAnswered(0); setShowExplanation(false); }} className="gap-2">
              <Star className="w-4 h-4" />
              {isRu ? "Ещё раз" : "Ще раз"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active scenario ──
  const step = selectedScenario.steps[currentStep];
  const question = step.questions[currentQuestion];

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      <button
        onClick={resetGame}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back")}
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
          {selectedScenario.icon} {isRu ? step.titleRu : step.titleUk}
        </h2>
        <span className="text-xs text-muted-foreground">
          {currentStep + 1}/{selectedScenario.steps.length} • {currentQuestion + 1}/{step.questions.length}
        </span>
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 rounded-full bg-muted mb-5">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{
            width: `${((currentStep * step.questions.length + currentQuestion) / (selectedScenario.steps.reduce((a, s) => a + s.questions.length, 0))) * 100}%`,
          }}
        />
      </div>

      {/* German document */}
      <div className="glass-card p-4 mb-4 border-l-4 border-primary/40">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary uppercase tracking-wide">
            {step.type === "form" ? "Formular" : step.type === "letter" ? "Brief" : step.type === "dialogue" ? "Dialog" : "Dokument"}
          </span>
        </div>
        <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
          {step.germanText}
        </pre>
      </div>

      {/* Explanation toggle */}
      <button
        onClick={() => setShowExplanation(!showExplanation)}
        className="text-xs text-primary hover:underline mb-4 flex items-center gap-1"
      >
        💡 {isRu ? (showExplanation ? "Скрыть подсказку" : "Показать перевод/объяснение") : (showExplanation ? "Сховати підказку" : "Показати переклад/пояснення")}
      </button>

      {showExplanation && (
        <div className="glass-card p-3 mb-4 bg-accent/5 border-accent/20">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isRu ? step.explanationRu : step.explanationUk}
          </p>
        </div>
      )}

      {/* Question */}
      <div className="glass-card p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">
          {isRu ? question.questionRu : question.questionUk}
        </p>

        {question.type === "choice" ? (
          <div className="space-y-2">
            {question.options!.map((opt) => {
              const isCorrectOpt = opt === question.correctAnswer;
              const isSelected = showResult !== null && opt === question.correctAnswer;
              return (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  disabled={showResult !== null}
                  className={cn(
                    "w-full p-3 rounded-xl text-sm text-left transition-all border",
                    showResult === null
                      ? "border-border hover:border-primary/40 hover:bg-primary/5"
                      : isCorrectOpt
                      ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                      : "border-border opacity-50"
                  )}
                >
                  {opt}
                  {showResult !== null && isCorrectOpt && (
                    <CheckCircle2 className="w-4 h-4 inline ml-2 text-green-500" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isRu ? "Введите ответ..." : "Введіть відповідь..."}
              disabled={showResult !== null}
              onKeyDown={(e) => e.key === "Enter" && inputValue.trim() && handleAnswer(inputValue)}
              className="text-sm"
            />
            {question.hintRu && showResult === null && (
              <p className="text-[11px] text-muted-foreground">
                💡 {isRu ? question.hintRu : question.hintUk}
              </p>
            )}
            {showResult === null && (
              <Button
                size="sm"
                onClick={() => handleAnswer(inputValue)}
                disabled={!inputValue.trim()}
                className="w-full"
              >
                {isRu ? "Проверить" : "Перевірити"}
              </Button>
            )}
          </div>
        )}

        {/* Result feedback */}
        {showResult !== null && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-xl text-sm",
            showResult ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"
          )}>
            {showResult ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                {isRu ? "Правильно!" : "Правильно!"}
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                {isRu ? `Ответ: ${question.correctAnswer}` : `Відповідь: ${question.correctAnswer}`}
              </>
            )}
          </div>
        )}

        {showResult !== null && (
          <Button onClick={nextQuestion} className="w-full">
            {isRu ? "Далее →" : "Далі →"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default LebenInDeutschland;
