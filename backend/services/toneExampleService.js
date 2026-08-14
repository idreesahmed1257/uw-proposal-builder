const { Pinecone } = require('@pinecone-database/pinecone');

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const NAMESPACE = 'tone-examples';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

function buildSourceText(proposal) {
  return proposal.jobBrief;
}
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
async function deleteProposalFromPinecone(proposal) {
  const index = pc.index(PINECONE_INDEX);
  await index.namespace(NAMESPACE).deleteMany({ ids: [String(proposal._id)] });
}

module.exports = { syncProposalToPinecone, deleteProposalFromPinecone };
