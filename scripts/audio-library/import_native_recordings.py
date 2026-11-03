import os
"""Read V3/V4 recordings without modifying either source; preserve original voice provenance."""
import concurrent.futures,hashlib,json,sqlite3,subprocess,unicodedata
from pathlib import Path
root=Path(os.environ['LT_NATIVE_SOURCE']).resolve()
v3=Path('/Users/drive/git-backups/LanguageThresholdTradesV3');bank=Path(os.environ.get('LT_AUDIO_LIBRARY', '/Volumes/Drive 2/language-threshold-audio-library'));bank.mkdir(parents=True,exist_ok=True)
def norm(t):return ' '.join(unicodedata.normalize('NFC',t).strip().lower().split()).rstrip('.!?¿¡,;:')
script={row['id']:norm(row['text']) for row in json.loads((v3/'scripts/v3_audio_script.json').read_text())}
db=sqlite3.connect(bank/'inventory.sqlite');db.execute('CREATE TABLE IF NOT EXISTS native_clips (text TEXT, voice TEXT, gender TEXT, name TEXT, sha256 TEXT, bytes INTEGER, duration REAL, source TEXT, PRIMARY KEY(text,voice))');jobs={};excluded=set();missing=[];source_counts={}
for app,folder in [('V3',v3/'LanguageThresholdTradesV3/Resources'),('V4',root/'Resources')]:
 count=0
 for text,entry in json.loads((folder/'recordings.json').read_text())['entries'].items():
  for gender,name in entry.items():
   if gender not in ('female','male'):continue
   stem=name.rsplit('-',1)[0]
   if name.startswith('es-next-'):continue # Already included by the Chirp inventory.
   if not name.endswith('-'+gender) or Path(name).name!=name:raise RuntimeError('Invalid manifest name '+name)
   if script.get(stem)!=norm(text) and not name.startswith(('trade-','cr-')):excluded.add((text,gender,name));continue
   p=folder/'RecordedAudio'/(name+'.mp3')
   if not p.is_file():missing.append(str(p));continue
   count+=1;voice=('gemini-2.5-flash-tts:'+('Aoede' if gender=='female' else 'Charon')+':es-CR:v3-style') if name.startswith('v3-') else ('source-imported-native:'+gender+':es-419')
   if db.execute('SELECT 1 FROM native_clips WHERE text=? AND voice=?',(text,voice)).fetchone():continue
   jobs.setdefault((text,voice),(text,voice,gender,name,p))
 source_counts[app]=count

def validate(job):
 text,voice,gender,name,p=job
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)],text=True));assert .1<=duration<=180,(p,duration)
 digest=hashlib.sha256(p.read_bytes()).hexdigest();dest=bank/'clips'/(name+'.mp3')
 if not dest.exists():
  import os,shutil
  try:os.link(p,dest)
  except OSError:shutil.copy2(p,dest)
 elif hashlib.sha256(dest.read_bytes()).hexdigest()!=digest:raise RuntimeError('Conflicting asset '+name)
 return(text,voice,gender,name,digest,p.stat().st_size,duration,str(p))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 for i,row in enumerate(pool.map(validate,jobs.values()),1):
  db.execute('INSERT OR REPLACE INTO native_clips VALUES(?,?,?,?,?,?,?,?)',row)
  if i%1000==0:db.commit();print('Validated',i,'/',len(jobs),flush=True)
db.commit();rows=db.execute('SELECT text,voice,gender,name,sha256,bytes,duration,source FROM native_clips ORDER BY text,voice').fetchall();entries={};inventory=[]
for t,v,g,n,sha,size,duration,source in rows:
 entries.setdefault(t,{})[g]=n;inventory.append(dict(text=t,voice=v,gender=g,name=n,sha256=sha,bytes=size,durationSeconds=duration,source=source,locale='es-419',accentPrompt='Costa Rica, Central Valley' if n.startswith('v3-') else 'Original native app recording',model='gemini-2.5-flash-tts' if n.startswith('v3-') else 'Original source model unverified',provider='Google Cloud Text-to-Speech' if n.startswith('v3-') else 'Imported native audio'))
report={'version':1,'entries':entries,'provider':'Google Cloud Text-to-Speech','model':'gemini-2.5-flash-tts','voices':{'female':'Aoede','male':'Charon'},'locale':'es-419','accentPrompt':'Costa Rica, Central Valley'}
def write(p,d):
 t=p.with_suffix('.json.part');t.write_text(json.dumps(d,ensure_ascii=False)+'\n');t.replace(p)
write(bank/'native-v3-manifest.json',report);write(bank/'native-v3-inventory.json',{'version':1,'clips':inventory})
summary={'sourceAppMappings':source_counts,'validatedUniqueTexts':len(entries),'validatedUniqueClips':len(rows),'existingChirpClips':db.execute('select count(*) from clips').fetchone()[0],'olderMappingsNeedingProvenance':len(excluded),'originalSourceModelUnverifiedClips':sum(not row[3].startswith('v3-') for row in rows),'missingFiles':missing,'sourceAppsModified':False,'generatedNewAudio':False,'validation':'SHA256 and nonzero ffprobe duration for every imported clip','publication':'Local source integration, not a website deployment'}
write(root/'docs/native-recordings-backfill.json',summary);print(json.dumps(summary),flush=True)
