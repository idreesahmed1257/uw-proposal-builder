// backend/seed/seedPastProposals.js
//
// Run with: node seed/seedPastProposals.js
//
// Loads the curated tone-example proposals (job_brief -> our_response pairs)
// into the PastProposal MongoDB collection. Does NOT touch Pinecone —
// run scripts/ingestPastProposals.js afterwards to embed them, or use
// scripts/reseedPastProposals.js to do both in one pass.

require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const PastProposal = require('../models/PastProposal');

const DATA_FILE = path.join(__dirname, '..', 'data', 'proposals-top6-clean.jsonl');

async function runSeed() {
  await connectDB();

  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

  const docs = lines.map((line) => {
    const parsed = JSON.parse(line);
    return {
      docId: parsed.doc_id,
      jobBrief: parsed.job_brief,
      ourResponse: parsed.our_response,
      platform: 'upwork',
    };
  });

  try {
    await PastProposal.deleteMany({}); // wipe before reseeding
    const created = await PastProposal.insertMany(docs);
    console.log(`Seeded ${created.length} past proposal(s).`);
  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    await mongoose.connection.close();
  }
}

runSeed();
