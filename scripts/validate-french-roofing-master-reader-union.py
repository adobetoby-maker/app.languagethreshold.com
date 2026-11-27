#!/usr/bin/env python3
"""Validate inert Reader evidence against Git objects, never the working-tree HEAD."""
import argparse, collections, hashlib, json, pathlib, re, subprocess
ROOT = pathlib.Path(__file__).resolve().parents[1]
EXPECTED_REVISION = '0366167141217f54fbf855cf3dd0bf788c1d380b'
parser = argparse.ArgumentParser()
parser.add_argument('--manifest', type=pathlib.Path, default=ROOT / 'docs/french-program/roofing-master-reader-union-2026-11-26.json')
args = parser.parse_args()
m = json.loads(args.manifest.read_text())
assert m['schema'] == 'french-roofing-master-reader-union-v1'
assert m['exactMain'] == EXPECTED_REVISION
cache = {}
def raw(path):
    if path not in cache:
        cache[path] = subprocess.check_output(['git', 'show', EXPECTED_REVISION + ':' + path], cwd=ROOT)
    return cache[path]
def obj(path):
    return json.loads(raw(path))
def sha(path):
    return hashlib.sha256(raw(path)).hexdigest()
paths = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', EXPECTED_REVISION, 'content/french-roofing/candidates'], cwd=ROOT, text=True).splitlines()
artifacts = {x['path']: x for x in m['artifacts']}
assert len(artifacts) == len(m['artifacts'])
for path, record in artifacts.items():
    assert sha(path) == record['sha256'], path

def closed(value):
    assert value['reviewed'] is False
    assert value['selectedFrench'] is value['audioScript'] is None

def unresolved_fields(value, pointer=''):
    result = []
    if isinstance(value, dict):
        for key, item in value.items():
            at = pointer + '/' + key.replace('~', '~0').replace('/', '~1')
            if re.search(r'hold|review|issue|qualified|selected|gate|registered|audio|identity|role|objective|sourcespeaking|scaffold|note|proposal|senseoptions|status', key, re.I):
                result.append({'jsonPointer': at, 'value': item})
            else:
                result.extend(unresolved_fields(item, at))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            result.extend(unresolved_fields(item, pointer + '/' + str(index)))
    return result

totals = collections.Counter()
source_ids, alternative_ids = set(), set()
master_paths = [p for p in paths if re.search(r'/master-\d+-authored-candidate-[^/]+/candidate.json$', p)]
assert len(master_paths) == len(m['lessons']) == 20
assert [x['lessonNumber'] for x in m['lessons']] == list(range(1, 21))
for lesson in m['lessons']:
    cp = lesson['canonicalCandidate']['path']
    assert cp in master_paths and sha(cp) == lesson['canonicalCandidate']['sha256']
    p = obj(cp)
    closed(p)
    assert all(v is False for v in p['gates'].values())
    for key in ('lessonId', 'gates', 'reviewed', 'selectedFrench', 'audioScript', 'sourceObjectiveEnglish', 'sourceSpeakingEnglish', 'sourceObjectiveCompletionStatus', 'candidateObjectiveEnglish'):
        assert lesson[key] == p[key], (cp, key)
    assert 'held' in lesson['sourceObjectiveCompletionStatus'].lower()
    assert lesson['identityEvidence'] == p.get('identityEvidence')
    assert lesson['canonicalInternalNotes'] == p.get('internalNotes', [])
    assert lesson['candidateRoleAdaptation'] == p.get('candidateRoleAdaptation')
    assert lesson['canonicalUnresolvedFields'] == unresolved_fields(p)
    assert lesson['dictionaryReviewPointers'] == ['/' + key for key in ('dictionaryMappings', 'terminologyProposals', 'terminologyEnrichmentReviewScope') if key in p]
    sp = p['sourcePacket']['path']
    assert lesson['sourcePacket']['path'] == sp
    assert sha(sp) == lesson['sourcePacket']['sha256'] == p['sourcePacket']['sha256']
    s = obj(sp)
    assert lesson['sourceDecisionQuestions'] == s['sourceDecisionQuestions']
    for path, expected in s['sourceFileSha256'].items():
        assert path in artifacts and sha(path) == expected, path
    source = {r['id']: r for r in s['reader']}
    canonical = {r['sourceAnchor']: r for r in p['candidateRows'] if ':reader:' in r['sourceAnchor']}
    assert list(canonical) == list(source)
    assert [r['sourceAnchor'] for r in lesson['anchors']] == list(source)
    assert not source_ids.intersection(source)
    source_ids.update(source)
    directory = cp.rsplit('/', 1)[0]
    expected_sidecars = {x for x in paths if x.startswith(directory + '/reader-alternatives-') and x.endswith('.json') and 'ai-assistance' not in x}
    assert {x['artifact']['path'] for x in lesson['sidecars']} == expected_sidecars
    by_anchor = collections.defaultdict(list)
    for side in lesson['sidecars']:
        ap = side['artifact']['path']
        a = obj(ap)
        assert sha(ap) == side['artifact']['sha256']
        assert side['rootReviewContext'] == {k: v for k, v in a.items() if k != 'rows'}
        assert a['canonicalCandidatePath'] == cp and a['canonicalCandidateSha256'] == sha(cp)
        assert a['sourcePacket'] == p['sourcePacket'] and a['gates'] == p['gates']
        closed(a)
        mp = side['assistanceArtifact']['path']
        assert sha(mp) == side['assistanceArtifact']['sha256'] and obj(mp) == side['assistanceEvidence']
        for j, row in enumerate(a['rows']):
            anchor = row['sourceAnchor']
            assert anchor in source
            closed(row)
            assert row['holdResolved'] is row['scoringEnabled'] is False
            for key in ('sourceEnglish', 'sourceSpanish', 'legacySourceRef'):
                assert row[key] == source[anchor][key]
            assert row['originalCandidateHold'] == canonical[anchor]['hold']
            assert row['candidateRowId'] == canonical[anchor]['id']
            for alt in row['alternatives']:
                closed(alt)
                assert alt['scoringEnabled'] is False and alt['candidateFrench']
                assert alt['id'].startswith(p['lessonId'] + ':') and alt['id'] not in alternative_ids
                alternative_ids.add(alt['id'])
            by_anchor[anchor].append({'artifact': side['artifact'], 'rowPointer': f'/rows/{j}', 'row': row})
    counts = collections.Counter()
    for index, entry in enumerate(lesson['anchors']):
        anchor = entry['sourceAnchor']
        cr = canonical[anchor]
        closed(cr)
        assert cr['sourceEnglish'] == source[anchor]['sourceEnglish']
        assert entry['sourceFace'] == source[anchor]
        assert entry['sourcePacketReaderPointer'] == f'/reader/{index}'
        assert entry['canonicalCandidateRow'] == cr
        assert entry['canonicalRowPointer'] == '/candidateRows/' + str(p['candidateRows'].index(cr))
        assert entry['alternativeRows'] == by_anchor[anchor]
        assert entry['chosenFrench'] is None
        has_canonical, has_alternative = bool(cr['candidateFrench']), bool(by_anchor[anchor])
        assert has_canonical or has_alternative, anchor
        expected = 'canonical-proposal-and-alternative' if has_canonical and has_alternative else 'canonical-proposal-only' if has_canonical else 'sidecar-alternative-only'
        assert entry['coverageClassification'] == expected
        counts['sourceReaderAnchors'] += 1
        counts['canonicalCandidateFrenchProposed'] += has_canonical
        counts['canonicalSelectedFrench'] += cr['selectedFrench'] is not None
        counts['anchorsWithSidecarAlternatives'] += has_alternative
        counts['sidecarAlternativeVariants'] += sum(len(x['row']['alternatives']) for x in by_anchor[anchor])
        counts['distinctCoveredAnchors'] += 1
    assert dict(counts) == lesson['counts'] and lesson['actualMissingReaderAnchors'] == []
    totals.update(counts)
    totals['lessons'] += 1
    totals['sidecarFiles'] += len(expected_sidecars)
assert dict(totals) == m['totals']
assert totals['sourceReaderAnchors'] == totals['distinctCoveredAnchors'] == len(source_ids) == 325
assert totals['canonicalCandidateFrenchProposed'] == 24 and totals['canonicalSelectedFrench'] == 0
assert totals['anchorsWithSidecarAlternatives'] == 301 and totals['sidecarAlternativeVariants'] == len(alternative_ids) == 317
assert totals['sidecarFiles'] == 38 and m['remainingReaderAnchors'] == []
assert m['compilerAssistance']['cliCallsAttemptedThisDeliverable'] == 0 and m['compilerAssistance']['newHaikuOpusFableChainClaimed'] is False
assert m['releaseState']['chosenFrench'] == 0
assert all(v is False for k, v in m['releaseState'].items() if k != 'chosenFrench')
# The next gap is checked against actual authored activities, not inferred from row numbering.
full = m['full60AuthoredContentAudit']
assert len(full['lessons']) == 60
aggregate = {s: collections.Counter() for s in ('foundation', 'core', 'master')}
for row in full['lessons']:
    path = row['candidate']['path']
    assert sha(path) == row['candidate']['sha256']
    p = obj(path)
    acts = p['activities']
    assert row['activityModes'] == [a['mode'] for a in acts]
    assert row['activityCount'] == len(acts) == 6
    assert set(row['activityModes']) == {'see', 'recall', 'hear', 'type', 'say', 'write'}
    assert row['distinctActivityTargetCount'] == len({a.get('candidateTargetEnglish') for a in acts})
    assert row['readerLinkedActivityCount'] == sum(any(':reader:' in z for z in a.get('sourceAnchors', [])) for a in acts)
    for key in ('candidateObjectiveEnglish', 'sourceObjectiveEnglish', 'sourceObjectiveCompletionStatus'):
        assert row[key] == p.get(key)
    assert row['speakingLearnerRole'] == p.get('speaking', {}).get('learnerRole')
    assert row['candidateRoleAdaptation'] == p.get('candidateRoleAdaptation')
    for j, activity in enumerate(acts):
        e = row['activities'][j]
        assert e['jsonPointer'] == f'/activities/{j}'
        for key in ('id', 'mode', 'promptEnglish', 'promptFrench', 'candidateTargetEnglish', 'scoringEnabled', 'audioStatus'):
            assert e[key] == activity.get(key)
        assert e['sourceAnchors'] == activity.get('sourceAnchors', [])
    c = aggregate[row['stage']]
    c['lessonCount'] += 1
    c['activityCount'] += len(acts)
    c['readerLinkedActivityCount'] += row['readerLinkedActivityCount']
    c['lessonsWithOriginalObjectiveHeld'] += 'held' in (p.get('sourceObjectiveCompletionStatus') or '').lower()
assert {s: dict(v) for s, v in aggregate.items()} == full['stageCounts']
next_gap = full['nextRealAuthoredGap']
one = next(x for x in full['lessons'] if x['lessonId'] == next_gap['lessonId'])
assert one['lessonId'] == 'master-roofing:1:fr-en' and one['readerLinkedActivityCount'] == 0
assert 'held' in one['sourceObjectiveCompletionStatus'] and one['candidateRoleAdaptation']
assert next_gap['candidatePath'] == one['candidate']['path']
packet = obj(obj(next_gap['candidatePath'])['sourcePacket']['path'])
assert set(next_gap['sourceReaderAnchors']) <= {r['id'] for r in packet['reader']}
print(f'PASS exact-main {EXPECTED_REVISION}: 20 lessons, 325 distinct Reader anchors = 24 canonical proposals + 301 alternative-only anchors; 317 variants/38 sidecars; chosen French 0; all gates closed. Full60 activity/scope evidence and next Master1 content gap verified.')
