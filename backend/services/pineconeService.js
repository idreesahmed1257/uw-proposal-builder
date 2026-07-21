// backend/services/pineconeService.js
//
// Reusable Pinecone sync logic for PortfolioProject documents.
// Used by:
//   - portfolioController.js (real-time sync on create/update/delete)
//   - scripts/ingestPortfolio.js (one-time/backfill sync for existing data)

const { Pinecone } = require('@pinecone-database/pinecone');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const NAMESPACE = 'portfolio-projects';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 75,
});

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

// Deletes all existing chunk vectors for a project (by known chunk count),
// then re-chunks + upserts current data. Safe to call on create AND update.
async function syncProjectToPinecone(project) {
  const index = pc.index(PINECONE_INDEX);

  // Remove old chunks first (covers the "update" case where chunk count changes)
  const oldChunkCount = project.chunkCount || 0;
  if (oldChunkCount > 0) {
    const oldIds = Array.from({ length: oldChunkCount }, (_, i) => `${project._id}-chunk-${i}`);
    try {
      await index.namespace(NAMESPACE).deleteMany({ ids: oldIds });
    } catch (err) {
      console.error(`Error: failed to delete old chunks for ${project._id}:`, err.message);
      throw new Error(`Failed to clean up old Pinecone chunks: ${err.message}`);
    }
  }

  const sourceText = buildSourceText(project);
  const chunks = await splitter.splitText(sourceText);

  const records = chunks.map((chunkText, i) => ({
    id: `${project._id}-chunk-${i}`,
    text: chunkText,
    portfolioProjectId: String(project._id),
    title: project.title,
    industry: project.industry || '',
    tags: project.tags || [],
    chunkIndex: i,
  }));

  await index.namespace(NAMESPACE).upsertRecords({ records });

  project.embeddingStatus = 'embedded';
  project.chunkCount = chunks.length;
  await project.save();

  return chunks.length;
}

// Deletes all chunk vectors for a project (used when a project is deleted).
async function deleteProjectFromPinecone(project) {
  const index = pc.index(PINECONE_INDEX);
  const chunkCount = project.chunkCount || 0;
  if (chunkCount === 0) return;

  const ids = Array.from({ length: chunkCount }, (_, i) => `${project._id}-chunk-${i}`);
  await index.namespace(NAMESPACE).deleteMany({ ids });
}

module.exports = { syncProjectToPinecone, deleteProjectFromPinecone };