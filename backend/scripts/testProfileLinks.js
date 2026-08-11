require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const { searchPortfolio } = require('../services/retrievalService');
const { searchToneExamples } = require('../services/toneRetrievalService');
const { generateProposal } = require('../services/generationService');

async function testLinkCitation() {
  const jdText = `
Looking for a React and Node.js developer to build an analytics dashboard.
Kindly mention your portfolio/github links in your application so we can review your code repositories and live samples.
`;

  console.log('Running test with profile links...');
  const input = [{ role: 'user', content: jdText }];

  const { results: portfolioResults, queryProfile, lowConfidence: lowConfidencePortfolio } =
    await searchPortfolio(input);

  const { results: toneResults, lowConfidence: lowConfidenceTone } =
    await searchToneExamples(queryProfile.clean_query);

  const { proposal, usage } = await generateProposal({
    queryProfile,
    portfolioResults,
    lowConfidencePortfolio,
    toneResult: toneResults[0] || null,
    lowConfidenceTone,
    userProfile: {
      githubUrl: 'https://github.com/my-agency-devs',
      portfolioUrl: 'https://myagency-portfolio.com',
      linkedinUrl: 'https://linkedin.com/in/my-agency',
    },
    rawInput: jdText,
  });

  console.log('\n--- GENERATED PROPOSAL ---');
  console.log(proposal);
  console.log('--------------------------');
}

testLinkCitation().catch(console.error);
