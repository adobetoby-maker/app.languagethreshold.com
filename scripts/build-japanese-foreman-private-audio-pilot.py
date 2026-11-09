#!/usr/bin/env python3
"""Pin five exact Foundation 1 Japanese strings for private listening review."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCOPE=ROOT/'docs/japanese-program/foreman-exact-audio-scope-2026-11-08.json'
OUTPUT=ROOT/'docs/japanese-program/foreman-private-audio-pilot-foundation-1.json'
TEXTS=['ヘルメット','安全ベスト','親方','みなさん、おはようございます！','はじめまして。私はカルロスです。']
def sha(raw): return hashlib.sha256(raw).hexdigest()
def build():
    raw=SCOPE.read_bytes();scope=json.loads(raw);assert scope['pairKey']=='Japanese:English' and scope['locale']=='ja-JP'
    index={row['text']:row for row in scope['texts']};rows=[index[text] for text in TEXTS]
    assert len(rows)==len(set(TEXTS))==5
    assert all(any(o['draftLessonKey']=='foundation:1' for o in row['occurrences']) for row in rows)
    return {'schema':1,'state':'private-audio-pilot-unsynthesized','moduleId':'construction-foreman',
      'pairKey':'Japanese:English','locale':'ja-JP','draftLessonKey':'foundation:1',
      'sourceFilesSHA256':scope['sourceFilesSHA256'],'sourceInventorySha256':sha(raw),
      'reviewed':False,'recordingsGenerated':False,'listeningReviewed':False,'registered':False,
      'counts':{'uniqueExactTexts':5,'twoVoiceClips':10,'unicodeCharactersPerVoice':sum(map(len,TEXTS))},
      'exactTextSha256':sha('\n'.join(TEXTS).encode()),'texts':rows}
def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args()
    encoded=json.dumps(build(),ensure_ascii=False,indent=2)+'\n'
    if args.check:assert OUTPUT.read_text()==encoded,'Foreman audio pilot is stale'
    else:OUTPUT.write_text(encoded)
    print('Japanese Foreman Foundation 1 private pilot verified')
if __name__=='__main__':main()
