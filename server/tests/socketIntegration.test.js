const assert = require('node:assert/strict')
const http = require('node:http')
const test = require('node:test')
const { Server } = require('socket.io')
const { io: createClient } = require('../../client/node_modules/socket.io-client')
const Room = require('../src/models/Room')
const registerDocumentSocket = require('../src/socket/documentSocket')
const { clearDocumentServiceMemory } = require('../src/services/documentService')
const participants = require('../src/store/participantStore')
const reconnectStore = require('../src/store/reconnectStore')
const typingTimers = require('../src/store/typingStore')

function createRoomStore(initialDocument = '') {
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
      const query = {
        select() {
          return query
        },
        lean() {
          return Promise.resolve({
            document: room.document,
            updatedAt: room.updatedAt,
          })
        },
        then(resolve, reject) {
          return Promise.resolve(room).then(resolve, reject)
        },
      }

      return query
    },
  }
}

function clearObject(object) {
  Object.keys(object).forEach((key) => {
    delete object[key]
  })
}

function once(socket, event) {
  return new Promise((resolve) => {
    socket.once(event, resolve)
  })
}

function emitWithAck(socket, event, payload) {
  return new Promise((resolve) => {
    socket.emit(event, payload, resolve)
  })
}

async function startSocketServer(roomStore) {
  const originalFindOne = Room.findOne
  Room.findOne = roomStore.findOne

  const httpServer = http.createServer()
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  })

  registerDocumentSocket(io)

  await new Promise((resolve) => {
    httpServer.listen(0, resolve)
  })

  const port = httpServer.address().port
  const url = `http://localhost:${port}`
  const clients = []

  function connectClient() {
    const client = createClient(url, {
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    })
    clients.push(client)
    return client
  }

  async function cleanup() {
    clients.forEach((client) => {
      client.disconnect()
    })
    await io.close()
    await new Promise((resolve) => {
      httpServer.close(resolve)
    })
    Room.findOne = originalFindOne
    clearDocumentServiceMemory()
    clearObject(participants)
    clearObject(reconnectStore)
    clearObject(typingTimers)
  }

  return {
    cleanup,
    connectClient,
  }
}

test('socket integration syncs deltas between two users', async () => {
  const roomStore = createRoomStore('')
  const server = await startSocketServer(roomStore)

  try {
    const alice = server.connectClient()
    const bob = server.connectClient()
    await Promise.all([once(alice, 'connect'), once(bob, 'connect')])

    assert.equal((await emitWithAck(alice, 'join-document', { roomId: 'ROOM1', username: 'Alice' })).ok, true)
    assert.equal((await emitWithAck(bob, 'join-document', { roomId: 'ROOM1', username: 'Bob' })).ok, true)

    const receivedByBob = once(bob, 'receive-delta')
    const ack = await emitWithAck(alice, 'send-delta', {
      roomId: 'ROOM1',
      position: 0,
      insertedText: 'Hi',
      deletedLength: 0,
      timestamp: 1,
    })

    assert.equal(ack.ok, true)
    assert.deepEqual(await receivedByBob, {
      position: 0,
      insertedText: 'Hi',
      deletedLength: 0,
      updatedDocumentVersion: ack.updatedDocumentVersion,
    })
    assert.equal(roomStore.room.document, 'Hi')
  } finally {
    await server.cleanup()
  }
})

test('socket integration returns a server snapshot when a delta is rejected', async () => {
  const roomStore = createRoomStore('Hi')
  const server = await startSocketServer(roomStore)

  try {
    const alice = server.connectClient()
    await once(alice, 'connect')
    assert.equal((await emitWithAck(alice, 'join-document', { roomId: 'ROOM1', username: 'Alice' })).ok, true)

    const ack = await emitWithAck(alice, 'send-delta', {
      roomId: 'ROOM1',
      position: 99,
      insertedText: '!',
      deletedLength: 0,
      timestamp: 1,
    })

    assert.equal(ack.ok, false)
    assert.equal(ack.document, 'Hi')
    assert.equal(typeof ack.documentVersion, 'number')
    assert.equal(roomStore.room.document, 'Hi')
  } finally {
    await server.cleanup()
  }
})

test('socket integration restores the latest snapshot after reconnect rejoin', async () => {
  const roomStore = createRoomStore('one')
  const server = await startSocketServer(roomStore)

  try {
    const firstSocket = server.connectClient()
    await once(firstSocket, 'connect')
    const firstJoin = await emitWithAck(firstSocket, 'join-document', { roomId: 'ROOM1', username: 'Alice' })
    assert.equal(firstJoin.document, 'one')

    await emitWithAck(firstSocket, 'send-delta', {
      roomId: 'ROOM1',
      position: 3,
      insertedText: ' two',
      deletedLength: 0,
      timestamp: 1,
    })
    firstSocket.disconnect()

    const reconnectedSocket = server.connectClient()
    await once(reconnectedSocket, 'connect')
    const rejoin = await emitWithAck(reconnectedSocket, 'join-document', { roomId: 'ROOM1', username: 'Alice' })

    assert.equal(rejoin.ok, true)
    assert.equal(rejoin.document, 'one two')
  } finally {
    await server.cleanup()
  }
})

test('socket integration adjusts stale conflicting edit positions', async () => {
  const roomStore = createRoomStore('abcd')
  const server = await startSocketServer(roomStore)

  try {
    const alice = server.connectClient()
    const bob = server.connectClient()
    await Promise.all([once(alice, 'connect'), once(bob, 'connect')])
    await emitWithAck(alice, 'join-document', { roomId: 'ROOM1', username: 'Alice' })
    await emitWithAck(bob, 'join-document', { roomId: 'ROOM1', username: 'Bob' })

    const firstAck = await emitWithAck(alice, 'send-delta', {
      roomId: 'ROOM1',
      position: 1,
      insertedText: '',
      deletedLength: 2,
      timestamp: 200,
    })
    const secondAck = await emitWithAck(bob, 'send-delta', {
      roomId: 'ROOM1',
      position: 3,
      insertedText: 'X',
      deletedLength: 0,
      timestamp: 100,
    })

    assert.equal(firstAck.ok, true)
    assert.equal(secondAck.ok, true)
    assert.equal(roomStore.room.document, 'aXd')
  } finally {
    await server.cleanup()
  }
})

test('socket integration removes participants on leave-room and rejects later edits', async () => {
  const roomStore = createRoomStore('')
  const server = await startSocketServer(roomStore)

  try {
    const alice = server.connectClient()
    const bob = server.connectClient()
    await Promise.all([once(alice, 'connect'), once(bob, 'connect')])
    await emitWithAck(alice, 'join-document', { roomId: 'ROOM1', username: 'Alice' })
    await emitWithAck(bob, 'join-document', { roomId: 'ROOM1', username: 'Bob' })

    const participantUpdate = once(bob, 'participant-list')
    const leaveAck = await emitWithAck(alice, 'leave-room', { roomId: 'ROOM1' })

    assert.equal(leaveAck.ok, true)
    assert.deepEqual(await participantUpdate, [{ username: 'Bob' }])

    const rejectedEdit = await emitWithAck(alice, 'send-delta', {
      roomId: 'ROOM1',
      position: 0,
      insertedText: 'x',
      deletedLength: 0,
      timestamp: 1,
    })

    assert.equal(rejectedEdit.ok, false)
    assert.equal(rejectedEdit.reason, 'User is not inside this room.')
  } finally {
    await server.cleanup()
  }
})
