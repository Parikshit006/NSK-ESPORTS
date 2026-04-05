import { useState, useCallback } from 'react'
import { getLeaderboard } from '../services/dataService'
import { usePolling } from './usePolling'

/**
 * Polls leaderboard every 5 seconds via REST API.
 * No realtime WebSocket connections consumed.
 */
export function useLeaderboard(tournamentId) {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetch = useCallback(async () => {
    if (!tournamentId) return
    try {
      const data = await getLeaderboard(tournamentId)
      setLeaderboard(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  usePolling(fetch, 5000, !!tournamentId)

  return { leaderboard, loading, error, lastUpdated, refetch: fetch }
}
