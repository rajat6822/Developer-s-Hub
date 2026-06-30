const http = require('http')
const mongoose = require('mongoose')
const { Server } = require('socket.io')
const app = require('./src/app')
const registerDocumentSocket = require('./src/socket/documentSocket')
require('dotenv').config()

const port = process.env.PORT || 5000
const mongoUri = process.env.MONGODB_URI
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})

registerDocumentSocket(io)

async function startServer() {
  if (mongoUri) {
    await mongoose.connect(mongoUri)
    console.log('MongoDB connected')
  } else {
    console.warn('MONGODB_URI is not set. Document persistence will fail until it is configured.')
  }

  server.listen(port, () => {
    console.log(`Server is running on port ${port}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start server', error)
  process.exit(1)
})
