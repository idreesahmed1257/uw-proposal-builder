const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    // Useful once RAG is wired in: which portfolio projects/chunks were
    // retrieved and used to ground this specific assistant response.
    sources: [
      {
        portfolioProject: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'PortfolioProject',
        },
        chunkId: String, // whatever id the teammate's chunking pipeline uses
        score: Number, // similarity score, optional
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
