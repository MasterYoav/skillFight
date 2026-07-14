/** Chiptune SFX — square/triangle bleeps synthesized in WebAudio, no assets.
 * Mute is visible in the header and persisted. Volumes are tiny on purpose:
 * arcade seasoning, not a soundtrack. */

let muted = typeof localStorage !== "undefined" && localStorage.getItem("sf-muted") === "1";
let ctx: AudioContext | null = null;

export function isMuted() {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  localStorage.setItem("sf-muted", muted ? "1" : "0");
  return muted;
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null; // no audio available — the game is silent, never broken
  }
}

/** One bleep: `freq` Hz for `dur`s, starting `at`s from now. */
function bleep(freq: number, dur: number, at = 0, type: OscillatorType = "square", vol = 0.03) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export const sfx = {
  /** A warrior joins the roster. */
  summon() {
    bleep(523, 0.07);
    bleep(784, 0.1, 0.07);
  },
  /** FIGHT pressed — rising alarm. */
  fight() {
    bleep(196, 0.09);
    bleep(262, 0.09, 0.09);
    bleep(330, 0.09, 0.18);
    bleep(392, 0.16, 0.27);
  },
  /** Verdict arrived. */
  verdict() {
    bleep(659, 0.08, 0, "triangle", 0.05);
    bleep(880, 0.12, 0.09, "triangle", 0.05);
    bleep(1175, 0.2, 0.21, "triangle", 0.05);
  },
  /** Something failed. */
  error() {
    bleep(220, 0.12, 0, "sawtooth", 0.03);
    bleep(147, 0.25, 0.12, "sawtooth", 0.03);
  },
  /** Small UI tick (mode switch, expand). */
  tick() {
    bleep(880, 0.04, 0, "square", 0.02);
  },
};
