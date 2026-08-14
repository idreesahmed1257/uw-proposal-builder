const mongoose = require('mongoose');
const pastProposalSchema = new mongoose.Schema(
  {
    docId: {
      type: String, // e.g. "Proposal 12" 
      required: true,
      trim: true,
      unique: true,
    },
    jobBrief: {
      type: String,
      required: true,
    },
    ourResponse: {
      type: String,
      required: true,
    },
    platform: {
      type: String, // "upwork","fiverr"
      default: 'upwork',
    },
    embeddingStatus: {
      type: String,
      enum: ['pending', 'embedded', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PastProposal', pastProposalSchema);
