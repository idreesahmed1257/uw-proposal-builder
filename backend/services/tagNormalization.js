const TAG_ALIASES = {
  'react.js': 'react',
  reactjs: 'react',
  react: 'react',
  'react native': 'react-native',
  'react-native': 'react-native',
  'node.js': 'node',
  nodejs: 'node',
  node: 'node',
  'next.js': 'nextjs',
  nextjs: 'nextjs',
  next: 'nextjs',
  'nest.js': 'nestjs',
  nestjs: 'nestjs',
  mongodb: 'mongodb',
  mongo: 'mongodb',
  postgresql: 'postgresql',
  postgres: 'postgresql',
  psql: 'postgresql',
  'gpt-4': 'gpt-4',
  gpt4: 'gpt-4',
  'openai gpt-4': 'gpt-4',
  'open ai': 'openai',
  openai: 'openai',
  stripe: 'stripe',
  'stripe payments': 'stripe',
  'stripe payment sheet': 'stripe',
  firebase: 'firebase',
  firestore: 'firebase',
  supabase: 'supabase',
  'aws lambda': 'aws-lambda',
  lambda: 'aws-lambda',
  aws: 'aws',
  gcp: 'gcp',
  'google cloud': 'gcp',
  electron: 'electron',
  fastify: 'fastify',
  mqtt: 'mqtt',
  kafka: 'kafka',
  'socket.io': 'socketio',
  socketio: 'socketio',
  'socket io': 'socketio',
  typescript: 'typescript',
  ts: 'typescript',
  tailwind: 'tailwind',
  'tailwind css': 'tailwind',
  docker: 'docker',
  vercel: 'vercel',
  prisma: 'prisma',
  xano: 'xano',
  mapbox: 'mapbox',
  'mapbox gl': 'mapbox',
  cloudinary: 'cloudinary',
};

function normalizeTag(rawTag) {
  if (!rawTag) return '';
  const key = String(rawTag)
    .toLowerCase()
    .trim()
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ');
  return TAG_ALIASES[key] || key;
}


function normalizeTags(rawTags = []) {
  // De-duplicate after normalization (e.g. "React" + "React.js" both -> "react")
  return [...new Set(rawTags.map(normalizeTag).filter(Boolean))];
}

module.exports = { normalizeTag, normalizeTags };