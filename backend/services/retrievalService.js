// backend/services/retrievalService.js
//
// Retrieval layer over the Pinecone "portfolio-projects" namespace.
// Uses Pinecone's integrated embedding search (searchRecords) — you pass
// raw query text, Pinecone embeds it server-side (same llama-text-embed-v2
// model used at ingestion time) and returns the closest matching chunks.

const { Pinecone } = require('@pinecone-database/pinecone');

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const NAMESPACE = 'portfolio-projects';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

/**
 * Search the portfolio knowledge base.
 *
 * @param {string} query - natural language query, e.g. "fintech projects"
 * @param {object} options
 * @param {number} options.topK - how many chunks to return (default 5)
 * @param {string} options.industry - optional exact-match filter, e.g. "HR Tech / SaaS"
 * @param {string[]} options.tags - optional filter: chunk must have at least one of these tags
 * @returns {Promise<Array<{id, score, title, industry, tags, chunkIndex, text}>>}
 */
async function searchPortfolio(query, options = {}) {
  const { topK = 5, industry, tags } = options;
  const index = pc.index(PINECONE_INDEX);

  // Build optional metadata filter (Pinecone filter syntax)
  const filter = {};
  if (industry) {
    filter.industry = { $eq: industry };
  }
  if (tags && tags.length > 0) {
    filter.tags = { $in: tags };
  }

  const searchRequest = {
    query: {
      inputs: { text: query },
      topK,
    },
    fields: ['title', 'industry', 'tags', 'chunkIndex', 'text', 'portfolioProjectId'],
  };

  if (Object.keys(filter).length > 0) {
    searchRequest.query.filter = filter;
  }

  const results = await index.namespace(NAMESPACE).searchRecords(searchRequest);

  // Normalize the response into a simple flat array
  const hits = results?.result?.hits || [];
  return hits.map((hit) => ({
    id: hit._id,
    score: hit._score,
    title: hit.fields?.title,
    industry: hit.fields?.industry,
    tags: hit.fields?.tags,
    chunkIndex: hit.fields?.chunkIndex,
    text: hit.fields?.text,
    portfolioProjectId: hit.fields?.portfolioProjectId,
  }));
}

module.exports = { searchPortfolio };