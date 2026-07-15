const mongoose = require('mongoose');

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
