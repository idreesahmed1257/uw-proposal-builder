const { Pinecone } = require('@pinecone-database/pinecone');
const { normalizeTags } = require('./tagNormalization');
const { buildQueryProfile } = require('./queryUnderstandingService');

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const NAMESPACE = 'portfolio-projects';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const CANDIDATE_POOL = 15;

const WEIGHTS = {
  semantic: 0.6,
  keywordOverlap: 0.35,
  industryMatch: 0.05,
};


const LOW_CONFIDENCE_THRESHOLD = 0.22;

const PROJECT_TYPE_PLACEHOLDERS = new Set([
  'unknown', 'n/a', 'na', 'none', 'unspecified', 'not specified', 'tbd', '',
  'project', 'projects', 'app', 'apps', 'application', 'platform', 'platforms',
  'software', 'system', 'systems', 'mvp', 'solution', 'solutions', 'tool', 'tools',
]);

const TRAILING_GENERIC_NOUN = /\s+(apps?|platforms?|software|systems?|mvp|solutions?|tools?|projects?)$/i;

function tokenizeProjectType(projectType) {
  if (!projectType) return [];
  const lower = projectType.toLowerCase().trim();
  if (PROJECT_TYPE_PLACEHOLDERS.has(lower)) return [];

  const stripped = lower.replace(TRAILING_GENERIC_NOUN, '').trim();
  return stripped ? [stripped] : [];
}

function softMatch(requiredToken, projectTag) {
  // A required token "hits" a project tag if either contains the other.
  // This handles the most common real-world mismatches:
  //   "hr"        vs "hr tech"        hit (required is substring of tag)
  //   "mobile"    vs "react native"   miss (genuinely different words)
  //   "mobile"    vs "mobile"         hit (exact)
  //   "saas"      vs "saas"           hit (exact)
  //   "real time" vs "real-time"      hit (normalization already unified delimiters)
  return requiredToken === projectTag ||
    projectTag.includes(requiredToken) ||
    requiredToken.includes(projectTag);
}

function keywordOverlapScore(required = [], projectTags = []) {
  if (required.length === 0 || projectTags.length === 0) return 0;
  let hits = 0;
  for (const req of required) {
    if (projectTags.some((tag) => softMatch(req, tag))) hits += 1;
  }
  return hits / required.length;
}

// Raw dense search against Pinecone, wide candidate pool, no rescoring.
async function denseSearch(cleanQuery, { topK = CANDIDATE_POOL, industry, tags } = {}) {
  const index = pc.index(PINECONE_INDEX);

  const filter = {};
  if (industry) filter.industry = { $eq: industry };
  if (tags && tags.length > 0) filter.tags = { $in: tags };

  const searchRequest = {
    query: {
      inputs: { text: cleanQuery },
      topK,
    },
    fields: ['title', 'industry', 'tags', 'normalizedTags', 'text', 'portfolioProjectId', 'url'],
  };

  if (Object.keys(filter).length > 0) {
    searchRequest.query.filter = filter;
  }

  const results = await index.namespace(NAMESPACE).searchRecords(searchRequest);
  const hits = results?.result?.hits || [];

  return hits.map((hit) => {
    const text = hit.fields?.text || '';
    const urlFromText = text.split('\n').find((l) => l.startsWith('URL: '))?.replace('URL: ', '').trim();
    return {
      id: hit._id,
      semanticScore: hit._score,
      title: hit.fields?.title,
      industry: hit.fields?.industry,
      tags: hit.fields?.tags,
      normalizedTags: hit.fields?.normalizedTags || [],
      text: text,
      portfolioProjectId: hit.fields?.portfolioProjectId || hit._id,
      url: hit.fields?.url || urlFromText || '',
    };
  });
}


//Hybrid search: dense retrieval + tag-overlap rescoring against an

function rescore(candidates, queryProfile) {
  if (candidates.length === 0) return [];
  const requiredStack = normalizeTags([
    ...(queryProfile.tech_stack || []),
    ...(queryProfile.functional_signals || []),
    ...tokenizeProjectType(queryProfile.project_type),
  ]);

  const scored = candidates.map((candidate) => {
    const keywordScore = keywordOverlapScore(requiredStack, candidate.normalizedTags);
    const industryBonus =
      queryProfile.industry_guess &&
        candidate.industry &&
        candidate.industry.toLowerCase().includes(queryProfile.industry_guess.toLowerCase())
        ? 1
        : 0;
    const finalScore =
      WEIGHTS.semantic * candidate.semanticScore +
      WEIGHTS.keywordOverlap * keywordScore +
      WEIGHTS.industryMatch * industryBonus;

    return {
      ...candidate,
      keywordScore,
      score: finalScore,
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Main entry point for the chatbot's retrieval step.
 *
 * @param {string|Array<{role, content}>} input
 * @param {object} options
 * @param {number} options.finalK - how many projects to return after rescoring (default 4)
 * @param {string} options.industry - optional hard filter (use sparingly — prefer letting industryMatch bonus handle it)
 * @param {string[]} options.tags - optional hard filter passed straight to Pinecone
 * @returns {Promise<{results: Array, queryProfile: object}>}
 */
async function searchPortfolio(input, options = {}) {
  const { finalK = 4, industry, tags } = options;

  const messages = Array.isArray(input) ? input : [{ role: 'user', content: input }];

  // clean + structure the query (handles noise + multi-turn context)
  const queryProfile = await buildQueryProfile(messages);

  // wide dense candidate pool using the cleaned query
  const candidates = await denseSearch(queryProfile.clean_query, {
    topK: CANDIDATE_POOL,
    industry,
    tags,
  });

  // hybrid rescore, trim to final count
  const reranked = rescore(candidates, queryProfile);
  const results = reranked.slice(0, finalK);

  const lowConfidence =
    results.length === 0 || results[0].score < LOW_CONFIDENCE_THRESHOLD;

  return {
    results,
    queryProfile, // useful to log/inspect, and to feed the generation prompt directly
    lowConfidence,
  };
}

module.exports = { searchPortfolio, denseSearch, rescore };