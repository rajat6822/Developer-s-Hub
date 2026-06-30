const { applyAndPersistDelta, getRoomDocument } = require('../services/documentService')

function buildIncomingDelta(payload) {
  return {
    position: payload.position,
    insertedText: payload.insertedText,
    deletedLength: payload.deletedLength,
    timestamp: payload.timestamp || Date.now(),
  }
}

// Document-only socket events. Room creation and participants are handled elsewhere.
function registerDocumentSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join-document', async ({ roomId } = {}, acknowledge) => {
      if (!roomId) {
        acknowledge?.({ ok: false, reason: 'roomId is required.' })
        return
      }

      socket.join(roomId)
      const roomDocument = await getRoomDocument(roomId)

      if (!roomDocument) {
        acknowledge?.({ ok: false, reason: 'Room not found.' })
        return
      }

      acknowledge?.({
        ok: true,
        roomId,
        document: roomDocument.document,
        documentVersion: roomDocument.documentVersion,
      })
    })

    socket.on('send-delta', async (payload = {}, acknowledge) => {
      const { roomId } = payload

      if (!roomId) {
        acknowledge?.({ ok: false, reason: 'roomId is required.' })
        return
      }

      const result = await applyAndPersistDelta({
        roomId,
        delta: buildIncomingDelta(payload),
        socketId: socket.id,
      })

      if (!result.ok) {
        acknowledge?.({ ok: false, reason: result.reason })
        return
      }

      const outgoingDelta = {
        position: result.delta.position,
        insertedText: result.delta.insertedText,
        deletedLength: result.delta.deletedLength,
        updatedDocumentVersion: result.updatedDocumentVersion,
      }

      socket.to(roomId).emit('receive-delta', outgoingDelta)
      acknowledge?.({ ok: true, updatedDocumentVersion: result.updatedDocumentVersion })
    })
  })
}

module.exports = registerDocumentSocket
