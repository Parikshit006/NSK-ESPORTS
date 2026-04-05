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
    const { tournamentId, teamName, players, transactionId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check tournament exists and registration is open
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('status, filled_slots, total_slots')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Tournament not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (tournament.status !== 'registration_open') {
      return new Response(JSON.stringify({ error: 'Registration is closed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (tournament.filled_slots >= tournament.total_slots) {
      return new Response(JSON.stringify({ error: 'All slots are filled' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check duplicate team name
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', tournamentId)
      .ilike('team_name', teamName)
      .not('status', 'eq', 'rejected')
      .maybeSingle()

    if (existingTeam) {
      return new Response(
        JSON.stringify({ error: `Team name "${teamName}" is already registered` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check duplicate transaction ID
    if (transactionId) {
      const { data: existingTxn } = await supabase
        .from('teams')
        .select('team_name')
        .eq('tournament_id', tournamentId)
        .eq('transaction_id', transactionId)
        .not('status', 'eq', 'rejected')
        .maybeSingle()

      if (existingTxn) {
        return new Response(
          JSON.stringify({
            error: `Transaction ID already used by team "${existingTxn.team_name}"`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
