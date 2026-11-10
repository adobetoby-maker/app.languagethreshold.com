#!/usr/bin/env python3
"""Run the capped, resumable private French Lunch synthesis batches."""
import argparse
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
GENERATOR = HERE / 'generate-french-lunch-hd-audio.py'
STAGES = (('foundation', 10), ('core', 30), ('master', 20))


def invoke(stage, lesson, project, limit, generate):
    command = [sys.executable, str(GENERATOR), '--stage', stage,
               '--lesson', str(lesson), '--project', project, '--limit', str(limit)]
    if generate:
        command.append('--generate')
    process = subprocess.run(command, text=True, capture_output=True)
    if process.returncode:
        raise RuntimeError(f'{stage} {lesson} failed: {process.stderr.strip()}')
    rows = [json.loads(line) for line in process.stdout.splitlines()]
    if not rows:
        raise ValueError('Generator returned no result')
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', required=True)
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--max-new-clips', type=int, default=20)
    args = parser.parse_args()
    if not 1 <= args.max_new_clips <= 2654:
        raise SystemExit('--max-new-clips must be between 1 and the pinned 2,654-clip scope')
    generated = 0
    complete = 0
    for stage, count in STAGES:
        for lesson in range(1, count + 1):
            while True:
                available = args.max_new_clips - generated
                if available == 0:
                    print(json.dumps({'completeLessons': complete, 'generatedThisRun': generated,
                                      'budgetExhausted': True}), flush=True)
                    return
                rows = invoke(stage, lesson, args.project, min(20, available), args.generate)
                plan = rows[0]
                if not args.generate:
                    print(json.dumps({'stage': stage, 'lesson': lesson, **plan}), flush=True)
                    break
                new = rows[-1]['generatedClips']
                if new != plan['plannedClips']:
                    raise ValueError('Generation count differs from planned batch')
                generated += new
                if plan['remainingClips'] == 0:
                    complete += 1
                    print(json.dumps({'stage': stage, 'lesson': lesson,
                                      'verified': plan['verifiedClips'],
                                      'reused': plan['reusedClips'],
                                      'generatedThisRun': generated,
                                      'completeLessons': complete}), flush=True)
                    break
                if new == 0:
                    raise ValueError('Incomplete lesson made no progress')
    print(json.dumps({'completeLessons': complete, 'generatedThisRun': generated,
                      'fullCourseCandidateSynthesized': complete == 60}), flush=True)


if __name__ == '__main__':
    main()
