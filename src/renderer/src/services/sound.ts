import type { SoundCue } from '@shared/types/state'

let context: AudioContext | null = null
let athan: HTMLAudioElement | null = null

/** A soft two-note chime synthesised on the fly; no audio file needed. */
function playChime(): void {
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
}

function playAthan(file: string): void {
  athan?.pause()
  athan = new Audio(`daywell-asset://asset/${encodeURIComponent(file)}`)
  void athan.play().catch(() => {
    // The file may have been removed or be unplayable; the notification still shows.
  })
}

export function stopAthan(): void {
  athan?.pause()
  athan = null
}

export function playSound(cue: SoundCue): void {
  if (cue.kind === 'chime') playChime()
  else playAthan(cue.file)
}

export function assetUrl(name: string): string {
  return `daywell-asset://asset/${encodeURIComponent(name)}`
}
