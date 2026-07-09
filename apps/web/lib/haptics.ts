// Pure-web haptics: Android -> navigator.vibrate, iOS -> tiny audio tick

let audioCtx: AudioContext | null = null;

const ensureAudio = () => {
  if (typeof window === "undefined") return null;
  const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!audioCtx && AC) audioCtx = new AC();
  if (audioCtx?.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
};

export const isIOS = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const touchMac = (navigator as any).platform === "MacIntel" && (navigator as any).maxTouchPoints > 1;
  return /iPad|iPhone|iPod/i.test(ua) || touchMac;
};

export const isMobileDevice = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return ("ontouchstart" in window) || ((navigator.maxTouchPoints ?? 0) > 0);
};

const canVibrate = () =>
  typeof navigator !== "undefined" &&
  typeof (navigator as any).vibrate === "function";

const tickAudio = () => {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // short, soft "tick"
    osc.type = "square";
    osc.frequency.value = 200;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.28, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  } catch {
    // ignore
  }
};

export const lightImpact = async () => {
  if (canVibrate() && !isIOS()) {
    try { (navigator as any).vibrate(12); } catch {}
    return;
  }
  tickAudio();
};

export const selectionTick = async () => {
  await lightImpact();
};