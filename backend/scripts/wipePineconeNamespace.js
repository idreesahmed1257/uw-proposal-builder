// backend/scripts/wipePineconeNamespace.js
//
// Deletes ALL vectors from the 'portfolio-projects' namespace in Pinecone,
// then runs a fresh ingestion from MongoDB.
//
// Use this whenever you reseed MongoDB (seedPortfolio.js) — reseeding creates
// new document IDs, which means ingestPortfolio.js inserts NEW vectors while
// the old ones (with old IDs) remain in Pinecone as orphans. This script
// clears those orphans before re-ingesting.
//
// Run with: node scripts/wipePineconeNamespace.js

require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const { Pinecone } = require('@pinecone-database/pinecone');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const PortfolioProject = require('../models/PortfolioProject');
const { syncProjectToPinecone } = require('../services/pineconeService');

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const NAMESPACE = 'portfolio-projects';

async function run() {
  console.log('Connecting to MongoDB...');
  await connectDB();

  console.log(`Wiping Pinecone namespace "${NAMESPACE}"...`);
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index(PINECONE_INDEX);
  await index.namespace(NAMESPACE).deleteAll();
  console.log('Namespace wiped.\n');

  const projects = await PortfolioProject.find({});
  console.log(`Re-ingesting ${projects.length} project(s)...\n`);

  for (const project of projects) {
    try {
      await syncProjectToPinecone(project);
      console.log(`✔ ${project.title}`);
    } catch (err) {
      console.error(`✘ ${project.title}: ${err.message}`);
    }
  }

  console.log('\nDone — Pinecone is now in sync with MongoDB.');
  await mongoose.connection.close();
}

run().catch((err) => {
  console.error('Script crashed:', err);
  process.exit(1);
});