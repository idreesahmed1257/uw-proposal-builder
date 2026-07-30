// backend/services/pineconeService.js
//
// Reusable Pinecone sync logic for PortfolioProject documents.
// Used by:
//   - portfolioController.js (real-time sync on create/update/delete)
//   - scripts/ingestPortfolio.js (one-time/backfill sync for existing data)

const { Pinecone } = require('@pinecone-database/pinecone');
const { normalizeTags } = require('./tagNormalization');

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const NAMESPACE = 'portfolio-projects';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

function buildSourceText(project) {
  const skills = (project.skillsAndDeliverables || []).join('. ');
  return [
    `Title: ${project.title}`,
    `Role: ${project.role}`,
    `Description: ${project.description}`,
    skills ? `Skills and deliverables: ${skills}` : '',
    project.industry ? `Industry: ${project.industry}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// Upserts the current project data into Pinecone as a single vector.
// Safe to call on create AND update (upsert automatically overwrites by id).
async function syncProjectToPinecone(project) {
  const index = pc.index(PINECONE_INDEX);
  const sourceText = buildSourceText(project);
  const rawTags = project.tags || [];

  await index.namespace(NAMESPACE).upsertRecords({
    records: [{
      id: String(project._id),
      text: sourceText,
      title: project.title,
      industry: project.industry || '',
      tags: rawTags,
      // Canonical form of `tags`, computed via the same TAG_ALIASES map used
      // on extracted job-description stacks at query time. Keyword-overlap
      // scoring in retrievalService.js compares against THIS field, not the
      // free-text `tags` field, so "React", "React.js", "ReactJS" all match
      // a query stack of "react" consistently.
      normalizedTags: normalizeTags(rawTags),
    }],
  });

  project.embeddingStatus = 'embedded';
  await project.save();
  return 1;
}

// Deletes the project's vector from Pinecone (used when a project is deleted).
async function deleteProjectFromPinecone(project) {
  const index = pc.index(PINECONE_INDEX);
  await index.namespace(NAMESPACE).deleteMany({ ids: [String(project._id)] });
}

module.exports = { syncProjectToPinecone, deleteProjectFromPinecone };