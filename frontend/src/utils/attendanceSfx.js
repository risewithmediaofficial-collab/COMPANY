/**
 * Native Web Audio API Sound Synthesizer for Attendance Memes & Stickers
 * Zero external audio files required, zero latency, 100% reliable across browsers.
 */

let sharedAudioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
};

export const isSfxEnabled = () => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('attendance_sfx_muted');
  return stored !== 'true';
};

export const setSfxEnabled = (enabled) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('attendance_sfx_muted', enabled ? 'false' : 'true');
};

/**
 * 👑 Tier 1: Early Bird — Goundamani Royal Fanfare (Ta-da-da-DAAA! 🎺)
 */
export const playEarlyFanfare = () => {
  if (!isSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, time: 0.0, dur: 0.12 }, // C5
    { freq: 659.25, time: 0.12, dur: 0.12 }, // E5
    { freq: 783.99, time: 0.24, dur: 0.14 }, // G5
    { freq: 1046.50, time: 0.38, dur: 0.55 }, // C6
  ];

  notes.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, now + time);
    filter.Q.setValueAtTime(3, now + time);

    gain.gain.setValueAtTime(0, now + time);
    gain.gain.linearRampToValueAtTime(0.28, now + time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur);
  });
};

/**
 * 🎯 Tier 2: Sharp 9:30 AM — Vadivelu Rolex Sniper Laser & Bell Ting (Pew-Pew-ZAP! ⚡)
 */
export const playSharpSniper = () => {
  if (!isSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Mechanical ticks
  [0.0, 0.07].forEach((t) => {
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(1400, now + t);
    clickGain.gain.setValueAtTime(0.18, now + t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.02);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now + t);
    clickOsc.stop(now + t + 0.02);
  });

  // Laser beam sweep
  const laserOsc = ctx.createOscillator();
  const laserGain = ctx.createGain();
  const laserFilter = ctx.createBiquadFilter();

  laserOsc.type = 'sawtooth';
  laserOsc.frequency.setValueAtTime(2400, now + 0.15);
  laserOsc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

  laserFilter.type = 'lowpass';
  laserFilter.frequency.setValueAtTime(3000, now + 0.15);
  laserFilter.Q.setValueAtTime(8, now + 0.15);

  laserGain.gain.setValueAtTime(0.25, now + 0.15);
  laserGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  laserOsc.connect(laserFilter);
  laserFilter.connect(laserGain);
  laserGain.connect(ctx.destination);

  laserOsc.start(now + 0.15);
  laserOsc.stop(now + 0.4);

  // Metallic sniper bell
  const bellOsc = ctx.createOscillator();
  const bellGain = ctx.createGain();
  bellOsc.type = 'sine';
  bellOsc.frequency.setValueAtTime(1760, now + 0.32);
  bellGain.gain.setValueAtTime(0.3, now + 0.32);
  bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

  bellOsc.connect(bellGain);
  bellGain.connect(ctx.destination);
  bellOsc.start(now + 0.32);
  bellOsc.stop(now + 0.85);
};

/**
 * 🐢 Tier 3: Late Login — Vadivelu Comedy Spring Boing & Sad Trombone (Booo-ing~ Wah-Wah! 🪗🤣)
 */
export const playLateBoing = () => {
  if (!isSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Spring BOING
  const springOsc = ctx.createOscillator();
  const springGain = ctx.createGain();
  springOsc.type = 'triangle';
  springOsc.frequency.setValueAtTime(180, now);
  springOsc.frequency.exponentialRampToValueAtTime(620, now + 0.18);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(18, now);
  lfoGain.gain.setValueAtTime(45, now);
  lfo.connect(springOsc.frequency);

  springGain.gain.setValueAtTime(0.3, now);
  springGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

  springOsc.connect(springGain);
  springGain.connect(ctx.destination);

  lfo.start(now);
  springOsc.start(now);
  lfo.stop(now + 0.32);
  springOsc.stop(now + 0.32);

  // Comedy Wah-Wah Horn
  const wahNotes = [
    { freq: 293.66, time: 0.34, dur: 0.16 },
    { freq: 277.18, time: 0.50, dur: 0.16 },
    { freq: 261.63, time: 0.66, dur: 0.16 },
    { freq: 246.94, time: 0.82, dur: 0.45 },
  ];

  wahNotes.forEach(({ freq, time, dur }, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + time);
    if (idx === wahNotes.length - 1) {
      osc.frequency.exponentialRampToValueAtTime(195, now + time + dur);
    }

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now + time);
    filter.frequency.linearRampToValueAtTime(1100, now + time + 0.08);
    filter.frequency.linearRampToValueAtTime(500, now + time + dur);
    filter.Q.setValueAtTime(4, now + time);

    gain.gain.setValueAtTime(0, now + time);
    gain.gain.linearRampToValueAtTime(0.22, now + time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur);
  });
};

/**
 * 🎬 Tier 4: Afternoon — Dramatic Cinema Interval Climax Blast (DUN-DUN-DUNNN! 🎬)
 */
export const playAfternoonClimax = () => {
  if (!isSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const boomOsc = ctx.createOscillator();
  const boomGain = ctx.createGain();
  boomOsc.type = 'sine';
  boomOsc.frequency.setValueAtTime(95, now);
  boomOsc.frequency.exponentialRampToValueAtTime(40, now + 0.5);

  boomGain.gain.setValueAtTime(0.4, now);
  boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  boomOsc.connect(boomGain);
  boomGain.connect(ctx.destination);
  boomOsc.start(now);
  boomOsc.stop(now + 0.6);

  [146.83, 174.61, 220.00].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + 0.04);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now + 0.04);
    filter.Q.setValueAtTime(3, now + 0.04);

    gain.gain.setValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + 0.04);
    osc.stop(now + 0.65);
  });
};

/**
 * ⚡ Scanning Radar Bleeps (while marking attendance)
 */
export const playScanningSound = () => {
  if (!isSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  [0.0, 0.09, 0.18].forEach((t, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 + i * 220, now + t);
    gain.gain.setValueAtTime(0.12, now + t);
    gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + t);
    osc.stop(now + t + 0.05);
  });
};

/**
 * Dispatcher helper based on timing tier
 */
export const playTierSfx = (tier) => {
  switch (tier) {
    case 'early':
      playEarlyFanfare();
      break;
    case 'sharp':
      playSharpSniper();
      break;
    case 'late':
      playLateBoing();
      break;
    case 'afternoon':
      playAfternoonClimax();
      break;
    default:
      playSharpSniper();
  }
};

/**
 * Authentic Tamil Comedian Audio Clips (MP3)
 * Plays real comedian movie clips (Vadivelu "Ahaan", Kaipulla "Theriyaama Modhiten", Vadivelu "Vaanga Sir")
 * 100% natural authentic cinema sound - never uses robotic machine text-to-speech.
 * Falls back gracefully to synthesized cartoon SFX if blocked.
 */
const TIER_AUDIO_MAP = {
  early: '/audio/memes/vadivelu_early.mp3',
  sharp: '/audio/memes/vadivelu_930.mp3',
  late: '/audio/memes/kaipulla_late.mp3',
  afternoon: '/audio/memes/chief_guest.mp3',
};

let currentAudio = null;

export const playComedianAudio = (tier) => {
  if (!isSfxEnabled()) return;

  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (_) {}
    currentAudio = null;
  }

  const audioSrc = TIER_AUDIO_MAP[tier] || TIER_AUDIO_MAP.sharp;
  if (audioSrc && typeof window !== 'undefined') {
    try {
      const audio = new Audio(audioSrc);
      currentAudio = audio;
      audio.volume = 0.9;
      audio.play().catch(() => {
        // Fallback to cartoon synthesized SFX if browser autoplay restriction applies
        playTierSfx(tier);
      });
      return;
    } catch (_) {
      playTierSfx(tier);
      return;
    }
  }

  playTierSfx(tier);
};

export const stopComedianAudio = () => {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (_) {}
    currentAudio = null;
  }
};

