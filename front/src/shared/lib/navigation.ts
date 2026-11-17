import { useEffect, useSyncExternalStore } from 'react'

// Minimal client-side navigation on top of the History API, until the team picks a routing library.

const navigationEvent = 'app:navigate'

export function navigate(path: string, { replace = false } = {}) {
  if (replace) window.history.replaceState(null, '', path)
  else window.history.pushState(null, '', path)
  window.dispatchEvent(new Event(navigationEvent))
}

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(navigationEvent, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(navigationEvent, onChange)
  }
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () => window.location.pathname)
}

// Turns clicks on same-origin links (<a href="/connexion">) into client-side navigation.
// Anchors on the current page (#section), new tabs, and downloads keep the browser behavior.
export function useInternalLinks() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest('a')
      if (!link || link.target || link.hasAttribute('download') || link.origin !== window.location.origin) return
      if (link.pathname === window.location.pathname && link.hash) return
      event.preventDefault()
      navigate(link.pathname + link.search + link.hash)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])
}
