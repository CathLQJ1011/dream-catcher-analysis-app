import { useSyncExternalStore } from 'react'

// Minimal client-side routing: enough for a handful of top-level screens
// without adding a router library.

const subscribe = (onChange: () => void) => {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

export function usePath() {
  return useSyncExternalStore(subscribe, () => window.location.pathname)
}

/** `replace` swaps the current history entry, so Back skips the page you came from. */
export function navigate(path: string, { replace = false } = {}) {
  if (path === window.location.pathname + window.location.search) return
  if (replace) window.history.replaceState(null, '', path)
  else window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}
