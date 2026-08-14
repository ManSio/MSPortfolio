// Bundled fallback articles — the blog can NEVER be empty, even if the
// Dev.to API and the metrics snapshot are both unreachable.
import type { DevToArticle } from '../lib/types';

export const FALLBACK_ARTICLES: DevToArticle[] = [
  {
    id: 4371984,
    title: 'The Mechanical vs. The Semantic: What Happens When AI Memory is Wrong?',
    description:
      'An empirical look at memory contamination in AI agents. I ran an experiment to see how agents handle false facts, tested a retraction mechanism, and closed the final gap with verify-on-read.',
    readingTimeMinutes: 6,
    url: 'https://dev.to/mansio/the-mechanical-vs-the-semantic-what-happens-when-ai-memory-is-wrong-38ko',
    tags: ['ai', 'agents', 'architecture', 'mcp'],
    reactions: 19,
    comments: 39,
    coverImage: null,
    socialImage:
      'https://media2.dev.to/dynamic/image/width=1200,height=627,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fh5tdgd82gnvqwwvx9m7s.png',
    readablePublishDate: 'Aug 11',
  },
  {
    id: 4353746,
    title: 'What I learned building a long-lived AI agent (the boring version)',
    description:
      'A practical log of building a long-lived Telegram AI agent — caching, providers, routing, memory, latency. No benchmarks. Just what actually happened.',
    readingTimeMinutes: 5,
    url: 'https://dev.to/mansio/what-i-learned-building-a-long-lived-ai-agent-the-boring-version-32p8',
    tags: ['ai', 'python', 'agents', 'llm'],
    reactions: 14,
    comments: 28,
    coverImage:
      'https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fj7md32hq3a2m3hbf05ao.png',
    socialImage:
      'https://media2.dev.to/dynamic/image/width=1200,height=627,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fj7md32hq3a2m3hbf05ao.png',
    readablePublishDate: 'Aug 9',
  },
  {
    id: 4347706,
    title: "I Asked One AI to Fact-Check Another AI's Audit of My Own Code",
    description:
      "I'm not a programmer. My background is construction engineering, and I got into programming almost by accident.",
    readingTimeMinutes: 5,
    url: 'https://dev.to/mansio/i-asked-one-ai-to-fact-check-another-ais-audit-of-my-own-code-1ac3',
    tags: ['ai', 'opensource', 'python', 'mcp'],
    reactions: 6,
    comments: 4,
    coverImage:
      'https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Flfl93vyclpghqf81qi7k.png',
    socialImage:
      'https://media2.dev.to/dynamic/image/width=1200,height=627,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Flfl93vyclpghqf81qi7k.png',
    readablePublishDate: 'Aug 8',
  },
  {
    id: 4200469,
    title: 'PageRank vs RAG on a Real Codebase: Corrected Numbers, and What I Almost Got Wrong Twice',
    description:
      "Second correction to this experiment. The Hit@Gold numbers are now independently verified and reproducible — and my own 'gold standard is 100% valid' claim wasn't.",
    readingTimeMinutes: 7,
    url: 'https://dev.to/mansio/i-measured-pagerank-token-savings-on-a-real-codebase-the-result-will-surprise-you-5bnj',
    tags: ['machinelearning', 'python', 'ai', 'devtools'],
    reactions: 2,
    comments: 2,
    coverImage: null,
    socialImage:
      'https://media2.dev.to/dynamic/image/width=1200,height=627,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2F7zqwuyw5onysh9hvpy7p.png',
    readablePublishDate: 'Jul 22',
  },
  {
    id: 4200301,
    title: 'The Silent Vector Contamination Bug: Why Your Concurrent Embeddings Might Be Lying to You',
    description:
      'How a subtle race condition in async inference queues returned syntactically valid embeddings for the wrong inputs — and how to catch it with a cosine contamination test.',
    readingTimeMinutes: 4,
    url: 'https://dev.to/mansio/the-silent-vector-contamination-bug-why-your-concurrent-embeddings-might-be-lying-to-you-5fg7',
    tags: ['machinelearning', 'python', 'rag', 'openvino'],
    reactions: 1,
    comments: 0,
    coverImage: null,
    socialImage:
      'https://media2.dev.to/dynamic/image/width=1200,height=627,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fh0yqnvxw2c8wsznehyc9.png',
    readablePublishDate: 'Jul 21',
  },
];
