import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { context } from '@devvit/web/client';
import { CURATED_MOVIES } from './data/movies';
import { PlayerStats, GuessRecord } from './types/kodle';
import {
  DailyGameState,
  getActiveStreak,
  getDailyMovie,
  loadDailyState,
  loadPlayerName,
  loadSoundEnabled,
  loadStats,
  recordRoundToStats,
  saveDailyState,
  savePlayerName,
  saveStats,
} from './utils/storage';
import { FloatingNav } from './components/FloatingNav';
import { GameBoard } from './components/GameBoard';
import { buildLeaderboard, LeaderboardView } from './components/LeaderboardView';
import { RulesModal } from './components/RulesModal';
import { SpaceDustBackground } from './components/SpaceDustBackground';

function loadDarkMode(): boolean {
  try {
    const saved = localStorage.getItem('filmque-dark');
    // Default to true (Dark Mode) on initial visit
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

function loadHasSeenRules(): boolean {
  try {
    return localStorage.getItem('filmque-has-seen-rules') === 'true';
  } catch {
    return false;
  }
}

export default function App() {
  const [stats, setStats] = useState<PlayerStats>(() => loadStats());
  const [playerName, setPlayerName] = useState<string>(() => context?.username || loadPlayerName());
  const [soundEnabled] = useState<boolean>(() => loadSoundEnabled());
  const [darkMode, setDarkMode] = useState<boolean>(loadDarkMode);

  // Deterministic Film of the Day based on calendar date
  const defaultDaily = useMemo(() => getDailyMovie(CURATED_MOVIES), []);
  const initialIndex = useMemo(() => {
    const idx = CURATED_MOVIES.findIndex((m) => m.id === defaultDaily.movie.id);
    return idx >= 0 ? idx : 0;
  }, [defaultDaily]);

  // Dev: allow refreshing through movies
  const [movieIndex, setMovieIndex] = useState<number>(initialIndex);
  const currentMovie = CURATED_MOVIES[movieIndex] || defaultDaily.movie;

  // Game state for the active film
  const [dailyState, setDailyState] = useState<DailyGameState | null>(() =>
    loadDailyState(defaultDaily.dateString, defaultDaily.movie.id)
  );

  const handleDevRefreshMovie = () => {
    const nextIdx = (movieIndex + 1) % CURATED_MOVIES.length;
    setMovieIndex(nextIdx);
    const nextMovie = CURATED_MOVIES[nextIdx];
    if (nextMovie) {
      setDailyState(loadDailyState(defaultDaily.dateString, nextMovie.id));
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('filmque-dark', String(darkMode));
    } catch {
      // ignore
    }
  }, [darkMode]);

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState<boolean>(() => !loadHasSeenRules());

  const handleCloseRules = () => {
    setRulesOpen(false);
    try {
      localStorage.setItem('filmque-has-seen-rules', 'true');
    } catch {
      // ignore
    }
  };

  // Check active streak for today
  const activeStreak = useMemo(
    () => getActiveStreak(stats, defaultDaily.dateString),
    [stats, defaultDaily.dateString]
  );

  const playerRank = useMemo(() => {
    const rows = buildLeaderboard(playerName, stats);
    return rows.findIndex((r) => r.isCurrentUser) + 1;
  }, [playerName, stats]);

  const handleRoundComplete = ({
    won,
    guessesUsed,
    score,
    guesses,
  }: {
    won: boolean;
    guessesUsed: number;
    score: number;
    guesses: GuessRecord[];
  }) => {
    const updated = recordRoundToStats(
      stats,
      {
        movieId: currentMovie.id,
        movieTitle: currentMovie.title,
        year: currentMovie.year,
        category: currentMovie.category,
        won,
        guessesUsed,
        score,
      },
      defaultDaily.dateString
    );
    setStats(updated);
    saveStats(updated);

    const newDailyState: DailyGameState = {
      date: defaultDaily.dateString,
      movieId: currentMovie.id,
      guesses,
      completed: true,
      won,
      score,
    };
    setDailyState(newDailyState);
    saveDailyState(newDailyState);
  };

  const handleChangePlayerName = (name: string) => {
    setPlayerName(name);
    savePlayerName(name);
  };

  return (
    <div className="relative min-h-screen lg:h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col justify-between transition-colors duration-300">
      {darkMode && <SpaceDustBackground darkMode={darkMode} />}

      {/* Top Header: Reddit-Aligned Identity + Dev Refresh + Nav Controls */}
      <header className="relative z-10 w-full px-3 sm:px-5 lg:px-6 py-2 flex items-center justify-between gap-2.5 shrink-0 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur-xs">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 select-none">
            <span className="text-lg sm:text-xl">🎬</span>
            <span className="font-extrabold tracking-tight text-sm sm:text-base text-[var(--ink)]">
              Film<span className="text-[#ff4500]">Que</span>
            </span>
          </div>

          {/* Dev Refresh Button (Temporary for playtesting) */}
          <button
            type="button"
            onClick={handleDevRefreshMovie}
            title="Dev tool: Cycle to next film in library"
            className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono border border-dashed border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>DEV</span>
            <span className="tabular-nums">({movieIndex + 1}/{CURATED_MOVIES.length})</span>
          </button>
        </div>

        <FloatingNav
          playerName={playerName}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onOpenRules={() => setRulesOpen(true)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
          playerRank={playerRank}
          currentStreak={activeStreak}
        />
      </header>

      <main className="relative z-10 flex-1 w-full px-3 sm:px-5 lg:px-6 py-2 flex flex-col justify-start overflow-y-auto">
        <GameBoard
          key={currentMovie.id}
          movie={currentMovie}
          allMovies={CURATED_MOVIES}
          dayNumber={defaultDaily.dayNumber}
          dateString={defaultDaily.dateString}
          currentStreak={activeStreak}
          totalScore={stats.totalScore}
          soundEnabled={soundEnabled}
          initialGuesses={dailyState?.guesses || []}
          isCompleted={dailyState?.completed || false}
          initialScore={dailyState?.score}
          onRoundComplete={handleRoundComplete}
        />
      </main>

      <footer className="relative z-10 border-t border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur-xs shrink-0 transition-colors duration-300">
        <div className="w-full px-3.5 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between text-xs text-[var(--mute)]">
          <span className="font-semibold text-[11px] text-[var(--ink)] tracking-wider select-none">r/FilmQue</span>
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="text-[11px] text-[var(--ink)] underline underline-offset-4 hover:opacity-75 active:scale-95 transition-all cursor-pointer font-medium"
          >
            Scoring &amp; Rules
          </button>
        </div>
      </footer>

      <RulesModal open={rulesOpen} onClose={handleCloseRules} />
      <LeaderboardView
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        playerName={playerName}
        onChangePlayerName={handleChangePlayerName}
        stats={stats}
      />
    </div>
  );
}
