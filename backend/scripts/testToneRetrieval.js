// backend/scripts/testToneRetrieval.js
//
// Run with: node scripts/testToneRetrieval.js
//
// Quick sanity check for searchToneExamples() — runs a few sample briefs
// and prints top match + score + lowConfidence flag.

require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const { searchToneExamples } = require('../services/toneRetrievalService');

const testQueries = [
  {
    label: 'Should match Proposal 45 (Next.js/AI audit)',
    text: 'Looking for a senior Next.js developer to audit and deploy our AI-powered platform. Need production readiness review, Stripe subscription checkout integration, OpenAI Whisper audio transcription, and real-time WebSocket sync between dashboards.',
  },
  {
    label: 'Should match Proposal 33 (client portal/dashboard)',
    text: 'Need a developer to build a client portal and admin dashboard replacing our current Google Sheets-based operational workflow. Requires role-based access, automated email notifications, and a mobile-friendly client view.',
  },
  {
    label: 'Should be low-confidence (unrelated)',
    text: 'Looking for a graphic designer to create a new logo, brand colors, and Instagram post templates for a small coffee shop.',
  },
];

async function run() {
  for (const q of testQueries) {
    console.log(`\n--- ${q.label} ---`);
    const { results, lowConfidence } = await searchToneExamples(q.text, { topK: 2 });
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.docId} — score ${r.score.toFixed(4)}`);
    });
    console.log(`lowConfidence: ${lowConfidence}`);
  }
}

run().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});