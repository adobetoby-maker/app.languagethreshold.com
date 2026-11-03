import os
"""Validate and install completed medical HD recordings, preserving all prior mappings."""
import concurrent.futures,json,os,shutil,subprocess
from pathlib import Path
root=Path(os.environ['LT_NATIVE_SOURCE']).resolve()
output=Path(os.environ.get('LT_MEDICAL_AUDIO_CACHE', '/Volumes/Drive 2/threshold-v4-medical-hd/audio'))
m=json.loads((output/'manifest.json').read_text());entries=m['entries']
assert entries and all(set(v)=={'female','male'} for v in entries.values()),'Incomplete audio batch'
files={output/(name+'.mp3') for v in entries.values() for name in v.values()}
def probe(p):
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)],text=True))
 assert 0.1<=duration<=120,(p.name,duration)
 return duration
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:durations=list(pool.map(probe,files))
for f in files:
 dest=root/'Resources/RecordedAudio'/f.name
 if not dest.exists():
  try:os.link(f,dest)
  except OSError:shutil.copy2(f,dest)
p=root/'Resources/recordings.json';prior=json.loads(p.read_text());prior['entries'].update(entries);temp=p.with_suffix('.json.part');temp.write_text(json.dumps(prior,ensure_ascii=False));temp.replace(p)
report={'texts':len(entries),'clips':len(files),'missingClips':0,'voices':m['voices'],'minimumDurationSeconds':min(durations),'maximumDurationSeconds':max(durations),'validation':'Every MP3 has ffprobe-validated nonzero duration','humanListeningReview':False,'scope':'All eleven medical iPhone courses: vocabulary, readings, verbs, forms and examples','deviceVoiceFallback':'Disabled on iPhone; Watch retains its independent compact pack policy'}
(root/'docs/medical-hd-audio.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
p=root/'docs/medical-core60-import.json';d=json.loads(p.read_text());d['audio']=report;d['gaps']=[g for g in d['gaps'] if 'paid audio' not in g];p.write_text(json.dumps(d,indent=2)+'\n')
