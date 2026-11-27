import { KodleMovie } from '../types/kodle';

/** Score based on how many clue stages were visible when the player solved it */
export function scoreForClueStage(stage: number): number {
  switch (stage) {
    case 1:
      return 100;
    case 2:
      return 60;
    case 3:
      return 30;
    default:
      return 0;
  }
}

/** @deprecated Use scoreForClueStage instead */
export function scoreForAttempt(attemptNumber: number): number {
  return scoreForClueStage(attemptNumber);
}

/**
 * Normalizes movie titles:
 * strips punctuation/articles, collapses whitespace and common spelling variants.
 */
export function normalizeTitle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’`":.,!?()\-–—]/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function phoneticKey(input: string): string {
  let s = normalizeTitle(input).replace(/\s+/g, '');
  if (!s) return '';
  // Handle purely numeric titles like "96" separately
  if (/^\d+$/.test(s)) return s;

  s = s
    .replace(/zh/g, 'l')
    .replace(/sh/g, 's')
    .replace(/ch/g, 'c')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/bh/g, 'b')
    .replace(/ph/g, 'f')
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/ou/g, 'au')
    .replace(/([a-z])\1+/g, '$1');

  return s;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });

  for (let j = 1; j <= b.length; j++) {
    const firstRow = matrix[0];
    if (firstRow) firstRow[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const prevRow = matrix[i - 1];
      const currRow = matrix[i];
      if (prevRow && currRow) {
        currRow[j] = Math.min(
          (prevRow[j] ?? 0) + 1,
          (currRow[j - 1] ?? 0) + 1,
          (prevRow[j - 1] ?? 0) + cost
        );
      }
    }
  }
  return matrix[a.length]?.[b.length] ?? Math.max(a.length, b.length);
}

export function isMatchingMovie(guess: string, movie: KodleMovie): boolean {
  const normGuess = normalizeTitle(guess);
  if (!normGuess) return false;

  const phoneGuess = phoneticKey(guess);
  const candidates = [movie.title, ...movie.aliases];

  for (const candidate of candidates) {
    const normCand = normalizeTitle(candidate);
    if (!normCand) continue;

    // 1. Exact normalized match
    if (normGuess === normCand) return true;

    // 2. Exact compact match (ignoring spaces)
    const compactGuess = normGuess.replace(/\s+/g, '');
    const compactCand = normCand.replace(/\s+/g, '');
    if (compactGuess === compactCand) return true;

    // Numeric titles like "96" must match exactly
    if (/^\d+$/.test(compactCand) || /^\d+$/.test(compactGuess)) {
      continue;
    }

    // 3. Phonetic and spelling variant match
    const phoneCand = phoneticKey(candidate);
    if (phoneGuess && phoneGuess === phoneCand) return true;

    // 4. Tight Levenshtein typo tolerance on phonetic key
    if (phoneCand.length >= 5 && phoneGuess.length >= 5) {
      const maxEdits = phoneCand.length >= 9 ? 2 : 1;
      if (levenshtein(phoneGuess, phoneCand) <= maxEdits) {
        return true;
      }
    }
  }

  return false;
}

export function isDuplicateGuess(
  guess: string,
  previousGuesses: { normalized: string; isSkipped?: boolean }[],
  allMovies: KodleMovie[]
): boolean {
  const norm = normalizeTitle(guess);
  const phone = phoneticKey(guess);
  if (!norm) return false;

  // Also check if guess resolves to the same movie title as a prior guess
  const matchedPriorMovie = allMovies.find((m) => isMatchingMovie(guess, m));

  return previousGuesses.some((prev) => {
    if (prev.isSkipped) return false;
    if (prev.normalized === norm) return true;
    if (phone && phoneticKey(prev.normalized) === phone) return true;
    if (matchedPriorMovie && isMatchingMovie(prev.normalized, matchedPriorMovie)) {
      return true;
    }
    return false;
  });
}

export function suggestTitles(
  query: string,
  movies: KodleMovie[],
  limit = 6
): { id: string; title: string; year: number }[] {
  const q = normalizeTitle(query);
  if (q.length < 2) return [];

  const qCompact = q.replace(/\s+/g, '');
  const qPhone = phoneticKey(q);

  const scored = movies
    .map((movie) => {
      const titles = [movie.title, ...movie.aliases];
      let bestScore = 0;

      for (const t of titles) {
        const nt = normalizeTitle(t);
        const ct = nt.replace(/\s+/g, '');
        const pt = phoneticKey(t);

        if (nt.startsWith(q) || ct.startsWith(qCompact)) {
          bestScore = Math.max(bestScore, 3);
        } else if (nt.includes(q) || ct.includes(qCompact) || (qPhone.length >= 3 && pt.includes(qPhone))) {
          bestScore = Math.max(bestScore, 2);
        }
      }

      return { movie, score: bestScore };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.movie.title.localeCompare(b.movie.title))
    .slice(0, limit)
    .map((item) => ({
      id: item.movie.id,
      title: item.movie.title,
      year: item.movie.year,
    }));

  return scored;
}
