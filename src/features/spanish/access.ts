export const SPANISH_NICKNAMES = ["ludmila"];
export const canSeeSpanish = (nickname?: string | null) =>
  !!nickname && SPANISH_NICKNAMES.includes(nickname.trim().toLowerCase());

export const ACADEMY_PATH = "/academy";
export const SPANISH_PATH = "/spanish";

/** Where the "Академія" entry should lead for this account. */
export const academyPathFor = (nickname?: string | null) =>
  canSeeSpanish(nickname) ? SPANISH_PATH : ACADEMY_PATH;
