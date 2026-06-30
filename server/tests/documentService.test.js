const assert = require('node:assert/strict')
const test = require('node:test')
const { applyAndPersistDelta, clearDocumentServiceMemory } = require('../src/services/documentService')

function createRoomModel(initialDocument = '') {
  const room = {
    document: initialDocument,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    async save() {
      this.updatedAt = new Date(this.updatedAt.getTime() + 1000)
      return this
    },
  }

  return {
    room,
    findOne() {
      return {
        select() {
          return Promise.resolve(room)
        },
      }
    },
  }
}

test('applyAndPersistDelta updates only the document value', async () => {
  clearDocumentServiceMemory()
  const roomModel = createRoomModel('Hello')

  const result = await applyAndPersistDelta({
    roomId: 'ROOM1',
    socketId: 'socket-1',
    roomModel,
    delta: { position: 5, insertedText: '!', deletedLength: 0, timestamp: 1 },
  })

  assert.equal(result.ok, true)
  assert.equal(roomModel.room.document, 'Hello!')
})

test('applyAndPersistDelta ignores duplicate deltas from the same socket', async () => {
  clearDocumentServiceMemory()
  const roomModel = createRoomModel('Hi')
  const delta = { position: 2, insertedText: '!', deletedLength: 0, timestamp: 10 }

  const first = await applyAndPersistDelta({ roomId: 'ROOM2', socketId: 'socket-1', roomModel, delta })
  const duplicate = await applyAndPersistDelta({ roomId: 'ROOM2', socketId: 'socket-1', roomModel, delta })

  assert.equal(first.ok, true)
  assert.equal(duplicate.ok, false)
  assert.equal(roomModel.room.document, 'Hi!')
})

test('applyAndPersistDelta rejects invalid deltas without changing persisted text', async () => {
  clearDocumentServiceMemory()
  const roomModel = createRoomModel('Hi')

  const result = await applyAndPersistDelta({
    roomId: 'ROOM3',
    socketId: 'socket-1',
    roomModel,
    delta: { position: 99, insertedText: '!', deletedLength: 0, timestamp: 1 },
  })

  assert.equal(result.ok, false)
  assert.equal(roomModel.room.document, 'Hi')
})
