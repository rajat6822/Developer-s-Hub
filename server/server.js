const http = require('http')
const path = require('path')
const mongoose = require('mongoose')
const { Server } = require('socket.io')
const app = require('./src/app')
const registerDocumentSocket = require('./src/socket/documentSocket')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const port = process.env.PORT || 5000
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})

registerDocumentSocket(io)

async function startServer() {
  if (!mongoUri) {
    console.warn('MONGODB_URI is not set. Document persistence will fail until it is configured.')
  } else {
    try {
      await mongoose.connect(mongoUri)
      console.log('MongoDB connected')
    } catch (error) {
      console.error('Failed to connect to MongoDB. Check MONGODB_URI and Atlas network access.', error.message)
      throw error
    }
  }

  server.listen(port, () => {
    console.log(`Server is running on port ${port}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start server', error)
  process.exit(1)
})
