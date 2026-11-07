#!/usr/bin/env python3
"""Build private French Core 1–3 curriculum fixture; never register it."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DRAFT='content/french-basics/core-1-3-draft.json'
OUT='content/french-basics/private-runtime-core-1-3.json'
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def split_dialogue(line):
 parts=line.split('|')
 if len(parts)!=2 or not all(part.strip() for part in parts): raise ValueError(f'unpaired dialogue: {line!r}')
 return {'target':parts[0].strip(),'native':parts[1].strip()}
d=json.loads((ROOT/DRAFT).read_text())
assert (d['target'],d['native'],d['moduleId'],d['stage'],d['reviewed'])==('French','English','french-basics','core',False)
s=d['source'];assert s['sourceSha256']==sha(s['path'])
for path,expected in s['sourceFileSha256'].items():assert sha(path)==expected
assert [x['n'] for x in d['lessons']]==[1,2,3]
lessons=[];support=[]
for l in d['lessons']:
 n=l['n'];words=[{'es':w['fr'],'en':w['en'],'kind':w['kind']} for w in l['words']]
 assert len(words)==14 and sum(w['kind']=='term' for w in words)==8 and sum(w['kind']=='phrase' for w in words)==6
 reader={'title':l['reading']['title'],'language':'French','nativeLanguage':'English',
         'target':l['reading']['target'],'native':l['reading']['native']}
 assert [w['es'] for w in words if w['kind']=='phrase']==reader['target']
 assert [w['en'] for w in words if w['kind']=='phrase']==reader['native']
 dialogue=[split_dialogue(line) for line in l['dialogue']]
 assert len(dialogue)==len(reader['target'])+1
 assert {'recall','write','listening','comprehension'}<={c['type'] for c in l['checks']}
 assert all(c.get('locale')=='fr-FR' and c.get('voiceStatus')=='script-only; no recorded audio' for c in l['checks'] if c['type']=='listening')
 lessons.append({'n':n,'title':l['title'],'objective':l['objective'],'words':words,
   'grammar':{'focus':l['focus'],'examples':[{'es':fr,'en':en} for fr,en in zip(reader['target'][:2],reader['native'][:2])]},
   'steps':[{'tab':'reader','tabLabel':'Reader','instruction':f'Read {l["title"]}; explain the French grammar in your own words.','durationMin':5},
            {'tab':'wordMatch','tabLabel':'Word Match','instruction':'Recall the words and build the lesson sentences, then check and retry.','durationMin':5},
            {'tab':'speak','tabLabel':'Speak & Learn','instruction':l['speaking'],'durationMin':6}]})
 support.append({'n':n,'stableLessonKey':f'french-basics:{n}','stageCardIndexes':list(range(len(words))),
   'cards':[{'target':w['es'],'native':w['en'],'kind':w['kind']} for w in words],
   'backlogCards':[],
   'dictionaryEntries':[{'target':w['es'],'native':w['en']} for w in words if w['kind']=='term'],
   'reader':reader,'dialogue':dialogue,'grammarNotes':l['grammar'],'checks':l['checks'],
   'speaking':{'locale':'fr-FR','brief':l['speaking'],'recordedAudio':False},
   'modes':{'see':{'readerLineCount':len(reader['target'])},'recall':{'cardCount':len(words)},
     'hear':{'scriptCount':len(reader['target']),'recordedAudio':False},
     'type':{'cardCount':len(words)},'say':{'speakingBrief':l['speaking'],'recordedAudio':False},
     'write':{'cardCount':len(words)}}})
result={'privatePilot':True,'registered':False,'reviewed':False,'audioStatus':'script-only; no recorded audio',
 'target':'French','native':'English',
 'source':{'draftPath':DRAFT,'draftSha256':sha(DRAFT),'englishSourcePath':s['path'],
           'englishSourceSha256':s['sourceSha256'],'sourceFileSha256':s['sourceFileSha256']},
 'coreCurriculum':{'moduleId':'french-basics','headline':'French 101 Core 30 private pilot',
  'threshold':'Practice everyday French sentences and explain how regular and irregular verbs work.',
  'lessons':lessons},'support':support}
(ROOT/OUT).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {OUT}: 3 unregistered Core lessons, {sum(len(x["cards"]) for x in support)} cards, {sum(len(x["reader"]["target"]) for x in support)} Reader pairs')
