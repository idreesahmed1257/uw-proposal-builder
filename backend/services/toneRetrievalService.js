
const { Pinecone } = require('@pinecone-database/pinecone');

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const NAMESPACE = 'tone-examples';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

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