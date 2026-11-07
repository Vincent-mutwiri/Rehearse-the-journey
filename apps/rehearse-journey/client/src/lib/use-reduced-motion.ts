import { useSyncExternalStore } from 'react'

const query = '(prefers-reduced-motion: reduce)'
function subscribe(onChange: () => void) {
  const preference = window.matchMedia(query)
  preference.addEventListener('change', onChange)
  return () => preference.removeEventListener('change', onChange)
}
const snapshot = () => window.matchMedia(query).matches

/** React to live OS preference changes as well as the page's explicit setting. */
export function useReducedMotion(requested = false) {
  const system = useSyncExternalStore(subscribe, snapshot, () => true)
  return requested || system
}
