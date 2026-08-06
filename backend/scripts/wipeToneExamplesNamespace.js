// backend/scripts/wipeToneExamplesNamespace.js
//
// Deletes ALL vectors from the 'tone-examples' namespace in Pinecone,
// then runs a fresh ingestion from MongoDB.
//
// Use this whenever you reseed MongoDB (seedPastProposals.js) — reseeding
// creates new document IDs, which means ingestPastProposals.js inserts NEW
// vectors while the old ones (with old IDs) remain in Pinecone as orphans.
// This script clears those orphans before re-ingesting.
//
// Run with: node scripts/wipeToneExamplesNamespace.js

require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const { Pinecone } = require('@pinecone-database/pinecone');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const PastProposal = require('../models/PastProposal');
const { syncProposalToPinecone } = require('../services/toneExampleService');

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const NAMESPACE = 'tone-examples';

async function run() {
  console.log('Connecting to MongoDB...');
  await connectDB();

  console.log(`Wiping Pinecone namespace "${NAMESPACE}"...`);
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index(PINECONE_INDEX);
  await index.namespace(NAMESPACE).deleteAll();
  console.log('Namespace wiped.\n');

  const proposals = await PastProposal.find({});
  console.log(`Re-ingesting ${proposals.length} proposal(s)...\n`);

  for (const proposal of proposals) {
    try {
      await syncProposalToPinecone(proposal);
      console.log(`✔ ${proposal.docId}`);
    } catch (err) {
      proposal.embeddingStatus = 'failed';
      await proposal.save();
      console.error(`✘ ${proposal.docId}: ${err.message}`);
    }
  }

  console.log('\nDone — Pinecone is now in sync with MongoDB.');
  await mongoose.connection.close();
}

run().catch((err) => {
  console.error('Script crashed:', err);
  process.exit(1);
});