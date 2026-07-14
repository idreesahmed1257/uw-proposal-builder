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
const { Pinecone } = require('@pinecone-database/pinecone');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

const connectDB = require('../config/db');
const PortfolioProject = require('../models/PortfolioProject');

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const NAMESPACE = 'portfolio-projects'; // keep portfolio data separate from other content later

if (!process.env.PINECONE_API_KEY || !PINECONE_INDEX) {
  console.error('Missing PINECONE_API_KEY or PINECONE_INDEX in .env');
  process.exit(1);
}

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// Combines the useful text fields of a project into one block for chunking.
function buildSourceText(project) {
  const skills = (project.skillsAndDeliverables || []).join('. ');
  return [
    `Title: ${project.title}`,
    `Role: ${project.role}`,
    `Description: ${project.description}`,
    skills ? `Skills and deliverables: ${skills}` : '',
    project.industry ? `Industry: ${project.industry}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function ingestProject(splitter, index, project) {
  const sourceText = buildSourceText(project);
  const chunks = await splitter.splitText(sourceText);

  // Pinecone integrated embedding: records are { id, text, ...metadata }
  const records = chunks.map((chunkText, i) => ({
    id: `${project._id}-chunk-${i}`,
    text: chunkText, // field map on the index is "text" -> this gets embedded automatically
    portfolioProjectId: String(project._id),
    title: project.title,
    industry: project.industry || '',
    tags: project.tags || [],
    chunkIndex: i,
  }));

  await index.namespace(NAMESPACE).upsertRecords({ records });

  project.embeddingStatus = 'embedded';
  project.chunkCount = chunks.length;
  await project.save();

  console.log(`✔ ${project.title} — ${chunks.length} chunk(s) upserted`);
}

async function runIngestion() {
  await connectDB();

  const index = pc.index(PINECONE_INDEX);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 75,
  });

  const projects = await PortfolioProject.find({});
  console.log(`Found ${projects.length} portfolio project(s) to ingest.\n`);

  for (const project of projects) {
    try {
      project.embeddingStatus = 'chunked';
      await ingestProject(splitter, index, project);
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