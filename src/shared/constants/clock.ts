export const CLOCK_THEMES = ['minimal', 'flip', 'retro', 'neon', 'nature'] as const
export type ClockThemeId = (typeof CLOCK_THEMES)[number]

/** 'theme' means "use the font the selected clock theme was designed with". */
export const CLOCK_FONTS = ['theme', 'inter', 'space-grotesk', 'jetbrains-mono', 'playfair', 'orbitron'] as const
export type ClockFontId = (typeof CLOCK_FONTS)[number]
