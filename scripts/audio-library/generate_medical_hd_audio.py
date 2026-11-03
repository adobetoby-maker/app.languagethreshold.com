import os
"""Generate resumable female/male Chirp 3 HD clips using existing Google ADC.
No credential values are printed or saved. --dry-run never contacts Google.
Only successful, nonempty MP3 files enter the playback manifest.
"""
import argparse,base64,concurrent.futures,hashlib,json,os,re,shutil,subprocess,threading,time,unicodedata,urllib.request,urllib.error
from pathlib import Path
ROOT=Path(os.environ['LT_NATIVE_SOURCE']).resolve()
VOICES={'female':'es-US-Chirp3-HD-Aoede','male':'es-US-Chirp3-HD-Charon'}
def normalize(s):return re.sub(r'[.!?¿¡,;:]+$','',re.sub(r'\s+',' ',unicodedata.normalize('NFC',s).strip().lower()))
def read(p):return json.loads(p.read_text())
def atomic(p,data):
 p.parent.mkdir(parents=True,exist_ok=True);temp=p.with_suffix(p.suffix+'.part');temp.write_text(json.dumps(data,ensure_ascii=False)+'\n');temp.replace(p)
def collect():
 texts={}
 def add(s):
  if s:texts.setdefault(normalize(s),s)
 for m in read(ROOT/'Resources/core60.json')['modules']:
  if m['kind']!='medical':continue
  for l in m['lessons']:
   for i in l['items']+l['passage']:add(i['target'])
   for v in l.get('verbs',[]):
    add(v['infinitive']);add(v.get('example',{}).get('target'))
    for s in v['forms'].values():add(s)
 return texts
class Token:
 def __init__(self):self.lock=threading.Lock();self.exp=0;self.value=''
 def get(self,refresh=False):
  with self.lock:
   if refresh or time.time()>self.exp:
    p=subprocess.run(['gcloud','auth','application-default','print-access-token'],capture_output=True,text=True,check=True);self.value=p.stdout.strip();self.exp=time.time()+2400
   return self.value
class Limiter:
 def __init__(self,rpm):self.lock=threading.Lock();self.next=0;self.spacing=60/rpm
 def wait(self):
  with self.lock:delay=max(0,self.next-time.monotonic());self.next=max(self.next,time.monotonic())+self.spacing
  if delay:time.sleep(delay)
def main():
 a=argparse.ArgumentParser();a.add_argument('--project');a.add_argument('--dry-run',action='store_true');a.add_argument('--workers',type=int,default=6);a.add_argument('--rpm',type=int,default=170);a.add_argument('--limit',type=int);a.add_argument('--native',type=Path,default=Path('/Users/drive/git-backups/LanguageThresholdV4'));args=a.parse_args()
 texts=collect();output=Path(os.environ.get('LT_MEDICAL_AUDIO_CACHE', '/Volumes/Drive 2/threshold-v4-medical-hd/audio'));output.mkdir(parents=True,exist_ok=True)
 native_manifest=args.native/'Resources/recordings.json';existing=read(native_manifest)['entries'];manifest={};pending=[]
 shared=Path('/Volumes/Drive 2/language-threshold-audio-library/manifest.json')
 if shared.exists():
  library=read(shared)
  if library.get('voices')==VOICES:
   for text,recording in library['entries'].items():existing[text]={**existing.get(text,{}),**recording}
 for key,text in texts.items():
  manifest[key]={}
  for gender in VOICES:
   name='es-next-'+hashlib.sha256(key.encode()).hexdigest()[:20]+'-'+gender;dest=output/(name+'.mp3')
   old=existing.get(key,{}).get(gender);oldpath=args.native/'Resources/RecordedAudio'/((old or '')+'.mp3')
   if not oldpath.is_file():oldpath=shared.parent/'clips'/((old or '')+'.mp3')
   # Preserve a valid existing voice. Hardlinks avoid duplicate local storage.
   if not dest.exists() and old and oldpath.is_file() and oldpath.stat().st_size>500 and not args.dry_run:
    try:os.link(oldpath,dest)
    except OSError:shutil.copy2(oldpath,dest)
   if dest.exists() and dest.stat().st_size>500:manifest[key][gender]=name
   elif old and oldpath.is_file() and args.dry_run:manifest[key][gender]=name
   else:pending.append((key,text,gender,name))
 report=dict(version=1,texts=len(texts),requiredClips=len(texts)*2,existingClips=sum(len(x) for x in manifest.values()),pendingClips=len(pending),charactersToSynthesize=sum(len(x[1]) for x in pending),voices=VOICES,provider='Google Cloud Chirp 3 HD',language='es-US',normalizedTextSHA256=hashlib.sha256(json.dumps(texts,sort_keys=True).encode()).hexdigest())
 print(json.dumps(report),flush=True)
 if args.dry_run:return
 if not args.project:raise SystemExit('--project required')
 atomic(ROOT/'docs/medical-hd-script.json',[dict(id='es-next-'+hashlib.sha256(k.encode()).hexdigest()[:20],normalized=k,text=t) for k,t in texts.items()])
 token=Token();token.get();limiter=Limiter(args.rpm);failures=[];done=0
 def generate(job):
  key,text,gender,name=job;path=output/(name+'.mp3')
  for attempt in range(7):
   if shutil.disk_usage(ROOT).free<200_000_000:raise RuntimeError('Less than 200MB disk space remains')
   limiter.wait();data={'input':{'text':text},'voice':{'languageCode':'es-US','name':VOICES[gender]},'audioConfig':{'audioEncoding':'MP3'}}
   req=urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize',data=json.dumps(data).encode(),headers={'Authorization':'Bearer '+token.get(),'Content-Type':'application/json','x-goog-user-project':args.project})
   try:
    result=json.load(urllib.request.urlopen(req,timeout=75));clip=base64.b64decode(result['audioContent']);assert len(clip)>500
    temp=path.with_suffix('.part');temp.write_bytes(clip);temp.replace(path);return key,gender,name
   except urllib.error.HTTPError as e:
    if e.code==401:token.get(True)
    elif e.code not in [429,499,500,502,503,504]:raise RuntimeError(f'Synthesis HTTP {e.code}')
    time.sleep(min(30,2**attempt))
   except (urllib.error.URLError,TimeoutError):time.sleep(min(30,2**attempt))
  raise RuntimeError('Retry limit reached')
 def save():
  report.update(completedClips=sum(len(x) for x in manifest.values()),missingClips=len(texts)*2-sum(len(x) for x in manifest.values()),failures=failures)
  atomic(output/'manifest.json',dict(version=1,entries=manifest,voices=VOICES));atomic(ROOT/'docs/medical-hd-generation.json',report)
 with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
  for f in concurrent.futures.as_completed({pool.submit(generate,j):j for j in pending[:args.limit]}):
   try:
    key,gender,name=f.result();manifest[key][gender]=name;done+=1
   except Exception as e:failures.append(str(e))
   if (done+len(failures))%50==0:save();print(f'Generated {done}/{min(args.limit or len(pending),len(pending))}; failures {len(failures)}',flush=True)
 save();print(json.dumps(report),flush=True)
 if failures:raise SystemExit(1)
if __name__=='__main__':main()
