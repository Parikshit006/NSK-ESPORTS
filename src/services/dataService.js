/**
 * NSK ESPORTS — Data Service
 * Supabase backend implementation
 * Drop-in replacement for localStorage version
 */

import { supabase } from '../lib/supabase'
import { uploadToCloudinary } from '../lib/cloudinary'

// ============================================================
// HELPER: Convert DB row → app data model
// ============================================================

function dbToTournament(row) {
  if (!row) return null
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    basicInfo: {
      name: row.name,
      organizer: row.organizer,
      tagline: row.tagline,
      bannerUrl: row.banner_url,
      game: row.game,
      teamFormat: row.team_format
    },
    schedule: {
      date: row.tournament_date,
      regDeadline: row.reg_deadline,
      roomReleaseTime: row.room_release_time,
      matchStartTime: row.match_start_time,
      numMatches: row.num_matches
    },
    slots: {
      total: row.total_slots,
      filled: row.filled_slots
    },
    entry: {
      fee: row.entry_fee,
      upiId: row.upi_id
    },
    prizes: row.prizes || [],
    qualifier: {
      enabled: row.qualifier_enabled,
      topN: row.qualifier_top_n,
      roundName: row.qualifier_round_name
    },
    scoring: {
      preset: row.scoring_preset,
      placementPoints: row.placement_points,
      killPointValue: row.kill_point_value,
      killCap: row.kill_cap,
      tiebreaker: row.tiebreaker
    },
    rules: row.rules || [],
    regFields: {
      college: row.show_college,
      transactionId: row.show_txn_id,
      paymentScreenshot: row.show_screenshot
    },
    contact: {
      whatsapp: row.contact_whatsapp,
      whatsappGroup: row.contact_whatsapp_group,
      discord: row.contact_discord,
      instagram: row.contact_instagram
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function tournamentToDb(tournament) {
  const t = tournament
  return {
    slug: t.slug,
    status: t.status || 'draft',
    name: t.basicInfo?.name,
    organizer: t.basicInfo?.organizer,
    tagline: t.basicInfo?.tagline,
    banner_url: t.basicInfo?.bannerUrl,
    game: t.basicInfo?.game || 'Free Fire Max',
    team_format: t.basicInfo?.teamFormat || 'Squad (4 Players)',
    tournament_date: t.schedule?.date || null,
    reg_deadline: t.schedule?.regDeadline || null,
    room_release_time: t.schedule?.roomReleaseTime,
    match_start_time: t.schedule?.matchStartTime,
    num_matches: t.schedule?.numMatches || 6,
    total_slots: t.slots?.total || 12,
    filled_slots: t.slots?.filled || 0,
    entry_fee: t.entry?.fee || 0,
    upi_id: t.entry?.upiId,
    prizes: t.prizes || [],
    qualifier_enabled: t.qualifier?.enabled || false,
    qualifier_top_n: t.qualifier?.topN || 4,
    qualifier_round_name: t.qualifier?.roundName,
    scoring_preset: t.scoring?.preset || 'pict',
    placement_points: t.scoring?.placementPoints || {},
    kill_point_value: t.scoring?.killPointValue || 1,
    kill_cap: t.scoring?.killCap || 0,
    tiebreaker: t.scoring?.tiebreaker || 'total_kills',
    rules: t.rules || [],
    show_college: t.regFields?.college || false,
    show_txn_id: t.regFields?.transactionId !== false,
    show_screenshot: t.regFields?.paymentScreenshot !== false,
    contact_whatsapp: t.contact?.whatsapp,
    contact_whatsapp_group: t.contact?.whatsappGroup,
    contact_discord: t.contact?.discord,
    contact_instagram: t.contact?.instagram
  }
}

function dbToTeam(row) {
  if (!row) return null
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    teamName: row.team_name,
    leaderName: row.leader_name,
    leaderWhatsapp: row.leader_whatsapp,
    college: row.college,
    players: row.players || [],
    payment: {
      transactionId: row.transaction_id,
      screenshotUrl: row.screenshot_url
    },
    status: row.status,
    slotNumber: row.slot_number,
    rejectionReason: row.rejection_reason,
    dqReason: row.dq_reason,
    createdAt: row.created_at
  }
}

function dbToMatch(row) {
  if (!row) return null
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    matchNumber: row.match_number,
    roomId: row.room_id,
    password: row.password,
    roomReleased: row.room_released,
    published: row.published,
    publishedAt: row.published_at,
    results: []
  }
}

// ============================================================
// TOURNAMENT CRUD
// ============================================================

export async function getAllTournaments() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .not('status', 'eq', 'archived')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(dbToTournament)
}

export async function getPublicTournaments() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .not('status', 'in', '("draft","archived")')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(dbToTournament)
}

export async function getTournamentBySlug(slug) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return dbToTournament(data)
}

export async function getTournamentById(id) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return dbToTournament(data)
}

export async function createTournament(tournamentData) {
  const slug = generateSlug(tournamentData.basicInfo?.name || 'tournament')
  const dbData = tournamentToDb({ ...tournamentData, slug })

  const { data, error } = await supabase
    .from('tournaments')
    .insert(dbData)
    .select()
    .single()

  if (error) throw error

  // Create matches
  const numMatches = parseInt(tournamentData.schedule?.numMatches) || 3
  const matchRows = []
  for (let i = 1; i <= numMatches; i++) {
    matchRows.push({
      tournament_id: data.id,
      match_number: i,
      room_released: false,
      published: false
    })
  }

  const { error: matchError } = await supabase
    .from('matches')
    .insert(matchRows)

  if (matchError) throw matchError

  return dbToTournament(data)
}

export async function updateTournament(id, updates) {
  const dbData = tournamentToDb(updates)
  // Remove undefined values
  const cleanData = Object.fromEntries(
    Object.entries(dbData).filter(([_, v]) => v !== undefined)
  )

  const { data, error } = await supabase
    .from('tournaments')
    .update(cleanData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return dbToTournament(data)
}

export async function updateTournamentStatus(id, status) {
  const { data, error } = await supabase
    .from('tournaments')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return dbToTournament(data)
}

export async function deleteTournament(id) {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function uploadTournamentBanner(file) {
  return uploadToCloudinary(file, 'nsk-banners')
}

// ============================================================
// TEAM CRUD
// ============================================================

export async function getTeamsByTournament(tournamentId) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data.map(dbToTeam)
}

export async function getConfirmedTeams(tournamentId) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId)
    .in('status', ['confirmed', 'disqualified'])
    .order('slot_number', { ascending: true })

  if (error) throw error
  return data.map(dbToTeam)
}

export async function registerTeam(tournamentId, formData, screenshotFile) {
  let screenshotUrl = null
  if (screenshotFile) {
    screenshotUrl = await uploadPaymentScreenshot(
      tournamentId,
      formData.leaderWhatsapp,
      screenshotFile
    )
  }

  const { data, error } = await supabase
    .from('teams')
    .insert({
      tournament_id: tournamentId,
      team_name: formData.teamName,
      leader_name: formData.leaderName,
      leader_whatsapp: formData.leaderWhatsapp,
      college: formData.college || null,
      players: formData.players || [],
      transaction_id: formData.payment?.transactionId || formData.transactionId || null,
      screenshot_url: screenshotUrl,
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw error
  return dbToTeam(data)
}

async function uploadPaymentScreenshot(tournamentId, phone, file) {
  const compressed = await compressImageFile(file)
  const path = `${tournamentId}/${phone}-${Date.now()}.jpg`

  const { error } = await supabase.storage
    .from('payment-screenshots')
    .upload(path, compressed, {
      contentType: 'image/jpeg',
      cacheControl: '3600'
    })

  if (error) throw error

  const { data } = await supabase.storage
    .from('payment-screenshots')
    .createSignedUrl(path, 86400)

  return data?.signedUrl
}

async function compressImageFile(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(800 / img.width, 800 / img.height, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        blob => resolve(new File([blob], 'screenshot.jpg', { type: 'image/jpeg' })),
        'image/jpeg', 0.75
      )
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

export async function approveTeam(tournamentId, teamId) {
  const { data: existing } = await supabase
    .from('teams')
    .select('slot_number')
    .eq('tournament_id', tournamentId)
    .not('slot_number', 'is', null)
    .order('slot_number', { ascending: false })
    .limit(1)

  const nextSlot = (existing?.[0]?.slot_number || 0) + 1

  const { data, error } = await supabase
    .from('teams')
    .update({
      status: 'confirmed',
      slot_number: nextSlot,
      rejection_reason: null
    })
    .eq('id', teamId)
    .select()
    .single()

  if (error) throw error

  await supabase.rpc('increment_filled_slots', {
    tournament_id_arg: tournamentId
  })

  return dbToTeam(data)
}

export async function rejectTeam(tournamentId, teamId, reason) {
  const { data, error } = await supabase
    .from('teams')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', teamId)
    .select()
    .single()

  if (error) throw error
  return dbToTeam(data)
}

export async function disqualifyTeam(tournamentId, teamId, reason) {
  const { data, error } = await supabase
    .from('teams')
    .update({ status: 'disqualified', dq_reason: reason })
    .eq('id', teamId)
    .select()
    .single()

  if (error) throw error
  return dbToTeam(data)
}

export async function updateTeam(tournamentId, teamId, updates) {
  const updateData = {}
  if (updates.teamName !== undefined) updateData.team_name = updates.teamName
  if (updates.players !== undefined) updateData.players = updates.players
  if (updates.leaderWhatsapp !== undefined) updateData.leader_whatsapp = updates.leaderWhatsapp

  const { data, error } = await supabase
    .from('teams')
    .update(updateData)
    .eq('id', teamId)
    .select()
    .single()

  if (error) throw error
  return dbToTeam(data)
}

// Team portal login
export async function getTeamByNameAndPhone(tournamentId, teamName, phone) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId)
    .ilike('team_name', teamName.trim())
    .eq('leader_whatsapp', phone.trim())
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return dbToTeam(data)
}

// ============================================================
// IGN LOOKUP & SEARCH
// ============================================================

export async function lookupIGN(tournamentId, ign) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId)

  if (error) throw error

  const normalizedIGN = ign.toLowerCase().trim()
  for (const team of data) {
    for (let i = 0; i < (team.players || []).length; i++) {
      if (team.players[i].ign?.toLowerCase().trim() === normalizedIGN) {
        const t = dbToTeam(team)
        return {
          teamId: t.id,
          teamName: t.teamName,
          slotNumber: t.slotNumber,
          status: t.status,
          player: team.players[i],
          playerIndex: i,
          allPlayers: team.players,
        }
      }
    }
  }
  return null
}

export async function searchIGN(tournamentId, query) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId)

  if (error) throw error

  const normalizedQuery = query.toLowerCase().trim()
  const results = []

  for (const team of data) {
    for (const player of (team.players || [])) {
      if (player.ign?.toLowerCase().includes(normalizedQuery)) {
        const t = dbToTeam(team)
        results.push({
          teamId: t.id,
          teamName: t.teamName,
          slotNumber: t.slotNumber,
          status: t.status,
          player,
        })
      }
    }
  }
  return results
}

// ============================================================
// MATCH CRUD
// ============================================================

export async function getMatchesByTournament(tournamentId) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('match_number', { ascending: true })

  if (error) throw error
  return data.map(dbToMatch)
}

export async function updateRoomInfo(tournamentId, matchNumber, roomId, password) {
  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('match_number', matchNumber)
    .single()

  if (!match) throw new Error('Match not found')

  const { error } = await supabase
    .from('matches')
    .update({ room_id: roomId, password })
    .eq('id', match.id)

  if (error) throw error
}

export async function toggleRoomRelease(tournamentId, matchNumber) {
  const { data: match } = await supabase
    .from('matches')
    .select('id, room_released')
    .eq('tournament_id', tournamentId)
    .eq('match_number', matchNumber)
    .single()

  if (!match) throw new Error('Match not found')

  const newState = !match.room_released

  const { error } = await supabase
    .from('matches')
    .update({ room_released: newState })
    .eq('id', match.id)

  if (error) throw error
  return newState
}

// ============================================================
// MATCH RESULTS
// ============================================================

export async function saveMatchResults(tournamentId, matchNumber, resultsArray) {
  // Get match ID
  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('match_number', matchNumber)
    .single()

  if (!match) throw new Error('Match not found')

  // Upsert results
  const rows = resultsArray.map(r => ({
    match_id: match.id,
    tournament_id: tournamentId,
    team_id: r.teamId,
    placement: r.placement,
    kills: r.kills,
    placement_pts: r.placementPts,
    kill_pts: r.killPts,
    total_pts: r.totalPts
  }))

  const { error: upsertError } = await supabase
    .from('match_results')
    .upsert(rows, { onConflict: 'match_id,team_id' })

  if (upsertError) throw upsertError

  // Mark match as published
  const { error: pubError } = await supabase
    .from('matches')
    .update({
      published: true,
      published_at: new Date().toISOString()
    })
    .eq('id', match.id)

  if (pubError) throw pubError
}

export async function unpublishMatch(tournamentId, matchNumber) {
  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('match_number', matchNumber)
    .single()

  if (!match) throw new Error('Match not found')

  const { error } = await supabase
    .from('matches')
    .update({ published: false })
    .eq('id', match.id)

  if (error) throw error
}

export async function getResultsByMatch(matchId) {
  const { data, error } = await supabase
    .from('match_results')
    .select('*')
    .eq('match_id', matchId)

  if (error) throw error
  return data
}

// Build leaderboard from all published results
export async function getLeaderboard(tournamentId) {
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId)
    .in('status', ['confirmed', 'disqualified'])
    .order('slot_number', { ascending: true })

  if (teamsError) throw teamsError

  const { data: results, error: resultsError } = await supabase
    .from('match_results')
    .select(`
      *,
      matches!inner(match_number, published)
    `)
    .eq('tournament_id', tournamentId)
    .eq('matches.published', true)

  if (resultsError) throw resultsError

  // Build per-team data
  const teamMap = {}
  teams.forEach(t => {
    teamMap[t.id] = {
      id: t.id,
      teamId: t.id,
      teamName: t.team_name,
      slotNumber: t.slot_number,
      status: t.status,
      matchResults: {},
      totalKills: 0,
      totalPts: 0,
      totalPoints: 0
    }
  })

  results.forEach(r => {
    const matchNum = r.matches.match_number
    if (!teamMap[r.team_id]) return
    teamMap[r.team_id].matchResults[matchNum] = {
      matchNumber: matchNum,
      placement: r.placement,
      kills: r.kills,
      placementPts: parseFloat(r.placement_pts),
      killPts: parseFloat(r.kill_pts),
      total: parseFloat(r.total_pts),
      totalPts: parseFloat(r.total_pts)
    }
    teamMap[r.team_id].totalKills += r.kills
    teamMap[r.team_id].totalPts += parseFloat(r.total_pts)
    teamMap[r.team_id].totalPoints += parseFloat(r.total_pts)
  })

  // Sort
  const leaderboard = Object.values(teamMap).sort((a, b) => {
    if (a.status === 'disqualified' && b.status !== 'disqualified') return 1
    if (b.status === 'disqualified' && a.status !== 'disqualified') return -1
    if (b.totalPts !== a.totalPts) return b.totalPts - a.totalPts
    return b.totalKills - a.totalKills
  })

  return leaderboard.map((t, i) => ({
    ...t,
    rank: t.status === 'disqualified' ? -1 : i + 1
  }))
}

/**
 * Get full tournament data with embedded teams, matches, and results.
 * Used by admin components that need the complete picture.
 */
export async function getFullTournament(tournamentId) {
  const tournament = await getTournamentById(tournamentId)
  if (!tournament) return null

  const teams = await getTeamsByTournament(tournamentId)
  const matches = await getMatchesByTournament(tournamentId)

  // Load results for each match
  for (const match of matches) {
    const results = await getResultsByMatch(match.id)
    match.results = results.map(r => ({
      teamId: r.team_id,
      placement: r.placement,
      kills: r.kills,
      placementPts: parseFloat(r.placement_pts),
      killPts: parseFloat(r.kill_pts),
      totalPts: parseFloat(r.total_pts)
    }))
  }

  // Load announcements
  const announcements = await getAnnouncements(tournamentId)

  return {
    ...tournament,
    teams,
    matches,
    announcements
  }
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================

export async function getAnnouncements(tournamentId) {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function addAnnouncement(tournamentId, text) {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ tournament_id: tournamentId, text })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAnnouncement(tournamentId, announcementId) {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId)

  if (error) throw error
}

// ============================================================
// DUPLICATE CHECKS
// ============================================================

export async function checkDuplicateIGN(tournamentId, igns) {
  const { data, error } = await supabase
    .from('teams')
    .select('team_name, players')
    .eq('tournament_id', tournamentId)
    .not('status', 'eq', 'rejected')

  if (error) throw error

  const taken = []
  const lowerIgns = igns.map(i => i.toLowerCase())

  data.forEach(team => {
    (team.players || []).forEach(p => {
      if (lowerIgns.includes(p.ign?.toLowerCase())) {
        taken.push({ ign: p.ign, teamName: team.team_name })
      }
    })
  })

  return taken
}

export async function checkDuplicateUID(tournamentId, uids) {
  const { data, error } = await supabase
    .from('teams')
    .select('team_name, players')
    .eq('tournament_id', tournamentId)
    .not('status', 'eq', 'rejected')

  if (error) throw error

  const taken = []
  data.forEach(team => {
    (team.players || []).forEach(p => {
      if (uids.includes(p.uid)) {
        taken.push({ uid: p.uid, teamName: team.team_name })
      }
    })
  })

  return taken
}

// ============================================================
// REALTIME SUBSCRIPTIONS (admin only)
// ============================================================

export function subscribeToTeams(tournamentId, callback) {
  const channel = supabase
    .channel(`teams-${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'teams',
        filter: `tournament_id=eq.${tournamentId}`
      },
      callback
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export function subscribeToMatches(tournamentId, callback) {
  const channel = supabase
    .channel(`matches-${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`
      },
      callback
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

// ============================================================
// SLUG GENERATOR
// ============================================================

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
    + '-' + Date.now().toString(36)
}
