export const SPANISH_NICKNAMES = ["ludmila"];
export const canSeeSpanish = (nickname?: string | null) =>
  !!nickname && SPANISH_NICKNAMES.includes(nickname.trim().toLowerCase());
