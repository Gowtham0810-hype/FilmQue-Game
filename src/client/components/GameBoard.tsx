import type React from 'react';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useAnimate } from 'motion/react';
import {
  Film,
  Lock,
  AlertCircle,
  ArrowRight,
  Flag,
  Clock,
  CheckCircle2,
  XCircle,
  Check,
} from 'lucide-react';
import { GuessRecord, KodleMovie } from '../types/kodle';
import {
  isDuplicateGuess,
  isMatchingMovie,
  normalizeTitle,
  scoreForClueStage,
  suggestTitles,
} from '../utils/matching';
import { playTone } from '../utils/sound';
import { ResultModal } from './ResultModal';

function loadHasPlayed(): boolean {
  try { return localStorage.getItem('filmque-has-played') === 'true'; } catch { return false; }
}
function markHasPlayed(): void {
  try { localStorage.setItem('filmque-has-played', 'true'); } catch {
    // ignore
  }
}

interface GameBoardProps {
  movie: KodleMovie;
  allMovies: KodleMovie[];
  dayNumber: number;
  dateString: string;
  currentStreak: number;
  totalScore: number;
  soundEnabled: boolean;
  initialGuesses?: GuessRecord[];
  isCompleted?: boolean;
  initialScore?: number | undefined;
  onRoundComplete: (result: {
    won: boolean;
    guessesUsed: number;
    score: number;
    guesses: GuessRecord[];
  }) => void;
}

function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export function GameBoard({
  movie,
  allMovies,
  dayNumber,
  dateString,
  currentStreak,
  totalScore,
  soundEnabled,
  initialGuesses = [],
  isCompleted = false,
  initialScore,
  onRoundComplete,
}: GameBoardProps) {
  const [guesses, setGuesses] = useState<GuessRecord[]>(initialGuesses);
  const [clueStage, setClueStage] = useState<1 | 2 | 3>(() => {
    if (initialScore === 60) return 2;
    if (initialScore === 30) return 3;
    return 1;
  });
  const [clueForfeited, setClueForfeited] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'warn'; message: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isWinningReveal, setIsWinningReveal] = useState(false);
  const [winningGuessText, setWinningGuessText] = useState('');
  const finishTimerRef = useRef<number | null>(null);
  const [shakeScope, animateShake] = useAnimate();

  // ── Barcode proxy: fetch opaque hash, never expose movie filename ──────────
  const [barcodeUrl, setBarcodeUrl] = useState<string>('');
  const fetchBarcodeHash = useCallback(async (movieId: string) => {
    try {
      const endpoint = `/api/barcode/${movieId}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = (await res.json()) as { hash?: string };
      if (data.hash) {
        setBarcodeUrl(`/api/barcode/${data.hash}/image`);
      } else {
        throw new Error('No hash in response');
      }
    } catch (err) {
      console.warn('[FilmQue] Barcode proxy failed, using direct URL:', err);
      // Fallback: direct URL (still works locally, but exposes filename)
      setBarcodeUrl(`/barcodes/${movieId}.png`);
    }
  }, []);

  useEffect(() => {
    setBarcodeUrl(''); // reset while fetching
    fetchBarcodeHash(movie.id);
  }, [movie.id, fetchBarcodeHash]);
  // ─────────────────────────────────────────────────────────────────────────

  const triggerShake = () => {
    if (shakeScope.current) {
      animateShake(
        shakeScope.current,
        { x: [0, -10, 10, -8, 8, -4, 4, 0] },
        { duration: 0.36, ease: 'easeInOut' }
      );
    }
  };

  // First-time onboarding hint — only for brand-new players
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !loadHasPlayed() && !isCompleted);

  const [secondsUntilMidnight, setSecondsUntilMidnight] = useState<number>(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      setSecondsUntilMidnight(Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss onboarding hint after 7 seconds
  useEffect(() => {
    if (!showOnboarding) return;
    const t = setTimeout(() => { setShowOnboarding(false); markHasPlayed(); }, 7000);
    return () => clearTimeout(t);
  }, [showOnboarding]);

  // Focus guess input on mount if today's round is active
  useEffect(() => {
    if (!isCompleted) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, []);

  // Reset board state ONLY if movie.id changes (e.g. daily rollover)
  useEffect(() => {
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    setIsWinningReveal(false);
    setWinningGuessText('');
    setGuesses(initialGuesses);
    setClueStage(1);
    setClueForfeited(false);
    setInputValue('');
    setFeedback(null);
    setShowSuggestions(false);
    setHighlightedIdx(-1);
    setConfirmGiveUp(false);
    setShowResultModal(false);
    if (!isCompleted) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [movie.id]);

  useEffect(() => {
    return () => {
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, []);

  // Sync initialGuesses if it becomes available and guesses is empty
  useEffect(() => {
    if (initialGuesses.length > 0 && guesses.length === 0) {
      setGuesses(initialGuesses);
    }
  }, [initialGuesses]);

  const winningIndex = guesses.findIndex((g) => g.isCorrect);
  const won = winningIndex >= 0;
  const lost = !won && (clueForfeited || isCompleted);
  const isRoundResolved = won || lost || isCompleted;
  const roundEnded = isRoundResolved || isWinningReveal;
  const unlockedCount = roundEnded ? 3 : clueStage;
  const finalScore = won
    ? (initialScore !== undefined ? initialScore : scoreForClueStage(clueStage))
    : (initialScore || 0);

  // Press "/" to focus the guess box
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current && !roundEnded) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, [roundEnded]);

  // Title Assist active while playing
  const suggestions = useMemo(() => {
    if (roundEnded) return [];
    const list = suggestTitles(inputValue, allMovies, 6);
    return list.filter((item) => !isDuplicateGuess(item.title, guesses, allMovies));
  }, [inputValue, allMovies, guesses, roundEnded]);

  const finishRound = (finalGuesses: GuessRecord[], didWin: boolean, stageAtFinish: number) => {
    const score = didWin ? scoreForClueStage(stageAtFinish) : 0;
    const guessesUsedCount = finalGuesses.filter(g => !g.isSkipped).length;
    setShowResultModal(true);
    onRoundComplete({
      won: didWin,
      guessesUsed: guessesUsedCount,
      score,
      guesses: finalGuesses,
    });
  };

  const submitGuessText = (rawText: string) => {
    if (roundEnded) return;
    const trimmed = rawText.trim();
    if (!trimmed) {
      triggerShake();
      setFeedback({ type: 'warn', message: 'Type a movie title to submit.' });
      return;
    }

    if (isDuplicateGuess(trimmed, guesses, allMovies)) {
      triggerShake();
      setFeedback({
        type: 'warn',
        message: `"${trimmed}" was already tried today.`,
      });
      return;
    }

    const correct = isMatchingMovie(trimmed, movie);
    const nextAttemptNumber = guesses.length + 1;
    const nextRecord: GuessRecord = {
      attemptNumber: nextAttemptNumber,
      rawInput: trimmed,
      normalized: normalizeTitle(trimmed),
      isCorrect: correct,
    };

    const nextGuesses = [...guesses, nextRecord];
    setGuesses(nextGuesses);
    setInputValue('');
    setShowSuggestions(false);
    setHighlightedIdx(-1);
    setConfirmGiveUp(false);

    if (correct) {
      setFeedback(null);
      setIsWinningReveal(true);
      setWinningGuessText(trimmed);
      playTone('win', soundEnabled);
      // Paced transition: allows the player to absorb the victory on board before modal appears
      finishTimerRef.current = window.setTimeout(() => {
        setIsWinningReveal(false);
        finishRound(nextGuesses, true, clueStage);
      }, 950);
    } else {
      playTone('wrong', soundEnabled);
      triggerShake();
      const hint =
        clueStage === 1
          ? 'Not quite — try again, or reveal Clue 1 below.'
          : clueStage === 2
            ? 'Not quite — try again, or reveal Clue 2 below.'
            : 'Not quite — keep trying, or pass final.';
      setFeedback({
        type: 'error',
        message: hint,
      });
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  };

  const handleUnlockStage = (stage: 2 | 3) => {
    if (roundEnded) return;
    setShowSuggestions(false);
    setConfirmGiveUp(false);
    setClueStage(stage);
    const clueLabel = stage === 2 ? 'Clue 1 (Oblique Detail)' : 'Clue 2 (Core Premise)';
    const pts = stage === 2 ? 60 : 30;
    playTone('submit', soundEnabled);
    setFeedback({
      type: 'warn',
      message: `${clueLabel} revealed — ${pts} pts available.`,
    });
  };

  const handleForfeit = () => {
    if (roundEnded) return;
    setClueForfeited(true);
    setFeedback(null);
    setConfirmGiveUp(false);
    playTone('lose', soundEnabled);
    const capturedStage = clueStage;
    finishTimerRef.current = window.setTimeout(() => {
      finishRound(guesses, false, capturedStage);
    }, 450);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIdx((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIdx((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        setHighlightedIdx(-1);
        return;
      }
      if (e.key === 'Tab' && highlightedIdx >= 0) {
        e.preventDefault();
        const picked = suggestions[highlightedIdx];
        if (picked) {
          setInputValue(picked.title);
          setShowSuggestions(false);
          setHighlightedIdx(-1);
        }
        return;
      }
      if (e.key === 'Enter' && highlightedIdx >= 0) {
        e.preventDefault();
        e.stopPropagation();
        const picked = suggestions[highlightedIdx];
        if (picked) {
          submitGuessText(picked.title);
        }
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      submitGuessText(inputValue);
    }
  };


  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 h-full justify-start">
      {/* Top Title Strip - Clean Subreddit Header */}
      <section className="pb-1 border-b border-[var(--line)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-[var(--ink)] tracking-tight">
            Movie of the Day
          </h1>
          <span className="text-xs text-[var(--mute)] hidden sm:inline">
            · Decode the color barcode &amp; story clues
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--mute)] shrink-0">
          <span className="tabular-nums hidden md:inline text-[11px]">{dateString}</span>
          <span className="px-2.5 py-0.5 rounded-full bg-[var(--white-surface)] border border-[var(--line)] text-[var(--ink)] font-semibold tabular-nums text-[11px]">
            SCORE: {totalScore}
          </span>
        </div>
      </section>

      {/* Full-Width 2-Column Play Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-start">
        {/* Left Column (7 cols): Barcode Spectrum + Clue 1 & Clue 2 */}
        <div className="lg:col-span-7 flex flex-col gap-2">
          {/* Cinema Barcode Spectrum Frame */}
          <div className="relative group overflow-hidden rounded-lg border border-[var(--line)] bg-black shadow-xs">
            {/* Timeline ruler */}
            <div className="flex items-center justify-between px-3 py-1 text-[10px] sm:text-[11px] font-mono text-zinc-400 bg-zinc-900/95 border-b border-zinc-800 tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                00:00:00 (OPENING)
              </span>
              <span className="text-zinc-500 hidden sm:inline">50% RUNTIME</span>
              <div className="flex items-center gap-2">
                <span>CREDITS</span>
                {won && clueStage === 1 && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-600">
                    ✓ SOLVED ON BARCODE
                  </span>
                )}
              </div>
            </div>

            {/* Barcode image - Balanced cinema height for no-scroll viewport */}
            <div className="relative w-full h-36 sm:h-44 lg:h-48 xl:h-52 overflow-hidden bg-zinc-950 flex items-center justify-center">
              {barcodeUrl ? (
                <img
                  src={barcodeUrl}
                  alt="Movie Barcode Color Spectrum"
                  className="w-full h-full object-fill select-none pointer-events-none transition-transform duration-300 group-hover:scale-[1.005]"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="w-full h-full bg-zinc-900 animate-pulse" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />
            </div>
          </div>

          {/* Text Clues (Clue 1 and Clue 2) */}
          <div className="flex flex-col gap-1.5">
            {/* Clue 1: Oblique Detail (movie.clues[1]) */}
            {unlockedCount >= 2 ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`p-2.5 rounded-lg bg-[var(--white-surface)] border transition-all ${isWinningReveal && clueStage === 2
                  ? 'border-emerald-500 ring-2 ring-emerald-500/25'
                  : 'border-[var(--line)]'
                  }`}
              >
                <div className="flex items-center justify-between pb-1 border-b border-[var(--line-subtle)]">
                  <span className="label-mono text-xs font-semibold text-[var(--ink)]">
                    CLUE 1 (DETAIL)
                  </span>
                  {won && clueStage === 2 && (
                    <span className="px-2 py-0.2 rounded text-[9px] font-mono font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      ✓ SOLVED HERE
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-[var(--ink)]">
                  {movie.clues[1].text}
                </p>
                {roundEnded && movie.clues[1].note && (
                  <p className="mt-1 text-[11px] text-[var(--mute)] border-t border-[var(--line-subtle)] pt-1">
                    {movie.clues[1].note}
                  </p>
                )}
              </motion.div>
            ) : (
              <div className="px-3 py-1.5 rounded-lg flex items-center justify-between gap-3 bg-[var(--white-surface)] border border-dashed border-[var(--line-strong)]">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[var(--mute)] shrink-0" />
                  <span className="label-mono text-xs font-semibold text-[var(--ink)]">CLUE 1</span>
                  <span className="text-[11px] text-[var(--mute)] hidden sm:inline">· Oblique Detail</span>
                </div>
                <button
                  type="button"
                  disabled={roundEnded}
                  onClick={() => handleUnlockStage(2)}
                  className="px-2.5 py-1 rounded-full bg-[var(--ink)] text-[var(--bg)] label-xs text-[10px] hover:opacity-85 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>Reveal</span>
                  <span className="opacity-70 font-mono text-[9px]">(60 pts)</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {/* Clue 2: Core Premise (movie.clues[2]) */}
            {unlockedCount >= 3 ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`p-2.5 rounded-lg bg-[var(--white-surface)] border transition-all ${isWinningReveal && clueStage === 3
                  ? 'border-emerald-500 ring-2 ring-emerald-500/25'
                  : 'border-[var(--line)]'
                  }`}
              >
                <div className="flex items-center justify-between pb-1 border-b border-[var(--line-subtle)]">
                  <span className="label-mono text-xs font-semibold text-[var(--ink)]">
                    CLUE 2 (PREMISE)
                  </span>
                  {won && clueStage === 3 && (
                    <span className="px-2 py-0.2 rounded text-[9px] font-mono font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      ✓ SOLVED HERE
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-[var(--ink)]">
                  {movie.clues[2].text}
                </p>
                {roundEnded && movie.clues[2].note && (
                  <p className="mt-1 text-[11px] text-[var(--mute)] border-t border-[var(--line-subtle)] pt-1">
                    {movie.clues[2].note}
                  </p>
                )}
              </motion.div>
            ) : clueStage === 2 ? (
              <div className="px-3 py-1.5 rounded-lg flex items-center justify-between gap-3 bg-[var(--white-surface)] border border-dashed border-[var(--line-strong)]">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[var(--mute)] shrink-0" />
                  <span className="label-mono text-xs font-semibold text-[var(--ink)]">CLUE 2</span>
                  <span className="text-[11px] text-[var(--mute)] hidden sm:inline">· Core Premise</span>
                </div>
                <button
                  type="button"
                  disabled={roundEnded}
                  onClick={() => handleUnlockStage(3)}
                  className="px-2.5 py-1 rounded-full bg-[var(--ink)] text-[var(--bg)] label-xs text-[10px] hover:opacity-85 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>Reveal</span>
                  <span className="opacity-70 font-mono text-[9px]">(30 pts)</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-lg flex items-center justify-between gap-3 bg-[var(--bg)] border border-[var(--line-subtle)] opacity-50">
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-[var(--mute)] shrink-0" />
                  <span className="label-mono text-xs text-[var(--mute)]">CLUE 2</span>
                  <span className="text-[11px] text-[var(--mute)]">· Locked</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 cols: Guess Input or Today's Completed Status */}
        <div ref={shakeScope} className="lg:col-span-5 flex flex-col gap-2.5 justify-start items-stretch">
          <AnimatePresence mode="wait">
            {isRoundResolved ? (
              /* Completed Today Card - Reddit community oriented */
              <motion.div
                key="completed-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="bg-[var(--white-surface)] border border-[var(--line)] rounded-xl p-4 glow-card transition-all duration-300 shadow-sm"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-[var(--line-subtle)]">
                  <div className="flex items-center gap-2">
                    {won ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[var(--mute)]" />
                    )}
                    <span className="label-xs text-[var(--ink)] font-semibold">
                      {won ? "Today's Film Solved" : "Today's Film Revealed"}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full label-mono text-xs font-semibold tabular-nums ${won ? 'bg-emerald-500 text-white' : 'bg-[var(--line)] text-[var(--ink)]'
                      }`}
                  >
                    {won ? `+${finalScore} PTS` : '0 PTS'}
                  </span>
                </div>

                <div className="my-3">
                  <p className="text-[11px] text-[var(--mute)] uppercase tracking-wider font-semibold">Today's Mystery Movie</p>
                  <h3 className="text-xl font-bold text-[var(--ink)] mt-0.5">{movie.title}</h3>
                  <p className="text-xs text-[var(--mute)] mt-0.5">
                    {movie.year} · {movie.category}
                    {movie.language ? ` · ${movie.language}` : ''}
                  </p>
                </div>

                {/* Reddit Community CTA */}
                <div className="p-2.5 rounded-lg bg-[#ff4500]/10 border border-[#ff4500]/25 text-xs text-[var(--ink)] flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <span>💬</span>
                    <span>Join discussion in comments below!</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#ff4500] font-semibold shrink-0">
                    Use spoiler tags &gt;!...!&lt;
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[var(--line-subtle)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--mute)]">
                    <Clock className="w-3.5 h-3.5 text-[var(--mute)]" />
                    <span className="label-mono text-[11px]">
                      Next: <span className="text-[var(--ink)] font-semibold tabular-nums">{formatCountdown(secondsUntilMidnight)}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowResultModal(true)}
                    className="px-4 py-1.5 rounded-full bg-[#ff4500] text-white font-semibold text-xs hover:bg-[#e03d00] active:scale-95 transition-all cursor-pointer shrink-0 shadow-xs"
                  >
                    Share / Summary
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Guess Input Card */
              <motion.div
                key="guess-input-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={`bg-[var(--white-surface)] border rounded-xl p-4 glow-card transition-all duration-500 ${isWinningReveal
                  ? 'border-emerald-500 ring-2 ring-emerald-500/25 shadow-[0_0_24px_rgba(52,211,153,0.2)]'
                  : 'border-[var(--line)]'
                  }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <label htmlFor="filmclub-guess-input" className="label-xs text-[var(--ink)]">
                    {isWinningReveal ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Solved!
                      </span>
                    ) : (
                      'Enter Movie Guess'
                    )}
                  </label>
                  <span
                    className={`label-mono text-[11px] tabular-nums transition-colors duration-300 ${isWinningReveal
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-[var(--mute)]'
                      }`}
                  >
                    {isWinningReveal
                      ? `+${scoreForClueStage(clueStage)} PTS`
                      : `${scoreForClueStage(clueStage)} PTS`}
                  </span>
                </div>

                <div className="relative">
                  <div
                    className={`border rounded-lg px-3 py-2 bg-[var(--input-bg)] flex items-center gap-2.5 glow-input transition-all duration-300 ${isWinningReveal
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                      : 'border-[var(--line-strong)] focus-within:border-[#ff4500]'
                      }`}
                  >
                    {isWinningReveal ? (
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Film className="w-4 h-4 text-[var(--mute)] shrink-0" />
                    )}
                    <input
                      ref={inputRef}
                      id="filmclub-guess-input"
                      type="text"
                      disabled={roundEnded}
                      value={isWinningReveal ? (winningGuessText || movie.title) : inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                        setHighlightedIdx(-1);
                        if (feedback) setFeedback(null);
                        if (showOnboarding) {
                          setShowOnboarding(false);
                          markHasPlayed();
                        }
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 160)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type movie title..."
                      autoComplete="off"
                      className="bg-transparent border-none outline-none text-sm text-[var(--ink)] w-full placeholder:text-[var(--mute)] disabled:opacity-75"
                    />
                  </div>

                  {/* First-time onboarding hint */}
                  {showOnboarding && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, delay: 0.6 }}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-[var(--ink)] text-[var(--bg)] text-xs flex items-center justify-between gap-2"
                    >
                      <span>💡 Type a film title above and press <kbd className="px-1 py-0.5 font-mono text-[10px] border border-[var(--bg)]/40 rounded">Enter</kbd> to guess</span>
                      <button
                        type="button"
                        onClick={() => { setShowOnboarding(false); markHasPlayed(); }}
                        className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer text-[10px] font-mono"
                      >
                        ✕
                      </button>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && !roundEnded && (
                      <motion.ul
                        initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        style={{ originY: 0 }}
                        role="listbox"
                        className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg bg-[var(--white-surface)] border border-[var(--line-strong)] shadow-lg max-h-48 overflow-y-auto divide-y divide-[var(--line-subtle)]"
                      >
                        {suggestions.map((item, idx) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                submitGuessText(item.title);
                              }}
                              className={`w-full px-3.5 py-2 text-left flex items-center justify-between text-sm cursor-pointer transition-colors duration-150 ${idx === highlightedIdx
                                ? 'bg-[#ff4500] text-white'
                                : 'bg-[var(--white-surface)] text-[var(--ink)] hover:bg-[var(--card-bg)]'
                                }`}
                            >
                              <span className="font-medium">{item.title}</span>
                              <span
                                className={`label-mono text-xs tabular-nums ${idx === highlightedIdx ? 'text-white/80' : 'text-[var(--mute)]'
                                  }`}
                              >
                                {item.year}
                              </span>
                            </button>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {feedback && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -4 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -4 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div
                        role="status"
                        className={`mt-2 px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${feedback.type === 'error'
                          ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-700/50 dark:text-red-300'
                          : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-700/50 dark:text-amber-300'
                          }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{feedback.message}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-2.5 flex">
                  <button
                    type="button"
                    disabled={roundEnded}
                    onClick={() => submitGuessText(inputValue)}
                    className={`w-full py-2 px-4 rounded-full label-xs transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-40 active:scale-[0.98] ${isWinningReveal
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-[#ff4500] text-white hover:bg-[#e03d00] shadow-sm'
                      }`}
                  >
                    {isWinningReveal ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Correct!</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Guess</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-2 pt-2 border-t border-[var(--line-subtle)] flex items-center justify-between">
                  {!confirmGiveUp ? (
                    <button
                      type="button"
                      disabled={roundEnded}
                      onClick={() => setConfirmGiveUp(true)}
                      className="label-xs text-[10px] text-[var(--mute)] hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 cursor-pointer disabled:opacity-40 active:scale-[0.98] transition-colors"
                    >
                      <Flag className="w-3 h-3" />
                      <span>Give up (0 pts)</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="label-xs text-[10px] text-red-500 dark:text-red-400">Reveal answer?</span>
                      <button
                        type="button"
                        onClick={handleForfeit}
                        className="px-2 py-0.5 rounded bg-red-600 text-white label-xs text-[10px] cursor-pointer active:scale-[0.98]"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmGiveUp(false)}
                        className="px-2 py-0.5 rounded border border-[var(--line-strong)] bg-[var(--white-surface)] text-[var(--ink)] label-xs text-[10px] cursor-pointer active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <span className="label-mono text-[10px] text-[var(--mute)] hidden sm:inline">
                    PRESS / TO TYPE
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submitted Guesses */}
          <div className="bg-[var(--white-surface)] border border-[var(--line)] rounded-xl p-3 glow-card transition-all duration-300 shadow-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--line-subtle)]">
              <span className="label-xs text-[var(--ink)]">Submitted Guesses</span>
              <span className="label-mono text-xs text-[var(--mute)] tabular-nums">
                {guesses.filter(g => !g.isSkipped).length} {guesses.filter(g => !g.isSkipped).length === 1 ? 'try' : 'tries'}
              </span>
            </div>

            {guesses.length === 0 ? (
              <p className="py-2 text-xs text-[var(--mute)] leading-relaxed">
                No guesses yet. Guess from the barcode for 100 points.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--line-subtle)] mt-0.5 max-h-36 overflow-y-auto">
                {guesses.map((g) => (
                  <motion.li
                    key={g.attemptNumber}
                    initial={{ opacity: 0, x: -8, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="py-1 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="label-mono text-[11px] text-[var(--mute)] tabular-nums">
                        {String(g.attemptNumber).padStart(2, '0')}
                      </span>
                      <span
                        className={`text-xs sm:text-sm truncate transition-colors duration-200 ${g.isSkipped ? 'italic text-[var(--mute)]' : 'text-[var(--ink)] font-medium'
                          }`}
                      >
                        {g.rawInput}
                      </span>
                    </div>
                    <span
                      className={`px-1.5 py-0.2 text-[9px] font-mono uppercase shrink-0 transition-all duration-300 ${g.isCorrect
                        ? 'bg-emerald-500 text-white border border-emerald-400 font-semibold'
                        : 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-700/50'
                        }`}
                    >
                      {g.isCorrect ? 'MATCH' : g.isSkipped ? 'PASSED' : 'MISS'}
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Pop-Up Modal on Correct Guess or Round End */}
      <ResultModal
        open={showResultModal}
        movie={movie}
        won={won}
        guesses={guesses}
        score={finalScore}
        clueStage={clueStage}
        dayNumber={dayNumber}
        currentStreak={currentStreak}
        onClose={() => setShowResultModal(false)}
      />
    </div>
  );
}
