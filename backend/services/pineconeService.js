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
    project.url ? `URL: ${project.url}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
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
      url: project.url || '',
      tags: rawTags,
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