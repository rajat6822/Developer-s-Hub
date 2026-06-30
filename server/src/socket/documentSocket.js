const { applyAndPersistDelta, getRoomDocument } = require("../services/documentService");
const participants = require("../store/participantStore");

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

      // Validation
      if (!roomId || !username) {
        acknowledge?.({
          ok: false,
          reason: "roomId and username are required.",
        });
        return;
      }

      // Check room exists BEFORE joining
      const roomDocument = await getRoomDocument(roomId);

      if (!roomDocument) {
        acknowledge?.({
          ok: false,
          reason: "Room not found.",
        });
        return;
      }

      socket.join(roomId);

      // Initialize participant list
      if (!participants[roomId]) {
        participants[roomId] = [];
      }

      // Prevent duplicate entries
      const alreadyExists = participants[roomId].some(
        (user) => user.socketId === socket.id
      );

      if (!alreadyExists) {
        participants[roomId].push({
          socketId: socket.id,
          username,
        });
      }

      // Broadcast participant list
      io.to(roomId).emit(
        "participant-list",
        participants[roomId].map((user) => ({
          username: user.username,
        }))
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

    });

    socket.on("stopTyping", ({ roomId, username } = {}) => {

      if (!roomId || !username) return;

      socket.to(roomId).emit("stopTyping", {
        username,
      });

    });

    socket.on("disconnect", () => {

      for (const roomId in participants) {

        const index = participants[roomId].findIndex(
          (user) => user.socketId === socket.id
        );

        if (index !== -1) {

          const disconnectedUser = participants[roomId][index];

          socket.to(roomId).emit("stopTyping", {
            username: disconnectedUser.username,
          });

          participants[roomId].splice(index, 1);

          io.to(roomId).emit(
            "participant-list",
            participants[roomId].map((user) => ({
              username: user.username,
            }))
          );

          if (participants[roomId].length === 0) {
            delete participants[roomId];
          }

          break;
        }
      }
    });

  });
}

module.exports = registerDocumentSocket;