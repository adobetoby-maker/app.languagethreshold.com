import os
"""Maintain a reusable audio inventory and export completed recordings to both web apps.
Does not synthesize audio or deploy. Safe to rerun while generation is active.
"""
import argparse,concurrent.futures,hashlib,json,os,shutil,sqlite3,subprocess,time
from pathlib import Path
root=Path(os.environ['LT_NATIVE_SOURCE']).resolve()
bank=Path(os.environ.get('LT_AUDIO_LIBRARY', '/Volumes/Drive 2/language-threshold-audio-library'));bank.mkdir(parents=True,exist_ok=True)
voices={'female':'es-US-Chirp3-HD-Aoede','male':'es-US-Chirp3-HD-Charon'}
def atomic(p,d):
 p.parent.mkdir(parents=True,exist_ok=True);t=p.with_suffix(p.suffix+'.part');t.write_text(json.dumps(d,ensure_ascii=False)+'\n');t.replace(p)
def link(a,b):
 b.parent.mkdir(parents=True,exist_ok=True)
 if b.exists():
  if a.stat().st_size!=b.stat().st_size or hashlib.sha256(a.read_bytes()).digest()!=hashlib.sha256(b.read_bytes()).digest():raise RuntimeError('Audio collision '+b.name)
  return
 try:os.link(a,b)
 except OSError:shutil.copy2(a,b)
def sync(web,junior):
 db=sqlite3.connect(bank/'inventory.sqlite');db.execute('CREATE TABLE IF NOT EXISTS clips (text TEXT, voice TEXT, gender TEXT, name TEXT, sha256 TEXT, bytes INTEGER, duration REAL, source TEXT, PRIMARY KEY(text,voice))')
 sources=[(root/'Resources/recordings.json',root/'Resources/RecordedAudio'),(Path('/Users/drive/lt-audio/spanish-next/manifest.json'),Path('/Users/drive/lt-audio/spanish-next')),(Path('/Volumes/Drive 2/threshold-v4-medical-hd/audio/manifest.json'),Path(os.environ.get('LT_MEDICAL_AUDIO_CACHE', '/Volumes/Drive 2/threshold-v4-medical-hd/audio')))]
 jobs={};legacy=set()
 for manifest,folder in sources:
  if not manifest.exists():continue
  for text,v in json.loads(manifest.read_text())['entries'].items():
   for gender,name in v.items():
    if gender not in voices:continue
    if not name.startswith('es-next-'):legacy.add((text,gender,name));continue # Keep provenance honest: unknown older voices are not labeled HD.
    p=folder/(name+'.mp3')
    if not p.is_file():continue
    if db.execute('SELECT 1 FROM clips WHERE text=? AND voice=?',(text,voices[gender])).fetchone():continue
    jobs[(text,voices[gender])]=(text,gender,name,p)
 def validate(job):
  text,g,n,p=job;duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)],text=True));assert .1<=duration<=120
  digest=hashlib.sha256(p.read_bytes()).hexdigest();link(p,bank/'clips'/(n+'.mp3'));return(text,voices[g],g,n,digest,p.stat().st_size,duration,str(p))
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  for row in pool.map(validate,jobs.values()):db.execute('INSERT OR REPLACE INTO clips VALUES(?,?,?,?,?,?,?,?)',row)
 atomic(bank/'legacy-inventory.json',{'version':1,'status':'Older recording voice provenance unverified; excluded from HD counts','clips':[{'text':t,'gender':g,'name':n,'nativePath':str(root/'Resources/RecordedAudio'/(n+'.mp3'))} for t,g,n in sorted(legacy)]})
 db.commit();rows=db.execute('SELECT text,voice,gender,name,sha256,bytes,duration FROM clips ORDER BY text,voice').fetchall();entries={};inventory=[]
 for text,v,g,n,sha,size,duration in rows:
  entries.setdefault(text,{})[g]=n;inventory.append(dict(text=text,voice=v,gender=g,locale='es-US',provider='Google Cloud Chirp 3 HD',name=n,sha256=sha,bytes=size,durationSeconds=duration))
 manifest={'version':1,'entries':entries,'voices':voices};atomic(bank/'manifest.json',manifest);atomic(bank/'inventory.json',{'version':1,'clips':inventory})
 # Website uses its existing recording resolver, so no second playback mechanism is needed.
 oldpath=web/'src/data/spanish-next-recordings.json';old=json.loads(oldpath.read_text());
 for text,v in entries.items():old['entries'].setdefault(text,{}).update(v)
 for row in rows:link(bank/'clips'/(row[3]+'.mp3'),web/'public/audio/spanish-next'/(row[3]+'.mp3'))
 atomic(oldpath,old);atomic(web/'public/audio/spanish-next/manifest.json',old)
 # Preserve native Gemini provenance in a separate manifest and path.
 nativePath=bank/'native-v3-manifest.json'
 native=json.loads(nativePath.read_text()) if nativePath.exists() else {'version':1,'entries':{}}
 for v in native['entries'].values():
  for name in v.values():link(bank/'clips'/(name+'.mp3'),web/'public/audio/native-v3'/(name+'.mp3'))
 atomic(web/'src/data/native-v3-recordings.json',native)
 atomic(web/'public/audio/native-v3/manifest.json',native)
 # Export only exact matches from Junior's authored Spanish courses.
 program="import{KIDS_MODULES}from'./src/data/kidsModules.ts';import{KIDS_STORIES}from'./src/data/kidsStories.ts';const ids=new Set(KIDS_MODULES.filter(m=>m.language==='es').map(m=>m.id));const t=KIDS_MODULES.filter(m=>ids.has(m.id)).flatMap(m=>[...m.vocab.map(v=>v.es),m.samplePhrase.es]);for(const s of KIDS_STORIES.filter(s=>ids.has(s.moduleId)))t.push(s.titleEs,...s.sentences.map(v=>v.es));process.stdout.write(JSON.stringify(t));"
 import unicodedata
 texts=json.loads(subprocess.check_output(['node','--input-type=module','-e',program],cwd=junior,text=True,stderr=subprocess.DEVNULL))
 required={' '.join(unicodedata.normalize('NFC',t).strip().lower().split()).rstrip('.!?¿¡,;:') for t in texts}
 combined={k:dict(v) for k,v in native['entries'].items()}
 for text,v in entries.items():combined.setdefault(text,{}).update(v)
 selected={k:v for k,v in combined.items() if k in required};selectedNames={n for v in selected.values() for n in v.values()}
 folder=junior/'public/audio/shared-spanish';folder.mkdir(parents=True,exist_ok=True)
 for name in selectedNames:link(bank/'clips'/(name+'.mp3'),folder/(name+'.mp3'))
 # This dedicated generated directory contains no authored assets.
 for p in folder.glob('es-next-*.mp3'):
  if p.stem not in selectedNames:p.unlink()
 atomic(junior/'src/data/shared-spanish-recordings.json',{'version':1,'entries':selected,'voices':voices})

 tally={'updatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'validatedHdTexts':len(entries),'validatedHdClips':len(rows),'femaleClips':sum(r[2]=='female' for r in rows),'maleClips':sum(r[2]=='male' for r in rows),'bytes':sum(r[5] for r in rows),'uniqueFileHashes':len({r[4] for r in rows}),'legacyMappingsExcludedFromHdCount':len(legacy),'nativeAppTexts':len(native['entries']),'nativeAppClips':sum(len(v) for v in native['entries'].values()),'totalValidatedReusableClips':len(rows)+sum(len(v) for v in native['entries'].values()),'destinations':{'website':str(web),'juniorLinguist':str(junior)},'juniorSpanishTexts':len(required),'juniorMatchedTexts':len(selected),'juniorMatchedClips':len(selectedNames),'publication':'Local source exports only; not deployed','reuseKey':'NFC normalized text + exact provider voice + locale; file SHA256 verifies bytes'}
 generation=root/'docs/medical-hd-generation.json'
 if generation.exists():tally['medicalGeneration']=json.loads(generation.read_text())
 for p in [bank/'tally.json',root/'docs/shared-hd-audio-tally.json',web/'docs/shared-hd-audio-tally.json',junior/'docs/shared-hd-audio-tally.json']:atomic(p,tally)
 db.close();print(json.dumps({k:v for k,v in tally.items() if k!='medicalGeneration'}),flush=True)
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--web',type=Path,required=True);a.add_argument('--junior',type=Path,required=True);a.add_argument('--watch',action='store_true');args=a.parse_args()
 while True:
  sync(args.web,args.junior)
  if not args.watch:break
  if (root/'docs/medical-hd-audio.json').exists():break
  time.sleep(300)
