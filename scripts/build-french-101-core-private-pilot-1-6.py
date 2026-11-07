#!/usr/bin/env python3
"""Build private French Core 1–6 curriculum fixture; never register it."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DRAFTS=['content/french-basics/core-1-3-draft.json','content/french-basics/core-4-6-draft.json']
OUT='content/french-basics/private-runtime-core-1-6.json'
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def split_dialogue(line):
 parts=line.split('|')
 if len(parts)!=2 or not all(part.strip() for part in parts): raise ValueError(f'unpaired dialogue: {line!r}')
 return {'target':parts[0].strip(),'native':parts[1].strip()}
drafts=[json.loads((ROOT/path).read_text()) for path in DRAFTS]
sources=[]
for path,d in zip(DRAFTS,drafts):
 assert (d['target'],d['native'],d['moduleId'],d['stage'],d['reviewed'])==('French','English','french-basics','core',False)
 src=d['source'];assert src['sourceSha256']==sha(src['path'])
 for source_path,expected in src['sourceFileSha256'].items():assert sha(source_path)==expected
 sources.append({'draftPath':path,'draftSha256':sha(path),'englishSourcePath':src['path'],
   'englishSourceSha256':src['sourceSha256'],'sourceFileSha256':src['sourceFileSha256']})
source_lessons=[lesson for d in drafts for lesson in d['lessons']]
assert [x['n'] for x in source_lessons]==[1,2,3,4,5,6]
lessons=[];support=[]
for l in source_lessons:
 n=l['n'];words=[{'es':w['fr'],'en':w['en'],'kind':w['kind']} for w in l['words']]
 assert len(words)==14 and sum(w['kind']=='term' for w in words)==8 and sum(w['kind']=='phrase' for w in words)==6
 reader={'title':l['reading']['title'],'language':'French','nativeLanguage':'English',
         'target':l['reading']['target'],'native':l['reading']['native']}
 assert [w['es'] for w in words if w['kind']=='phrase']==reader['target']
 assert [w['en'] for w in words if w['kind']=='phrase']==reader['native']
 dialogue=[split_dialogue(line) for line in l['dialogue']]
 assert 5<=len(dialogue)<=9
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
 'sources':sources,
 'coreCurriculum':{'moduleId':'french-basics','headline':'French 101 Core 30 private pilot',
  'threshold':'Practice everyday French sentences and explain how regular and irregular verbs work.',
  'lessons':lessons},'support':support}
(ROOT/OUT).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {OUT}: 6 unregistered Core lessons, {sum(len(x["cards"]) for x in support)} cards, {sum(len(x["reader"]["target"]) for x in support)} Reader pairs')
