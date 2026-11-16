"""Inventory exact verified-HD clip reuse; never synthesize or label a device voice as a recording."""
import json,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
normalize=lambda s:re.sub(r'[.!?¿¡,;:]+$','',re.sub(r'\s+',' ',unicodedata.normalize('NFC',s).strip().lower()))
texts={}
for base in ['accounting','personal-money','travel-money']:
 for pair,language in [('es-en','Spanish'),('en-es','English')]:
  path=ROOT/f'content/finance/{base}/{pair}.json'
  rows=json.loads(path.read_text())
  for row in rows:
   context=f'{base}:{pair}:{row["stage"]}:{row["lesson"]["n"]}'
   content=row['content'];lesson=row['lesson']
   items=[w['es']for w in lesson['words']]+content['passage']['target']+[lesson['openingLine']]
   for v in content['verbs']:items += [v['infinitive'],v['example']['target']]+list(v['forms'].values())
   for text in items:
    key=(language,normalize(text));entry=texts.setdefault(key,{'language':language,'text':text,'normalizedText':key[1],'contexts':set()});entry['contexts'].add(context)
manifest=json.loads((ROOT/'src/data/spanish-next-recordings.json').read_text())
entries=[];summary={}
for (language,key),e in sorted(texts.items()):
 clips={}
 for gender in ['female','male']:
  name=manifest.get('entries',{}).get(key,{}).get(gender) if language=='Spanish' else None
  path=ROOT/f'public/audio/spanish-next/{name}.mp3' if name else None
  if name and re.fullmatch(r'es-next-[a-f0-9]{20}-(female|male)',name) and path.is_file() and path.stat().st_size>500:clips[gender]=str(path.relative_to(ROOT/'public'))
 e['contexts']=sorted(e['contexts']);e['recordings']=clips;e['status']='recorded' if len(clips)==2 else 'partial' if clips else 'missing';entries.append(e)
for language in ['Spanish','English']:
 selected=[e for e in entries if e['language']==language]
 summary[language]={'uniqueTexts':len(selected),'existingVerifiedHdClips':sum(len(e['recordings'])for e in selected),'missingVoiceClips':sum(2-len(e['recordings'])for e in selected),'targetCharactersPerVoice':sum(len(e['text'])for e in selected)}
out={'version':1,'scope':'Exact recorded HD reuse only; online cloud playback is separate. No synthesis performed.','humanReviewed':False,'voices':{lang:{gender:f'{code}-Chirp3-HD-{voice}'for gender,voice in [('female','Aoede'),('male','Charon')]}for lang,code in [('Spanish','es-US'),('English','en-US')]},'summary':summary,'entries':entries}
(ROOT/'content/finance/audio-inventory.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,indent=2))
