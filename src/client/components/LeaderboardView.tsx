import type React from 'react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Edit2, Trophy, X } from 'lucide-react';
import { PlayerStats } from '../types/kodle';

export interface LeaderboardRow {
  id: string;
  name: string;
  score: number;
  solved: number;
  streak: number;
  isCurrentUser?: boolean;
}

export const CLUB_CONTENDERS: Omit<LeaderboardRow, 'isCurrentUser'>[] = [
  { id: 'fc-1', name: 'u/Cinephile_Pro', score: 540, solved: 7, streak: 5 },
  { id: 'fc-2', name: 'u/FilmBuff_42', score: 480, solved: 6, streak: 4 },
  { id: 'fc-3', name: 'u/MovieNerd_K', score: 420, solved: 5, streak: 4 },
  { id: 'fc-4', name: 'u/ReelGenius', score: 380, solved: 5, streak: 3 },
  { id: 'fc-5', name: 'u/CinemaLover', score: 320, solved: 4, streak: 3 },
  { id: 'fc-6', name: 'u/OscarWatcher', score: 260, solved: 4, streak: 2 },
  { id: 'fc-7', name: 'u/IndieFanatic', score: 220, solved: 3, streak: 2 },
  { id: 'fc-8', name: 'u/FrameByFrame', score: 180, solved: 3, streak: 1 },
  { id: 'fc-9', name: 'u/ColorSpectrum', score: 140, solved: 2, streak: 2 },
  { id: 'fc-10', name: 'u/PopcornDaily', score: 120, solved: 2, streak: 1 },
  { id: 'fc-11', name: 'u/ScreenReview', score: 80, solved: 1, streak: 1 },
  { id: 'fc-12', name: 'u/DirectorCut', score: 60, solved: 1, streak: 0 },
];

export function buildLeaderboard(playerName: string, stats: PlayerStats): LeaderboardRow[] {
  const cleanName = playerName.trim() || 'You';
  const displayName = cleanName.startsWith('u/') ? cleanName : `u/${cleanName}`;
  const userRow: LeaderboardRow = {
    id: 'current-player',
    name: displayName,
    score: stats.totalScore,
    solved: stats.totalWon,
    streak: stats.bestStreak,
    isCurrentUser: true,
  };

  const combined: LeaderboardRow[] = [...CLUB_CONTENDERS, userRow];
  return combined.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.solved !== a.solved) return b.solved - a.solved;
    if (b.streak !== a.streak) return b.streak - a.streak;
    return a.isCurrentUser ? -1 : 1;
  });
}

interface LeaderboardViewProps {
  open: boolean;
  onClose: () => void;
  playerName: string;
  onChangePlayerName: (name: string) => void;
  stats: PlayerStats;
}

export function LeaderboardView({
  open,
  onClose,
  playerName,
  onChangePlayerName,
  stats,
}: LeaderboardViewProps) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(playerName);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const rows = buildLeaderboard(playerName, stats);
  const myRank = rows.findIndex((r) => r.isCurrentUser) + 1;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    onChangePlayerName(draftName.trim() || 'You');
    setEditingName(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="leaderboard-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="leaderboard-modal-title"
        >
          <motion.div
            key="leaderboard-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl bg-[var(--white-surface)] border border-[var(--line)] rounded-2xl shadow-2xl my-auto transition-colors duration-300 flex flex-col max-h-[88vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[var(--line)] shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <p className="label-mono text-xs text-[var(--mute)] uppercase">
                    r/FilmQue · Standings
                  </p>
                </div>
                <h2 id="leaderboard-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)] mt-1">
                  Community Leaderboard
                </h2>
                <p className="text-xs text-[var(--mute)] mt-0.5">
                  Earn up to 100 points per daily film to climb the subreddit rankings.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close leaderboard"
                className="w-8 h-8 rounded-full border border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--card-bg)] active:scale-95 text-[var(--ink)] flex items-center justify-center cursor-pointer transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

        {/* Player summary bar */}
        <div className="px-6 py-3 bg-[var(--card-bg)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="label-xs text-[11px] text-[var(--mute)]">PLAYER:</span>
            {editingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                <input
                  type="text"
                  maxLength={22}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  autoFocus
                  placeholder="Enter name..."
                  className="border border-[var(--line-strong)] bg-[var(--input-bg)] px-2 py-0.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--ink)] transition-colors"
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-[var(--ink)] text-[var(--bg)] label-xs text-[10px] flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <Check className="w-3 h-3" />
                  <span>Save</span>
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[var(--ink)]">{playerName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(playerName);
                    setEditingName(true);
                  }}
                  aria-label="Edit player handle"
                  className="p-1 text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
            <div>
              <span className="text-[var(--mute)] mr-1.5">RANK:</span>
              <span className="font-semibold text-[var(--ink)] tabular-nums">#{myRank}</span>
            </div>
            <div>
              <span className="text-[var(--mute)] mr-1.5">STREAK:</span>
              <span className="font-semibold text-amber-500 dark:text-amber-400 tabular-nums">{stats.currentStreak}</span>
            </div>
            <div>
              <span className="text-[var(--mute)] mr-1.5">SCORE:</span>
              <span className="font-semibold text-[var(--ink)] tabular-nums">{stats.totalScore}</span>
            </div>
            <div>
              <span className="text-[var(--mute)] mr-1.5">SOLVED:</span>
              <span className="font-semibold text-[var(--ink)] tabular-nums">{stats.totalWon}</span>
            </div>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Table header (sticky) */}
          <div className="sticky top-0 z-10 grid grid-cols-12 px-6 py-2.5 bg-[var(--bg)] border-b border-[var(--line)] text-[var(--mute)] label-xs text-[11px]">
            <span className="col-span-2 sm:col-span-1">Rank</span>
            <span className="col-span-5 sm:col-span-6">Player</span>
            <span className="col-span-2 text-right">Solved</span>
            <span className="col-span-3 text-right">Score</span>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-[var(--line-subtle)]">
            {rows.map((row, index) => {
              const rank = index + 1;

              return (
                <div
                  key={row.id}
                  className={`grid grid-cols-12 items-center px-6 py-3.5 transition-colors ${
                    row.isCurrentUser
                      ? 'bg-[var(--ink)] text-[var(--bg)]'
                      : 'bg-[var(--white-surface)] text-[var(--ink)] hover:bg-[var(--card-bg)]'
                  }`}
                >
                  {/* Rank */}
                  <span
                    className={`col-span-2 sm:col-span-1 label-mono text-sm font-semibold tabular-nums ${
                      row.isCurrentUser ? 'text-[var(--bg)]' : 'text-[var(--mute)]'
                    }`}
                  >
                    {String(rank).padStart(2, '0')}
                  </span>

                  {/* Player */}
                  <div className="col-span-5 sm:col-span-6 flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{row.name}</span>
                    {row.isCurrentUser && (
                      <span className="px-1.5 py-0.5 bg-[var(--bg)] text-[var(--ink)] label-mono text-[9px] font-semibold shrink-0">
                        YOU
                      </span>
                    )}
                  </div>

                  {/* Solved */}
                  <span
                    className={`col-span-2 text-right label-mono text-sm tabular-nums ${
                      row.isCurrentUser ? 'opacity-75' : 'text-[var(--mute)]'
                    }`}
                  >
                    {row.solved}
                  </span>

                  {/* Score */}
                  <span className="col-span-3 text-right label-mono text-sm sm:text-base font-semibold tabular-nums">
                    {row.score} PTS
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-[var(--line)] bg-[var(--bg)] flex items-center justify-between gap-3 shrink-0">
          <span className="label-mono text-xs text-[var(--mute)] hidden sm:inline">
            TOP PLAYERS COMPETE FOR WEEKLY HONORS
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-[var(--ink)] text-[var(--bg)] label-xs hover:opacity-85 active:scale-[0.98] transition-all cursor-pointer ml-auto"
          >
            Back to Game
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
