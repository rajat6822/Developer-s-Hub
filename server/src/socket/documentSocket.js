const Room = require("../models/Room");
const { applyAndPersistDelta, getRoomDocument } = require("../services/documentService");
const participants = require("../store/participantStore");
const reconnectStore = require("../store/reconnectStore");
const typingTimers = require("../store/typingStore");
const { addParticipant, removeParticipant, getParticipantList, } = require("../utils/participantHelper");
const { getRoomMember, isRoomMember, isValidDelta, } = require("../utils/socketValidation");



function buildIncomingDelta(payload) {
  return {
    position: payload.position,
    insertedText: payload.insertedText,
    deletedLength: payload.deletedLength,
    timestamp: payload.timestamp || Date.now(),
  };
}

function clearTypingTimer(roomId, username) {
  const key = `${roomId}-${username}`;
  clearTimeout(typingTimers[key]);
  delete typingTimers[key];
}

function isHostUser(room, username) {
  return Boolean(room?.host?.username && username && room.host.username === username);
}

async function getRoomState(roomId) {
  return Room.findOne({ roomCode: roomId }).select("roomCode host closedAt").lean();
}

async function isRoomClosed(roomId) {
  const room = await Room.findOne({ roomCode: roomId }).select("closedAt").lean();
  return Boolean(room?.closedAt);
}

function clearRoomMemory(roomId) {
  delete participants[roomId];

  Object.keys(reconnectStore).forEach((socketId) => {
    if (reconnectStore[socketId]?.roomId === roomId) {
      delete reconnectStore[socketId];
    }
  });

  Object.keys(typingTimers).forEach((key) => {
    if (key.startsWith(`${roomId}-`)) {
      clearTimeout(typingTimers[key]);
      delete typingTimers[key];
    }
  });
}

function removeSocketFromRoom(io, socket, roomId, username) {
  if (!roomId || !username) return;

  clearTypingTimer(roomId, username);
  socket.to(roomId).emit("stopTyping", { username });
  removeParticipant(roomId, socket.id);
  io.to(roomId).emit(
    "participant-list",
    getParticipantList(roomId)
  );
  socket.leave(roomId);
}

async function acknowledgeWithSnapshot(roomId, reason, acknowledge) {
  const roomDocument = roomId ? await getRoomDocument(roomId) : null;

  acknowledge?.({
    ok: false,
    reason,
    document: roomDocument?.document,
    documentVersion: roomDocument?.documentVersion,
  });
}

// Document-only socket events. Room creation and participants are handled elsewhere.
function registerDocumentSocket(io) {
  io.on("connection", (socket) => {

    socket.on("join-document", async ({ roomId, username } = {}, acknowledge) => {
      try {
        if (!roomId || !username) {
          acknowledge?.({
            ok: false,
            reason: "roomId and username are required.",
          });
          return;
        }

        const roomDocument = await getRoomDocument(roomId);
        const roomState = await getRoomState(roomId);

        if (!roomDocument || !roomState) {
          acknowledge?.({
            ok: false,
            reason: "Room not found.",
          });
          return;
        }

        if (roomState.closedAt) {
          acknowledge?.({
            ok: false,
            reason: "Room is closed.",
          });
          return;
        }

        const previousSession = reconnectStore[socket.id];
        if (previousSession && previousSession.roomId !== roomId) {
          removeSocketFromRoom(io, socket, previousSession.roomId, previousSession.username);
        }

        socket.join(roomId);

        reconnectStore[socket.id] = {
          roomId,
          username,
        };

        addParticipant(roomId, socket.id, username);

        io.to(roomId).emit(
          "participant-list",
          getParticipantList(roomId)
        );

        acknowledge?.({
          ok: true,
          roomId,
          document: roomDocument.document,
          documentVersion: roomDocument.documentVersion,
          hostUsername: roomState.host?.username || null,
          isHost: isHostUser(roomState, username),
        });
      } catch (error) {
        acknowledge?.({
          ok: false,
          reason: "Unable to join room.",
        });
      }

    });
    socket.on("send-delta", async (payload = {}, acknowledge) => {
      try {
        const { roomId } = payload;

        if (!roomId) {
          acknowledge?.({
            ok: false,
            reason: "roomId is required.",
          });
          return;
        }

        if (!isRoomMember(roomId, socket.id)) {
          await acknowledgeWithSnapshot(roomId, "User is not inside this room.", acknowledge);
          return;
        }

        if (await isRoomClosed(roomId)) {
          await acknowledgeWithSnapshot(roomId, "Room is closed.", acknowledge);
          return;
        }

        const delta = buildIncomingDelta(payload);

        if (!isValidDelta(delta)) {
          await acknowledgeWithSnapshot(roomId, "Invalid delta.", acknowledge);
          return;
        }

        const result = await applyAndPersistDelta({
          roomId,
          delta,
          socketId: socket.id,
        });

        if (!result.ok) {
          acknowledge?.({
            ok: false,
            reason: result.reason,
            document: result.document,
            documentVersion: result.updatedDocumentVersion,
          });
          return;
        }

        const outgoingDelta = {
          position: result.delta.position,
          insertedText: result.delta.insertedText,
          deletedLength: result.delta.deletedLength,
          updatedDocumentVersion: result.updatedDocumentVersion,
        };

        socket.to(roomId).emit("receive-delta", outgoingDelta);

        acknowledge?.({
          ok: true,
          updatedDocumentVersion: result.updatedDocumentVersion,
        });
      } catch (error) {
        acknowledge?.({
          ok: false,
          reason: "Unable to save delta.",
        });
      }
    });

    socket.on("typing", ({ roomId, username } = {}) => {

      if (!roomId || !username) return;
      if (!isRoomMember(roomId, socket.id)) return;

      socket.to(roomId).emit("typing", {
        username,
      });

      const key = `${roomId}-${username}`;

      clearTimeout(typingTimers[key]);

      typingTimers[key] = setTimeout(() => {

        socket.to(roomId).emit("stopTyping", {
          username,
        });

        delete typingTimers[key];

      }, 2000);

    });

    socket.on("stopTyping", ({ roomId, username } = {}) => {

      if (!roomId || !username) return;
      if (!isRoomMember(roomId, socket.id)) return;

      clearTypingTimer(roomId, username);

      socket.to(roomId).emit("stopTyping", {
        username,
      });

    });

    socket.on("leave-room", ({ roomId } = {}, acknowledge) => {

      const reconnect = reconnectStore[socket.id];
      const activeRoomId = roomId || reconnect?.roomId;

      if (!reconnect || reconnect.roomId !== activeRoomId) {
        acknowledge?.({
          ok: false,
          reason: "No active room session.",
        });
        return;
      }

      removeSocketFromRoom(io, socket, reconnect.roomId, reconnect.username);
      delete reconnectStore[socket.id];

      acknowledge?.({
        ok: true,
      });

    });

    socket.on("disconnect", () => {

      const reconnect = reconnectStore[socket.id];

      if (!reconnect) return;

      const { roomId, username } = reconnect;

      removeSocketFromRoom(io, socket, roomId, username);

      delete reconnectStore[socket.id];

    });

    socket.on("close-room", async ({ roomId } = {}, acknowledge) => {
      try {
        if (!roomId) {
          acknowledge?.({
            ok: false,
            reason: "roomId is required.",
          });
          return;
        }

        const member = getRoomMember(roomId, socket.id);

        if (!member) {
          acknowledge?.({
            ok: false,
            reason: "User is not inside this room.",
          });
          return;
        }

        const room = await Room.findOne({ roomCode: roomId }).select("host closedAt");

        if (!room) {
          acknowledge?.({
            ok: false,
            reason: "Room not found.",
          });
          return;
        }

        if (!isHostUser(room, member.username)) {
          acknowledge?.({
            ok: false,
            reason: "Only the room host can close this room.",
          });
          return;
        }

        if (!room.closedAt) {
          room.closedAt = new Date();
          await room.save();
        }

        io.to(roomId).emit("room-closed", {
          roomId,
          reason: "The host closed this room.",
        });
        io.to(roomId).emit("participant-list", []);
        clearRoomMemory(roomId);
        io.in(roomId).socketsLeave(roomId);

        acknowledge?.({
          ok: true,
        });
      } catch (error) {
        acknowledge?.({
          ok: false,
          reason: "Unable to close room.",
        });
      }
    });

    socket.on("kick-user", async ({ roomId, socketId } = {}, acknowledge) => {
      try {
        if (!roomId || !socketId) {
          acknowledge?.({
            ok: false,
            reason: "roomId and socketId are required.",
          });
          return;
        }

        const member = getRoomMember(roomId, socket.id);
        const room = await getRoomState(roomId);

        if (!member || !room) {
          acknowledge?.({
            ok: false,
            reason: "User is not inside this room.",
          });
          return;
        }

        if (!isHostUser(room, member.username)) {
          acknowledge?.({
            ok: false,
            reason: "Only the room host can remove participants.",
          });
          return;
        }

        io.to(socketId).emit("kicked");

        acknowledge?.({
          ok: true,
        });
      } catch (error) {
        acknowledge?.({
          ok: false,
          reason: "Unable to remove participant.",
        });
      }
    });
  });
}

module.exports = registerDocumentSocket;
