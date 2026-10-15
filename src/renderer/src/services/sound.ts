import type { SoundCue } from '@shared/types/state'

let context: AudioContext | null = null
let athan: HTMLAudioElement | null = null

const CHIME_SECONDS = 1.6

/** A soft two-note chime synthesised on the fly; no audio file needed. */
function playChime(): Promise<void> {
  context ??= new AudioContext()
  const ctx = context
  const start = ctx.currentTime + 0.02
  for (const [index, frequency] of [659.25, 987.77].entries()) {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    const t = start + index * 0.18
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.18, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4)
    oscillator.connect(gain).connect(ctx.destination)
    oscillator.start(t)
    oscillator.stop(t + 1.5)
  }
  return new Promise((resolve) => setTimeout(resolve, CHIME_SECONDS * 1000))
}

function playAthan(file: string): Promise<void> {
  athan?.pause()
  const audio = new Audio(assetUrl(file))
  athan = audio
  return new Promise((resolve) => {
    // Resolve however playback ends: finished, failed, or replaced by a newer Athan.
    audio.addEventListener('ended', () => resolve(), { once: true })
    audio.addEventListener('error', () => resolve(), { once: true })
    audio.addEventListener('pause', () => resolve(), { once: true })
    // The file may have been removed or be unplayable; the notification still shows.
    audio.play().catch(() => resolve())
  })
}

/** Plays a cue and resolves when it has finished. */
export function playSound(cue: SoundCue): Promise<void> {
  return cue.kind === 'chime' ? playChime() : playAthan(cue.file)
}

export function assetUrl(name: string): string {
  return `daywell-asset://asset/${encodeURIComponent(name)}`
}
