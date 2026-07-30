// backend/scripts/testRetrieval.js
//
// QA script — runs sample queries against the hybrid retrieval layer and
// prints results plus the extracted query profile, so you can eyeball both
// retrieval quality AND what query-understanding pulled out.
//
// Also prints raw semanticScore (not min-max normalized — see
// retrievalService.js for why) and the lowConfidence flag, so you can use
// this output to actually calibrate LOW_CONFIDENCE_THRESHOLD against your
// real data instead of guessing.
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
  { query: 'HR platform work', options: { industry: 'HR Tech / SaaS' } },
];

async function runTests() {
  for (const { query, options } of testQueries) {
    console.log('\n============================================');
    console.log(`Query: "${query}"`);
    if (options) console.log('Filters:', options);
    console.log('============================================');

    try {
      const { results, queryProfile, lowConfidence } = await searchPortfolio(query, options);

      console.log('Query profile:', JSON.stringify(queryProfile, null, 2));
      console.log(`lowConfidence: ${lowConfidence}`);

      if (results.length === 0) {
        console.log('No results returned.');
        continue;
      }

      results.forEach((r, i) => {
        console.log(
          `\n#${i + 1} — final score: ${r.score.toFixed(4)} (raw semantic: ${r.semanticScore.toFixed(
            4
          )}, keyword: ${r.keywordScore.toFixed(2)}) — ${r.title}`
        );
        console.log(`   industry: ${r.industry || 'n/a'} | tags: ${(r.tags || []).join(', ') || 'n/a'}`);
        console.log(`   text: ${r.text.slice(0, 150).replace(/\n/g, ' ')}...`);
      });
    } catch (err) {
      console.error(`Query failed: ${err.message}`);
    }
  }
}

runTests();