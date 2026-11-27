import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2 } from 'lucide-react';

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

export function RulesModal({ open, onClose }: RulesModalProps) {
  const clueTiers = [
    { tier: 'BARCODE', pts: '100 PTS', desc: 'Visual color spectrum capturing every frame from opening shot to credits.' },
    { tier: 'CLUE 1', pts: '60 PTS', desc: 'Oblique detail: a specific scene, object, or odd moment from the film.' },
    { tier: 'CLUE 2', pts: '30 PTS', desc: "Core premise: the hero's situation or central conflict." },
    { tier: 'PASS FINAL', pts: '0 PTS', desc: 'Forfeit on the final clue to reveal the answer.' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="rules-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rules-modal-title"
        >
          <motion.div
            key="rules-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl bg-[var(--white-surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-2xl my-auto transition-colors duration-300 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--line)]">
              <div>
                <h2 id="rules-modal-title" className="text-lg font-bold tracking-tight text-[var(--ink)]">
                  Rules &amp; Scoring
                </h2>
                <p className="text-xs text-[var(--mute)] mt-0.5">
                  One daily mystery film · Unlimited tries per clue
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close rules"
                className="w-8 h-8 rounded-full border border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--card-bg)] active:scale-95 text-[var(--ink)] flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="py-4 space-y-4">
              {/* Clues & Points Ladder */}
              <div>
                <div className="border border-[var(--line)] rounded-xl overflow-hidden divide-y divide-[var(--line-subtle)]">
                  {clueTiers.map((row) => (
                    <div
                      key={row.tier}
                      className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 bg-[var(--white-surface)]"
                    >
                      <div className="flex items-center gap-2.5 min-w-[130px] shrink-0">
                        <span className="label-mono text-xs font-semibold text-[var(--ink)]">
                          {row.tier}
                        </span>
                        <span className="px-2 py-0.5 rounded-full label-mono text-[10px] font-semibold bg-[#ff4500]/15 text-[#ff4500] border border-[#ff4500]/25 tabular-nums">
                          {row.pts}
                        </span>
                      </div>
                      <p className="text-xs sm:text-[13px] text-[var(--mute)] leading-relaxed sm:text-right">
                        {row.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fair Evaluation Callout */}
              <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line-subtle)] flex items-start gap-2.5 text-xs text-[var(--mute)] leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  Alternate titles, translations, and common spelling variants are automatically accepted. Duplicate guesses are blocked to prevent wasted tries.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[var(--line)] flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2 rounded-full bg-[var(--ink)] text-[var(--bg)] font-semibold text-xs hover:opacity-85 active:scale-95 transition-all duration-200 cursor-pointer"
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
