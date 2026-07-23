// backend/scripts/testRetrieval.js
//
// QA script for Week 4 — runs a set of real sample queries against the
// retrieval layer and prints the results, so we can eyeball retrieval
// quality (are the right project chunks coming back?).
//
// Run with: node scripts/testRetrieval.js

require('dotenv').config();
const { searchPortfolio } = require('../services/retrievalService');

const testQueries = [
  { query: 'What has DevNauts built in fintech?' },
  { query: 'Show me mobile app projects' },
  { query: 'Projects involving real-time data or IoT' },
  { query: 'Experience with payment integrations like Stripe' },
  { query: 'Multi-tenant SaaS architecture experience' },
  // Example with a metadata filter — swap "industry" to match a real
  // value from your PortfolioProject data once you've tagged more projects.
  { query: 'HR platform work', options: { industry: 'HR Tech / SaaS' } },
];

async function runTests() {
  for (const { query, options } of testQueries) {
    console.log('\n============================================');
    console.log(`Query: "${query}"`);
    if (options) console.log('Filters:', options);
    console.log('============================================');

    try {
      const results = await searchPortfolio(query, options);

      if (results.length === 0) {
        console.log('No results returned.');
        continue;
      }

      results.forEach((r, i) => {
        console.log(`\n#${i + 1} — score: ${r.score.toFixed(4)} — ${r.title}`);
        console.log(`   industry: ${r.industry || 'n/a'} | tags: ${(r.tags || []).join(', ') || 'n/a'}`);
        console.log(`   text: ${r.text.slice(0, 150).replace(/\n/g, ' ')}...`);
      });
    } catch (err) {
      console.error(`Query failed: ${err.message}`);
    }
  }
}

runTests();