import type { CourseModule, PlannedModule } from '../types';
import { perfekt } from './02-perfekt';

/** Додавай готові модулі сюди. */
export const MODULES: CourseModule[] = [perfekt];

/** Весь план курсу: модулі, яких ще нема в MODULES, показуються як «Скоро». */
export const PLANNED: PlannedModule[] = [
  { number: 1, title: { ua: 'Повторення A1, розпорядок дня', de: 'Wiederholung A1, Alltag' } },
  { number: 2, title: { ua: 'Perfekt', de: 'Perfekt' } },
  { number: 3, title: { ua: 'Präteritum: war, hatte, модальні', de: 'Präteritum: war, hatte, Modalverben' } },
  { number: 4, title: { ua: 'Akkusativ і Dativ, займенники', de: 'Akkusativ und Dativ, Pronomen' } },
  { number: 5, title: { ua: 'Wechselpräpositionen, житло', de: 'Wechselpräpositionen, Wohnen' } },
  { number: 6, title: { ua: 'Прикметники I: ступені порівняння', de: 'Adjektive I: Komparativ/Superlativ' } },
  { number: 7, title: { ua: 'Відмінювання прикметників', de: 'Adjektivdeklination' } },
  { number: 8, title: { ua: 'Підрядні: weil, dass, wenn, obwohl', de: 'Nebensätze: weil, dass, wenn, obwohl' } },
  { number: 9, title: { ua: 'Зворотні дієслова, здоров’я', de: 'Reflexive Verben, Gesundheit' } },
  { number: 10, title: { ua: 'Подорожі, Imperativ', de: 'Reisen und Verkehr, Imperativ' } },
  { number: 11, title: { ua: 'Робота, Konjunktiv II', de: 'Arbeit und Beruf, Konjunktiv II' } },
  { number: 12, title: { ua: 'Побажання, ввічливість, повторення', de: 'Wunsch und Höflichkeit, Wiederholung' } },
];
