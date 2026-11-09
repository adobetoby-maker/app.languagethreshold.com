#!/usr/bin/env node
// Assemble a private runtime-shaped preview; never register unreviewed missions.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSpeakingMissions } from '../src/data/speaking-missions.ts';

const root = resolve(import.meta.dirname, '..');
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
const sources = [
  ['foundation-japanese-basics', 10, 'content/japanese-basics/private-foundation-practice-speaking-ja-en.json'],
  ['japanese-basics', 30, 'content/japanese-basics/private-core-practice-speaking-ja-en.json'],
  ['master-japanese-basics', 20, 'content/japanese-basics/private-master-practice-speaking-ja-en.json'],
];
const live = getSpeakingMissions('Japanese').filter(mission =>
  mission.sourceObjectiveId && sources.some(([id]) => id === mission.moduleId));
if (live.length !== 60) throw new Error(`Expected 60 Japanese 101 lesson missions; got ${live.length}`);
const byObjective = new Map(live.map(mission => [mission.sourceObjectiveId, mission]));
if (byObjective.size !== 60) throw new Error('Duplicate Japanese lesson objective IDs');
const missions = [];
const sourceHashes = [];
for (const [moduleId, count, path] of sources) {
  const candidate = read(path);
  if (candidate.pairKey !== 'Japanese:English' || candidate.registered !== false || candidate.reviewed !== false ||
      Object.keys(candidate.support).length !== count)
    throw new Error(`${path}: pair, count, or release gate changed`);
  for (const [file, hash] of [[candidate.sourceFile, candidate.sourceSha256], [candidate.practiceFile, candidate.practiceSha256],
    ...(candidate.extensionsFile ? [[candidate.extensionsFile, candidate.extensionsSha256]] : [])])
    if (sha(file) !== hash) throw new Error(`${path}: ${file} hash changed`);
  sourceHashes.push({ path, sha256: sha(path) });
  for (let n = 1; n <= count; n++) {
    const item = candidate.support[n];
    const authored = item.authoredSpeakingMission;
    const prior = byObjective.get(`${moduleId}.lesson.${n}`);
    if (!authored || !prior || prior.moduleId !== moduleId || prior.openingLine !== authored.opening ||
        prior.locale !== 'ja-JP' || prior.language !== 'Japanese' || prior.partnerRole === authored.role ||
        prior.sourcePrompts?.length !== 3 || prior.objectives.length !== 3)
      throw new Error(`${moduleId}/${n}: source mission mismatch`);
    const next = structuredClone(prior);
    next.partnerRole = authored.role;
    next.sourcePrompts[2] = item.speaking;
    next.lessonTeaching.speaking.context = item.speaking;
    next.objectives[0].description = `${authored.role}: ${authored.objectives[0]}`;
    next.objectives[1].description = authored.objectives.slice(1).join(' ');
    next.objectives[2].description = authored.closure;
    missions.push(next);
  }
}
if (new Set(missions.map(mission => mission.id)).size !== 60 ||
    new Set(missions.map(mission => mission.scenarioId)).size !== 60)
  throw new Error('Speaking preview changed unique mission identities');
const out = {
  pairKey: 'Japanese:English', registered: false, reviewed: false,
  sourceHashes, missionCount: missions.length, missions,
};
const serialized = JSON.stringify(out, null, 2) + '\n';
const target = resolve(root, 'content/japanese-basics/private-speaking-runtime-preview-ja-en.json');
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== serialized) throw new Error('Japanese speaking preview needs regeneration');
} else writeFileSync(target, serialized);
console.log('Japanese 101: 60 private runtime-shaped speaking missions with stable identities');
