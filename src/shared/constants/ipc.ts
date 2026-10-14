/** Every IPC channel used by the app. Nothing outside this list is ever handled. */
export const IPC = {
  getSnapshot: 'app:get-snapshot',
  updateSettings: 'settings:update',
  focusCommand: 'focus:command',
  addWater: 'hydration:add',
  removeWater: 'hydration:remove',
  pauseHydration: 'hydration:pause',
  showMain: 'window:show-main',
  setWidgetVisible: 'widget:set-visible',
  resizeWidget: 'widget:resize',
  pickAsset: 'assets:pick',
  // main → renderer
  sliceChanged: 'state:slice-changed',
  navigate: 'app:navigate',
  playSound: 'app:play-sound'
} as const
