export type MovieCategory =
  | 'Sci-Fi'
  | 'Thriller'
  | 'Crime'
  | 'Drama'
  | 'Action'
  | 'Comedy'
  | 'Horror'
  | 'Mystery'
  | 'Romance'
  | 'War'
  | 'Animation';

export type ClueDifficulty =
  | 'Barcode'
  | 'Very Hard'
  | 'Hard'
  | 'Easy';

export interface ClueItem {
  level: 1 | 2 | 3;
  difficulty: ClueDifficulty;
  text: string;
  note?: string;
  barcodeUrl?: string;
}

export interface KodleMovie {
  id: string;
  title: string;
  year: number;
  director?: string;
  category: MovieCategory;
  language?: string;
  aliases: string[];
  barcodeUrl?: string;
  clues: [ClueItem, ClueItem, ClueItem];
  connectionSummary: string;
  isCustom?: boolean;
  createdAt?: number;
}

export interface GuessRecord {
  attemptNumber: number;
  rawInput: string;
  normalized: string;
  isSkipped?: boolean;
  isCorrect: boolean;
}

export interface RoundHistoryEntry {
  id: string;
  movieId: string;
  movieTitle: string;
  year: number;
  category: MovieCategory;
  won: boolean;
  guessesUsed: number;
  score: number;
  timestamp: number;
}

export interface PlayerStats {
  totalPlayed: number;
  totalWon: number;
  currentStreak: number;
  bestStreak: number;
  firstGuessWins: number;
  totalScore: number;
  totalGuessesOnWins: number;
  lastPlayedDate?: string | undefined;
  lastWonDate?: string | undefined;
  distribution: {
    1: number;
    2: number;
    3: number;
    fail: number;
  };
  history: RoundHistoryEntry[];
}

export type AppView = 'play' | 'archive' | 'stats';

export const MOVIE_CATEGORIES: MovieCategory[] = [
  'Sci-Fi',
  'Thriller',
  'Crime',
  'Drama',
  'Action',
  'Comedy',
  'Horror',
  'Mystery',
  'Romance',
  'War',
  'Animation',
];

export const CLUE_DIFFICULTIES: ClueDifficulty[] = [
  'Barcode',
  'Very Hard',
  'Hard',
  'Easy',
];

/**
 * Returns user-facing label for clue difficulty in the UI:
 * Level 1 / "Barcode" / "Very Hard" -> "Barcode"
 * Level 2 / "Hard" -> "Medium"
 * Level 3 / "Easy" -> "Easy"
 */
export function getDisplayDifficulty(difficultyOrLevel: string | number): 'Barcode' | 'Hard' | 'Medium' | 'Easy' {
  if (difficultyOrLevel === 1 || difficultyOrLevel === 'Barcode' || difficultyOrLevel === 'Very Hard') return 'Barcode';
  if (difficultyOrLevel === 2 || difficultyOrLevel === 'Hard') return 'Medium';
  return 'Easy';
}
