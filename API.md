# 📡 NSK-ESPORTS — REST API Reference

Base URL: `http://localhost:5000/api` (Local) / `/api` (Production with Reverse Proxy)

All endpoints accept and return JSON unless specified otherwise. Admin routes require the `Authorization: Bearer <token>` header.

---

## 1. Authentication Endpoints

### 1.1 `POST /auth/login`
Authenticates the admin and returns a JWT token.

- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "admin@nsk-esports.in",
    "password": "Admin@Password123"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "6a997a7a9a6e9e61a664c63a",
      "email": "admin@nsk-esports.in",
      "name": "Tournament Director",
      "role": "admin"
    }
  }
  ```
- **Error Response (401 Unauthorized):**
  ```json
  {
    "success": false,
    "message": "Invalid email or password"
  }
  ```

---

### 1.2 `GET /auth/me`
Verifies current session and returns admin profile.

- **Access:** Admin (Bearer Token)
- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "admin": {
      "id": "6a997a7a9a6e9e61a664c63a",
      "email": "admin@nsk-esports.in",
      "name": "Tournament Director",
      "role": "admin"
    }
  }
  ```

---

## 2. Tournament Endpoints

### 2.1 `GET /tournaments`
Returns all active public tournaments (excluding `draft` and `archived`).

- **Access:** Public
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "6a997a7a9a6e9e61a664c63e",
        "slug": "nsk-championship-2026",
        "status": "ongoing",
        "name": "NSK College Championship 2026",
        "organizer": "NSK Esports Association",
        "slots": { "total": 12, "filled": 6 }
      }
    ]
  }
  ```

---

### 2.2 `GET /tournaments/slug/:slug`
Fetches a single tournament by unique URL slug.

- **Access:** Public
- **Response (200 OK / 404 Not Found)**

---

### 2.3 `GET /tournaments/:id/full`
Fetches complete tournament data including teams, matches, results, and announcements.

- **Access:** Admin (Bearer Token)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "6a997a7a9a6e9e61a664c63e",
      "name": "NSK College Championship 2026",
      "teams": [ ... ],
      "matches": [ ... ],
      "announcements": [ ... ]
    }
  }
  ```

---

### 2.4 `POST /tournaments`
Creates a new tournament and automatically provisions matches (1 through `numMatches`).

- **Access:** Admin (Bearer Token)
- **Request Body:**
  ```json
  {
    "name": "Spring Havoc Cup",
    "organizer": "NSK Gaming",
    "schedule": { "numMatches": 4, "date": "2026-09-10" },
    "slots": { "total": 12 },
    "entry": { "fee": 100, "upiId": "nsk@upi" },
    "scoring": { "preset": "pict" }
  }
  ```

---

## 3. Teams & Registration Endpoints

### 3.1 `POST /teams/tournament/:tournamentId/register`
Submits squad registration with optional payment proof screenshot.

- **Access:** Public
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `teamName`: Squad Name (Required)
  - `leaderName`: Captain Name (Required)
  - `leaderWhatsapp`: Captain Phone (Required)
  - `college`: College/Institution (Optional)
  - `players`: JSON String of player objects `[{ ign, uid, role }]`
  - `transactionId`: UPI Reference ID (Optional/Required for paid events)
  - `screenshot`: Image File (JPEG, PNG, WebP up to 5MB)
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "6a997a7a9a6e9e61a664c64a",
      "teamName": "Team Phoenix",
      "status": "pending",
      "slotNumber": null
    }
  }
  ```

---

### 3.2 `POST /teams/:id/approve`
Approves a pending registration, assigns the next available slot sequentially, and atomically updates `filled_slots`.

- **Access:** Admin (Bearer Token)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "6a997a7a9a6e9e61a664c64a",
      "teamName": "Team Phoenix",
      "status": "confirmed",
      "slotNumber": 7
    }
  }
  ```

---

### 3.3 `POST /teams/:id/reject`
Rejects a team registration with an optional reason.

- **Access:** Admin (Bearer Token)
- **Request Body:** `{ "reason": "Invalid payment screenshot" }`

---

### 3.4 `POST /teams/:id/disqualify`
Disqualifies a team with a recorded reason.

- **Access:** Admin (Bearer Token)
- **Request Body:** `{ "reason": "Rule violation" }`

---

### 3.5 `POST /teams/portal-login`
Authenticates a team into the Team Portal by squad name and captain phone.

- **Access:** Public
- **Request Body:**
  ```json
  {
    "tournamentId": "6a997a7a9a6e9e61a664c63e",
    "teamName": "Total Gaming Army",
    "phone": "9876500001"
  }
  ```

---

### 3.6 `GET /teams/:id/screenshot`
Securely streams the team's payment screenshot from disk.

- **Access:** Admin Only (Bearer Token)
- **Response:** Image binary stream (`image/jpeg`)

---

### 3.7 `POST /teams/tournament/:tournamentId/check-duplicate-ign`
Checks if any provided in-game names are already registered in the tournament.

- **Access:** Public
- **Request Body:** `{ "igns": ["TG_Ajjubhai", "PlayerTwo"] }`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      { "ign": "TG_Ajjubhai", "teamName": "Total Gaming Army" }
    ]
  }
  ```

---

## 4. Matches & Leaderboard Endpoints

### 4.1 `GET /matches/tournament/:tournamentId`
Returns all scheduled matches.

- **Access:** Public

---

### 4.2 `PUT /matches/tournament/:tournamentId/matches/:matchNumber/room`
Updates Free Fire room ID and password.

- **Access:** Admin (Bearer Token)
- **Request Body:**
  ```json
  {
    "roomId": "1234567",
    "password": "PASS"
  }
  ```

---

### 4.3 `POST /matches/tournament/:tournamentId/matches/:matchNumber/toggle-release`
Toggles room credentials visibility for teams in the Team Portal.

- **Access:** Admin (Bearer Token)

---

### 4.4 `POST /matches/tournament/:tournamentId/matches/:matchNumber/results`
Saves match placements, kill counts, calculates points, and publishes the match results.

- **Access:** Admin (Bearer Token)
- **Request Body:**
  ```json
  {
    "results": [
      {
        "teamId": "6a997a7a9a6e9e61a664c64a",
        "placement": 1,
        "kills": 8,
        "placementPts": 12,
        "killPts": 8,
        "totalPts": 20
      }
    ]
  }
  ```

---

### 4.5 `GET /matches/tournament/:tournamentId/leaderboard`
High-performance live leaderboard endpoint. Aggregates results across all published matches, sorts teams by points and tiebreakers, and attaches qualifier flags.

- **Access:** Public
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "teamId": "6a997a7a9a6e9e61a664c641",
        "teamName": "GodLike Esports",
        "slotNumber": 2,
        "rank": 1,
        "totalKills": 16,
        "totalPoints": 37,
        "matchResults": {
          "1": { "placement": 2, "kills": 6, "totalPts": 15 },
          "2": { "placement": 1, "kills": 10, "totalPts": 22 }
        }
      }
    ]
  }
  ```

---

## 5. Announcements Endpoints

- `GET /announcements/tournament/:tournamentId` (Public)
- `POST /announcements/tournament/:tournamentId` (Admin)
- `DELETE /announcements/:id` (Admin)
