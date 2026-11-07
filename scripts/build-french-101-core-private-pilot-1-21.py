#!/usr/bin/env python3
"""Build private French Core 1–21 curriculum fixture; never register it."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DRAFTS=['content/french-basics/core-1-3-draft.json','content/french-basics/core-4-6-draft.json','content/french-basics/core-7-9-draft.json','content/french-basics/core-10-12-draft.json','content/french-basics/core-13-15-draft.json','content/french-basics/core-16-18-draft.json','content/french-basics/core-19-21-draft.json']
OUT='content/french-basics/private-runtime-core-1-21.json'
OVERLAY='content/french-basics/core-1-9-language-support-overrides.json'
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
assert [x['n'] for x in source_lessons]==list(range(1,22))
overlay=json.loads((ROOT/OVERLAY).read_text())
new_overlay=json.loads((ROOT/'content/french-basics/core-10-12-language-support-overrides.json').read_text())
assert (new_overlay['schema'],new_overlay['target'],new_overlay['native'],new_overlay['reviewed'])==(1,'French','English',False)
third_overlay=json.loads((ROOT/'content/french-basics/core-13-15-language-support-overrides.json').read_text())
assert (third_overlay['schema'],third_overlay['target'],third_overlay['native'],third_overlay['reviewed'])==(1,'French','English',False)
fourth_overlay=json.loads((ROOT/'content/french-basics/core-16-18-language-support-overrides.json').read_text())
assert (fourth_overlay['schema'],fourth_overlay['target'],fourth_overlay['native'],fourth_overlay['reviewed'])==(1,'French','English',False)
fifth_overlay=json.loads((ROOT/'content/french-basics/core-19-21-language-support-overrides.json').read_text())
assert (fifth_overlay['schema'],fifth_overlay['target'],fifth_overlay['native'],fifth_overlay['reviewed'])==(1,'French','English',False)
for key in ('cardOverrides','dialogueOverrides','grammarOverrides'):
 overlay[key].extend(new_overlay[key])
 overlay[key].extend(third_overlay[key])
 overlay[key].extend(fourth_overlay[key])
 overlay[key].extend(fifth_overlay[key])
assert (overlay['schema'],overlay['target'],overlay['native'],overlay['reviewed'])==(1,'French','English',False)
card_overrides={(entry['lesson'],entry['cardIndex']):entry for entry in overlay['cardOverrides']}
grammar_overrides={entry['lesson']:entry for entry in overlay['grammarOverrides']}
caution_overrides={entry['lesson']:entry for entry in new_overlay['cautionOverrides']+third_overlay['cautionOverrides']+fourth_overlay['cautionOverrides']+fifth_overlay['cautionOverrides']}
dialogue_overrides={(entry['lesson'],entry['lineIndex']):entry for entry in overlay['dialogueOverrides']}
assert len(card_overrides)==len(overlay['cardOverrides']) and len(grammar_overrides)==len(overlay['grammarOverrides'])
assert len(dialogue_overrides)==len(overlay['dialogueOverrides'])
model_overrides={(entry['lesson'],entry['key']):entry for entry in fifth_overlay['modelOverrides']}
assert len(model_overrides)==len(fifth_overlay['modelOverrides'])
lessons=[];support=[]
for l in source_lessons:
 n=l['n'];source_words=[{'es':w['fr'],'en':w['en'],'kind':w['kind']} for w in l['words']]
 authored_words=[w.copy() for w in source_words]
 assert len(authored_words)==14 and sum(w['kind']=='term' for w in authored_words)==8 and sum(w['kind']=='phrase' for w in authored_words)==6
 for (lesson,index),entry in card_overrides.items():
  if lesson!=n:continue
  assert 0<=index<len(authored_words)
  assert entry['from']=={'target':source_words[index]['es'],'native':source_words[index]['en']}
  authored_words[index].update(es=entry['to']['target'],en=entry['to']['native'])
  assert authored_words[index]['es'] and authored_words[index]['en']
 selected=list(range(len(authored_words)))
 supplemental=[]
 if n==7:
  # Spanish los/las both become French les. Retain both source pairs, but only one
  # duplicate in the practice set; use a contextual park term from the reading.
  assert source_words[2:4]==[{'es':'les','en':'the / them (masculine plural)','kind':'term'},
                             {'es':'les','en':'the / them (feminine plural)','kind':'term'}]
  selected.remove(3)
  supplemental=[{'es':'parc','en':'park','kind':'term'}]
 if n==14:
  # Spanish masculine/feminine plural forms both collapse to French les.
  # Keep both cards for deck provenance; curate the practice set to one les.
  assert source_words[6:8]==[{'es':'les','en':'the / them (masculine plural)','kind':'term'},
                             {'es':'les','en':'the / them (feminine plural)','kind':'term'}]
  selected.remove(7)
  supplemental=[{'es':'aide','en':'help','kind':'term'}]
 words=[authored_words[i] for i in selected if authored_words[i]['kind']=='term']+supplemental+[authored_words[i] for i in selected if authored_words[i]['kind']=='phrase']
 assert len(words)==14 and sum(w['kind']=='term' for w in words)==8 and sum(w['kind']=='phrase' for w in words)==6
 source_reader={'title':l['reading']['title'],'language':'French','nativeLanguage':'English',
                'target':l['reading']['target'],'native':l['reading']['native']}
 assert [w['es'] for w in source_words if w['kind']=='phrase']==source_reader['target']
 assert [w['en'] for w in source_words if w['kind']=='phrase']==source_reader['native']
 reader={'title':source_reader['title'],'language':'French','nativeLanguage':'English',
         'target':[w['es'] for w in authored_words if w['kind']=='phrase'],
         'native':[w['en'] for w in authored_words if w['kind']=='phrase']}
 assert [w['es'] for w in words if w['kind']=='phrase']==reader['target']
 assert [w['en'] for w in words if w['kind']=='phrase']==reader['native']
 source_dialogue=[split_dialogue(line) for line in l['dialogue']]
 dialogue=json.loads(json.dumps(source_dialogue))
 for (lesson,index),entry in dialogue_overrides.items():
  if lesson!=n:continue
  assert 0<=index<len(dialogue) and dialogue[index]==entry['from']
  dialogue[index]=entry['to']
 assert 5<=len(dialogue)<=9
 assert {'recall','write','listening','comprehension'}<={c['type'] for c in l['checks']}
 assert all(c.get('locale')=='fr-FR' and c.get('voiceStatus')=='script-only; no recorded audio' for c in l['checks'] if c['type']=='listening')
 grammar_notes=json.loads(json.dumps(l['grammar']))
 if n in grammar_overrides:
  entry=grammar_overrides[n]
  assert grammar_notes['explanation']==entry['from']
  grammar_notes['explanation']=entry['to']
 if n in caution_overrides:
  caution=caution_overrides[n]
  assert grammar_notes['caution']==caution['from']
  grammar_notes['caution']=caution['to']
 for (lesson,key),entry in model_overrides.items():
  if lesson!=n:continue
  assert grammar_notes['model'][key]==entry['from']
  grammar_notes['model'][key]=entry['to']
 lessons.append({'n':n,'title':l['title'],'objective':l['objective'],'words':words,
   'grammar':{'focus':l['focus'],'examples':[{'es':fr,'en':en} for fr,en in zip(reader['target'][:2],reader['native'][:2])]},
   'steps':[{'tab':'reader','tabLabel':'Reader','instruction':f'Read {l["title"]}; explain the French grammar in your own words.','durationMin':5},
            {'tab':'wordMatch','tabLabel':'Word Match','instruction':'Recall the words and build the lesson sentences, then check and retry.','durationMin':5},
            {'tab':'speak','tabLabel':'Speak & Learn','instruction':l['speaking'],'durationMin':6}]})
 support.append({'n':n,'stableLessonKey':f'french-basics:{n}','stageCardIndexes':selected,
   'cards':[{'target':w['es'],'native':w['en'],'kind':w['kind']} for w in authored_words],
   'sourceCards':[{'target':w['es'],'native':w['en'],'kind':w['kind']} for w in source_words],
   'backlogCards':[{'target':authored_words[i]['es'],'native':authored_words[i]['en'],'kind':authored_words[i]['kind']} for i in range(len(authored_words)) if i not in selected],
   'supplementalCards':[{'target':w['es'],'native':w['en'],'kind':w['kind']} for w in supplemental],
   'dictionaryEntries':[{'target':w['es'],'native':w['en']} for w in authored_words if w['kind']=='term']+[{'target':w['es'],'native':w['en']} for w in supplemental],
   'reader':reader,'sourceReader':source_reader,'dialogue':dialogue,'sourceDialogue':source_dialogue,
   'grammarNotes':grammar_notes,'sourceGrammarNotes':l['grammar'],'checks':l['checks'],
   'speaking':{'locale':'fr-FR','brief':l['speaking'],'recordedAudio':False},
   'modes':{'see':{'readerLineCount':len(reader['target'])},'recall':{'cardCount':len(words)},
     'hear':{'scriptCount':len(reader['target']),'recordedAudio':False},
     'type':{'cardCount':len(words)},'say':{'speakingBrief':l['speaking'],'recordedAudio':False},
     'write':{'cardCount':len(words)}}})
result={'privatePilot':True,'registered':False,'reviewed':False,'audioStatus':'script-only; no recorded audio',
 'target':'French','native':'English',
 'sources':sources,
 'supportOverlayPath':OVERLAY,'supportOverlaySha256':sha(OVERLAY),
 'nextSupportOverlayPath':'content/french-basics/core-10-12-language-support-overrides.json',
 'nextSupportOverlaySha256':sha('content/french-basics/core-10-12-language-support-overrides.json'),
 'thirdSupportOverlayPath':'content/french-basics/core-13-15-language-support-overrides.json',
 'thirdSupportOverlaySha256':sha('content/french-basics/core-13-15-language-support-overrides.json'),
 'fourthSupportOverlayPath':'content/french-basics/core-16-18-language-support-overrides.json',
 'fourthSupportOverlaySha256':sha('content/french-basics/core-16-18-language-support-overrides.json'),
 'fifthSupportOverlayPath':'content/french-basics/core-19-21-language-support-overrides.json',
 'fifthSupportOverlaySha256':sha('content/french-basics/core-19-21-language-support-overrides.json'),
 'coreCurriculum':{'moduleId':'french-basics','headline':'French 101 Core 30 private pilot',
  'threshold':'Practice everyday French sentences and explain how regular and irregular verbs work.',
  'lessons':lessons},'support':support}
(ROOT/OUT).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {OUT}: 21 unregistered Core lessons, {sum(len(x["cards"]) for x in support)} cards, {sum(len(x["reader"]["target"]) for x in support)} Reader pairs')
