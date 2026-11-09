#!/usr/bin/env python3
"""Build the unregistered French 101 contextual-form activity preview."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/french-basics'
FORM_FILES = sorted(CONTENT.glob('private-form-practice-*-fr-en.json'))
RUNTIME_FILES = [CONTENT / f'private-runtime-{stage}.json' for stage in
                 ('foundation-1-10', 'core-1-30', 'master-1-20')]
OUTPUT = CONTENT / 'private-form-runtime-preview-fr-en.json'


def read(path):
    return json.loads(path.read_text())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def reader_lines(reader):
    if 'sentences' in reader:
        return reader['sentences']
    assert len(reader['target']) == len(reader['native'])
    return [dict(target=target, native=native) for target, native in
            zip(reader['target'], reader['native'])]


def aligned(prompt, line):
    if prompt['frenchAnswer'] == line['target'] and prompt['englishPrompt'] == line['native']:
        return True
    source_target = prompt.get('sourceFrenchLine', prompt.get('sourceReaderTarget'))
    source_native = prompt.get('sourceEnglishLine', prompt['englishPrompt'])
    return (source_target == line['target'] and source_native == line['native'] and
            line['target'].endswith(prompt['frenchAnswer']) and
            line['native'].endswith(prompt['englishPrompt']))


def build():
    runtimes = {}
    sources = []
    for path in RUNTIME_FILES:
        data = read(path)
        assert data['registered'] is False and data['reviewed'] is False
        sources.append(dict(path=str(path.relative_to(ROOT)), sha256=digest(path)))
        for lesson in data['support']:
            key = lesson['stableLessonKey']
            assert key not in runtimes
            runtimes[key] = lesson
    assert len(runtimes) == 60

    lessons = {}
    prompt_ids = set()
    source_counts = {'reader-linked': 0, 'authored-contrast': 0}
    for path in FORM_FILES:
        data = read(path)
        assert data['pairKey'] == 'French:English'
        assert data['registered'] is False and data['reviewed'] is False
        source = ROOT / data['sourceFile']
        if not source.is_file():
            source = CONTENT / data['sourceFile']
        assert digest(source) == data['sourceSha256'], path
        sources.append(dict(path=str(path.relative_to(ROOT)), sha256=digest(path)))
        for lesson in data['lessons']:
            key = lesson['stableLessonKey']
            assert key in runtimes and key not in lessons
            lines = reader_lines(runtimes[key]['reader'])
            activities = []
            for prompt in lesson['prompts']:
                assert prompt['id'] not in prompt_ids and prompt['reviewed'] is False
                assert prompt['practice'] == ['recognize-meaning', 'produce-target']
                prompt_ids.add(prompt['id'])
                linked = 'sourceReaderTurn' in prompt
                if linked:
                    turn = prompt['sourceReaderTurn']
                    assert isinstance(turn, int) and 1 <= turn <= len(lines)
                    assert aligned(prompt, lines[turn - 1]), (key, prompt['id'])
                    source_counts['reader-linked'] += 1
                else:
                    assert prompt['source'] == 'authored-draft-contrast'
                    turn = None
                    source_counts['authored-contrast'] += 1
                common = dict(sourcePromptId=prompt['id'], sourceKind=(
                    'reader-linked' if linked else 'authored-contrast'),
                    sourceReaderTurn=turn, focus=prompt['focus'])
                activities.extend((
                    dict(id=prompt['id'] + ':recognize', mode='recognize-meaning',
                         cue=prompt['frenchAnswer'], answer=prompt['englishPrompt'], **common),
                    dict(id=prompt['id'] + ':produce', mode='produce-target',
                         cue=prompt['englishPrompt'], answer=prompt['frenchAnswer'],
                         knownFrenchVariants=prompt.get('knownFrenchVariants', [prompt['frenchAnswer']]),
                         **common),
                ))
            lessons[key] = dict(stableLessonKey=key, targetLanguage='French',
                                instructionLanguage='English', grammarModel=lesson.get('grammarModel'),
                                activities=activities, reviewed=False)
    assert set(lessons) == set(runtimes)
    assert len(prompt_ids) == 329 and source_counts == {
        'reader-linked': 284, 'authored-contrast': 45}
    return dict(pairKey='French:English', registered=False, reviewed=False,
                sources=sources, lessonCount=60, promptCount=329,
                activityCount=658, sourceCounts=source_counts,
                lessons=[lessons[key] for key in sorted(lessons)])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    serialized = json.dumps(build(), ensure_ascii=False, indent=2) + '\n'
    if args.check:
        assert OUTPUT.read_text() == serialized, 'French form preview needs regeneration'
    else:
        OUTPUT.write_text(serialized)
    print('French 101: 60 lessons, 329 prompts, 658 private activities')


if __name__ == '__main__':
    main()
