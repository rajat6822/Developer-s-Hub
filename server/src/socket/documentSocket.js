const { applyAndPersistDelta, getRoomDocument } = require("../services/documentService");
const participants = require("../store/participantStore");

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

// Document-only socket events. Room creation and participants are handled elsewhere.
function registerDocumentSocket(io) {
  io.on("connection", (socket) => {

    socket.on("join-document", async ({ roomId, username } = {}, acknowledge) => {

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

    });
    socket.on("send-delta", async (payload = {}, acknowledge) => {

      const { roomId } = payload;

      if (!roomId) {
        acknowledge?.({
          ok: false,
          reason: "roomId is required.",
        });
        return;
      }

      // NEW: Membership Validation
      if (!isRoomMember(roomId, socket.id)) {
        acknowledge?.({
          ok: false,
          reason: "User is not inside this room.",
        });
        return;
      }

      // NEW: Delta Validation
      const delta = buildIncomingDelta(payload);

      if (!isValidDelta(delta)) {
        acknowledge?.({
          ok: false,
          reason: "Invalid delta.",
        });
        return;
      }

      const result = await applyAndPersistDelta({
        roomId,
        delta: buildIncomingDelta(payload),
        socketId: socket.id,
      });

      if (!result.ok) {
        acknowledge?.({
          ok: false,
          reason: result.reason,
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
    });

    socket.on("typing", ({ roomId, username } = {}) => {

      if (!roomId || !username) return;

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

      const key = `${roomId}-${username}`;

      clearTimeout(typingTimers[key]);

      delete typingTimers[key];

      socket.to(roomId).emit("stopTyping", {
        username,
      });

    });

    socket.on("disconnect", () => {

      const reconnect = reconnectStore[socket.id];

      if (!reconnect) return;

      const { roomId, username } = reconnect;

      socket.to(roomId).emit("stopTyping", {
        username,
      });

      removeParticipant(roomId, socket.id);

      io.to(roomId).emit(
        "participant-list",
        getParticipantList(roomId)
      );

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