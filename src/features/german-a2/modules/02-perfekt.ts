import type { CourseModule, Exercise, L, MC } from '../types';

const l = (ua: string, de: string): L => ({ ua, de });
/** Richtig/Falsch-вправа. */
const rf = (q: string, ok: boolean, explain?: L): MC => ({
  type: 'mc', prompt: l('Правильно чи ні?', 'Richtig oder falsch?'), q, options: ['richtig', 'falsch'], answer: ok ? 0 : 1, keepOrder: true, explain,
});

/* ════════════════ WORTSCHATZ ════════════════ */

const verbsExercises: Exercise[] = [
  { type: 'match', pairs: [['fahren', 'ist gefahren'], ['kochen', 'hat gekocht'], ['aufstehen', 'ist aufgestanden'], ['essen', 'hat gegessen'], ['bleiben', 'ist geblieben'], ['treffen', 'hat getroffen']] },
  { type: 'match', prompt: l('З’єднайте німецьке слово з перекладом.', 'Ordne die Übersetzung zu.'), pairs: [['besuchen', 'відвідувати'], ['einkaufen', 'робити покупки'], ['schlafen', 'спати'], ['ankommen', 'прибувати'], ['laufen', 'бігти / ходити пішки'], ['telefonieren', 'розмовляти телефоном']] },
  { type: 'gap', text: 'Wir {{sind}} nach Wien {{gefahren}}.', hint: 'fahren' },
  { type: 'gap', text: 'Ich {{habe}} mit meiner Mutter {{telefoniert}}.', hint: 'telefonieren' },
  { type: 'translate', ua: 'Ми залишилися вдома.', answers: ['Wir sind zu Hause geblieben.', 'Wir sind zuhause geblieben.'] },
  { type: 'translate', ua: 'Я відвідав бабусю.', answers: ['Ich habe meine Oma besucht.', 'Ich habe meine Großmutter besucht.'] },
];

const adjExercises: Exercise[] = [
  { type: 'match', prompt: l('Знайдіть антоніми.', 'Finde das Gegenteil.'), pairs: [['schön', 'hässlich'], ['teuer', 'billig'], ['laut', 'leise'], ['voll', 'leer'], ['warm', 'kalt'], ['schnell', 'langsam']] },
  { type: 'match', prompt: l('Знайдіть антоніми.', 'Finde das Gegenteil.'), pairs: [['interessant', 'langweilig'], ['bequem', 'unbequem'], ['freundlich', 'unfreundlich'], ['pünktlich', 'unpünktlich'], ['anstrengend', 'entspannend'], ['lustig', 'ernst']] },
  { type: 'sort', categories: ['positiv', 'negativ'], items: [['wunderbar', 0], ['furchtbar', 1], ['bequem', 0], ['unbequem', 1], ['freundlich', 0], ['unfreundlich', 1], ['ekelhaft', 1], ['lecker', 0]] },
  { type: 'gapselect', text: 'Ich habe nur drei Stunden geschlafen. Ich war sehr [[müde|wach]].' },
  { type: 'gapselect', text: 'Der Bus war [[voll|leer]]. Wir haben keinen Sitzplatz gefunden.' },
  { type: 'translate', ua: 'Фільм був дуже цікавий.', answers: ['Der Film war sehr interessant.'] },
];

const timeExercises: Exercise[] = [
  { type: 'match', prompt: l('З’єднайте німецьке слово з перекладом.', 'Ordne die Übersetzung zu.'), pairs: [['gestern', 'вчора'], ['vorgestern', 'позавчора'], ['letzte Woche', 'минулого тижня'], ['neulich', 'нещодавно'], ['schließlich', 'нарешті'], ['danach', 'після цього']] },
  { type: 'gapselect', text: 'Wir waren [[letztes|letzte|letzten]] Jahr in Polen.' },
  { type: 'gapselect', text: 'Ich war [[letzte|letzten|letztes]] Woche krank und [[letzten|letzte|letztes]] Monat in Berlin.' },
  { type: 'gapselect', text: 'Ich habe ihn vor [[einer|einem|ein]] Woche gesehen und vor [[einem|einer|ein]] Monat angerufen.' },
  { type: 'order', words: ['Letzte', 'Woche', 'bin', 'ich', 'nach', 'Wien', 'gefahren.'], alt: [['Ich', 'bin', 'letzte', 'Woche', 'nach', 'Wien', 'gefahren.']], translation: 'Минулого тижня я їздив до Відня.' },
  { type: 'order', words: ['Zuerst', 'habe', 'ich', 'gefrühstückt,', 'dann', 'habe', 'ich', 'gearbeitet.'], translation: 'Спочатку я поснідав, потім працював.' },
];

/* ════════════════ GRAMMATIK ════════════════ */

const gBasics: CourseModule['grammar'][number] = {
  id: 'basics',
  title: l('Що таке Perfekt і як він будується', 'Was ist das Perfekt?'),
  blocks: [
    { t: 'p', text: l(
      'Perfekt — найпоширеніша форма минулого в розмові, у повідомленнях і листах другові. Коли ти розповідаєш, що робив учора чи на вихідних, ти майже завжди вживаєш Perfekt.',
      'Das Perfekt benutzen wir, wenn wir sprechen oder eine private Nachricht schreiben: „Was hast du gestern gemacht?“ – „Ich habe Pizza gegessen.“') },
    { t: 'sentence', words: [{ w: 'Ich', role: 'subj' }, { w: 'habe', role: 'aux' }, { w: 'gestern', role: 'time' }, { w: 'Pizza', role: 'obj' }, { w: 'gegessen.', role: 'part' }], ua: 'Вчора я їв піцу.' },
    { t: 'p', text: l(
      'Формула: підмет + haben/sein (на 2-му місці) + … + Partizip II (в кінці). Дієслово ніби розділяється на дві частини, між якими стоїть решта речення. Це «рамка» (Satzklammer).',
      'Formel: Subjekt + haben/sein (Position 2) + … + Partizip II (am Ende). Das Verb bildet eine Klammer, in der Mitte steht der Rest.') },
    { t: 'table', head: ['', 'haben', 'sein'], rows: [
      ['ich', 'habe', 'bin'], ['du', 'hast', 'bist'], ['er / sie / es', 'hat', 'ist'],
      ['wir', 'haben', 'sind'], ['ihr', 'habt', 'seid'], ['sie / Sie', 'haben', 'sind'] ] },
    { t: 'sentence', words: [{ w: 'Wir', role: 'subj' }, { w: 'sind', role: 'aux' }, { w: 'am Samstag', role: 'time' }, { w: 'nach Dresden', role: 'obj' }, { w: 'gefahren.', role: 'part' }], ua: 'У суботу ми поїхали до Дрездена.' },
    { t: 'warn', text: l('Змінюється тільки haben/sein (за особою). Partizip II не змінюється ніколи.', 'Nur haben/sein ändert sich. Das Partizip II bleibt immer gleich.') },
    { t: 'examples', items: [
      { de: 'Hast du gestern lange geschlafen?', ua: 'Ти вчора довго спав?' },
      { de: 'Mia hat einen Kuchen gebacken.', ua: 'Міа спекла пиріг.' },
      { de: 'Wir sind früh angekommen.', ua: 'Ми приїхали рано.' } ] },
  ],
  exercises: [
    { type: 'mc', q: 'Wo steht das Partizip II im Hauptsatz?', options: ['am Ende', 'auf Position 2', 'auf Position 1', 'direkt nach dem Subjekt'], answer: 0, explain: l('Haben/sein — на 2-му місці, Partizip II — у кінці: «рамка».', 'Haben/sein auf Position 2, Partizip II am Ende: die Satzklammer.') },
    { type: 'order', words: ['Ich', 'habe', 'gestern', 'Pizza', 'gegessen.'], alt: [['Gestern', 'habe', 'ich', 'Pizza', 'gegessen.']], translation: 'Вчора я їв піцу.' },
    { type: 'gap', text: 'Du {{hast}} gestern lange {{geschlafen}}.', hint: 'schlafen' },
    { type: 'gapselect', text: 'Ich [[habe|hast|hat]] Kaffee getrunken, und du [[hast|habe|hat]] Tee getrunken.' },
    { type: 'gapselect', text: 'Wir [[haben|hat|habt]] Pizza gegessen, und ihr [[habt|haben|hast]] Salat gegessen.' },
    { type: 'fix', wrong: 'Ich habe gestern gegessen Pizza.', answers: ['Ich habe gestern Pizza gegessen.'], explain: l('Partizip II — завжди в кінці речення.', 'Das Partizip II steht am Ende.') },
    { type: 'fix', wrong: 'Gestern ich habe Kaffee getrunken.', answers: ['Gestern habe ich Kaffee getrunken.'], explain: l('Haben завжди на 2-му місці: Gestern (1) habe (2) ich (3).', 'Haben bleibt auf Position 2: Gestern (1) habe (2) ich (3).') },
    { type: 'translate', ua: 'Ми вчора купили хліб.', answers: ['Wir haben gestern Brot gekauft.', 'Gestern haben wir Brot gekauft.'] },
    { type: 'mc', q: 'Welcher Satz ist richtig?', options: ['Er hat gestern Fußball gespielt.', 'Er gestern hat Fußball gespielt.', 'Er hat gespielt gestern Fußball.', 'Er hat gestern gespielt Fußball.'], answer: 0 },
  ],
};

const gRegular: CourseModule['grammar'][number] = {
  id: 'regular',
  title: l('Правильні дієслова: ge-…-t', 'Regelmäßige Verben: ge-…-t'),
  blocks: [
    { t: 'p', text: l('Правильні (слабкі) дієслова утворюють Partizip II за схемою ge + корінь + t. Корінь не змінюється.', 'Regelmäßige Verben: ge + Stamm + t. Der Stamm bleibt gleich.') },
    { t: 'table', head: ['Infinitiv', 'Stamm', 'Partizip II'], rows: [
      ['machen', 'mach', 'gemacht'], ['spielen', 'spiel', 'gespielt'], ['kaufen', 'kauf', 'gekauft'], ['lernen', 'lern', 'gelernt'], ['kochen', 'koch', 'gekocht'], ['hören', 'hör', 'gehört'] ] },
    { t: 'h', text: l('Корінь на -t, -d або кілька приголосних: -et', 'Stamm auf -t, -d oder mehrere Konsonanten: -et') },
    { t: 'p', text: l('Тут для вимови додається -e-: gearbeit-et. Ці дієслова треба запам’ятати.', 'Hier sprechen wir ein -e- mit: gearbeit-et. Diese Verben lernst du als Gruppe.') },
    { t: 'table', head: ['Infinitiv', 'Partizip II'], rows: [
      ['arbeiten', 'gearbeitet'], ['warten', 'gewartet'], ['baden', 'gebadet'], ['öffnen', 'geöffnet'], ['regnen', 'geregnet'], ['kosten', 'gekostet'] ] },
    { t: 'tip', text: l('Схема ge + корінь + t: «грав» → ge-spiel-t, «купив» → ge-kauf-t. Закінчення -t у Partizip II — ознака правильного дієслова.', 'Merke: fast alle Verben mit -t am Ende sind regelmäßig: gemacht, gekauft, gespielt.') },
  ],
  exercises: [
    { type: 'gap', text: 'Er hat den ganzen Tag {{gearbeitet}}.', hint: 'arbeiten' },
    { type: 'gap', text: 'Wir haben im Park {{gespielt}} und Musik {{gehört}}.', hint: 'spielen, hören' },
    { type: 'gap', text: 'Es hat am Wochenende {{geregnet}}.', hint: 'regnen' },
    { type: 'gap', text: 'Ich habe zwei Stunden auf den Bus {{gewartet}}.', hint: 'warten' },
    { type: 'gap', text: 'Sie hat die Tür {{geöffnet}}.', hint: 'öffnen' },
    { type: 'gap', text: 'Hast du heute schon Deutsch {{gelernt}}?', hint: 'lernen' },
    { type: 'match', pairs: [['machen', 'gemacht'], ['kaufen', 'gekauft'], ['baden', 'gebadet'], ['warten', 'gewartet'], ['regnen', 'geregnet'], ['lernen', 'gelernt']] },
    { type: 'sort', prompt: l('Яке закінчення: -t чи -et?', 'Endet das Partizip auf -t oder -et?'), categories: ['ge…t', 'ge…et'], items: [['gemacht', 0], ['gearbeitet', 1], ['gespielt', 0], ['gewartet', 1], ['gebadet', 1], ['gekauft', 0], ['geöffnet', 1], ['gelernt', 0]] },
    { type: 'fix', wrong: 'Ich habe gestern lange gearbeit.', answers: ['Ich habe gestern lange gearbeitet.'], explain: l('Корінь на -t → потрібне -et.', 'Stamm auf -t → Endung -et.') },
  ],
};

const gIrregular: CourseModule['grammar'][number] = {
  id: 'irregular',
  title: l('Неправильні дієслова: ge-…-en', 'Unregelmäßige Verben: ge-…-en'),
  blocks: [
    { t: 'p', text: l('Неправильні (сильні) дієслова мають закінчення -en, а корінь часто змінює голосну. Їх треба вчити напам’ять разом з haben/sein.', 'Unregelmäßige Verben enden auf -en, und der Vokal ändert sich oft. Lerne sie immer zusammen mit haben/sein.') },
    { t: 'table', head: ['Infinitiv', 'Perfekt', { ua: 'Переклад', de: 'Bedeutung' }], rows: [
      ['sehen', 'hat gesehen', l('бачити', 'to see')], ['essen', 'hat gegessen', l('їсти', 'to eat')], ['trinken', 'hat getrunken', l('пити', 'to drink')],
      ['schreiben', 'hat geschrieben', l('писати', 'to write')], ['lesen', 'hat gelesen', l('читати', 'to read')], ['sprechen', 'hat gesprochen', l('говорити', 'to speak')],
      ['nehmen', 'hat genommen', l('брати', 'to take')], ['geben', 'hat gegeben', l('давати', 'to give')], ['finden', 'hat gefunden', l('знаходити', 'to find')],
      ['schlafen', 'hat geschlafen', l('спати', 'to sleep')], ['helfen', 'hat geholfen', l('допомагати', 'to help')], ['treffen', 'hat getroffen', l('зустрічати', 'to meet')],
      ['fahren', 'ist gefahren', l('їхати', 'to drive')], ['gehen', 'ist gegangen', l('йти', 'to go')], ['kommen', 'ist gekommen', l('приходити', 'to come')],
      ['bleiben', 'ist geblieben', l('залишатися', 'to stay')], ['fliegen', 'ist geflogen', l('летіти', 'to fly')], ['laufen', 'ist gelaufen', l('бігти', 'to run')] ] },
    { t: 'h', text: l('Змішані дієслова: нова основа + -t', 'Gemischte Verben: neuer Stamm + -t') },
    { t: 'table', head: ['Infinitiv', 'Perfekt'], rows: [
      ['bringen', 'hat gebracht'], ['denken', 'hat gedacht'], ['wissen', 'hat gewusst'], ['kennen', 'hat gekannt'], ['nennen', 'hat genannt'], ['rennen', 'ist gerannt'] ] },
    { t: 'tip', text: l('Вчи так: «fahren – ist gefahren», а не просто «gefahren». Тоді haben/sein запам’ятається автоматично.', 'Lerne immer: „fahren – ist gefahren“, nicht nur „gefahren“.') },
    { t: 'warn', text: l('Дієслова sein і haben у розмові зазвичай вживають у Präteritum: «Ich war müde», «Ich hatte Zeit» (модуль 3), а не «ich bin gewesen».', 'Bei sein und haben sagen wir meistens: „Ich war müde“, „Ich hatte Zeit“ (Modul 3).') },
  ],
  exercises: [
    { type: 'match', pairs: [['sehen', 'gesehen'], ['essen', 'gegessen'], ['trinken', 'getrunken'], ['schreiben', 'geschrieben'], ['finden', 'gefunden'], ['geben', 'gegeben']] },
    { type: 'match', pairs: [['nehmen', 'genommen'], ['sprechen', 'gesprochen'], ['helfen', 'geholfen'], ['lesen', 'gelesen'], ['treffen', 'getroffen'], ['schlafen', 'geschlafen']] },
    { type: 'gap', text: 'Ich habe ein Buch {{gelesen}}.', hint: 'lesen' },
    { type: 'gap', text: 'Wir haben im Restaurant Fisch {{gegessen}} und Wasser {{getrunken}}.', hint: 'essen, trinken' },
    { type: 'gap', text: 'Hast du meine Tasche {{gefunden}}?', hint: 'finden' },
    { type: 'gap', text: 'Sie hat mit dem Lehrer {{gesprochen}}.', hint: 'sprechen' },
    { type: 'gap', text: 'Er hat mir ein Geschenk {{gebracht}}, und ich habe an ihn {{gedacht}}.', hint: 'bringen, denken' },
    { type: 'fix', wrong: 'Ich habe gestern einen Film gesehet.', answers: ['Ich habe gestern einen Film gesehen.'], explain: l('sehen — неправильне дієслово: gesehen.', 'sehen ist unregelmäßig: gesehen.') },
    { type: 'fix', wrong: 'Wir haben ein Taxi genehmt.', answers: ['Wir haben ein Taxi genommen.'] },
    { type: 'translate', ua: 'Я написав їй листа.', answers: ['Ich habe ihr einen Brief geschrieben.'] },
  ],
};

const gPrefix: CourseModule['grammar'][number] = {
  id: 'prefix',
  title: l('Префікси: відокремлювані, невіддільні, -ieren', 'Trennbar, untrennbar, -ieren'),
  blocks: [
    { t: 'h', text: l('Відокремлювані дієслова: ge- посередині', 'Trennbare Verben: ge- in der Mitte') },
    { t: 'table', head: ['Infinitiv', 'Partizip II'], rows: [
      ['aufstehen', 'aufgestanden'], ['einkaufen', 'eingekauft'], ['anrufen', 'angerufen'], ['mitkommen', 'mitgekommen'], ['fernsehen', 'ferngesehen'], ['ankommen', 'angekommen'], ['ausgehen', 'ausgegangen'] ] },
    { t: 'h', text: l('Невіддільні префікси (be-, emp-, ent-, er-, ge-, ver-, zer-): без ge-', 'Untrennbare Präfixe (be-, emp-, ent-, er-, ge-, ver-, zer-): kein ge-') },
    { t: 'table', head: ['Infinitiv', 'Partizip II'], rows: [
      ['besuchen', 'besucht'], ['bekommen', 'bekommen'], ['verstehen', 'verstanden'], ['vergessen', 'vergessen'], ['erzählen', 'erzählt'], ['entscheiden', 'entschieden'], ['empfehlen', 'empfohlen'] ] },
    { t: 'h', text: l('Дієслова на -ieren: теж без ge-', 'Verben auf -ieren: auch kein ge-') },
    { t: 'table', head: ['Infinitiv', 'Partizip II'], rows: [
      ['telefonieren', 'telefoniert'], ['studieren', 'studiert'], ['reservieren', 'reserviert'], ['fotografieren', 'fotografiert'], ['passieren', 'ist passiert'] ] },
    { t: 'sentence', words: [{ w: 'Ich', role: 'subj' }, { w: 'bin', role: 'aux' }, { w: 'um sieben Uhr', role: 'time' }, { w: 'aufgestanden.', role: 'part' }], ua: 'Я встав о сьомій.' },
    { t: 'sentence', words: [{ w: 'Ich', role: 'subj' }, { w: 'habe', role: 'aux' }, { w: 'meine Oma', role: 'obj' }, { w: 'besucht.', role: 'part' }], ua: 'Я відвідав бабусю.' },
    { t: 'tip', text: l('Наголос на префіксі (AUF-stehen) → префікс відокремлюється, ge- стає всередину. Префікс без наголосу (be-SU-chen) → ge- не потрібне.', 'Betonung auf dem Präfix (AUF-stehen) → ge- kommt in die Mitte. Präfix ohne Betonung (be-SU-chen) → kein ge-.') },
  ],
  exercises: [
    { type: 'sort', prompt: l('Де стоїть ge-?', 'Wo steht ge-?'), categories: ['ge- vorne', 'ge- in der Mitte', 'kein ge-'], items: [['gemacht', 0], ['aufgestanden', 1], ['besucht', 2], ['eingekauft', 1], ['verstanden', 2], ['telefoniert', 2], ['gespielt', 0], ['angerufen', 1], ['vergessen', 2], ['gelernt', 0]] },
    { type: 'gap', text: 'Ich bin heute um sechs Uhr {{aufgestanden}}.', hint: 'aufstehen' },
    { type: 'gap', text: 'Wir haben im Supermarkt {{eingekauft}}.', hint: 'einkaufen' },
    { type: 'gap', text: 'Hast du ihn schon {{angerufen}}?', hint: 'anrufen' },
    { type: 'gap', text: 'Ich habe meine Tante {{besucht}}.', hint: 'besuchen' },
    { type: 'gap', text: 'Er hat die Aufgabe nicht {{verstanden}}.', hint: 'verstehen' },
    { type: 'gap', text: 'Sie hat eine Stunde mit ihrer Freundin {{telefoniert}}.', hint: 'telefonieren' },
    { type: 'gap', text: 'Ich habe mein Handy zu Hause {{vergessen}}.', hint: 'vergessen' },
    { type: 'match', pairs: [['ankommen', 'angekommen'], ['mitkommen', 'mitgekommen'], ['erzählen', 'erzählt'], ['bekommen', 'bekommen'], ['reservieren', 'reserviert'], ['fernsehen', 'ferngesehen']] },
    { type: 'fix', wrong: 'Ich habe gestern meine Oma gebesucht.', answers: ['Ich habe gestern meine Oma besucht.'], explain: l('Префікс be- невіддільний → без ge-.', 'be- ist untrennbar → kein ge-.') },
    { type: 'fix', wrong: 'Wir haben lange gefernsehen.', answers: ['Wir haben lange ferngesehen.'] },
    { type: 'translate', ua: 'Я забув ключ.', answers: ['Ich habe den Schlüssel vergessen.', 'Ich habe meinen Schlüssel vergessen.'] },
  ],
};

const gAux: CourseModule['grammar'][number] = {
  id: 'aux',
  title: l('haben чи sein?', 'haben oder sein?'),
  blocks: [
    { t: 'p', text: l('Більшість дієслів утворюють Perfekt з haben. З sein — лише певні групи.', 'Die meisten Verben bilden das Perfekt mit haben. Mit sein nur bestimmte Gruppen.') },
    { t: 'table', head: [l('Група', 'Gruppe'), l('Приклади', 'Beispiele')], rows: [
      [l('sein: рух з точки A в точку B', 'sein: Bewegung von A nach B'), 'fahren, gehen, fliegen, kommen, laufen, reisen, ankommen, abfahren'],
      [l('sein: зміна стану', 'sein: Zustandsänderung'), 'aufstehen, einschlafen, aufwachen, werden, wachsen'],
      [l('sein: винятки', 'sein: Ausnahmen'), 'sein, bleiben, passieren'],
      [l('haben: всі інші', 'haben: alle anderen'), 'kaufen, essen, sehen, schlafen, arbeiten, lernen, telefonieren, spielen, regnen'] ] },
    { t: 'examples', items: [
      { de: 'Ich habe zehn Stunden geschlafen.', ua: 'Я спав десять годин (стан, без зміни).' },
      { de: 'Ich bin um 22 Uhr eingeschlafen.', ua: 'Я заснув о 22:00 (зміна стану: прокинувся → заснув).' },
      { de: 'Wir sind nach Hamburg gefahren.', ua: 'Ми поїхали до Гамбурга (рух A→B).' } ] },
    { t: 'tip', text: l('Якщо є додаток в Akkusativ (kaufen, essen, sehen …) — майже завжди haben: «Er hat das Auto in die Garage gefahren». Sein — коли ти сам кудись їдеш.', 'Mit Akkusativobjekt: fast immer haben („Er hat das Auto gefahren“). Wenn du selbst irgendwohin fährst: sein.') },
  ],
  exercises: [
    { type: 'sort', prompt: l('haben чи sein?', 'haben oder sein?'), categories: ['hat …', 'ist …'], items: [['kaufen', 0], ['fahren', 1], ['schlafen', 0], ['kommen', 1], ['arbeiten', 0], ['aufstehen', 1], ['bleiben', 1], ['essen', 0], ['fliegen', 1], ['lernen', 0], ['einschlafen', 1], ['telefonieren', 0]] },
    { type: 'gapselect', text: 'Ich [[habe|bin]] gestern Fisch gegessen und [[bin|habe]] danach nach Hause gegangen.' },
    { type: 'gapselect', text: 'Wir [[sind|haben]] am Samstag nach Bonn gefahren und [[haben|sind]] dort ein Museum besucht.' },
    { type: 'gapselect', text: 'Am Morgen [[ist|hat]] er spät aufgestanden, und dann [[hat|ist]] er lange gefrühstückt.' },
    { type: 'gapselect', text: 'Es [[hat|ist]] die ganze Nacht geregnet. Was [[ist|hat]] passiert?' },
    { type: 'mc', q: 'Ich ___ gestern lange geschlafen.', options: ['habe', 'bin', 'hat', 'ist'], answer: 0 },
    { type: 'mc', q: 'Er ___ letzte Woche nach Italien geflogen.', options: ['ist', 'hat', 'habe', 'bin'], answer: 0 },
    { type: 'mc', q: 'Welcher Satz ist richtig?', options: ['Sie ist ins Kino gegangen.', 'Sie hat ins Kino gegangen.', 'Sie ist ins Kino gesehen.', 'Sie hat ins Kino gehen.'], answer: 0 },
    { type: 'mc', q: l('Чому «Ich bin eingeschlafen» — з sein?', 'Warum „Ich bin eingeschlafen“ mit sein?'), options: [l('Зміна стану', 'Zustandsänderung'), l('Є Akkusativ', 'Es gibt ein Akkusativobjekt'), l('Модальне дієслово', 'Modalverb'), l('Зворотне дієслово', 'Reflexives Verb')], answer: 0, keepOrder: true },
    { type: 'fix', wrong: 'Ich habe gestern nach Berlin gefahren.', answers: ['Ich bin gestern nach Berlin gefahren.'], explain: l('Рух A→B → sein.', 'Bewegung A→B → sein.') },
    { type: 'fix', wrong: 'Wir sind einen Film gesehen.', answers: ['Wir haben einen Film gesehen.'], explain: l('Є Akkusativ (einen Film) → haben.', 'Akkusativobjekt (einen Film) → haben.') },
    { type: 'translate', ua: 'Ми приїхали о восьмій.', answers: ['Wir sind um acht Uhr angekommen.', 'Wir sind um 8 Uhr angekommen.'] },
    { type: 'order', words: ['Wir', 'sind', 'gestern', 'spät', 'nach', 'Hause', 'gekommen.'], alt: [['Gestern', 'sind', 'wir', 'spät', 'nach', 'Hause', 'gekommen.']], translation: 'Вчора ми пізно прийшли додому.' },
  ],
};

const gOrder: CourseModule['grammar'][number] = {
  id: 'order',
  title: l('Порядок слів: питання, nicht, послідовність', 'Wortstellung: Fragen, nicht, Reihenfolge'),
  blocks: [
    { t: 'h', text: l('Питання', 'Fragen') },
    { t: 'sentence', words: [{ w: 'Hast', role: 'aux' }, { w: 'du', role: 'subj' }, { w: 'am Wochenende', role: 'time' }, { w: 'Pizza', role: 'obj' }, { w: 'gegessen?', role: 'part' }], ua: 'Ти їв піцу на вихідних?', note: l('Питання «так/ні»: haben/sein — на 1-му місці.', 'Ja/Nein-Frage: haben/sein steht auf Position 1.') },
    { t: 'sentence', words: [{ w: 'Was', role: 'obj' }, { w: 'hast', role: 'aux' }, { w: 'du', role: 'subj' }, { w: 'gestern', role: 'time' }, { w: 'gemacht?', role: 'part' }], ua: 'Що ти вчора робив?', note: l('Питання з питальним словом: haben/sein — на 2-му місці.', 'W-Frage: haben/sein steht auf Position 2.') },
    { t: 'h', text: l('Заперечення nicht', 'Verneinung mit nicht') },
    { t: 'sentence', words: [{ w: 'Ich', role: 'subj' }, { w: 'habe', role: 'aux' }, { w: 'den Film', role: 'obj' }, { w: 'nicht', role: 'neg' }, { w: 'gesehen.', role: 'part' }], ua: 'Я не бачив цей фільм.', note: l('nicht стоїть перед Partizip II. З іменником без артикля або з неозначеним — kein: «Ich habe kein Auto gekauft».', 'nicht steht vor dem Partizip II. Mit unbestimmtem Artikel: kein („Ich habe kein Auto gekauft“).') },
    { t: 'h', text: l('Послідовність: zuerst, dann, danach, schließlich', 'Reihenfolge: zuerst, dann, danach, schließlich') },
    { t: 'p', text: l('Після цих слів дієслово стоїть одразу, а підмет — після нього: «Dann habe ich …», а не «Dann ich habe …».', 'Nach diesen Wörtern steht das Verb sofort: „Dann habe ich …“, nicht „Dann ich habe …“.') },
    { t: 'examples', items: [
      { de: 'Zuerst habe ich gefrühstückt, dann bin ich zur Arbeit gegangen.', ua: 'Спочатку я поснідав, потім пішов на роботу.' },
      { de: 'Danach habe ich meine Freundin angerufen.', ua: 'Після цього я зателефонував подрузі.' } ] },
  ],
  exercises: [
    { type: 'order', words: ['Hast', 'du', 'am', 'Wochenende', 'Pizza', 'gegessen?'], translation: 'Ти їв піцу на вихідних?' },
    { type: 'order', words: ['Was', 'hast', 'du', 'gestern', 'gemacht?'], translation: 'Що ти вчора робив?' },
    { type: 'order', words: ['Wohin', 'seid', 'ihr', 'letztes', 'Jahr', 'gefahren?'], translation: 'Куди ви їздили минулого року?' },
    { type: 'order', words: ['Ich', 'habe', 'den', 'Film', 'nicht', 'gesehen.'], alt: [['Den', 'Film', 'habe', 'ich', 'nicht', 'gesehen.']], translation: 'Я не бачив цей фільм.' },
    { type: 'order', words: ['Zuerst', 'habe', 'ich', 'gefrühstückt,', 'dann', 'bin', 'ich', 'zur', 'Arbeit', 'gegangen.'], translation: 'Спочатку я поснідав, потім пішов на роботу.' },
    { type: 'fix', wrong: 'Dann ich habe Kaffee getrunken.', answers: ['Dann habe ich Kaffee getrunken.'] },
    { type: 'fix', wrong: 'Ich habe gesehen den Film nicht.', answers: ['Ich habe den Film nicht gesehen.'] },
    { type: 'mc', q: 'Welcher Satz ist richtig?', options: ['Ich habe das Buch nicht gelesen.', 'Ich habe nicht das Buch gelesen.', 'Ich habe das Buch gelesen nicht.', 'Ich nicht habe das Buch gelesen.'], answer: 0 },
    { type: 'dialogue', turns: [
      { who: 'Lena', line: 'Hallo Tom!' },
      { who: 'Lena', line: 'Was hast du am Wochenende gemacht?' },
      { who: 'Tom', options: ['Ich habe meine Freunde getroffen.', 'Ich bin meine Freunde getroffen.', 'Ich habe getroffen meine Freunde.'], answer: 0 },
      { who: 'Lena', line: 'Und wohin seid ihr gegangen?' },
      { who: 'Tom', options: ['Wir sind ins Kino gegangen.', 'Wir haben ins Kino gegangen.', 'Wir ins Kino sind gegangen.'], answer: 0 },
      { who: 'Lena', line: 'Super! Welchen Film habt ihr gesehen?' } ] },
    { type: 'translate', ua: 'Що ти робив учора?', answers: ['Was hast du gestern gemacht?'] },
  ],
};

/* ════════════════ NOMEN-VERB-VERBINDUNGEN ════════════════ */

const nvvItems = [
  { phrase: 'eine Entscheidung treffen', ua: 'ухвалити рішення', example: 'Ich habe eine Entscheidung getroffen.' },
  { phrase: 'Rücksicht nehmen auf + Akk.', ua: 'зважати на когось', example: 'Er hat keine Rücksicht auf die Nachbarn genommen.' },
  { phrase: 'einen Termin vereinbaren', ua: 'домовитися про зустріч / запис', example: 'Wir haben einen Termin vereinbart.' },
  { phrase: 'eine Pause machen', ua: 'зробити перерву', example: 'Wir haben eine Pause gemacht.' },
  { phrase: 'einen Ausflug machen', ua: 'вирушити на екскурсію', example: 'Wir haben einen Ausflug an den See gemacht.' },
  { phrase: 'Fotos machen', ua: 'фотографувати', example: 'Ich habe viele Fotos gemacht.' },
  { phrase: 'eine Frage stellen', ua: 'поставити питання', example: 'Hast du dem Lehrer eine Frage gestellt?' },
  { phrase: 'Platz nehmen', ua: 'сісти, зайняти місце', example: 'Wir haben am Fenster Platz genommen.' },
  { phrase: 'Urlaub machen', ua: 'бути у відпустці', example: 'Wir haben in Spanien Urlaub gemacht.' },
  { phrase: 'einen Fehler machen', ua: 'зробити помилку', example: 'Ich habe einen Fehler gemacht.' },
  { phrase: 'Sport treiben', ua: 'займатися спортом', example: 'Er hat im Urlaub viel Sport getrieben.' },
  { phrase: 'Bescheid sagen', ua: 'повідомити, дати знати', example: 'Hast du ihm Bescheid gesagt?' },
  { phrase: 'Spaß haben', ua: 'веселитися', example: 'Wir haben viel Spaß gehabt.' },
  { phrase: 'Angst haben vor + Dat.', ua: 'боятися чогось', example: 'Ich habe Angst vor dem Hund gehabt.' },
  { phrase: 'Kontakt aufnehmen mit + Dat.', ua: 'зв’язатися з кимось', example: 'Sie hat mit der Schule Kontakt aufgenommen.' },
];

const nvv: CourseModule['nvv'] = {
  intro: [
    { t: 'p', text: l('Nomen-Verb-Verbindung — стійке поєднання іменника з дієсловом. Дієслово тут часто втрачає свій основний зміст, головне значення несе іменник: «eine Entscheidung treffen» — не «зустрічати рішення», а «ухвалити рішення».', 'Eine Nomen-Verb-Verbindung ist eine feste Kombination: Das Nomen trägt die Bedeutung, das Verb ist oft nur „Helfer“: eine Entscheidung treffen = entscheiden.') },
    { t: 'tip', text: l('Вчи їх як одне ціле, разом з артиклем, відмінком і прийменником. Дослівний переклад тут не працює: німець скаже «treffen», а не «machen» (і навпаки: «Fehler machen», а не «treffen»).', 'Lerne die Verbindung als Ganzes – mit Artikel, Kasus und Präposition. Nicht übersetzen, sondern merken: eine Entscheidung TREFFEN, einen Fehler MACHEN.') },
    { t: 'warn', text: l('Типова помилка: «eine Entscheidung machen». Правильно: «eine Entscheidung treffen».', 'Typischer Fehler: „eine Entscheidung machen“. Richtig: „eine Entscheidung treffen“.') },
    { t: 'p', text: l('У Perfekt Partizip II — це форма дієслова, іменник залишається на своєму місці перед ним.', 'Im Perfekt steht das Nomen vor dem Partizip II am Satzende: „Ich habe eine Entscheidung getroffen.“') },
  ],
  items: nvvItems,
  exercises: [
    { type: 'match', prompt: l('Який іменник до якого дієслова?', 'Welches Verb passt zum Nomen?'), pairs: [['eine Entscheidung …', 'treffen'], ['einen Termin …', 'vereinbaren'], ['eine Frage …', 'stellen'], ['Platz …', 'nehmen'], ['Sport …', 'treiben'], ['Bescheid …', 'sagen']] },
    { type: 'gap', text: 'Wir haben im Café {{Platz}} genommen.', hint: 'Platz nehmen' },
    { type: 'gap', text: 'Ich habe lange überlegt und dann eine Entscheidung {{getroffen}}.', hint: 'treffen' },
    { type: 'gap', text: 'Er hat dem Lehrer eine Frage {{gestellt}}.', hint: 'stellen' },
    { type: 'gapselect', text: 'Ich habe Angst [[vor|an|auf]] dem Hund gehabt.' },
    { type: 'gapselect', text: 'Er hat keine Rücksicht [[auf|für|an]] die Nachbarn genommen.' },
    { type: 'gapselect', text: 'Wir haben in Spanien [[Urlaub|Entscheidung|Frage]] gemacht.' },
    { type: 'translate', ua: 'Ми домовилися про зустріч.', answers: ['Wir haben einen Termin vereinbart.'] },
    { type: 'translate', ua: 'У нас було багато веселощів.', answers: ['Wir haben viel Spaß gehabt.', 'Wir haben sehr viel Spaß gehabt.'] },
    { type: 'fix', wrong: 'Ich habe gestern eine Entscheidung gemacht.', answers: ['Ich habe gestern eine Entscheidung getroffen.'], explain: l('Стійке поєднання: eine Entscheidung TREFFEN.', 'Feste Verbindung: eine Entscheidung TREFFEN.') },
  ],
};

/* ════════════════ LESEN ════════════════ */

const reading: CourseModule['reading'] = {
  title: 'Mias Blog: Ein Wochenende in Leipzig',
  byline: 'Mia schreibt über ihren Besuch bei einer Freundin.',
  paragraphs: [
    'Letztes Wochenende habe ich meine Freundin Anna in Leipzig besucht. Am Freitagabend bin ich mit dem Zug von Berlin nach Leipzig gefahren. Die Fahrt hat nur eine Stunde und vierzig Minuten gedauert. Anna hat mich am Bahnhof abgeholt, und wir sind zusammen in ihre Wohnung gegangen. Sie wohnt in einem alten, aber sehr schönen Haus im Zentrum. Zum Abendessen hat sie Gemüsesuppe gekocht. Sie war lecker, und wir haben bis spät in die Nacht geredet.',
    'Am Samstag sind wir früh aufgestanden. Zuerst haben wir im Café am Markt gefrühstückt. Dann haben wir die Stadt besichtigt: Wir haben die Nikolaikirche gesehen und viele Fotos gemacht. Am Nachmittag haben wir eine Bootstour auf dem Fluss gemacht. Das Wetter war leider nicht gut, es hat geregnet, aber das war nicht schlimm. Abends haben wir im Kino einen lustigen Film gesehen.',
    'Am Sonntag haben wir lange geschlafen. Nach dem Mittagessen habe ich meine Tasche gepackt, und Anna hat mich zum Bahnhof gebracht. Ich bin um 17 Uhr abgefahren und um 19 Uhr wieder zu Hause angekommen. Das Wochenende war wunderbar, aber auch ein bisschen anstrengend. Nächstes Mal bleibe ich länger!',
  ],
  glossary: [
    { de: 'abholen', ua: 'забрати, зустріти' }, { de: 'dauern', ua: 'тривати' }, { de: 'reden', ua: 'розмовляти' },
    { de: 'besichtigen', ua: 'оглядати (пам’ятки)' }, { de: 'die Bootstour', ua: 'прогулянка на човні' },
    { de: 'schlimm', ua: 'страшний, поганий' }, { de: 'packen', ua: 'пакувати' }, { de: 'abfahren', ua: 'відправлятися' },
  ],
  exercises: [
    { type: 'mc', prompt: l('Прочитайте текст і дайте відповідь.', 'Lies den Text und antworte.'), q: 'Wie ist Mia nach Leipzig gekommen?', options: ['mit dem Zug', 'mit dem Auto', 'mit dem Bus', 'mit dem Flugzeug'], answer: 0 },
    rf('Mia ist mit dem Auto gefahren.', false),
    rf('Anna hat am Freitag Gemüsesuppe gekocht.', true),
    rf('Am Samstag hat es geregnet.', true),
    rf('Mia ist am Sonntag früh aufgestanden.', false, l('У тексті: «Am Sonntag haben wir lange geschlafen».', 'Im Text: „Am Sonntag haben wir lange geschlafen.“')),
    rf('Mia und Anna sind am Samstagabend ins Theater gegangen.', false, l('Вони були в кіно (Kino).', 'Sie waren im Kino.')),
    { type: 'mc', q: 'Was haben Mia und Anna am Samstag zuerst gemacht?', options: ['Sie haben gefrühstückt.', 'Sie haben die Kirche besichtigt.', 'Sie haben eine Bootstour gemacht.', 'Sie haben einen Film gesehen.'], answer: 0 },
    { type: 'gap', text: 'Anna hat Mia am Bahnhof {{abgeholt}}.', hint: 'abholen' },
    { type: 'gap', text: 'Sie haben eine {{Bootstour}} auf dem Fluss gemacht.' },
    { type: 'sort', prompt: l('Що сталося в який день?', 'Was war an welchem Tag?'), categories: ['Freitag', 'Samstag', 'Sonntag'], items: [['Mia ist mit dem Zug gefahren.', 0], ['Anna hat Suppe gekocht.', 0], ['Sie haben die Nikolaikirche gesehen.', 1], ['Sie haben einen Film gesehen.', 1], ['Sie haben lange geschlafen.', 2], ['Anna hat Mia zum Bahnhof gebracht.', 2]] },
    { type: 'mc', q: 'Wie war das Wochenende für Mia?', options: ['wunderbar, aber ein bisschen anstrengend', 'langweilig und teuer', 'schrecklich und laut', 'ruhig und kalt'], answer: 0 },
  ],
};

/* ════════════════ HÖREN ════════════════ */

const listening: CourseModule['listening'] = {
  title: l('Montagmorgen: Wie war dein Wochenende?', 'Montagmorgen: Wie war dein Wochenende?'),
  instruction: l(
    'Прослухай діалог двічі (аудіо додається в поле audioUrl). Спочатку відповідай на питання, потім відкрий транскрипт і перевір себе.',
    'Höre das Gespräch zweimal. Beantworte zuerst die Aufgaben, dann lies das Transkript.'),
  transcript: [
    { speaker: 'Lena', text: 'Hallo Tom! Wie war dein Wochenende?' },
    { speaker: 'Tom', text: 'Hallo Lena! Es war super, aber ein bisschen stressig. Und deins?' },
    { speaker: 'Lena', text: 'Ganz ruhig. Am Samstag habe ich lange geschlafen und dann meine Wohnung geputzt.' },
    { speaker: 'Tom', text: 'Oh, das habe ich auch gemacht! Aber nur am Vormittag. Am Nachmittag bin ich mit meinem Bruder zum See gefahren.' },
    { speaker: 'Lena', text: 'Habt ihr gebadet?' },
    { speaker: 'Tom', text: 'Nein, das Wasser war viel zu kalt. Wir haben nur ein Eis gegessen und Fußball gespielt.' },
    { speaker: 'Lena', text: 'Und am Sonntag?' },
    { speaker: 'Tom', text: 'Am Sonntag habe ich meine Oma besucht. Sie hat Kuchen gebacken, und ich habe zu viel gegessen.' },
    { speaker: 'Lena', text: 'Ha, das kenne ich! Ich habe am Sonntag mit Julia telefoniert. Wir haben zwei Stunden gesprochen. Danach habe ich einen alten deutschen Film gesehen.' },
    { speaker: 'Tom', text: 'War der Film gut?' },
    { speaker: 'Lena', text: 'Ja, er war sehr lustig.' },
    { speaker: 'Tom', text: 'Super! Sollen wir am nächsten Wochenende zusammen etwas machen?' },
    { speaker: 'Lena', text: 'Gern!' },
  ],
  exercises: [
    { type: 'mc', q: 'Wie war Toms Wochenende?', options: ['super, aber ein bisschen stressig', 'ruhig und langweilig', 'schrecklich', 'kalt und nass'], answer: 0 },
    { type: 'mc', q: 'Was hat Lena am Samstag gemacht?', options: ['Sie hat lange geschlafen und die Wohnung geputzt.', 'Sie ist zum See gefahren.', 'Sie hat ihre Oma besucht.', 'Sie hat Fußball gespielt.'], answer: 0 },
    { type: 'mc', q: 'Warum haben Tom und sein Bruder nicht gebadet?', options: ['Das Wasser war zu kalt.', 'Sie hatten keine Zeit.', 'Es hat geregnet.', 'Der See war voll.'], answer: 0 },
    rf('Tom hat am Sonntag seine Oma besucht.', true),
    rf('Lena hat am Sonntag Julia besucht.', false, l('Вона з нею телефонувала (telefoniert).', 'Sie hat mit ihr telefoniert.')),
    rf('Der Film war langweilig.', false),
    { type: 'gap', text: 'Tom und sein Bruder haben am See Fußball {{gespielt}}.', hint: 'spielen' },
    { type: 'sort', prompt: l('Хто що робив?', 'Wer hat was gemacht?'), categories: ['Tom', 'Lena'], items: [['ist zum See gefahren', 0], ['hat einen Film gesehen', 1], ['hat Fußball gespielt', 0], ['hat telefoniert', 1], ['hat Kuchen gegessen', 0], ['hat lange geschlafen', 1]] },
  ],
};

/* ════════════════ SCHREIBEN ════════════════ */

const writing: CourseModule['writing'] = {
  task: l(
    'Напиши короткий електронний лист другові / подрузі про свої вихідні або відпустку.',
    'Schreibe eine kurze E-Mail an einen Freund / eine Freundin über dein Wochenende oder deinen Urlaub.'),
  points: [
    l('Де ти був(ла) і з ким?', 'Wo warst du und mit wem?'),
    l('Що ти робив(ла)? (мінімум 3 дієслова в Perfekt)', 'Was hast du gemacht? (mindestens 3 Verben im Perfekt)'),
    l('Яка була погода, їжа або враження? (1–2 прикметники)', 'Wie waren das Wetter, das Essen oder der Eindruck? (1–2 Adjektive)'),
    l('Запроси друга / подругу на щось разом.', 'Lade deinen Freund / deine Freundin zu etwas ein.'),
  ],
  minWords: 40, maxWords: 80,
  checklist: [
    l('Є звертання («Liebe Anna,») і прощання («Liebe Grüße»).', 'Anrede („Liebe Anna,“) und Gruß („Liebe Grüße“) sind da.'),
    l('Усі чотири пункти завдання розкриті.', 'Alle vier Punkte der Aufgabe sind enthalten.'),
    l('Partizip II стоїть у кінці речення.', 'Das Partizip II steht am Satzende.'),
    l('Для кожного дієслова перевірено haben чи sein.', 'Bei jedem Verb habe ich haben oder sein geprüft.'),
    l('Дієслово на 2-му місці (після «Zuerst», «Dann», «Am Sonntag»…).', 'Das Verb steht auf Position 2 (nach „Zuerst“, „Dann“, „Am Sonntag“ …).'),
    l('Іменники з великої літери, ä/ö/ü/ß написані правильно.', 'Nomen sind großgeschrieben, ä/ö/ü/ß stimmen.'),
  ],
  sample: `Liebe Anna,

letztes Wochenende bin ich nach Prag gefahren. Ich habe zwei Tage dort verbracht. Zuerst habe ich die Altstadt besichtigt und viele Fotos gemacht. Das Essen war lecker, aber ein bisschen teuer. Am Sonntag bin ich müde nach Hause gekommen. Hast du nächstes Wochenende Zeit? Dann können wir zusammen etwas machen.

Liebe Grüße
Mia`,
  exercises: [
    { type: 'mc', q: 'Welcher Gruß passt am Ende einer E-Mail an eine Freundin?', options: ['Liebe Grüße, Mia', 'Sehr geehrte Damen und Herren, Mia', 'Hochachtungsvoll, Mia'], answer: 0 },
    { type: 'mc', q: 'Wie beginnt eine E-Mail an Anna?', options: ['Liebe Anna,', 'Lieber Anna,', 'Liebes Anna,'], answer: 0 },
    { type: 'order', words: ['Letztes', 'Wochenende', 'bin', 'ich', 'nach', 'Prag', 'gefahren.'], translation: 'Минулих вихідних я їздила до Праги.' },
    { type: 'fix', wrong: 'Ich habe in Prag viele Fotos gemachen.', answers: ['Ich habe in Prag viele Fotos gemacht.'] },
    { type: 'fix', wrong: 'Am Sonntag ich bin nach Hause gefahren.', answers: ['Am Sonntag bin ich nach Hause gefahren.'] },
  ],
};

/* ════════════════ ABSCHLUSSTEST ════════════════ */

const test: CourseModule['test'] = {
  passPercent: 70,
  exercises: [
    { type: 'mc', q: 'Wir ___ nach Köln gefahren.', options: ['sind', 'haben', 'hat', 'bin'], answer: 0 },
    { type: 'gap', text: 'Gestern {{habe}} ich Pizza gegessen.' },
    { type: 'gap', text: 'Ich habe dir eine SMS {{geschrieben}}.', hint: 'schreiben' },
    { type: 'order', words: ['Am', 'Sonntag', 'bin', 'ich', 'früh', 'aufgestanden.'], translation: 'У неділю я рано встав.' },
    { type: 'fix', wrong: 'Sie hat ein Brot gekaufen.', answers: ['Sie hat ein Brot gekauft.'] },
    { type: 'match', pairs: [['trinken', 'getrunken'], ['schlafen', 'geschlafen'], ['anrufen', 'angerufen'], ['besuchen', 'besucht'], ['fahren', 'gefahren'], ['telefonieren', 'telefoniert']] },
    { type: 'sort', categories: ['hat …', 'ist …'], prompt: l('haben чи sein?', 'haben oder sein?'), items: [['lernen', 0], ['gehen', 1], ['kochen', 0], ['fliegen', 1], ['bleiben', 1], ['sehen', 0], ['kommen', 1], ['kaufen', 0]] },
    { type: 'gapselect', text: 'Wir [[sind|haben]] letzten Sommer nach Italien geflogen und [[haben|sind]] viel Eis gegessen.' },
    { type: 'translate', ua: 'Вона вчора пішла в кіно.', answers: ['Sie ist gestern ins Kino gegangen.', 'Gestern ist sie ins Kino gegangen.'] },
    { type: 'translate', ua: 'Я не бачив цей фільм.', answers: ['Ich habe den Film nicht gesehen.', 'Ich habe diesen Film nicht gesehen.'] },
    { type: 'mc', q: 'Das Zimmer war nicht sauber, es war ...', options: ['schmutzig', 'leise', 'billig', 'wach'], answer: 0 },
    { type: 'mc', q: 'Der Test war nicht schwierig, er war ...', options: ['einfach', 'traurig', 'laut', 'voll'], answer: 0 },
    { type: 'mc', q: 'Hast du eine Entscheidung ...?', options: ['getroffen', 'gemacht', 'gestellt', 'genommen'], answer: 0 },
    { type: 'gapselect', text: 'Wir haben Rücksicht [[auf|für|an]] die Kinder genommen.' },
    { type: 'dialogue', turns: [
      { who: 'Max', line: 'Was hast du letzte Woche gemacht?' },
      { who: 'Eva', options: ['Ich bin nach Wien gefahren.', 'Ich habe nach Wien gefahren.', 'Ich bin gefahren Wien.'], answer: 0 },
      { who: 'Max', line: 'Wie hat es dir gefallen?' },
      { who: 'Eva', options: ['Es hat mir sehr gut gefallen.', 'Es ist mir sehr gut gefallen.', 'Ich habe es sehr gut gefallen.'], answer: 0 },
      { who: 'Max', line: 'Super! Hast du Fotos gemacht?' },
      { who: 'Eva', options: ['Ja, ich habe viele Fotos gemacht.', 'Ja, ich bin viele Fotos gemacht.', 'Ja, ich habe viele Fotos gemachen.'], answer: 0 } ] },
    { type: 'fix', wrong: 'Wir haben gestern ins Kino gegangen.', answers: ['Wir sind gestern ins Kino gegangen.'] },
    { type: 'gap', text: 'Der Zug ist pünktlich {{angekommen}}.', hint: 'ankommen' },
    { type: 'gap', text: 'Hast du das Fenster {{geöffnet}}?', hint: 'öffnen' },
    { type: 'order', words: ['Was', 'habt', 'ihr', 'am', 'Wochenende', 'gemacht?'], translation: 'Що ви робили на вихідних?' },
    { type: 'match', prompt: l('Знайдіть антоніми.', 'Finde das Gegenteil.'), pairs: [['laut', 'leise'], ['teuer', 'billig'], ['voll', 'leer'], ['müde', 'wach'], ['schnell', 'langsam']] },
  ],
};

/* ════════════════ MODUL ════════════════ */

export const perfekt: CourseModule = {
  id: 'm02',
  number: 2,
  title: l('Perfekt: розповідаємо про минуле', 'Perfekt: Über die Vergangenheit sprechen'),
  subtitle: l('Вихідні, відпустка, події минулого тижня', 'Wochenende, Urlaub, die letzte Woche'),
  objectives: [
    l('Будувати Perfekt з haben та sein.', 'Das Perfekt mit haben und sein bilden.'),
    l('Утворювати Partizip II: правильні, неправильні, відокремлювані, невіддільні дієслова та -ieren.', 'Das Partizip II bilden: regelmäßig, unregelmäßig, trennbar, untrennbar, -ieren.'),
    l('Ставити слова в «рамку»: питання, nicht, zuerst/dann/danach.', 'Die Satzklammer benutzen: Fragen, nicht, zuerst/dann/danach.'),
    l('Розповісти про вихідні й відпустку, описати їх 20+ прикметниками.', 'Über Wochenende und Urlaub erzählen und mit 20+ Adjektiven beschreiben.'),
    l('Вжити 15 Nomen-Verb-Verbindungen у минулому.', '15 Nomen-Verb-Verbindungen in der Vergangenheit benutzen.'),
  ],
  video: {
    title: l('Урок 2: Perfekt', 'Lektion 2: Perfekt'),
    chapters: [
      l('Коли вживаємо Perfekt і чим він відрізняється від Präteritum', 'Wann benutzen wir das Perfekt?'),
      l('Рамка: haben/sein + Partizip II', 'Die Satzklammer: haben/sein + Partizip II'),
      l('Три типи Partizip II та префікси', 'Drei Typen von Partizip II und Präfixe'),
      l('haben чи sein: правила й винятки', 'haben oder sein: Regeln und Ausnahmen'),
      l('Розбір тексту «Ein Wochenende in Leipzig»', 'Textarbeit: „Ein Wochenende in Leipzig“'),
    ],
  },
  vocab: [
    { id: 'verbs', title: l('Дієслова дій', 'Aktivitäten'), intro: l('20 дієслів для розповіді про минуле. На картці: інфінітив → переклад, форма Perfekt, приклад.', '20 Verben für Vergangenes. Karte: Infinitiv → Übersetzung, Perfekt, Beispiel.'),
      items: [
        { de: 'kochen', extra: 'hat gekocht', ua: 'готувати їжу', example: 'Er hat Spaghetti gekocht.' },
        { de: 'einkaufen', extra: 'hat eingekauft', ua: 'робити покупки', example: 'Wir haben im Supermarkt eingekauft.' },
        { de: 'besuchen', extra: 'hat besucht', ua: 'відвідувати', example: 'Ich habe meine Oma besucht.' },
        { de: 'telefonieren', extra: 'hat telefoniert', ua: 'розмовляти телефоном', example: 'Sie hat mit ihrer Mutter telefoniert.' },
        { de: 'arbeiten', extra: 'hat gearbeitet', ua: 'працювати', example: 'Ich habe bis 18 Uhr gearbeitet.' },
        { de: 'lernen', extra: 'hat gelernt', ua: 'вчити', example: 'Wir haben für den Test gelernt.' },
        { de: 'sehen', extra: 'hat gesehen', ua: 'бачити', example: 'Hast du den Film gesehen?' },
        { de: 'essen', extra: 'hat gegessen', ua: 'їсти', example: 'Ich habe Pizza gegessen.' },
        { de: 'trinken', extra: 'hat getrunken', ua: 'пити', example: 'Er hat nur Wasser getrunken.' },
        { de: 'schlafen', extra: 'hat geschlafen', ua: 'спати', example: 'Sie hat zehn Stunden geschlafen.' },
        { de: 'treffen', extra: 'hat getroffen', ua: 'зустріти', example: 'Ich habe Lisa in der Stadt getroffen.' },
        { de: 'schreiben', extra: 'hat geschrieben', ua: 'писати', example: 'Ich habe dir eine E-Mail geschrieben.' },
        { de: 'fahren', extra: 'ist gefahren', ua: 'їхати', example: 'Wir sind nach Wien gefahren.' },
        { de: 'fliegen', extra: 'ist geflogen', ua: 'летіти', example: 'Sie ist nach Spanien geflogen.' },
        { de: 'gehen', extra: 'ist gegangen', ua: 'йти', example: 'Ich bin ins Kino gegangen.' },
        { de: 'kommen', extra: 'ist gekommen', ua: 'приходити', example: 'Er ist zu spät gekommen.' },
        { de: 'bleiben', extra: 'ist geblieben', ua: 'залишатися', example: 'Wir sind zu Hause geblieben.' },
        { de: 'aufstehen', extra: 'ist aufgestanden', ua: 'вставати', example: 'Ich bin um sechs Uhr aufgestanden.' },
        { de: 'ankommen', extra: 'ist angekommen', ua: 'прибувати', example: 'Der Zug ist pünktlich angekommen.' },
        { de: 'laufen', extra: 'ist gelaufen', ua: 'бігти, ходити пішки', example: 'Wir sind zum Bahnhof gelaufen.' },
      ], exercises: verbsExercises },
    { id: 'adjectives', title: l('Прикметники: Wie war es?', 'Adjektive: Wie war es?'), intro: l('20 прикметників для опису вражень. Тут вони стоять після war/waren (без закінчень); відмінювання — у модулях 6–7. Обов’язково вчи антоніми.', '20 Adjektive für Eindrücke. Hier nach war/waren (ohne Endung). Deklination: Module 6–7. Lerne immer das Gegenteil mit.'),
      items: [
        { de: 'schön', ua: 'гарний', extra: '↔ hässlich (потворний)', example: 'Das Hotel war schön.' },
        { de: 'interessant', ua: 'цікавий', extra: '↔ langweilig (нудний)', example: 'Der Film war interessant.' },
        { de: 'anstrengend', ua: 'виснажливий', extra: '↔ entspannend (розслаблюючий)', example: 'Die Wanderung war anstrengend.' },
        { de: 'teuer', ua: 'дорогий', extra: '↔ billig (дешевий)', example: 'Das Essen war teuer.' },
        { de: 'laut', ua: 'гучний', extra: '↔ leise (тихий)', example: 'Die Musik war zu laut.' },
        { de: 'sauber', ua: 'чистий', extra: '↔ schmutzig (брудний)', example: 'Das Zimmer war sauber.' },
        { de: 'neu', ua: 'новий', extra: '↔ alt (старий)', example: 'Die Wohnung war neu.' },
        { de: 'lecker', ua: 'смачний', extra: '↔ ekelhaft (огидний)', example: 'Die Suppe war lecker.' },
        { de: 'schnell', ua: 'швидкий', extra: '↔ langsam (повільний)', example: 'Der Zug war schnell.' },
        { de: 'warm', ua: 'теплий', extra: '↔ kalt (холодний)', example: 'Das Wetter war warm.' },
        { de: 'voll', ua: 'повний, переповнений', extra: '↔ leer (порожній)', example: 'Der Bus war voll.' },
        { de: 'müde', ua: 'втомлений', extra: '↔ wach (бадьорий)', example: 'Ich war sehr müde.' },
        { de: 'fröhlich', ua: 'веселий', extra: '↔ traurig (сумний)', example: 'Die Kinder waren fröhlich.' },
        { de: 'gesund', ua: 'здоровий', extra: '↔ krank (хворий)', example: 'Ich war letzte Woche krank.' },
        { de: 'wunderbar', ua: 'чудовий', extra: '↔ furchtbar (жахливий)', example: 'Der Urlaub war wunderbar.' },
        { de: 'bequem', ua: 'зручний', extra: '↔ unbequem (незручний)', example: 'Das Bett war bequem.' },
        { de: 'pünktlich', ua: 'пунктуальний, вчасний', extra: '↔ unpünktlich (недбалий щодо часу)', example: 'Der Bus war nicht pünktlich.' },
        { de: 'freundlich', ua: 'привітний', extra: '↔ unfreundlich (непривітний)', example: 'Die Kellnerin war sehr freundlich.' },
        { de: 'lustig', ua: 'смішний, веселий', extra: '↔ ernst (серйозний)', example: 'Der Film war lustig.' },
        { de: 'einfach', ua: 'простий', extra: '↔ schwierig (складний)', example: 'Die Prüfung war einfach.' },
      ], exercises: adjExercises },
    { id: 'time', title: l('Часові вирази', 'Zeitangaben'), intro: l('Слова, які показують, коли це було і що за чим сталося.', 'Wörter, die zeigen, wann etwas war und was zuerst kam.'),
      items: [
        { de: 'gestern', ua: 'вчора', example: 'Gestern habe ich Pizza gegessen.' },
        { de: 'vorgestern', ua: 'позавчора', example: 'Vorgestern habe ich Lisa getroffen.' },
        { de: 'heute Morgen', ua: 'сьогодні вранці', example: 'Heute Morgen bin ich spät aufgestanden.' },
        { de: 'letzte Woche', ua: 'минулого тижня', example: 'Letzte Woche war ich krank.' },
        { de: 'letztes Wochenende', ua: 'минулих вихідних', example: 'Letztes Wochenende bin ich nach Leipzig gefahren.' },
        { de: 'letzten Monat', ua: 'минулого місяця', example: 'Letzten Monat haben wir umgezogen.' },
        { de: 'letztes Jahr', ua: 'минулого року', example: 'Letztes Jahr waren wir in Polen.' },
        { de: 'vor zwei Tagen', ua: 'два дні тому', example: 'Vor zwei Tagen habe ich ihn gesehen.' },
        { de: 'vor einer Woche', ua: 'тиждень тому', example: 'Vor einer Woche habe ich angerufen.' },
        { de: 'am Montag', ua: 'у понеділок', example: 'Am Montag habe ich gearbeitet.' },
        { de: 'am Wochenende', ua: 'на вихідних', example: 'Am Wochenende habe ich geschlafen.' },
        { de: 'neulich', ua: 'нещодавно', example: 'Neulich habe ich einen alten Freund getroffen.' },
        { de: 'zuerst', ua: 'спочатку', example: 'Zuerst habe ich gefrühstückt.' },
        { de: 'dann', ua: 'потім', example: 'Dann bin ich zur Arbeit gegangen.' },
        { de: 'danach', ua: 'після цього', example: 'Danach habe ich Kaffee getrunken.' },
        { de: 'später', ua: 'пізніше', example: 'Später habe ich Anna angerufen.' },
        { de: 'schließlich', ua: 'нарешті', example: 'Schließlich sind wir angekommen.' },
        { de: 'am Ende', ua: 'наприкінці', example: 'Am Ende war ich sehr müde.' },
      ], exercises: timeExercises },
  ],
  grammar: [gBasics, gRegular, gIrregular, gPrefix, gAux, gOrder],
  nvv,
  reading,
  listening,
  writing,
  test,
};
