#!/usr/bin/env python3
"""Build an unregistered French Foundation 1–3 fixture for pair-safe runtime testing."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DRAFT='content/french-basics/foundation-1-3-draft.json'
OUT='content/french-basics/private-runtime-foundation-1-3.json'

def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def split_dialogue(line):
    parts=line.split('|')
    if len(parts)!=2 or not all(part.strip() for part in parts): raise ValueError(f'unpaired dialogue: {line!r}')
    return {'target':parts[0].strip(),'native':parts[1].strip()}

draft=json.loads((ROOT/DRAFT).read_text())
assert (draft['target'],draft['native'],draft['moduleId'],draft['stage'],draft['reviewed'])==('French','English','french-basics','foundation',False)
source=draft['source']
assert source['sourceSha256']==sha(source['path'])
assert [lesson['n'] for lesson in draft['lessons']]==[1,2,3]
lessons=[];support=[]
for lesson in draft['lessons']:
    n=lesson['n']
    words=[{'es':w['fr'],'en':w['en'],'kind':w['kind']} for w in lesson['words']]
    assert all(w['es'].strip() and w['en'].strip() for w in words)
    dialogue=[split_dialogue(line) for line in lesson['dialogue']]
    assert dialogue
    checks=lesson['checks']
    assert {'recall','write','listening','comprehension'}=={c['type'] for c in checks}
    assert all(c.get('locale')=='fr-FR' and c.get('voiceStatus')=='script-only; no recorded audio' for c in checks if c['type']=='listening')
    lessons.append({'n':n,'title':lesson['title'],'objective':lesson['objective'],'focus':lesson['focus'],
                    'words':words,'speaking':lesson['speaking']})
    support.append({'n':n,'stableLessonKey':f'foundation-french-basics:{n}',
       'reader':{'language':'French','nativeLanguage':'English','sentences':dialogue},
       'cards':[{'target':w['es'],'native':w['en'],'kind':w['kind']} for w in words],
       'dictionaryEntries':[{'target':w['es'],'native':w['en']} for w in words if w['kind']=='term'],
       'checks':checks,'speaking':{'locale':'fr-FR','brief':lesson['speaking'],'recordedAudio':False},
       'modes':{
           'see':{'readerLineCount':len(dialogue)},
           'recall':{'cardCount':len(words)},
           'hear':{'scriptCount':len(dialogue),'recordedAudio':False},
           'type':{'cardCount':len(words)},
           'say':{'speakingBrief':lesson['speaking'],'recordedAudio':False},
           'write':{'cardCount':len(words)},
       }})
result={
 'privatePilot':True,'registered':False,'reviewed':False,'audioStatus':'script-only; no recorded audio',
 'source':{'draftPath':DRAFT,'draftSha256':sha(DRAFT),'spanishSourcePath':source['path'],
           'spanishSourceSha256':source['sourceSha256'],'spanishSourceSubsetSha256':source['sourceSubsetSha256']},
 'stageFile':{'version':1,'module':'foundation-french-basics','baseModule':'french-basics',
              'stage':'foundation','language':'French','nativeLanguage':'English',
              'headline':'French 101 Foundation private pilot',
              'threshold':'Greet someone, use French articles and plurals, and ask simple questions.',
              'reviewed':False,'lessons':lessons},
 'support':support}
(ROOT/OUT).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {OUT}: {len(lessons)} unregistered lessons, {sum(len(x["cards"]) for x in support)} cards, {sum(len(x["reader"]["sentences"]) for x in support)} Reader pairs')
