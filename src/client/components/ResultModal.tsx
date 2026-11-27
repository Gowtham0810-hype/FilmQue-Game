import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Eye, Clock, Check, Share2, X, Flame } from 'lucide-react';
import { GuessRecord, KodleMovie } from '../types/kodle';
import { CelebrationBurst } from './CelebrationBurst';

interface ResultModalProps {
  open: boolean;
  movie: KodleMovie;
  won: boolean;
  guesses: GuessRecord[];
  score: number;
  clueStage?: number;
  dayNumber?: number;
  currentStreak?: number;
  onClose: () => void;
}

function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export function ResultModal({
  open,
  movie,
  won,
  guesses,
  score,
  clueStage = 1,
  dayNumber,
  currentStreak = 0,
  onClose,
}: ResultModalProps) {
  const [canAdvanceWithEnter, setCanAdvanceWithEnter] = useState(false);
  const [copied, setCopied] = useState(false);
  const [secondsUntilMidnight, setSecondsUntilMidnight] = useState<number>(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
  });

  // Countdown timer to midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
      setSecondsUntilMidnight(diff);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cooldown to prevent the Enter key used for guessing from immediately dismissing
  useEffect(() => {
    if (!open) {
      setCanAdvanceWithEnter(false);
      setCopied(false);
      return;
    }

    const timer = setTimeout(() => {
      setCanAdvanceWithEnter(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && canAdvanceWithEnter) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, canAdvanceWithEnter, onClose]);

  const handleShare = () => {
    const icons = guesses.filter(g => !g.isSkipped).map((g) => (g.isCorrect ? '🟩' : '🟥')).join('');
    const clueLabel = clueStage === 1 ? 'Barcode (100 PTS)' : clueStage === 2 ? 'Clue 1 (60 PTS)' : 'Clue 2 (30 PTS)';
    const streakLine = won && currentStreak > 1 ? `\n🔥 ${currentStreak}-day streak` : '';
    const text = `🎬 FilmQue #${dayNumber || 1}
Score: ${won ? `${score} PTS` : '0 PTS'} (${won ? clueLabel : 'Unsolved'})${streakLine}
Guesses: ${guesses.filter(g => !g.isSkipped).length} | ${icons}

r/FilmQue`;

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <>
      <CelebrationBurst active={open && won} />

      <AnimatePresence>
        {open && (
          <motion.div
            key="result-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="round-result-heading"
            onClick={onClose}
          >
            <motion.div
              key="result-modal-dialog"
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full max-w-2xl bg-[var(--white-surface)] border border-[var(--line)] rounded-2xl overflow-hidden shadow-2xl my-auto transition-colors duration-300 ${
                won
                  ? 'dark:shadow-[0_0_60px_rgba(255,69,0,0.2),0_16px_48px_rgba(0,0,0,0.6)]'
                  : 'dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Status Header */}
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={`px-6 py-4 border-b border-[var(--line)] flex items-center justify-between gap-3 ${
                  won
                    ? 'bg-[var(--ink)] text-[var(--bg)]'
                    : 'bg-[var(--bg)] text-[var(--ink)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {won ? (
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-[var(--mute)]" />
                  )}
                  <span className="label-xs font-semibold">
                    {won
                      ? `Correct · Solved on ${clueStage === 1 ? 'Barcode' : `Clue ${clueStage - 1}`}`
                      : 'Answer Revealed · 0 PTS'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 label-mono text-xs font-semibold tabular-nums ${
                      won
                        ? 'bg-emerald-400 text-[#141414] dark:shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                        : 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-700/50'
                    }`}
                  >
                    +{score} PTS
                  </span>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close modal"
                    className="p-1 hover:opacity-75 active:scale-[0.96] transition-transform cursor-pointer text-inherit"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>

              {/* Streak Banner — only show on a win with streak ≥ 2 */}
              {won && currentStreak >= 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.14, duration: 0.28 }}
                  className="px-6 py-3 border-b border-[var(--line-subtle)] bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center gap-2.5"
                >
                  <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span className="label-xs font-semibold text-amber-800 dark:text-amber-300 tabular-nums">
                    {currentStreak}-DAY STREAK · KEEP IT GOING!
                  </span>
                  <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                </motion.div>
              )}

              {/* Revealed Movie Title */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="p-6 sm:p-8 border-b border-[var(--line-subtle)]"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--mute)]">
                  <span className="font-mono tabular-nums">{movie.year}</span>
                  <span aria-hidden="true">·</span>
                  <span>{movie.category}</span>
                  {movie.language && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{movie.language}</span>
                    </>
                  )}
                  {movie.director && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Dir. {movie.director}</span>
                    </>
                  )}
                </div>

                <h2 id="round-result-heading" className="section-h2 mt-2">
                  {movie.title}
                </h2>

                <p className="text-sm text-[var(--mute)] mt-3 leading-relaxed">
                  {movie.connectionSummary}
                </p>
              </motion.div>

              {/* Concise 3-Clue Recap */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="p-6 sm:px-8 border-b border-[var(--line-subtle)] max-h-64 overflow-y-auto"
              >
                <p className="label-xs text-[11px] text-[var(--mute)] mb-3">
                  All Three Clues Connected
                </p>
                <div className="divide-y divide-[var(--line-subtle)] border border-[var(--line)]">
                  {movie.clues.map((clue) => {
                    const isSolvedHere = won && clue.level === clueStage;
                    return (
                      <div key={clue.level} className="px-4 py-3 bg-[var(--white-surface)]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="label-mono text-xs font-semibold text-[var(--ink)]">
                              {clue.level === 1 ? 'BARCODE' : `CLUE ${clue.level - 1}`}
                            </span>
                            <span className="text-xs text-[var(--mute)] uppercase tracking-[0.06em]">
                              {clue.level === 1 ? 'VISUAL SPECTRUM' : clue.level === 2 ? 'PREMISE' : 'HOOK'}
                            </span>
                          </div>
                          {isSolvedHere && (
                            <span className="label-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 dark:drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">
                              SOLVED HERE
                            </span>
                          )}
                        </div>
                        {clue.level === 1 && (
                          <div className="my-2 rounded overflow-hidden border border-[var(--line-strong)] h-12 bg-black">
                            <img
                              src={clue.barcodeUrl || movie.barcodeUrl || `/barcodes/${movie.id}.png`}
                              alt="Movie Barcode"
                              className="w-full h-full object-fill"
                            />
                          </div>
                        )}
                        <p className="text-sm text-[var(--ink)] mt-1">{clue.text}</p>
                        {clue.note && (
                          <p className="text-xs text-[var(--mute)] mt-0.5">{clue.note}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Reddit Community CTA */}
              <div className="mx-6 sm:mx-8 my-3 p-3 rounded-xl bg-[#ff4500]/10 border border-[#ff4500]/25 text-xs text-[var(--ink)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base select-none">💬</span>
                  <span>
                    Share your score in the daily subreddit thread! Remember spoiler tags: <code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-[10px]">&gt;!movie spoiler!&lt;</code>
                  </span>
                </div>
              </div>

              {/* Bottom Bar: Countdown to Tomorrow + Actions */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="px-6 py-3.5 sm:px-8 bg-[var(--bg)] flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors duration-300"
              >
                <div className="flex items-center gap-2 text-xs text-[var(--mute)]">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="label-mono text-[11px]">
                    NEXT FILM IN <span className="text-[var(--ink)] font-semibold tabular-nums">{formatCountdown(secondsUntilMidnight)}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex-1 sm:flex-initial px-5 py-2 rounded-full bg-[#ff4500] text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#e03d00] active:scale-95 transition-all shadow-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Share to Reddit'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-initial px-5 py-2 rounded-full bg-[var(--ink)] text-[var(--bg)] font-semibold text-xs hover:opacity-85 active:scale-95 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
