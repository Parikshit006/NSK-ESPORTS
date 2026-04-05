import { useEffect, useRef } from 'react'

/**
 * Generic polling hook.
 * Calls fetchFn every intervalMs milliseconds.
 * Also fetches immediately on mount.
 */
export function usePolling(fetchFn, intervalMs = 5000, enabled = true) {
  const savedFn = useRef(fetchFn)
  savedFn.current = fetchFn

  useEffect(() => {
    if (!enabled) return

    savedFn.current()

    const id = setInterval(() => savedFn.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])
}
