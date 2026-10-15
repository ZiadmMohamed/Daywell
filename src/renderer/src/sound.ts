/**
 * Entry for the invisible sound window. The main process opens it only to play
 * a cue while no other Daywell window is open, and closes it once every cue has
 * finished, so playing a sound does not keep a renderer alive.
 */
import { playSound } from './services/sound'

let playing = 0

window.daywell.onPlaySound((cue) => {
  playing++
  void playSound(cue).finally(() => {
    playing--
    if (playing === 0) void window.daywell.soundFinished()
  })
})
