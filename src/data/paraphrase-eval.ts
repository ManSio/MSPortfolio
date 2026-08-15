// v2 stage-0 eval set (KI-017 — recall gap).
//
// TRUE_PARAPHRASES: claims that ARE true about the owner (the canonical claim in
// src/data/lab/evidence.json is supported), but phrased with synonyms/restructured
// words so v1's keyword matching cannot hit them. These are the recall-gap cases
// the v2 LLM arm must rescue.
// FALSE_PARAPHRASES: rephrased negative controls — must stay refused even with
// better recall (no false-acceptance).
//
// Single source of truth for both the stage-0 test (tests/evidence-eval.test.ts)
// and the offline LLM-arm eval (scripts/eval-llm-arm.ts). Every phrase below was
// empirically verified against the v1 tool when added.

export interface ParaphraseCase {
  id: string;
  canonical: string;
  paraphrase: string;
}

export const TRUE_PARAPHRASES: ParaphraseCase[] = [
  { id: 'p-01', canonical: 'LanceDB and BM25 hybrid search', paraphrase: 'joins two retrieval styles to score results' },
  { id: 'p-02', canonical: 'LanceDB and BM25 hybrid search', paraphrase: 'mixes neural vectors with plain text matching' },
  { id: 'p-03', canonical: 'Telegram assistant with memory and intent routing', paraphrase: 'a messenger helper that keeps history and picks a handler by topic' },
  { id: 'p-04', canonical: 'Telegram assistant with memory and intent routing', paraphrase: 'a bot for close friends that remembers the chat and routes requests' },
  { id: 'p-05', canonical: 'must refuse rather than guess when it cannot verify', paraphrase: 'prefers declining over guessing when verification fails' },
  { id: 'p-06', canonical: 'derived state written through a single write path', paraphrase: 'every produced artifact is written by exactly one routine' },
  { id: 'p-07', canonical: 'claimed a fork as my own work', paraphrase: 'a repository that was copied was once labelled as his own creation' },
  { id: 'p-08', canonical: 'joined GitHub as ManSio', paraphrase: 'his public developer account dates to 2014' },
];

export const FALSE_PARAPHRASES: ParaphraseCase[] = [
  { id: 'n-01', canonical: 'worked at Google', paraphrase: 'spent several years at the large internet company' },
  { id: 'n-02', canonical: 'led a team of engineers at Meta', paraphrase: 'oversaw a big group of programmers at the social platform' },
  { id: 'n-03', canonical: 'built a mobile app for iOS', paraphrase: 'delivered an app for Apple handheld devices' },
];
