let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTone(type: 'submit' | 'wrong' | 'win' | 'lose', enabled: boolean) {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const triggerNote = (freq: number, start: number, duration: number, gainPeak: number, oscType: OscillatorType = 'sine') => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  };

  if (type === 'submit') {
    triggerNote(520, now, 0.06, 0.03, 'triangle');
  } else if (type === 'wrong') {
    triggerNote(210, now, 0.12, 0.04, 'sine');
    triggerNote(175, now + 0.07, 0.14, 0.035, 'sine');
  } else if (type === 'win') {
    triggerNote(440, now, 0.16, 0.045, 'sine');
    triggerNote(554.37, now + 0.08, 0.18, 0.045, 'sine');
    triggerNote(659.25, now + 0.16, 0.28, 0.05, 'sine');
  } else if (type === 'lose') {
    triggerNote(246.94, now, 0.16, 0.04, 'sine');
    triggerNote(196.0, now + 0.12, 0.24, 0.04, 'sine');
  }
}
