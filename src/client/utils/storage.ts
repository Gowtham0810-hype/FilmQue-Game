import { GuessRecord, KodleMovie, PlayerStats, RoundHistoryEntry } from '../types/kodle';

const CUSTOM_MOVIES_KEY = 'kodle_custom_movies_v1';
const PLAYER_STATS_KEY = 'kodle_player_stats_v1';
const RECENT_IDS_KEY = 'kodle_recent_ids_v1';
const SOUND_KEY = 'kodle_sound_enabled_v1';
const PLAYER_NAME_KEY = 'filmclub_player_name_v1';
const DAILY_STATE_PREFIX = 'filmque_daily_v2_';

export const EMPTY_STATS: PlayerStats = {
  totalPlayed: 0,
  totalWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  firstGuessWins: 0,
  totalScore: 0,
  totalGuessesOnWins: 0,
  distribution: {
    1: 0,
    2: 0,
    3: 0,
    fail: 0,
  },
  history: [],
};

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(todayDateStr: string): string {
  const parts = todayDateStr.split('-').map(Number);
  const y = parts[0] ?? 2026;
  const m = (parts[1] ?? 1) - 1;
  const d = parts[2] ?? 1;
  const date = new Date(y, m, d);
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailyMovie(
  movies: KodleMovie[],
  dateStr?: string
): { movie: KodleMovie; dayNumber: number; dateString: string } {
  const date = dateStr || getTodayDateString();
  const epoch = new Date('2026-01-01T00:00:00').getTime();
  const dateParts = date.split('-').map(Number);
  const py = dateParts[0] ?? 2026;
  const pm = (dateParts[1] ?? 1) - 1;
  const pd = dateParts[2] ?? 1;
  const todayTime = new Date(py, pm, pd).getTime();
  const diffDays = Math.max(0, Math.floor((todayTime - epoch) / (1000 * 60 * 60 * 24)));

  // Scramble index deterministically so days are well-distributed across movies
  const hash = (diffDays * 9301 + 49297) % 233280;
  const index = hash % movies.length;

  return {
    movie: movies[index] ?? movies[0]!,
    dayNumber: diffDays + 1,
    dateString: date,
  };
}

export interface DailyGameState {
  date: string;
  movieId: string;
  guesses: GuessRecord[];
  completed: boolean;
  won: boolean;
  score: number;
}

export function loadDailyState(todayDate: string, todayMovieId: string): DailyGameState | null {
  try {
    const raw = localStorage.getItem(`${DAILY_STATE_PREFIX}${todayDate}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.date === todayDate && parsed.movieId === todayMovieId) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveDailyState(state: DailyGameState): void {
  try {
    localStorage.setItem(`${DAILY_STATE_PREFIX}${state.date}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function getActiveStreak(stats: PlayerStats, todayStr: string): number {
  if (!stats.lastWonDate) return stats.currentStreak || 0;
  const yesterday = getYesterdayDateString(todayStr);
  if (stats.lastWonDate === todayStr || stats.lastWonDate === yesterday) {
    return stats.currentStreak;
  }
  return 0; // missed yesterday or earlier
}

export function loadCustomMovies(): KodleMovie[] {
  try {
    const raw = localStorage.getItem(CUSTOM_MOVIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomMovies(movies: KodleMovie[]): void {
  try {
    localStorage.setItem(CUSTOM_MOVIES_KEY, JSON.stringify(movies));
  } catch {
    // ignore
  }
}

export function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(PLAYER_STATS_KEY);
    if (!raw) return EMPTY_STATS;
    const parsed = JSON.parse(raw);
    return {
      ...EMPTY_STATS,
      ...parsed,
      distribution: {
        ...EMPTY_STATS.distribution,
        ...(parsed.distribution || {}),
      },
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return EMPTY_STATS;
  }
}

export function saveStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

export function recordRoundToStats(
  prev: PlayerStats,
  entry: Omit<RoundHistoryEntry, 'id' | 'timestamp'>,
  todayDateStr?: string
): PlayerStats {
  const today = todayDateStr || getTodayDateString();
  const yesterday = getYesterdayDateString(today);

  const newEntry: RoundHistoryEntry = {
    ...entry,
    id: `${entry.movieId}-${Date.now()}`,
    timestamp: Date.now(),
  };

  const totalPlayed = prev.totalPlayed + 1;
  const totalWon = entry.won ? prev.totalWon + 1 : prev.totalWon;

  // Streak logic for daily film:
  let currentStreak = 0;
  if (entry.won) {
    if (prev.lastWonDate === yesterday) {
      currentStreak = (prev.currentStreak || 0) + 1;
    } else if (prev.lastWonDate === today) {
      currentStreak = prev.currentStreak || 1;
    } else {
      currentStreak = 1;
    }
  }

  const bestStreak = Math.max(prev.bestStreak || 0, currentStreak);
  const firstGuessWins =
    entry.won && entry.score === 100 ? (prev.firstGuessWins || 0) + 1 : (prev.firstGuessWins || 0);
  const totalScore = (prev.totalScore || 0) + entry.score;
  const totalGuessesOnWins = entry.won
    ? (prev.totalGuessesOnWins || 0) + entry.guessesUsed
    : (prev.totalGuessesOnWins || 0);

  const distribution = { ...(prev.distribution || { 1: 0, 2: 0, 3: 0, fail: 0 }) };
  if (entry.won) {
    const stage = entry.score === 100 ? 1 : entry.score === 60 ? 2 : 3;
    distribution[stage] = (distribution[stage] || 0) + 1;
  } else {
    distribution.fail = (distribution.fail || 0) + 1;
  }

  return {
    totalPlayed,
    totalWon,
    currentStreak,
    bestStreak,
    firstGuessWins,
    totalScore,
    totalGuessesOnWins,
    lastPlayedDate: today,
    lastWonDate: entry.won ? today : prev.lastWonDate,
    distribution,
    history: [newEntry, ...(prev.history || [])].slice(0, 50),
  };
}

export function loadRecentMovieIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentMovieIds(ids: string[]): void {
  try {
    localStorage.setItem(RECENT_IDS_KEY, JSON.stringify(ids.slice(0, 20)));
  } catch {
    // ignore
  }
}

export function loadSoundEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SOUND_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function saveSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, String(enabled));
  } catch {
    // ignore
  }
}

export function loadPlayerName(): string {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || 'Film Buff';
  } catch {
    return 'Film Buff';
  }
}

export function savePlayerName(name: string): void {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name.trim() || 'Film Buff');
  } catch {
    // ignore
  }
}
