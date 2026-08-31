import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);
});

server.listen(4000, () => console.log("Backend running on port 4000"));
