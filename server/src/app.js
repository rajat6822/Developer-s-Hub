const express = require("express");
const cors = require("cors");
const Room = require("./models/Room");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

function createRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function createUniqueRoomCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomCode = createRoomCode();
    const existingRoom = await Room.exists({ roomCode });

    if (!existingRoom) {
      return roomCode;
    }
  }

  throw new Error("Unable to generate a unique room code.");
}

app.post("/create-room", async (req, res) => {
  const username = req.body?.username?.trim();

  if (!username) {
    return res.status(400).json({
      ok: false,
      reason: "Username is required.",
    });
  }

  try {
    const roomCode = await createUniqueRoomCode();

    await Room.create({
      roomCode,
      document: "",
      host: { username },
      participants: [{ username }],
    });

    return res.status(201).json({
      ok: true,
      roomCode,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      reason: "Unable to create room.",
    });
  }
});

app.post("/join-room", async (req, res) => {
  const username = req.body?.username?.trim();
  const roomCode = (req.body?.roomCode || req.body?.roomId || "").trim().toUpperCase();

  if (!username) {
    return res.status(400).json({
      ok: false,
      reason: "Username is required.",
    });
  }

  if (!roomCode) {
    return res.status(400).json({
      ok: false,
      reason: "Room code is required.",
    });
  }

  try {
    const room = await Room.findOne({ roomCode }).select("roomCode");

    if (!room) {
      return res.status(404).json({
        ok: false,
        reason: "Room not found.",
      });
    }

    return res.json({
      ok: true,
      roomCode: room.roomCode,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      reason: "Unable to join room.",
    });
  }
});

module.exports = app;
