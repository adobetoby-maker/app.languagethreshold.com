#!/usr/bin/env python3
"""Pin exact visible Japanese Foreman card and Reader strings, privately."""
import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "content/japanese-construction-foreman"
OUTPUT = ROOT / "docs/japanese-program/foreman-exact-audio-scope-2026-11-08.json"
PATTERNS = {"foundation": ("foundation-runtime-draft-ja-en.json", 10),
            "core": ("core-runtime-pilot-*-ja-en.json", 30),
            "master": ("master-runtime-pilot-*-ja-en.json", 20)}

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def build():
    source=[]; occurrence=defaultdict(list); counts=defaultdict(int); stages={}
    for stage,(pattern,expected) in PATTERNS.items():
        numbers=set(); stage_files=sorted(COURSE.glob(pattern))
        assert stage_files
        for path in stage_files:
            raw=path.read_bytes(); data=json.loads(raw)
            assert data['target']=='Japanese' and data['native']=='English' and data['reviewed'] is False
            source.append({'path':str(path.relative_to(ROOT)),'sha256':sha(raw)})
            for lesson in data['lessons']:
                n=lesson['n']; assert n not in numbers and lesson['reviewed'] is False
                numbers.add(n); key=f'{stage}:{n}'
                for index,word in enumerate(lesson['words'],1):
                    text=word['es']; assert isinstance(text,str) and text and word['en']
                    occurrence[text].append({'draftLessonKey':key,'field':f'cards[{index}].targetJapanese'})
                    counts['cards']+=1
                for index,line in enumerate(lesson['reader']['sentences'],1):
                    text=line['target'];assert isinstance(text,str) and text and line['native']
                    occurrence[text].append({'draftLessonKey':key,'field':f'reader[{index}].targetJapanese'})
                    counts['reader']+=1
        assert numbers==set(range(1,expected+1))
        stages[stage]=expected
    texts=sorted(occurrence)
    return {'schema':1,'state':'private-audio-scope-draft','moduleId':'construction-foreman',
      'pairKey':'Japanese:English','locale':'ja-JP','sourceFiles':source,
      'sourceFilesSHA256':sha(json.dumps(source,sort_keys=True,separators=(',',':')).encode()),
      'reviewed':False,'registered':False,'recordingsGenerated':False,'listeningReviewed':False,
      'includedFields':['cards[].targetJapanese','reader[].targetJapanese'],
      'excludedFields':['English support','grammar','speaking','feedback'],
      'stageCounts':stages,'counts':{'lessons':60,'placementsByField':dict(counts),
       'uniqueExactTexts':len(texts),'twoVoiceClips':len(texts)*2,
       'unicodeCharactersPerVoice':sum(map(len,texts))},
      'exactTextSha256':sha('\n'.join(texts).encode()),
      'texts':[{'text':text,'sha256':sha(text.encode()),'occurrences':occurrence[text]} for text in texts]}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    encoded=json.dumps(build(),ensure_ascii=False,indent=2)+'\n'
    if args.check: assert OUTPUT.read_text()==encoded,'Foreman exact audio scope is stale'
    else: OUTPUT.write_text(encoded)
    print('Japanese Foreman exact private audio scope verified')

if __name__=='__main__':main()
