// backend/scripts/reseedPastProposals.js
//
// Run with: node scripts/reseedPastProposals.js
//
// Loads the curated tone-example proposals (data/proposals-top6-clean.jsonl)
// into the PastProposal MongoDB collection, wipes the matching Pinecone
// namespace, and re-ingests the fresh MongoDB documents.

require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Pinecone } = require('@pinecone-database/pinecone');
const connectDB = require('../config/db');
const PastProposal = require('../models/PastProposal');
const { syncProposalToPinecone } = require('../services/toneExampleService');

const DATA_FILE = path.join(__dirname, '..', 'data', 'proposals-top6-clean.jsonl');
const PINECONE_INDEX = process.env.PINECONE_INDEX;
const NAMESPACE = 'tone-examples';

async function runSeedAndSync() {
  await connectDB();

  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);

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
    await PastProposal.deleteMany({});
    const created = await PastProposal.insertMany(docs);
    console.log(`Seeded ${created.length} past proposal(s).`);

    console.log(`Wiping Pinecone namespace "${NAMESPACE}"...`);
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index(PINECONE_INDEX);
    await index.namespace(NAMESPACE).deleteAll();
    console.log('Namespace wiped.\n');

    console.log(`Re-ingesting ${created.length} proposal(s)...\n`);
    for (const proposal of created) {
      try {
        await syncProposalToPinecone(proposal);
        console.log(`✔ ${proposal.docId}`);
      } catch (err) {
        proposal.embeddingStatus = 'failed';
        await proposal.save();
        console.error(`✘ ${proposal.docId}: ${err.message}`);
      }
    }

    console.log('\nDone — MongoDB and Pinecone are in sync.');
  } catch (err) {
    console.error('Reseed failed:', err.message);
  } finally {
    await mongoose.connection.close();
  }
}

runSeedAndSync();