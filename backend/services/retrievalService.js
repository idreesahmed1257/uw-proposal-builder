
// Pipeline:
//   1. buildQueryProfile()  — cheap LLM call cleans the raw chat input
//      (or full conversation) into a structured profile: clean_query +
//      tech_stack + project_type + industry_guess.
//   2. Pinecone dense search on `clean_query` (semantic), pulled at a WIDE
//      candidate pool (topK ~ CANDIDATE_POOL) rather than the final count.
//   3. Rescore each candidate: combine RAW dense score (not per-query
//      normalized — see LOW_CONFIDENCE_THRESHOLD below for why) with a
//      tag-overlap score against the extracted tech_stack + functional
//      signals. This is the "hybrid" step — Pinecone's integrated embedding
//      is dense-only, so keyword grounding happens here in application code
//      instead of via a separate sparse index.
//   4. Return the top N after rescoring.


const { Pinecone } = require('@pinecone-database/pinecone');
const { normalizeTags } = require('./tagNormalization');
const { buildQueryProfile } = require('./queryUnderstandingService');

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const NAMESPACE = 'portfolio-projects';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// How many candidates to pull from Pinecone before rescoring. Wider than the
// final result count so the keyword signal has room to re-rank things that
// dense search alone ranked lower.
const CANDIDATE_POOL = 15;

// Weighting between semantic similarity and keyword/stack overlap in the
// final blended score. Tune these based on eyeballing testRetrieval.js output.
const WEIGHTS = {
  semantic: 0.6,
  keywordOverlap: 0.35,
  industryMatch: 0.05,
};

// Below this BLENDED final score, we don't trust the match enough to present
// it as confident — flagged so the generation step can hedge instead of
// citing a weak/unrelated project as an ideal fit.
//
// Calibrated from real test data (see conversation history), not guessed:
// genuine no-match queries clustered at 0.13-0.19 blended; genuine matches
// with any keyword hit landed at 0.40-0.59; a genuine match with ZERO
// keyword hit (raw semantic alone) still cleared 0.25. Raw semantic score
// alone was NOT usable for this — this embedding model compresses raw scores
// into a narrow band (~0.21-0.42) regardless of match quality, so a strong
// and a weak match can differ by only ~0.15 in raw terms. The blended score
// (which folds in keyword overlap) separates far more cleanly. Re-tune this
// as your portfolio grows past 8 seed projects — these bands were observed
// on a very small pool and will shift.
const LOW_CONFIDENCE_THRESHOLD = 0.22;

// project_type sometimes comes back as a placeholder rather than a real
// value ("unknown", "n/a") — these must NOT be treated as a real required
// keyword, or they silently dilute every other candidate's overlap score.
// Also covers the case where project_type is ENTIRELY a generic noun with
// no other content (e.g. just "project" or "platform") — that carries the
// same zero information as "unknown" and should be dropped the same way,
// not just when the generic noun trails other real content.
const PROJECT_TYPE_PLACEHOLDERS = new Set([
  'unknown', 'n/a', 'na', 'none', 'unspecified', 'not specified', 'tbd', '',
  'project', 'projects', 'app', 'apps', 'application', 'platform', 'platforms',
  'software', 'system', 'systems', 'mvp', 'solution', 'solutions', 'tool', 'tools',
]);

// Only strip ONE trailing generic noun (e.g. "mobile app" -> "mobile",
// "saas platform" -> "saas") and keep the REST as a single phrase — do not
// split into individual words. Splitting a longer descriptive project_type
// like "real-time data or IoT projects" into ["real","time","data","or",
// "iot","projects"] was adding 5+ near-meaningless single words into the
// required-match set, which tanked the Jaccard score for every candidate
// even when a real functional_signals match already existed elsewhere.
// Stripping only the trailing noun bounds the worst case to +1 extra,
// mostly-non-matching token instead of +5 or more.
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
  //   "hr"        vs "hr tech"       → hit (required is substring of tag)
  //   "mobile"    vs "react native"  → miss (genuinely different words)
  //   "mobile"    vs "mobile"        → hit (exact)
  //   "saas"      vs "saas"          → hit (exact)
  //   "real time" vs "real-time"     → hit (normalization already unified delimiters)
  // We don't do fuzzy/edit-distance matching here — that would introduce
  // false positives ("node" matching "mongodb") which would be worse than
  // the missed matches it saves.
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
  // Denominator is required set size: "how much of what the job needs does
  // this project cover" — extra unrelated project tags don't penalise it.
  return hits / required.length;
}


/**
 * Raw dense search against Pinecone, wide candidate pool, no rescoring.
 */
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
    fields: ['title', 'industry', 'tags', 'normalizedTags', 'text', 'portfolioProjectId'],
  };

  if (Object.keys(filter).length > 0) {
    searchRequest.query.filter = filter;
  }

  const results = await index.namespace(NAMESPACE).searchRecords(searchRequest);
  const hits = results?.result?.hits || [];

  return hits.map((hit) => ({
    id: hit._id,
    semanticScore: hit._score,
    title: hit.fields?.title,
    industry: hit.fields?.industry,
    tags: hit.fields?.tags,
    normalizedTags: hit.fields?.normalizedTags || [],
    text: hit.fields?.text,
    portfolioProjectId: hit.fields?.portfolioProjectId || hit._id,
  }));
}

/**
 * Hybrid search: dense retrieval + tag-overlap rescoring against an
 * already-extracted query profile (tech_stack, industry_guess).
 */
function rescore(candidates, queryProfile) {
  if (candidates.length === 0) return [];

  // All three fields carry real matching signal: tech_stack is explicit
  // named technology, functional_signals is capability-level, and
  // project_type ("mobile app", "saas platform") is often a direct hit
  // against a portfolio tag once stopwords are stripped — e.g. "show me
  // mobile app projects" extracts project_type: "mobile app" but nothing
  // into tech_stack/functional_signals, so without this the word "mobile"
  // was never actually used for matching despite being the whole ask.
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

    // Using the RAW semantic score here, not a per-query min-max normalized
    // one. Normalizing within each candidate pool forces the best-of-the-pool
    // to 1.0 regardless of whether it's an absolutely strong or weak match —
    // with a small portfolio, that means even a query with NO good project
    // match still gets shown a confident-looking "1.00" top result. Raw
    // dense scores from Pinecone's integrated embedding are already on a
    // consistent, comparable scale across queries, so there's no need to
    // rescale — and rescaling actively destroys the one signal that tells
    // you whether the top match is any good in absolute terms.
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
 *        Either a single raw string (JD paste, single-shot query) OR a full
 *        conversation array for multi-turn chatbot sessions where a JD was
 *        followed by clarifying Q&A. Passing the full conversation lets
 *        query understanding build the fullest possible profile.
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