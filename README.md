# 🎮 NSK ESPORTS — Free Fire Max Tournament Platform

A production-ready, full-stack tournament management web application for Free Fire Max college esports. Built for college organizers to create tournaments, handle team registrations with payment verification, enter live match results, and display real-time public leaderboards — all at **zero hosting cost**.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Database Schema](#-database-schema)
- [Authentication](#-authentication)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Configuration Guide](#-configuration-guide)
- [Performance & Scaling](#-performance--scaling)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### Public Features
| Feature | Description |
|---------|-------------|
| **Tournament Listing** | Browse all active tournaments with status badges |
| **Tournament Detail** | Hero section, countdown timer, prize pool, slot tracker |
| **Team Registration** | 4-player squad registration with payment screenshot upload |
| **Live Leaderboard** | Auto-refreshing every 5s with per-match breakdown |
| **Screenshot Mode** | Clean leaderboard view optimized for PNG export |
| **WhatsApp Sharing** | One-click share leaderboard link via WhatsApp |
| **Qualifier Badges** | Top N teams display ⭐ QUALIFIED badge |
| **DQ Handling** | Disqualified teams shown at bottom with red styling |
| **Tournament Rules** | Dynamic rules page from admin configuration |
| **Team Portal** | Login with team name + phone to view room IDs, stats |
| **Room Info** | Copy room ID + password when admin releases them |

### Admin Features
| Feature | Description |
|---------|-------------|
| **Email + Google OAuth Login** | Secure admin authentication via Supabase Auth |
| **Session Persistence** | Stay logged in across browser refreshes |
| **Tournament Wizard** | 8-step creation wizard (info, schedule, slots, prizes, scoring, rules, fields, contact) |
| **Status Management** | Draft → Registration Open → Ongoing → Completed → Archived |
| **Team Management** | Approve/reject/disqualify teams with reasons |
| **Payment Verification** | View uploaded payment screenshots (signed URLs) |
| **WhatsApp Messages** | Auto-generated approval/room/results messages |
| **Match Results Entry** | Enter placement + kills per team per match |
| **Live Scoring Preview** | See calculated points as you enter results |
| **Room Management** | Set room ID + password, toggle release |
| **Announcements** | Post/delete announcements visible on all public pages |
| **Real-time Updates** | Instant notification on new team registrations |
| **IGN Search** | Search for any player IGN across all teams |
| **Export** | PNG results card, CSV data, WhatsApp text |

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite 6 | SPA with HMR |
| **Routing** | React Router v6 | Client-side navigation |
| **Styling** | Vanilla CSS (1,825 lines) | Custom dark gaming theme |
| **Database** | Supabase (PostgreSQL) | All tournament data |
| **Auth** | Supabase Auth | Email/password + Google OAuth |
| **File Storage** | Supabase Storage | Payment screenshots (private) |
| **CDN** | Cloudinary | Tournament banners (public) |
| **Hosting** | Vercel | Global CDN, auto-deploy |
| **Sanitization** | DOMPurify | XSS prevention on inputs |
| **Export** | html2canvas | PNG leaderboard export |

### Why Supabase over Firebase?
Firebase Firestore free tier = 50,000 reads/DAY.  
With 1000 users polling leaderboard every 5s = 720,000 reads/hour → app dies in 4 minutes.  
**Supabase REST API = UNLIMITED reads on free tier.** That's the deciding factor.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                    USERS (Browser)                    │
│                                                      │
│  Public Pages          Admin Pages                   │
│  ├── Home              ├── Dashboard                 │
│  ├── Leaderboard       ├── Create Tournament         │
│  ├── Registration      └── Manage Tournament         │
│  ├── Rules                 ├── Teams                  │
│  └── Team Portal           ├── Results               │
│                            ├── Rooms                  │
│       REST Polling         ├── Announcements          │
│       (5-10s interval)     └── Export                 │
│                                                      │
│            Realtime WebSocket                        │
│            (admin only, 1-2 connections)             │
└──────────────┬──────────────────┬────────────────────┘
               │                  │
               ▼                  ▼
┌──────────────────────┐  ┌──────────────────────────┐
│   Supabase (Free)    │  │   Cloudinary (Free)      │
│                      │  │                          │
│  PostgreSQL DB       │  │  Tournament banners      │
│  ├── tournaments     │  │  Auto-optimized (f_auto) │
│  ├── teams           │  │  Global CDN delivery     │
│  ├── matches         │  └──────────────────────────┘
│  ├── match_results   │
│  └── announcements   │
│                      │
│  Auth (Email+Google) │
│  Storage (private)   │
│  Realtime (admin)    │
│  REST API (public)   │
└──────────────────────┘
               │
               ▼
┌──────────────────────┐
│   Vercel (Free)      │
│  Static React SPA    │
│  Global CDN          │
│  Auto SSL            │
│  Auto-deploy on push │
└──────────────────────┘
```

### Data Flow Strategy
- **Public pages** → REST API polling (5s leaderboard, 10s team portal)
- **Admin panel** → Realtime WebSocket for new registrations
- **Result:** Max 2-3 WebSocket connections out of 200 limit

---

## 📁 Project Structure

```
NSK-ESPORTS/
│
├── .env.local                          # API keys (never commit)
├── .env.example                        # Template for .env.local
├── .gitignore
├── index.html                          # SPA entry point
├── package.json
├── vite.config.js                      # Code splitting config
├── vercel.json                         # SPA rewrite + caching
├── README.md                           # This file
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql      # Full DB schema + RLS + triggers
│   └── functions/
│       ├── validate-registration/
│       │   └── index.ts                # Edge fn: server-side validation
│       └── check-duplicate/
│           └── index.ts                # Edge fn: IGN/UID duplicate check
│
├── public/
│   └── ff-logo.webp                    # Free Fire Max logo
│
└── src/
    ├── main.jsx                        # App entry: providers + error boundary
    ├── App.jsx                         # Routes with lazy loading
    ├── index.css                       # Design system (DO NOT MODIFY)
    │
    ├── lib/                            # External service clients
    │   ├── supabase.js                 # Supabase client init
    │   └── cloudinary.js               # Cloudinary upload helper
    │
    ├── contexts/                       # React context providers
    │   ├── AuthContext.jsx             # Auth state + signIn/signOut/Google
    │   └── ToastContext.jsx            # Toast notification system
    │
    ├── hooks/                          # Custom React hooks
    │   ├── usePolling.js               # Generic interval-based fetcher
    │   └── useLeaderboard.js           # Leaderboard-specific polling
    │
    ├── services/
    │   └── dataService.js              # ALL Supabase CRUD operations
    │
    ├── pages/                          # Route-level components
    │   ├── HomePage.jsx                # / and /tournament/:slug
    │   ├── RegistrationPage.jsx        # /tournament/:slug/register
    │   ├── LeaderboardPage.jsx         # /tournament/:slug/leaderboard
    │   ├── RulesPage.jsx               # /tournament/:slug/rules
    │   ├── TeamPortalPage.jsx          # /tournament/:slug/portal
    │   ├── AdminPage.jsx               # /admin/*
    │   └── NotFoundPage.jsx            # 404
    │
    ├── components/
    │   ├── admin/
    │   │   ├── AdminPanel.jsx          # Login (Email + Google) + routing
    │   │   ├── AdminDashboard.jsx      # Tournament list + CRUD
    │   │   ├── CreateTournament.jsx    # 8-step wizard
    │   │   └── ManageTournament.jsx    # Teams/results/rooms/announce
    │   ├── layout/
    │   │   ├── Header.jsx              # Top navigation bar
    │   │   └── MobileNav.jsx           # Bottom mobile navigation
    │   ├── common/
    │   │   ├── ProtectedRoute.jsx      # Auth guard component
    │   │   └── ErrorBoundary.jsx       # React crash recovery
    │   └── leaderboard/
    │       └── ResultsTemplate.jsx     # PNG export template
    │
    └── utils/
        ├── helpers.js                  # Formatting, constants, WhatsApp msgs
        └── scoring.js                  # Scoring engine (PICT/Eagle/Custom)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- A [Supabase](https://supabase.com) account (free)
- A [Cloudinary](https://cloudinary.com) account (free)

### 1. Clone & Install
```bash
git clone https://github.com/SwayamKhairnar/NSK-ESPORTS.git
cd NSK-ESPORTS
npm install
```

### 2. Set Up Supabase
1. Create a new project at [supabase.com](https://supabase.com)
   - Region: **Southeast Asia (Singapore)** — closest to India
2. Go to **SQL Editor** → paste contents of `supabase/migrations/001_initial_schema.sql` → **Run**
3. Go to **Authentication → Providers → Email** → Enable email provider, disable "Confirm email"
4. Go to **Authentication → Users** → **Add User** → create admin account (check "Auto Confirm")
5. Go to **Storage** → create two buckets:
   - `payment-screenshots` (Private, 5MB max, image/* only)
   - `tournament-banners` (Public, 2MB max, image/* only)
6. Go to **Project Settings → API** → copy Project URL and anon key

### 3. Set Up Cloudinary
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to **Settings → Upload** → **Add upload preset**
   - Name: `NSKEsports` (or your preferred name)
   - Signing Mode: **Unsigned**
   - Folder: `nsk-banners`
3. Copy your **Cloud name** from the dashboard

### 4. Configure Environment
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=NSKEsports
```

### 5. Run Locally
```bash
npm run dev
```
Open `http://localhost:5173`

### 6. (Optional) Set Up Google OAuth
See [Authentication → Google OAuth](#google-oauth-setup) section below.

---

## 🗄 Database Schema

### Tables

#### `tournaments`
Stores all tournament configuration, scoring rules, and contact info.
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `slug` | TEXT | URL-friendly identifier (unique) |
| `status` | TEXT | draft / registration_open / registration_closed / ongoing / completed / archived |
| `name` | TEXT | Tournament name |
| `organizer` | TEXT | Organizer name |
| `tournament_date` | DATE | Event date |
| `num_matches` | INTEGER | Number of maps (1-10) |
| `total_slots` | INTEGER | Max teams allowed |
| `filled_slots` | INTEGER | Current confirmed teams |
| `entry_fee` | INTEGER | Fee in INR (0 = free) |
| `scoring_preset` | TEXT | pict / eagle / custom |
| `placement_points` | JSONB | Points per position |
| `prizes` | JSONB | Array of prize objects |
| `rules` | JSONB | Array of rule strings |

#### `teams`
Stores team registrations and player data.
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tournament_id` | UUID | FK → tournaments |
| `team_name` | TEXT | Team name |
| `leader_whatsapp` | TEXT | Leader's phone number |
| `players` | JSONB | Array of {ign, uid, role} |
| `status` | TEXT | pending / confirmed / rejected / disqualified |
| `slot_number` | INTEGER | Assigned slot (null if pending) |
| `screenshot_url` | TEXT | Payment proof (signed URL) |

#### `matches`
Stores room info and publication status.
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tournament_id` | UUID | FK → tournaments |
| `match_number` | INTEGER | 1-based match index |
| `room_id` | TEXT | Game room ID |
| `password` | TEXT | Room password |
| `room_released` | BOOLEAN | Visible to teams? |
| `published` | BOOLEAN | Results published? |

#### `match_results`
Stores per-team per-match scores.
| Column | Type | Description |
|--------|------|-------------|
| `match_id` | UUID | FK → matches |
| `team_id` | UUID | FK → teams |
| `placement` | INTEGER | Final position (1-12) |
| `kills` | INTEGER | Total kills |
| `placement_pts` | NUMERIC | Calculated placement points |
| `kill_pts` | NUMERIC | Calculated kill points |
| `total_pts` | NUMERIC | placement_pts + kill_pts |

#### `announcements`
Admin-posted announcements shown on public pages.
| Column | Type | Description |
|--------|------|-------------|
| `tournament_id` | UUID | FK → tournaments |
| `text` | TEXT | Announcement content |
| `created_at` | TIMESTAMPTZ | Timestamp |

### Row Level Security (RLS)
- **Public:** Can read non-draft tournaments, read teams, insert pending teams, read published results
- **Authenticated (admin):** Full CRUD on all tables
- Payment screenshots are in a **private** storage bucket — admin views via 24-hour signed URLs

---

## 🔐 Authentication

### Email/Password
- Admin account created manually in Supabase Dashboard
- Session persists across browser refreshes via Supabase Auth
- No public signups — only the admin account exists

### Google OAuth Setup

#### Step 1: Google Cloud Console
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → **APIs & Services → Credentials**
3. Configure **OAuth consent screen** (External, app name, email)
4. Create **OAuth Client ID** (Web application)
5. Add **Authorized redirect URI**:
   ```
   https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
   ```
6. Copy **Client ID** and **Client Secret**

#### Step 2: Supabase Dashboard
1. **Authentication → Providers → Google**
2. Toggle ON, paste Client ID + Secret, Save

---

## 📡 API Reference (dataService.js)

All functions are `async` and throw on error.

### Tournaments
```javascript
getAllTournaments()              // Returns all non-archived tournaments
getPublicTournaments()          // Returns non-draft, non-archived tournaments
getTournamentBySlug(slug)       // Single tournament by URL slug
getTournamentById(id)           // Single tournament by UUID
createTournament(data)          // Create new tournament + matches
updateTournament(id, updates)   // Partial update
updateTournamentStatus(id, status)  // Change status only
deleteTournament(id)            // Delete tournament + cascade
uploadTournamentBanner(file)    // Upload to Cloudinary, returns URL
getFullTournament(id)           // Tournament + teams + matches + results + announcements
```

### Teams
```javascript
getTeamsByTournament(tournamentId)       // All teams for a tournament
getConfirmedTeams(tournamentId)          // Confirmed + DQ teams only
registerTeam(tournamentId, formData, screenshotFile)  // New registration
approveTeam(tournamentId, teamId)        // Confirm + assign slot
rejectTeam(tournamentId, teamId, reason) // Reject with reason
disqualifyTeam(tournamentId, teamId, reason) // DQ with reason
updateTeam(tournamentId, teamId, updates)    // Edit team info
getTeamByNameAndPhone(tournamentId, name, phone) // Team portal login
```

### Matches & Results
```javascript
getMatchesByTournament(tournamentId)            // All matches
updateRoomInfo(tournamentId, matchNumber, roomId, password) // Set room
toggleRoomRelease(tournamentId, matchNumber)     // Show/hide room
saveMatchResults(tournamentId, matchNumber, results) // Publish results
getLeaderboard(tournamentId)                     // Aggregated standings
```

### Announcements
```javascript
getAnnouncements(tournamentId)           // All announcements (newest first)
addAnnouncement(tournamentId, text)      // Post new announcement
deleteAnnouncement(tournamentId, id)     // Remove announcement
```

### Search & Validation
```javascript
lookupIGN(tournamentId, ign)             // Find player by exact IGN
searchIGN(tournamentId, query)           // Partial IGN search
checkDuplicateIGN(tournamentId, igns)    // Check for taken IGNs
checkDuplicateUID(tournamentId, uids)    // Check for taken UIDs
```

### Realtime (Admin Only)
```javascript
subscribeToTeams(tournamentId, callback)    // Live team changes
subscribeToMatches(tournamentId, callback)  // Live match updates
// Both return an unsubscribe function
```

---

## 🌐 Deployment

### Vercel Deployment
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub
3. Framework: **Vite** (auto-detected)
4. Add environment variables:
   | Variable | Value |
   |----------|-------|
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `VITE_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
   | `VITE_CLOUDINARY_UPLOAD_PRESET` | Your upload preset name |
5. Click **Deploy**
6. Every `git push` to main branch → auto-deploys in ~30 seconds

### Custom Domain
1. Vercel Dashboard → **Settings → Domains**
2. Add your domain (e.g., `nsk-esports.in`)
3. Update DNS records as instructed
4. SSL certificate is automatic

### Anti-Pause Cron (Critical!)
Supabase pauses free-tier projects after 7 days of inactivity.
1. Go to [cron-job.org](https://cron-job.org) → Create free account
2. Create new job:
   - **URL:** `https://YOUR-PROJECT.supabase.co/rest/v1/tournaments?select=id&limit=1`
   - **Headers:** `apikey: YOUR_ANON_KEY`
   - **Schedule:** Every 3 days
3. This keeps your database alive indefinitely

---

## ⚙️ Configuration Guide

### Scoring Presets

#### PICT Preset (Default)
| Position | Points |
|----------|--------|
| #1 (Booyah) | 12 |
| #2 | 9 |
| #3 | 8 |
| #4-10 | 7, 6, 5, 4, 3, 2, 1 |
| Kill points | 1 per kill (no cap) |

#### Eagle Preset
| Position | Points |
|----------|--------|
| #1 | 10 |
| #2 | 6 |
| #3-5 | 5, 4, 3 |
| #6-10 | 2 each |
| #11-15 | 1 each |
| Kill points | 1 per kill |

#### Custom
Admin defines their own placement points, kill multiplier, kill cap, and tiebreaker.

### Tournament Status Flow
```
draft → registration_open → registration_closed → ongoing → completed → archived
```

---

## ⚡ Performance & Scaling

### Handling 500–1000 Concurrent Users

| Component | Strategy | Connections Used |
|-----------|----------|-----------------|
| Leaderboard (1000 users) | REST polling every 5s | 0 WebSocket |
| Team Portal (100 teams) | REST polling every 10s | 0 WebSocket |
| Admin Panel (1-2 users) | Realtime WebSocket | 2 WebSocket |
| **Total** | | **2 out of 200 limit** |

### Code Splitting
```javascript
// Vite manual chunks
'react-vendor': ['react', 'react-dom', 'react-router-dom']
'supabase': ['@supabase/supabase-js']
```
Admin code loads only when `/admin` is accessed via `React.lazy()`.

### Image Optimization
- Payment screenshots compressed to 800px max, 75% JPEG quality before upload
- Banners auto-optimized by Cloudinary CDN (`f_auto, q_auto`)

---

## 🔒 Security

| Measure | Implementation |
|---------|---------------|
| Row Level Security | Public read-only, admin full CRUD via RLS policies |
| Input Sanitization | DOMPurify on all text inputs |
| File Validation | Image-only, size-limited uploads |
| Duplicate Checks | IGN/UID/TxnID validated before registration |
| Private Storage | Payment screenshots in private Supabase bucket |
| Signed URLs | Screenshots accessible via 24-hour expiring URLs |
| Auth | Supabase Auth (email + Google OAuth) |
| No Secrets in Code | All API keys in environment variables |
| Disabled Signups | Only manually created admin account |

---

## 🔧 Troubleshooting

### "Email logins are disabled"
→ Supabase Dashboard → Authentication → Providers → Email → **Toggle ON**

### "relation tournaments already exists"
→ Database already set up. This is fine — skip the SQL step.

### Login works but admin sees empty dashboard
→ You haven't created any tournaments yet. Click "Create Tournament".

### Leaderboard not updating
→ Results must be **published** from Admin → Manage → Results tab. Unpublished results don't appear.

### Payment screenshot upload fails
→ Create the `payment-screenshots` bucket in Supabase Storage (Private, 5MB max).

### Google OAuth redirect error
→ Check that the redirect URI in Google Cloud Console matches:
`https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`

### Supabase project paused
→ Set up the anti-pause cron job at cron-job.org (see Deployment section).

---

## 📊 Free Tier Limits

| Service | Limit | Our Usage |
|---------|-------|-----------|
| **Supabase DB** | 500MB | < 10MB |
| **Supabase Storage** | 1GB | < 100MB |
| **Supabase Bandwidth** | 5GB/mo | < 2GB |
| **Supabase MAU** | 50,000 | < 5,000 |
| **Supabase Realtime** | 200 concurrent | 2-3 used |
| **Supabase REST API** | Unlimited | ✅ |
| **Cloudinary Storage** | 10GB | < 500MB |
| **Cloudinary Bandwidth** | 20GB/mo | < 5GB |
| **Vercel Bandwidth** | 100GB/mo | < 10GB |

At college-event scale, these limits will **never** be exceeded.

---

## 📜 License

MIT License — free to use, modify, and distribute.

---

*Built with ❤️ for the Indian college esports community.*
