// backend/scripts/listIndexes.js
// Debug script: lists all Pinecone indexes visible to your API key.
// Run with: node scripts/listIndexes.js

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

async function main() {
  const result = await pc.listIndexes();
  console.log('PINECONE_INDEX from .env:', JSON.stringify(process.env.PINECONE_INDEX));
  console.log('Indexes visible to this API key:');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => console.error('Error:', err));