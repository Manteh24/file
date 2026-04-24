// Plays a short two-tone "ding" via the Web Audio API.
// No asset file required — the tone is synthesised in the browser. Browsers
// block audio until the user has interacted with the page; the call is
// wrapped in a try/catch so an autoplay rejection never breaks polling.

const TONE_HZ_A = 880  // A5
const TONE_HZ_B = 660  // E5
const TONE_DURATION_MS = 220
const GAP_MS = 70

export function playReminderTone(): void {
  if (typeof window === "undefined") return
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const start = ctx.currentTime
    playTone(ctx, TONE_HZ_A, start, TONE_DURATION_MS / 1000)
    playTone(ctx, TONE_HZ_B, start + (TONE_DURATION_MS + GAP_MS) / 1000, TONE_DURATION_MS / 1000)
    // Release the context shortly after the tones finish.
    window.setTimeout(() => ctx.close().catch(() => {}), TONE_DURATION_MS * 2 + GAP_MS + 200)
  } catch {
    // Audio unavailable (autoplay blocked, no audio device, etc.) — silent fallback.
  }
}

function playTone(ctx: AudioContext, freq: number, when: number, durationSec: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "sine"
  osc.frequency.value = freq
  // Quick attack + exponential decay to avoid a click.
  gain.gain.setValueAtTime(0, when)
  gain.gain.linearRampToValueAtTime(0.18, when + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + durationSec)
  osc.connect(gain).connect(ctx.destination)
  osc.start(when)
  osc.stop(when + durationSec + 0.05)
}
