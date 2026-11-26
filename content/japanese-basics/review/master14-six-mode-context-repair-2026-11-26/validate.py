#!/usr/bin/env python3
import json,hashlib,re,subprocess
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'activities.json').read_text())
def raw(pin):
 b=subprocess.check_output(['git','show',pin['gitRevision']+':'+pin['path']],cwd=root);assert hashlib.sha256(b).hexdigest()==pin['sha256'];return b
def closed(x):assert x['selectedJapanese'] is x['audioScript'] is None and x['reviewed'] is False
private={k:json.loads(raw(v)) for k,v in p['privateSourcePins'].items() if k!='readerAdapter'};raw(p['privateSourcePins']['readerAdapter'])
main={}
for k,v in p['mainPins'].items():
 b=raw(v)
 if k in p['workspaceByteExactMainPinKeys']:assert (root/v['path']).read_bytes()==b,'Existing value changed: '+v['path']
 main[k]=b
assert p['pair']=={'target':'Japanese','native':'English'} and p['stableLessonKey']=='master-japanese-basics:14';closed(p);assert p['registered'] is False and all(v is False for v in p['gates'].values())
lesson=private['master']['lessons'][13];source=[line.split('|') for line in lesson['dialogue']];support=private['support']['support']['14']['reading'];assert support['target']==[j for j,e in source]+[line.split('|')[0] for line in private['extensions']['14']]
mainLesson=json.loads(main['master'])['lessons'][13];mainSupport=json.loads(main['support'])['master-japanese-basics']['14']['reading'];assert mainLesson!=lesson and len(mainSupport['target'])==13 and len(support['target'])==18
old=private['modes']['lessons'][13]['modes'];assert p['preservedPriorModes']==old;cards=private['curriculum']['lessons'][13]['words'];mainCards=json.loads(main['curriculum'])['lessons'][13]['words'];forms=next(z['prompts'] for z in private['forms']['lessons'] if z['lesson']==14);dictionary=[z for z in private['dictionary'] if z.get('moduleId')=='master-japanese-basics' and 'lesson=14&' in z.get('lessonHref','')]
assert [a['mode'] for a in p['activities']]==['see','recall','hear','type','say','write'];assert len({a['targetJapanese'] for a in p['activities']})==6;ids=[];proposed={c['id']:c for c in p['proposedCardFaces']};covered=0
for a in p['activities']:
 closed(a);ids.append(a['id']);t=a['sourceTurnOneBased'];assert a['sourceKind']=='dialogue' and t==old[a['mode']]['turn'] and [a['targetJapanese'],a['targetEnglish']]==source[t-1];assert a['preservedPriorCue']==old[a['mode']]
 assert all(a[k] for k in ['promptEnglish','contextEnglish','contextJapanese','explanationJapanese','explanationEnglish','targetSpeakerRoleEnglish','learnerPracticeRoleEnglish']);assert all(not re.search('[\u3400-\u4dbf\u4e00-\u9fff]',a[k]) for k in ['contextJapanese','explanationJapanese']);assert all(z and z in a['targetJapanese'] for z in a['wordBankJapanese']);assert ' '.join(a['wordBankJapanese'])==a['targetJapanese'];assert a['targetSpeakerRoleEnglish']=='Narrator' and a['learnerPracticeRoleEnglish']==('Listener' if a['mode']=='hear' else 'Narrator')
 rr=a['readerReference'];assert rr['privateReaderIndexZeroBased']==t-1 and rr['sourceTurnOneBased']==t and rr['sourceRevision']==p['privateSourcePins']['master']['gitRevision']
 assert a['matchingCanonicalFormIds']==[f['id'] for f in forms if f['japaneseAnswer']==a['targetJapanese'] and f['englishPrompt']==a['targetEnglish']];assert a['dictionarySupportRowIds']==[d['id'] for d in dictionary if d['word'] in a['targetJapanese']]
 existing=[i for i,z in enumerate(cards) if z['kind']=='phrase' and z['es']==a['targetJapanese'] and z['en']==a['targetEnglish']];ref=a['cardReference'];assert ref['existingPrivatePhraseRowIndexesZeroBased']==existing and ref['rowIndexesAreStableSavedIds'] is False;assert ref['existingMainPhraseRowIndexesZeroBased']==[i for i,z in enumerate(mainCards) if z['kind']=='phrase' and z['es']==a['targetJapanese'] and z['en']==a['targetEnglish']]
 if existing:covered+=1;assert ref['proposedCardId'] is None
 else:
  c=proposed[ref['proposedCardId']];closed(c);assert c['es']==a['targetJapanese'] and c['en']==a['targetEnglish'] and c['sourceTurnOneBased']==t and c['runtimeSavedCardId'] is None
 if a['mode']=='hear':
  choices=a['choices'];assert len(choices)==3 and {x['sourceTurnOneBased'] for x in choices}=={9,10,11};assert all([x['japanese'],x['english']]==source[x['sourceTurnOneBased']-1] and x['sourceKind']=='dialogue' for x in choices);assert a['hearScriptCandidateJapanese']==a['targetJapanese']
assert covered==2 and len(proposed)==4;ids+=list(proposed);assert len(ids)==len(set(ids))==10
assert sum(len(a['matchingCanonicalFormIds']) for a in p['activities'])==4
scope=p['progressPolicy'];assert json.loads(scope['core30ScopeKeyIndependent'])==['core30',1,'master-japanese-basics','Japanese','English',None];assert scope['sourceVersionInExistingProgressKey'] is scope['sourceAdoptionSelected'] is scope['progressWrites'] is False
assert 'context.enrollmentId ?? null' in main['progressScope'].decode() and 'context.targetLanguage' in main['progressScope'].decode() and 'context.instructionLanguage' in main['progressScope'].decode();assert 'log?.lessons[String(n)]' in main['progressPlan'].decode();assert '`${moduleId}:${entry.id}`' in main['cardState'].decode()
m=json.loads((h/'ai-assistance-metadata.json').read_text());assert m['qualifiedApproval'] is False
for k,name in [('haiku','claude-haiku-5-5'),('opus','claude-opus-5-5'),('fable','claude-fable-5-2')]:assert m[k]['safeMode'] is True and name in m[k]['actualModelUsage'] and m[k]['isError'] is False
print('PASS6exact contextual mode pairs/fullkana/3literal bilingual Hear choices;2existing private phrase links+4inert card projections/4canonical form links/10unique IDs;18private vs13main Reader;19immutable pins/9prior source-data files byte-exact/identity adapters inspected at exact main/closed gates/actual metadata/no progress writes')
