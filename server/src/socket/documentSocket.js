const { applyAndPersistDelta, getRoomDocument } = require("../services/documentService");
const reconnectStore = require("../store/reconnectStore");
const typingTimers = require("../store/typingStore");
const { addParticipant, removeParticipant, getParticipantList, } = require("../utils/participantHelper");
const { isRoomMember, isValidDelta, } = require("../utils/socketValidation");



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

        if (!roomDocument) {
          acknowledge?.({
            ok: false,
            reason: "Room not found.",
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

    socket.on("close-room", ({ roomId }) => {

      io.to(roomId).emit("room-closed");

    });

    socket.on("kick-user", ({ roomId, socketId }) => {

      io.to(socketId).emit("kicked");

    });
  });
}

module.exports = registerDocumentSocket;
