import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

import authRoutes        from "./routes/auth";
import gameRoutes        from "./routes/game";
import leaderboardRoutes from "./routes/leaderboard";
import { registerSocketHandlers } from "./socket/handlers";
import { errorHandler } from "./middleware/errorHandler";

const app    = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:3000")
  .split(",").map(o => o.trim());

const corsOptions = {
  origin: (origin: string | undefined, cb: (e: Error | null, ok?: boolean) => void) =>
    (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error("CORS: " + origin)),
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (_req, res) => res.json({ name: "damas.com API", version: "1.0.0" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth",        authRoutes);
app.use("/api",             gameRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

app.use(errorHandler);

registerSocketHandlers(io);

const PORT = Number(process.env.PORT ?? 4000);
server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
