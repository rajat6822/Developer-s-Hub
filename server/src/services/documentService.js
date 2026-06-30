const crypto = require('crypto')
const Room = require('../models/Room')
const { adjustDeltaPosition, applyDelta, validateDelta } = require('./deltaService')

const recentDeltasByRoom = new Map()
const processedDeltaIdsByRoom = new Map()
const MAX_RECENT_DELTAS = 50
const MAX_PROCESSED_IDS = 200

function getRecentDeltas(roomId) {
  return recentDeltasByRoom.get(roomId) || []
}

function rememberRecentDelta(roomId, delta) {
  const recentDeltas = [...getRecentDeltas(roomId), delta].slice(-MAX_RECENT_DELTAS)
  recentDeltasByRoom.set(roomId, recentDeltas)
}

function createDeltaFingerprint(socketId, delta) {
  return crypto
    .createHash('sha1')
    .update(
      JSON.stringify({
        socketId,
        position: delta.position,
        insertedText: delta.insertedText,
        deletedLength: delta.deletedLength,
        timestamp: delta.timestamp,
      }),
    )
    .digest('hex')
}

function hasProcessedDelta(roomId, deltaId) {
  return (processedDeltaIdsByRoom.get(roomId) || []).includes(deltaId)
}

function rememberProcessedDelta(roomId, deltaId) {
  const deltaIds = [...(processedDeltaIdsByRoom.get(roomId) || []), deltaId].slice(-MAX_PROCESSED_IDS)
  processedDeltaIdsByRoom.set(roomId, deltaIds)
}

async function getRoomDocument(roomId, roomModel = Room) {
  const room = await roomModel.findOne({ roomCode: roomId }).select('document updatedAt').lean()

  if (!room) {
    return null
  }

  return {
    document: room.document || '',
    documentVersion: room.updatedAt ? new Date(room.updatedAt).getTime() : Date.now(),
  }
}

// Persist after every accepted edit. Other room fields belong to the room feature.
async function applyAndPersistDelta({ roomId, delta, socketId, roomModel = Room }) {
  const currentRoom = await roomModel.findOne({ roomCode: roomId }).select('document updatedAt')

  if (!currentRoom) {
    return { ok: false, reason: 'Room not found.' }
  }

  const currentDocument = currentRoom.document || ''
  const currentDocumentVersion = currentRoom.updatedAt ? new Date(currentRoom.updatedAt).getTime() : Date.now()
  const deltaId = createDeltaFingerprint(socketId, delta)
  if (hasProcessedDelta(roomId, deltaId)) {
    return {
      ok: false,
      reason: 'Duplicate delta ignored.',
      document: currentDocument,
      updatedDocumentVersion: currentDocumentVersion,
    }
  }

  const recentDeltas = getRecentDeltas(roomId)
  if (recentDeltas.length === 0) {
    const initialValidation = validateDelta(delta, currentDocument.length)

    if (!initialValidation.isValid) {
      return {
        ok: false,
        reason: initialValidation.reason,
        document: currentDocument,
        updatedDocumentVersion: currentDocumentVersion,
      }
    }
  }

  const adjustedDelta = adjustDeltaPosition(delta, recentDeltas, currentDocument.length)
  const validation = validateDelta(adjustedDelta, currentDocument.length)

  if (!validation.isValid) {
    return {
      ok: false,
      reason: validation.reason,
      document: currentDocument,
      updatedDocumentVersion: currentDocumentVersion,
    }
  }

  const nextDocument = applyDelta(currentDocument, adjustedDelta)
  currentRoom.document = nextDocument
  await currentRoom.save()

  const updatedDocumentVersion = currentRoom.updatedAt ? new Date(currentRoom.updatedAt).getTime() : Date.now()
  const acceptedDelta = {
    position: adjustedDelta.position,
    insertedText: adjustedDelta.insertedText,
    deletedLength: adjustedDelta.deletedLength,
    timestamp: Number(delta.timestamp) || Date.now(),
    updatedDocumentVersion,
  }

  rememberRecentDelta(roomId, acceptedDelta)
  rememberProcessedDelta(roomId, deltaId)

  return {
    ok: true,
    delta: acceptedDelta,
    document: nextDocument,
    updatedDocumentVersion,
  }
}

function clearDocumentServiceMemory() {
  recentDeltasByRoom.clear()
  processedDeltaIdsByRoom.clear()
}

module.exports = {
  applyAndPersistDelta,
  clearDocumentServiceMemory,
  getRoomDocument,
}
