import { useEffect } from 'react'

/**
 * Register keyboard shortcuts for call controls.
 * handlers: { answer, decline, mute, hold, end }
 */
export function useKeyboardShortcuts(handlers = {}) {
  useEffect(() => {
    const onKey = (e) => {
      // Don't fire when typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return

      switch (e.key.toUpperCase()) {
        case 'A': handlers.answer?.(); break
        case 'D': handlers.decline?.(); break
        case 'M': handlers.mute?.(); break
        case 'H': handlers.hold?.(); break
        case 'E': handlers.end?.(); break
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handlers])
}
