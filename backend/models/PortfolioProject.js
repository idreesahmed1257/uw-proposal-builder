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
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    skillsAndDeliverables: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    industry: {
      type: String,
      default: '',
    },
    url: {
      type: String,
      default: '',
      trim: true,
    },

    embeddingStatus: {
      type: String,
      enum: ['pending', 'embedded', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PortfolioProject', portfolioProjectSchema);
