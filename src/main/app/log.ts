/* Minimal development logger. Never pass user content (notes, amounts, locations) here. */
const stamp = (): string => new Date().toISOString()

export const log = {
  info: (message: string, ...details: unknown[]): void => console.log(`[${stamp()}] INFO  ${message}`, ...details),
  warn: (message: string, ...details: unknown[]): void => console.warn(`[${stamp()}] WARN  ${message}`, ...details),
  error: (message: string, ...details: unknown[]): void => console.error(`[${stamp()}] ERROR ${message}`, ...details)
}
