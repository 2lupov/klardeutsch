export interface SM2Card {
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export function calculateNextReview(
  card: SM2Card,
  quality: 0 | 1 | 2 | 3 | 4 | 5
): SM2Card {
  let { easeFactor, interval, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.ceil(interval * easeFactor);
  }

  easeFactor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  if (easeFactor < 1.3) easeFactor = 1.3;

  return { easeFactor, interval, repetitions };
}
