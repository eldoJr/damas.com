# Damas.com

> Play the classic checkers (damas) board game online — real-time, multiplayer, and free.

---

## Features

- **Real-time multiplayer** — play against friends via shareable room links (WebSocket / Socket.IO)
- **Classic damas rules** — standard 8×8 board, mandatory captures, king promotion
- **Guest & account play** — jump in instantly as a guest or register to track stats
- **Match history** — review past games move by move
- **Leaderboard** — ranked by wins, win rate, and ELO score
- **Responsive board** — playable on desktop and mobile
- **Dark / light theme** — system preference aware

---

## Tech Stack

| Layer | Technology |
|-----------|--------------------------------------|
| Frontend | React 18, TypeScript, Vite, Zustand |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL |
| Shared | TypeScript types (monorepo) |
| DevOps | Docker, Docker Compose |

---

## Project Structure

```
damas.com/
├── frontend/                  # React + Vite SPA
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── board/         # Board, Square, Piece components
│       │   └── ui/            # Buttons, modals, layout
│       ├── hooks/             # useGame, useSocket, useAuth
│       ├── pages/             # Home, Game, Lobby, Profile
│       ├── store/             # Zustand global state
│       └── styles/            # Global CSS / tokens
│
├── backend/                   # Express + Socket.IO API
│   └── src/
│       ├── config/            # DB, env, constants
│       ├── controllers/       # Auth, game, room controllers
│       ├── middleware/        # Auth guard, error handler
│       ├── models/            # User, Game, Room DB models
│       ├── routes/            # REST API routes
│       ├── services/          # Game logic, matchmaking
│       └── socket/            # Socket.IO event handlers
│
├── shared/                    # Shared TypeScript types
│   └── types/
│
├── docker-compose.yml
├── package.json               # Monorepo root (npm workspaces)
└── .gitignore
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for DB)

### Install & Run

```bash
# Install all workspace dependencies
npm install

# Start PostgreSQL via Docker
docker-compose up db -d

# Run frontend + backend in parallel
npm run dev
```

Frontend → http://localhost:3000  
Backend API → http://localhost:4000

### Production

```bash
docker-compose up --build
```

---

## License

MIT
