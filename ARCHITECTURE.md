# 🏗️ NSK-ESPORTS — System Architecture Documentation

This document describes the migrated production architecture for **NSK-ESPORTS**, transitioning from Supabase/PostgreSQL to a decoupled **React 18 + Node.js/Express + MongoDB** stack.

---

## 1. High-Level Production Architecture

```mermaid
graph TD
    subgraph Client Layer
        PublicBrowser[Public Users - Desktop/Mobile]
        AdminBrowser[Tournament Organizers / Admins]
    end

    subgraph CDN & Frontend Hosting
        Vercel[Vercel Global CDN - Static React 18 SPA]
        CloudinaryCDN[Cloudinary CDN - Public Banners]
    end

    subgraph Backend Application Server
        Express[Node.js / Express 4 API Server]
        AuthMiddleware[JWT Authentication Guard]
        MulterUpload[Multer File Ingestion]
        SocketIOServer[Socket.IO Realtime Gateway]
        ScoringEngine[Esports Scoring & Leaderboard Engine]
    end

    subgraph Data & Storage Layer
        MongoDB[(MongoDB Database Engine)]
        PrivateStorage[(Private Disk Storage - uploads/payments/)]
    end

    PublicBrowser -->|HTTPS GET Assets| Vercel
    AdminBrowser -->|HTTPS GET Assets| Vercel
    PublicBrowser -->|Fetch Banners| CloudinaryCDN

    PublicBrowser -->|REST Polling 5s-10s| Express
    AdminBrowser -->|REST API with JWT| Express
    AdminBrowser <-->|WebSocket Realtime| SocketIOServer

    Express --> AuthMiddleware
    Express --> MulterUpload
    Express --> ScoringEngine

    MulterUpload -->|Save Proof| PrivateStorage
    Express -->|CRUD Operations| MongoDB
```

---

## 2. Team Registration Flow

```mermaid
sequenceDiagram
    autonumber
    actor TeamLeader as Team Captain
    participant React as React Frontend (/register)
    participant API as Express API (/api/teams/.../register)
    participant DB as MongoDB (teams collection)
    participant Disk as Private Disk (uploads/payments/)
    participant Socket as Socket.IO
    actor Admin as Admin Dashboard

    TeamLeader->>React: Fills form (IGNs, WhatsApp, Screenshot)
    React->>API: POST multipart/form-data
    API->>DB: Check duplicate squad name & transaction ID
    alt Duplicate Found
        API-->>React: 400 Bad Request (Error message)
    else Valid Submission
        API->>Disk: Store screenshot in uploads/payments/
        API->>DB: Insert Team document (status: 'pending')
        API->>Socket: Emit 'team:registered' to tournament room
        Socket-->>Admin: Instant UI Notification
        API-->>React: 201 Created (Success)
        React-->>TeamLeader: Displays confirmation screen
    end
```

---

## 3. Race-Safe Admin Approval Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Tournament Admin
    participant Dashboard as Admin Dashboard
    participant API as Express API (/api/teams/:id/approve)
    participant DB as MongoDB

    Admin->>Dashboard: Clicks "Approve Team"
    Dashboard->>API: POST /api/teams/:id/approve (JWT)
    API->>DB: Atomically check slots.filled < slots.total & increment
    alt Slots Exceeded
        API-->>Dashboard: 400 Error (Tournament Full)
    else Slots Available
        API->>DB: Query highest assigned slotNumber
        API->>DB: Set status: 'confirmed', slotNumber: nextSlot
        API->>Dashboard: 200 OK (Updated Team with slot)
        Dashboard-->>Admin: Generates customized WhatsApp approval message
    end
```

---

## 4. Live Leaderboard & Scoring Engine Flow

```mermaid
sequenceDiagram
    autonumber
    actor Viewer as Public Leaderboard Viewer
    participant UI as LeaderboardPage (React)
    participant Polling as useLeaderboard (5s Polling)
    participant API as Express API (/api/matches/.../leaderboard)
    participant Engine as scoringService.js
    participant DB as MongoDB

    Polling->>API: GET /api/matches/tournament/:id/leaderboard
    API->>DB: Fetch Tournament rules, Confirmed Teams, Published Matches, Match Results
    API->>Engine: buildLeaderboardFromData()
    Note over Engine: Calculates placement points + kill points (with kill cap)<br/>Applies tiebreaker: total_kills / last_match_kills / head_to_head<br/>Sorts standings and assigns official ranks
    Engine-->>API: Array of Ranked Standings
    API-->>UI: JSON Standings
    UI-->>Viewer: Renders live table with top qualifiers and DQ flags
```

---

## 5. Security Architecture

1. **Defense in Depth**: Frontend route protections (`ProtectedRoute.jsx`) serve exclusively for UX; security is guaranteed by server-side middleware (`protectAdmin`).
2. **Private Payment Protection**: Uploaded payment receipts are stored outside public document roots. Access is gated by `GET /api/teams/:id/screenshot`, which requires an authenticated Admin JWT.
3. **Password Security**: Admin credentials use salted bcrypt hashes (work factor 10). Passwords are never stored in plaintext.
4. **Injection Protection**: All queries use Mongoose schemas with strict sanitization and parameterized conditions.
