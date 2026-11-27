import { Flame, HelpCircle, Moon, Sun, Trophy, User } from 'lucide-react';
import { motion } from 'motion/react';

interface FloatingNavProps {
  playerName?: string;
  onOpenLeaderboard: () => void;
  onOpenRules?: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
  playerRank: number;
  currentStreak: number;
}

export function FloatingNav({
  playerName,
  onOpenLeaderboard,
  onOpenRules,
  darkMode,
  onToggleDark,
  playerRank,
  currentStreak,
}: FloatingNavProps) {
  const pillBase =
    'h-7 sm:h-8 rounded-full border text-xs font-medium transition-all duration-200 flex items-center justify-center shrink-0';

  const pillStyle = darkMode
    ? 'bg-[#181c1f] border-[#2d3236] text-[#f2f4f5] hover:bg-[#22272b] hover:border-[#3f454a]'
    : 'bg-white border-[#e3e6e8] text-[#1c1c1c] hover:bg-[#f0f2f4] hover:border-[#cbd2d6] shadow-xs';

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Reddit User badge */}
      {playerName && (
        <div
          className={`${pillBase} px-2 sm:px-2.5 gap-1.5 cursor-default ${pillStyle}`}
          title={`Signed in as u/${playerName}`}
        >
          <div className="w-3.5 h-3.5 rounded-full bg-[#ff4500]/15 text-[#ff4500] flex items-center justify-center shrink-0">
            <User className="w-2 h-2" />
          </div>
          <span className="font-mono text-[10px] sm:text-[11px] max-w-[80px] sm:max-w-[110px] truncate text-[var(--ink)]">
            u/{playerName}
          </span>
        </div>
      )}

      {/* Streak badge */}
      <div
        className={`${pillBase} px-2 sm:px-2.5 gap-1 cursor-default ${pillStyle}`}
        title={`Current daily streak: ${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`}
      >
        <Flame
          className={`w-3 h-3 transition-colors duration-300 ${
            currentStreak > 0 ? 'text-[#ff4500] animate-pulse' : 'text-[var(--mute)]'
          }`}
        />
        <span className="text-[10px] sm:text-[11px] hidden md:inline font-semibold">Streak</span>
        <span
          className={`px-1.5 py-0.2 text-[9px] sm:text-[10px] font-mono font-bold rounded-full tabular-nums leading-none ${
            currentStreak > 0
              ? 'bg-[#ff4500]/15 text-[#ff4500] border border-[#ff4500]/30'
              : darkMode
              ? 'bg-white/10 text-white/50'
              : 'bg-black/5 text-black/50'
          }`}
        >
          {currentStreak}
        </span>
      </div>

      {/* Leaderboard button */}
      <button
        type="button"
        onClick={onOpenLeaderboard}
        aria-label="Open leaderboard"
        className={`${pillBase} px-2 sm:px-2.5 gap-1 cursor-pointer active:scale-95 ${pillStyle}`}
      >
        <Trophy className="w-3 h-3 text-amber-500" />
        <span className="text-[10px] sm:text-[11px] hidden sm:inline font-semibold">Rank</span>
        <span
          className={`px-1.5 py-0.2 text-[9px] sm:text-[10px] font-mono font-bold rounded-full tabular-nums leading-none ${
            darkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'
          }`}
        >
          #{playerRank}
        </span>
      </button>

      {/* Scoring & Rules button */}
      {onOpenRules && (
        <button
          type="button"
          onClick={onOpenRules}
          aria-label="Open scoring and rules"
          title="Scoring & Rules"
          className={`${pillBase} px-2 sm:px-2.5 gap-1 cursor-pointer active:scale-95 ${pillStyle}`}
        >
          <HelpCircle className="w-3 h-3 text-[var(--mute)]" />
          <span className="text-[10px] sm:text-[11px] hidden sm:inline font-semibold">Rules</span>
        </button>
      )}

      {/* Dark / Light mode toggle */}
      <button
        type="button"
        onClick={onToggleDark}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`${pillBase} w-7 sm:w-8 cursor-pointer active:scale-90 ${pillStyle}`}
      >
        <motion.div
          key={darkMode ? 'dark' : 'light'}
          initial={{ rotate: -45, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center"
        >
          {darkMode ? (
            <Sun className="w-3 h-3 text-amber-400" />
          ) : (
            <Moon className="w-3 h-3 text-zinc-700" />
          )}
        </motion.div>
      </button>
    </div>
  );
}
