#!/usr/bin/env python3
"""Build an unregistered French Foundation 1–6 fixture for pair-safe runtime testing."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DRAFTS=['content/french-basics/foundation-1-3-draft.json','content/french-basics/foundation-4-6-draft.json']
OUT='content/french-basics/private-runtime-foundation-1-6.json'
PLAN='content/french-basics/foundation-1-6-curation-plan.json'

def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def split_dialogue(line):
    parts=line.split('|')
    if len(parts)!=2 or not all(part.strip() for part in parts): raise ValueError(f'unpaired dialogue: {line!r}')
    return {'target':parts[0].strip(),'native':parts[1].strip()}

drafts=[json.loads((ROOT/path).read_text()) for path in DRAFTS]
for draft in drafts:
    assert (draft['target'],draft['native'],draft['moduleId'],draft['stage'],draft['reviewed'])==('French','English','french-basics','foundation',False)
    assert draft['source']['sourceSha256']==sha(draft['source']['path'])
authored=[lesson for draft in drafts for lesson in draft['lessons']]
assert [lesson['n'] for lesson in authored]==list(range(1,7))
plan=json.loads((ROOT/PLAN).read_text())
assert [item['n'] for item in plan['lessons']]==list(range(1,7))
lessons=[];support=[]
for lesson,selection in zip(authored,plan['lessons']):
    n=lesson['n']
    words=[{'es':w['fr'],'en':w['en'],'kind':w['kind']} for w in lesson['words']]
    assert all(w['es'].strip() and w['en'].strip() for w in words)
    selected=selection['selectedWordIndexes']
    assert selected==sorted(set(selected)) and all(0<=i<len(words) for i in selected)
    stage_words=[words[i] for i in selected]
    assert 8<=sum(w['kind']=='term' for w in stage_words)<=12
    assert 4<=sum(w['kind']=='phrase' for w in stage_words)<=6
    dialogue=[split_dialogue(line) for line in lesson['dialogue']]
    assert dialogue
    checks=lesson['checks']
    assert {'recall','write','listening','comprehension'}=={c['type'] for c in checks}
    assert all(c.get('locale')=='fr-FR' and c.get('voiceStatus')=='script-only; no recorded audio' for c in checks if c['type']=='listening')
    lessons.append({'n':n,'title':lesson['title'],'objective':lesson['objective'],'focus':lesson['focus'],
                    'words':stage_words,'speaking':lesson['speaking']})
    support.append({'n':n,'stableLessonKey':f'foundation-french-basics:{n}',
       'reader':{'language':'French','nativeLanguage':'English','sentences':dialogue},
       'cards':[{'target':w['es'],'native':w['en'],'kind':w['kind']} for w in words],
       'stageCardIndexes':selected,
       'backlogCards':[{'target':w['es'],'native':w['en'],'kind':w['kind']} for i,w in enumerate(words) if i not in selected],
       'dictionaryEntries':[{'target':w['es'],'native':w['en']} for w in words if w['kind']=='term'],
       'checks':checks,'speaking':{'locale':'fr-FR','brief':lesson['speaking'],'recordedAudio':False},
       'modes':{
           'see':{'readerLineCount':len(dialogue)},
           'recall':{'cardCount':len(stage_words)},
           'hear':{'scriptCount':len(dialogue),'recordedAudio':False},
           'type':{'cardCount':len(stage_words)},
           'say':{'speakingBrief':lesson['speaking'],'recordedAudio':False},
           'write':{'cardCount':len(stage_words)},
       }})
result={
 'privatePilot':True,'registered':False,'reviewed':False,'audioStatus':'script-only; no recorded audio',
 'sources':[{'draftPath':path,'draftSha256':sha(path),
             'spanishSourcePath':draft['source']['path'],
             'spanishSourceSha256':draft['source']['sourceSha256'],
             'spanishSourceSubsetSha256':draft['source']['sourceSubsetSha256']}
            for path,draft in zip(DRAFTS,drafts)],
 'curationPlanPath':PLAN,'curationPlanSha256':sha(PLAN),
 'stageFile':{'version':1,'module':'foundation-french-basics','baseModule':'french-basics',
              'stage':'foundation','language':'French','nativeLanguage':'English',
              'headline':'French 101 Foundation private pilot',
              'threshold':'Greet someone, use French articles and plurals, and ask simple questions.',
              'reviewed':False,'lessons':lessons},
 'support':support}
(ROOT/OUT).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {OUT}: {len(lessons)} unregistered lessons, {sum(len(x["cards"]) for x in support)} cards, {sum(len(x["reader"]["sentences"]) for x in support)} Reader pairs')
