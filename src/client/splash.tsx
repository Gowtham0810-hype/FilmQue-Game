import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Film, Play, Sparkles } from 'lucide-react';
import { CURATED_MOVIES } from './data/movies';
import { getDailyMovie } from './utils/storage';

export const Splash = () => {
  const daily = useMemo(() => getDailyMovie(CURATED_MOVIES), []);

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen px-4 py-8 bg-zinc-950 text-zinc-100 font-sans select-none">
      <div className="w-full max-w-md flex flex-col items-center gap-4 text-center">
        {/* Badge */}
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 text-[11px] font-mono tracking-wider text-zinc-400">
          <Film className="w-3.5 h-3.5 text-purple-400" />
          <span>FILMQUE · #{daily.dayNumber}</span>
          <span>·</span>
          <span className="text-zinc-200">{daily.dateString}</span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Guess the Film of the Day
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Decode the movie color barcode spectrum &amp; story clues.
          </p>
        </div>

        {/* Teaser Barcode Frame */}
        <div className="w-full border border-zinc-800 rounded overflow-hidden bg-black shadow-lg">
          <div className="flex items-center justify-between px-3 py-1 text-[10px] font-mono text-zinc-500 bg-zinc-900/90 border-b border-zinc-800">
            <span>00:00:00 (OPENING)</span>
            <span>CREDITS</span>
          </div>
          <div className="relative w-full h-24 overflow-hidden bg-zinc-950 flex items-center justify-center">
            <img
              src={daily.movie.barcodeUrl || `/barcodes/${daily.movie.id}.png`}
              alt="Film Barcode Preview"
              className="w-full h-full object-fill opacity-90"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="px-3 py-1 bg-black/75 border border-zinc-700 text-xs font-mono text-white font-medium backdrop-blur-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Today's Mystery Barcode</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          className="w-full max-w-xs py-3 px-6 bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-200 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Play FilmQue {context.username ? `as @${context.username}` : ''}</span>
        </button>

        <p className="text-[11px] font-mono text-zinc-500">
          BARCODE: 100 · CLUE 1: 60 · CLUE 2: 30 PTS
        </p>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
