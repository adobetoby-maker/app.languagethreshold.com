#!/usr/bin/env python3
"""Pin five exact French 101 Foundation 1 card strings for private listening."""
import argparse
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'content/french-basics/foundation-1-3-draft.json'
OUTPUT=ROOT/'content/french-basics/private-audio-pilot-foundation-1.json'
TEXTS=['bonjour','je m’appelle','Comment vous appelez-vous ?','enchantée','Ça va bien, merci.']
def sha(raw):return hashlib.sha256(raw).hexdigest()
def build():
    raw=SOURCE.read_bytes();source=json.loads(raw)
    assert source['target']=='French' and source['native']=='English' and source['reviewed'] is False
    lesson=next(l for l in source['lessons'] if l['n']==1)
    assert len(TEXTS)==len(set(TEXTS))==5
    rows=[]
    for text in TEXTS:
        matches=[i for i,w in enumerate(lesson['words'],1) if w['fr']==text and w['en']]
        assert len(matches)==1
        rows.append({'text':text,'sha256':sha(text.encode()),'occurrences':[{'draftLessonKey':'foundation:1','field':f'cards[{matches[0]}].targetFrench'}]})
    return {'schema':1,'state':'private-audio-pilot-unsynthesized','moduleId':'french-basics',
       'pairKey':'French:English','locale':'fr-FR','draftLessonKey':'foundation:1',
       'sourceFile':str(SOURCE.relative_to(ROOT)),'sourceSha256':sha(raw),
       'reviewed':False,'recordingsGenerated':False,'listeningReviewed':False,'registered':False,
       'counts':{'uniqueExactTexts':5,'twoVoiceClips':10,'unicodeCharactersPerVoice':sum(map(len,TEXTS))},
       'exactTextSha256':sha('\n'.join(TEXTS).encode()),'texts':rows}
def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args()
    encoded=json.dumps(build(),ensure_ascii=False,indent=2)+'\n'
    if args.check:assert OUTPUT.read_text()==encoded,'French 101 pilot is stale'
    else:OUTPUT.write_text(encoded)
    print('French 101 Foundation 1 private audio pilot verified')
if __name__=='__main__':main()
