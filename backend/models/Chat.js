const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'New Chat', // rename once first message / generated summary comes in
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Optional: store the original client brief text here if this chat
    // is a "generate proposal" chat, so it's easy to re-reference.
    clientBrief: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Chat', chatSchema);
