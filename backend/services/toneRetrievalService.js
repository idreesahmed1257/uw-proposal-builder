// backend/services/toneRetrievalService.js
//
// Retrieval for the 'tone-examples' namespace — finds the most similar
// past proposal(s) to a new client brief, to use as a STYLE/TONE reference
// at generation time. Simpler than searchPortfolio() (retrievalService.js):
// no keyword-overlap rescoring, since tone matching is about "how similar
// is this type of job" not precise tech-stack grounding — that grounding
// already happens via portfolio-projects.

const { Pinecone } = require('@pinecone-database/pinecone');

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const NAMESPACE = 'tone-examples';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// Below this raw semantic score, don't trust the match as a genuine tone
// reference — a loosely-themed but unrelated brief (e.g. a design request
// matching a proposal that happens to mention "UI/UX designers") can still
// score ~0.30-0.35. Calibrated from early manual tests: genuine matches
// landed 0.59-0.72, a themed-but-unrelated non-match landed 0.33. Re-tune
// as more real briefs are tested — this is a small initial sample.
const LOW_CONFIDENCE_THRESHOLD = 0.45;

/**
 * Finds the most similar past proposal(s) to a new client brief, for use
 * as a tone/style reference during generation.
 *
 * @param {string} cleanQuery - the client brief (or cleaned version of it)
 * @param {object} options
 * @param {number} options.topK - how many tone examples to return (default 1)
 * @returns {Promise<{results: Array, lowConfidence: boolean}>}
 */
async function searchToneExamples(cleanQuery, options = {}) {
  const { topK = 1 } = options;
  const index = pc.index(PINECONE_INDEX);

  const results = await index.namespace(NAMESPACE).searchRecords({
    query: {
      inputs: { text: cleanQuery },
      topK,
    },
    fields: ['docId', 'ourResponse', 'platform', 'text'],
  });

  const hits = results?.result?.hits || [];

  const mapped = hits.map((hit) => ({
    id: hit._id,
    score: hit._score,
    docId: hit.fields?.docId,
    ourResponse: hit.fields?.ourResponse,
    platform: hit.fields?.platform,
    jobBrief: hit.fields?.text,
  }));

  const lowConfidence = mapped.length === 0 || mapped[0].score < LOW_CONFIDENCE_THRESHOLD;

  return { results: mapped, lowConfidence };
}

module.exports = { searchToneExamples };