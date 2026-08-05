// backend/services/toneExampleService.js
//
// Same pattern as pineconeService.js, but for curated past proposals used
// as TONE/STYLE reference only (never as factual project data).
// Namespace: 'tone-examples' — kept separate from 'portfolio-projects'.

const { Pinecone } = require('@pinecone-database/pinecone');

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const NAMESPACE = 'tone-examples';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

function buildSourceText(proposal) {
  return proposal.jobBrief;
}
// Upserts a single past proposal into Pinecone as one vector.
// Safe to call on create AND update (upsert overwrites by id).
async function syncProposalToPinecone(proposal) {
  const index = pc.index(PINECONE_INDEX);
  const sourceText = buildSourceText(proposal);

 await index.namespace(NAMESPACE).upsertRecords({
    records: [{
      id: String(proposal._id),
      text: sourceText,
      ourResponse: proposal.ourResponse,
      docId: proposal.docId,
      platform: proposal.platform || 'upwork',
    }],
  });

  proposal.embeddingStatus = 'embedded';
  await proposal.save();
  return 1;
}

// Deletes a proposal's vector from Pinecone (used when a record is deleted).
async function deleteProposalFromPinecone(proposal) {
  const index = pc.index(PINECONE_INDEX);
  await index.namespace(NAMESPACE).deleteMany({ ids: [String(proposal._id)] });
}

module.exports = { syncProposalToPinecone, deleteProposalFromPinecone };
