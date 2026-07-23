// backend/scripts/ingestPortfolio.js
//
// Run with: node scripts/ingestPortfolio.js
//
// Reads all PortfolioProject docs from MongoDB, chunks their text,
// and upserts them into Pinecone using INTEGRATED EMBEDDING
// (index model: llama-text-embed-v2 — Pinecone embeds server-side,
// we just send raw text in the "text" field).
//
// After a successful upsert, updates each MongoDB doc's
// embeddingStatus -> 'embedded' and chunkCount.

require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const { syncProjectToPinecone } = require('../services/pineconeService');
const connectDB = require('../config/db');
const PortfolioProject = require('../models/PortfolioProject');

async function ingestProject(project) {
  const chunksCount = await syncProjectToPinecone(project);
  console.log(`✔ ${project.title} — ${chunksCount} chunk(s) upserted`);
}

async function runIngestion() {
  await connectDB();

  const projects = await PortfolioProject.find({});
  console.log(`Found ${projects.length} portfolio project(s) to ingest.\n`);

  for (const project of projects) {
    try {
      project.embeddingStatus = 'pending';
      await ingestProject(project);
    } catch (err) {
      project.embeddingStatus = 'failed';
      await project.save();
      console.error(`✘ Failed on "${project.title}": ${err.message}`);
    }
  }

  console.log('\nIngestion complete.');
  await mongoose.connection.close();
}

runIngestion().catch((err) => {
  console.error('Ingestion script crashed:', err);
  process.exit(1);
});