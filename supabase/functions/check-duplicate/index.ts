// @ts-nocheck — This file runs on Supabase's Deno runtime, not locally
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tournamentId, igns, uids, transactionId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const duplicates: { type: string; value: string; teamName: string }[] = []

    // Get all non-rejected teams for this tournament
    const { data: teams } = await supabase
      .from('teams')
      .select('team_name, players, transaction_id')
      .eq('tournament_id', tournamentId)
      .not('status', 'eq', 'rejected')

    if (teams) {
      // Check IGN duplicates
      if (igns && igns.length > 0) {
        const lowerIgns = igns.map((i: string) => i.toLowerCase())
        for (const team of teams) {
          for (const player of (team.players || [])) {
            if (lowerIgns.includes(player.ign?.toLowerCase())) {
              duplicates.push({
                type: 'ign',
                value: player.ign,
                teamName: team.team_name
              })
            }
          }
        }
      }

      // Check UID duplicates
      if (uids && uids.length > 0) {
        for (const team of teams) {
          for (const player of (team.players || [])) {
            if (uids.includes(player.uid)) {
              duplicates.push({
                type: 'uid',
                value: player.uid,
                teamName: team.team_name
              })
            }
          }
        }
      }

      // Check transaction ID duplicate
      if (transactionId) {
        const match = teams.find(t => t.transaction_id === transactionId)
        if (match) {
          duplicates.push({
            type: 'transaction_id',
            value: transactionId,
            teamName: match.team_name
          })
        }
      }
    }

    return new Response(JSON.stringify({ duplicates }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
