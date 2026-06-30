const mongoose = require('mongoose')

const roomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    document: {
      type: String,
      default: '',
    },
    host: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    participants: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.models.Room || mongoose.model('Room', roomSchema)
