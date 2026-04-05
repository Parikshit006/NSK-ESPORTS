-- ============================================================
-- NSK ESPORTS — COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor to set up the database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: tournaments
-- ============================================================
CREATE TABLE tournaments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT UNIQUE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN (
                  'draft','registration_open','registration_closed',
                  'ongoing','completed','archived'
                )),

  -- Basic info
  name          TEXT NOT NULL,
  organizer     TEXT NOT NULL,
  tagline       TEXT,
  banner_url    TEXT,
  game          TEXT NOT NULL DEFAULT 'Free Fire Max',
  team_format   TEXT NOT NULL DEFAULT 'Squad (4 Players)',

  -- Schedule
  tournament_date       DATE,
  reg_deadline          TIMESTAMPTZ,
  room_release_time     TEXT,
  match_start_time      TEXT,
  num_matches           INTEGER NOT NULL DEFAULT 6
                        CHECK (num_matches BETWEEN 1 AND 10),

  -- Slots
  total_slots   INTEGER NOT NULL DEFAULT 12 CHECK (total_slots > 0),
  filled_slots  INTEGER NOT NULL DEFAULT 0,

  -- Entry
  entry_fee     INTEGER NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  upi_id        TEXT,

  -- Prizes: stored as JSON array
  prizes        JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Qualifier
  qualifier_enabled   BOOLEAN NOT NULL DEFAULT false,
  qualifier_top_n     INTEGER DEFAULT 4,
  qualifier_round_name TEXT DEFAULT 'Inter-College Round',

  -- Scoring
  scoring_preset      TEXT NOT NULL DEFAULT 'pict'
                      CHECK (scoring_preset IN ('pict','eagle','custom')),
  placement_points    JSONB NOT NULL DEFAULT '{
    "1":12,"2":9,"3":8,"4":7,"5":6,
    "6":5,"7":4,"8":3,"9":2,"10":1
  }'::jsonb,
  kill_point_value    NUMERIC NOT NULL DEFAULT 1.0,
  kill_cap            INTEGER DEFAULT 0,
  tiebreaker          TEXT NOT NULL DEFAULT 'total_kills'
                      CHECK (tiebreaker IN (
                        'total_kills','last_match_kills','head_to_head'
                      )),

  -- Rules: JSON array of strings
  rules           JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Registration form field toggles
  show_college    BOOLEAN NOT NULL DEFAULT false,
  show_txn_id     BOOLEAN NOT NULL DEFAULT true,
  show_screenshot BOOLEAN NOT NULL DEFAULT true,

  -- Contact
  contact_whatsapp        TEXT,
  contact_whatsapp_group  TEXT,
  contact_discord         TEXT,
  contact_instagram       TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: teams
-- ============================================================
CREATE TABLE teams (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id       UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,

  team_name           TEXT NOT NULL,
  leader_name         TEXT NOT NULL,
  leader_whatsapp     TEXT NOT NULL,
  college             TEXT,

  players             JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Payment
  transaction_id      TEXT,
  screenshot_url      TEXT,

  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN (
                        'pending','confirmed','rejected','disqualified'
                      )),
  slot_number         INTEGER,
  rejection_reason    TEXT,
  dq_reason           TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_teams_tournament_slot
  ON teams(tournament_id, slot_number)
  WHERE slot_number IS NOT NULL;

-- ============================================================
-- TABLE: matches
-- ============================================================
CREATE TABLE matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_number    INTEGER NOT NULL CHECK (match_number >= 1),
  room_id         TEXT,
  password        TEXT,
  room_released   BOOLEAN NOT NULL DEFAULT false,
  published       BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tournament_id, match_number)
);

-- ============================================================
-- TABLE: match_results
-- ============================================================
CREATE TABLE match_results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  placement       INTEGER NOT NULL CHECK (placement >= 1),
  kills           INTEGER NOT NULL DEFAULT 0 CHECK (kills >= 0),
  placement_pts   NUMERIC NOT NULL DEFAULT 0,
  kill_pts        NUMERIC NOT NULL DEFAULT 0,
  total_pts       NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(match_id, team_id)
);

-- ============================================================
-- TABLE: announcements
-- ============================================================
CREATE TABLE announcements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  text            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_teams_tournament     ON teams(tournament_id);
CREATE INDEX idx_teams_status         ON teams(tournament_id, status);
CREATE INDEX idx_matches_tournament   ON matches(tournament_id);
CREATE INDEX idx_results_tournament   ON match_results(tournament_id);
CREATE INDEX idx_results_match        ON match_results(match_id);
CREATE INDEX idx_results_team         ON match_results(team_id);
CREATE INDEX idx_announcements_tourn  ON announcements(tournament_id);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tournaments_updated
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_teams_updated
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_matches_updated
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE tournaments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams          ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements  ENABLE ROW LEVEL SECURITY;

-- PUBLIC read policies
CREATE POLICY "public_read_tournaments" ON tournaments
  FOR SELECT USING (status NOT IN ('draft','archived'));

CREATE POLICY "public_read_teams" ON teams
  FOR SELECT USING (true);

CREATE POLICY "public_insert_teams" ON teams
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "public_read_results" ON match_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id AND m.published = true
    )
  );

CREATE POLICY "public_read_matches" ON matches
  FOR SELECT USING (true);

CREATE POLICY "public_read_announcements" ON announcements
  FOR SELECT USING (true);

-- AUTHENTICATED (admin) full access
CREATE POLICY "admin_all_tournaments" ON tournaments
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_all_teams" ON teams
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_all_matches" ON matches
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_all_results" ON match_results
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_all_announcements" ON announcements
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- HELPER FUNCTION: increment filled_slots
-- ============================================================
CREATE OR REPLACE FUNCTION increment_filled_slots(tournament_id_arg UUID)
RETURNS void AS $$
BEGIN
  UPDATE tournaments
  SET filled_slots = filled_slots + 1
  WHERE id = tournament_id_arg
    AND filled_slots < total_slots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
