// backend/scripts/ingestPastProposals.js
//
// Run with: node scripts/ingestPastProposals.js
//
// Reads all PastProposal docs from MongoDB and upserts them into Pinecone
// (namespace: 'tone-examples') using integrated embedding — one vector
// per proposal (job_brief + our_response combined).

require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const { syncProposalToPinecone } = require('../services/toneExampleService');
const connectDB = require('../config/db');
const PastProposal = require('../models/PastProposal');

async function runIngestion() {
  await connectDB();

  const proposals = await PastProposal.find({});
  console.log(`Found ${proposals.length} past proposal(s) to ingest.\n`);

  for (const proposal of proposals) {
    try {
      await syncProposalToPinecone(proposal);
      console.log(`✔ ${proposal.docId} — embedded`);
    } catch (err) {
      proposal.embeddingStatus = 'failed';
      await proposal.save();
      console.error(`✘ Failed on "${proposal.docId}": ${err.message}`);
    }
  }

  console.log('\nIngestion complete.');
  await mongoose.connection.close();
}

runIngestion().catch((err) => {
  console.error('Ingestion script crashed:', err);
  process.exit(1);
});
