const mongoose = require('mongoose');

// This is the KNOWLEDGE BASE — DevNauts' own past projects/portfolio entries
// (e.g. "Visent"). Your RAG teammate will read from this collection, chunk
// the text fields (mainly `description` and `skillsAndDeliverables`), embed
// them, and upsert the resulting vectors into Pinecone. This document's
// _id is what they'll use as (or map to) the Pinecone vector metadata,
// so results can be traced back to the source project.
const portfolioProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 70,
    },
    role: {
      type: String, // "My Role" field
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    skillsAndDeliverables: {
      type: [String], // stored as an array, one entry per numbered point
      default: [],
    },
    // Optional metadata that'll help retrieval/filtering later
    tags: {
      type: [String], // e.g. ["SaaS", "Electron", "Biometrics", "MongoDB"]
      default: [],
    },
    industry: {
      type: String, // e.g. "Enterprise Security", "Healthcare"
      default: '',
    },

    // --- Fields for the RAG pipeline / teammate to use & update ---
    embeddingStatus: {
      type: String,
      enum: ['pending', 'chunked', 'embedded', 'failed'],
      default: 'pending',
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PortfolioProject', portfolioProjectSchema);
