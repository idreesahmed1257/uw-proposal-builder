const mongoose = require('mongoose');

// Curated past proposals (job_brief -> our_response pairs) used ONLY as
// style/tone reference for generation — never as factual project data.
// These live in the 'tone-examples' Pinecone namespace, kept separate from
// PortfolioProject's 'portfolio-projects' namespace.
const pastProposalSchema = new mongoose.Schema(
  {
    docId: {
      type: String, // e.g. "Proposal 12" — original reference label
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
      type: String, // "upwork" | "fiverr"
      default: 'upwork',
    },

    // --- Same sync-tracking pattern as PortfolioProject ---
    embeddingStatus: {
      type: String,
      enum: ['pending', 'embedded', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PastProposal', pastProposalSchema);
