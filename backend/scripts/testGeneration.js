// backend/scripts/testGeneration.js
//
// End-to-end pipeline test: JD in → proposal out.
// Runs all three stages in sequence:
//   1. queryUnderstandingService  (Groq — free)
//   2. searchPortfolio            (Pinecone dense + hybrid rescore)
//   3. searchToneExamples         (Pinecone dense)
//   4. generateProposal           (Claude Sonnet — paid)
//
// Run with: node scripts/testGeneration.js

require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const { searchPortfolio } = require('../services/retrievalService');
const { searchToneExamples } = require('../services/toneRetrievalService');
const { generateProposal } = require('../services/generationService');

// ─── Test cases ───────────────────────────────────────────────────────────────

const jdLeadDistribution = `
Custom Lead Distribution Software Buildout (Like Leadprosper)

We run a seven-figure paid lead generation agency. We buy traffic, generate
leads, and sell those leads to buyers at $250-$400 each.

We want someone to build a custom lead distribution system that:
- Distributes leads by priority (some buyers get first pick)
- Handles API bidding with bid caps
- Routes leads based on conditional rules (qualified vs disqualified)
- Is rock-solid reliable — no dropped leads, no misrouting

Tools in use: Lead Prospector, LeadsHook. We want to own our own version.
After build: ongoing monthly management fee expected.
Must have real API integration and webhook experience.
`;

const jdEdTech = `
EdTech MVP Platform for Online Learning & Student Progress Tracking

Looking for an experienced full-stack developer to build an MVP EdTech platform.

Core features:
- Student registration and login
- Student dashboard and course/lesson listing
- Progress tracking per lesson or module
- Basic quiz or assessment functionality
- Admin panel for managing students, courses, and content

Preferred stack: React, Next.js, Node.js, Supabase or Firebase, PostgreSQL.
`;

const jdHR = `
AI-Powered HR Platform Enhancement

We have an existing HR SaaS platform and need a senior developer to:
- Add conversational AI features for leave requests and HR policy queries
- Implement voice-based interaction (speech to text, text to speech)
- Extend our multi-tenant architecture for two new enterprise clients
- Build RAG-based policy intelligence — staff ask questions, get accurate answers

Stack: Node.js, Fastify, MongoDB. OpenAI integration preferred.
`;

const jdProfileLinks = `
Analytics Dashboard Developer Needed

We are building a real-time analytics dashboard with React, Node.js, and MongoDB.
Kindly mention your portfolio/github links in your application so we can review your past work repositories and live projects.
`;

const testCases = [
  { name: 'Github/Portfolio Citation Test (explicit link request)', jd: jdProfileLinks },
  { name: 'Lead Distribution (no portfolio match expected)', jd: jdLeadDistribution },
  { name: 'EdTech MVP (partial portfolio match expected)', jd: jdEdTech },
  { name: 'AI HR Platform (strong portfolio match expected — Henrietta)', jd: jdHR },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runTest({ name, jd }) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST: ${name}`);
  console.log('='.repeat(60));

  const input = [{ role: 'user', content: jd }];

  // Step 1 + 2: portfolio retrieval (includes query understanding internally)
  console.log('\n[1/3] Running portfolio retrieval...');
  const { results: portfolioResults, queryProfile, lowConfidence: lowConfidencePortfolio } =
    await searchPortfolio(input);

  console.log(`Query profile: project_type="${queryProfile.project_type}", tech_stack=[${(queryProfile.tech_stack || []).join(', ')}]`);
  console.log(`Portfolio: top match = "${portfolioResults[0]?.title || 'none'}" (score ${portfolioResults[0]?.score?.toFixed(3) || 'n/a'}), lowConfidence=${lowConfidencePortfolio}`);

  // Step 3: tone retrieval
  console.log('\n[2/3] Running tone retrieval...');
  const { results: toneResults, lowConfidence: lowConfidenceTone } =
    await searchToneExamples(queryProfile.clean_query);

  const toneResult = toneResults[0] || null;
  console.log(`Tone: top match = ${toneResult?.docId || 'none'} (score ${toneResult?.score?.toFixed(3) || 'n/a'}), lowConfidence=${lowConfidenceTone}`);

  // Step 4: generation
  console.log('\n[3/3] Generating proposal...');
  const { proposal, usage } = await generateProposal({
    queryProfile,
    portfolioResults,
    lowConfidencePortfolio,
    toneResult,
    lowConfidenceTone,
    userProfile: {
      githubUrl: 'https://github.com/devnauts-agency',
      portfolioUrl: 'https://devnauts.io',
      linkedinUrl: 'https://linkedin.com/company/devnauts',
    },
    rawInput: typeof input === 'string' ? input : input[input.length - 1]?.content,
  });

  console.log(`\nTokens used: ${usage.input_tokens} in / ${usage.output_tokens} out`);
  console.log('\n--- PROPOSAL OUTPUT ---\n');
  console.log(proposal);
  console.log('\n--- END PROPOSAL ---');
}

async function runAll() {
  for (const testCase of testCases) {
    try {
      await runTest(testCase);
    } catch (err) {
      console.error(`\nFAILED: ${testCase.name}`);
      console.error(err.message);
    }
  }
}

runAll();
