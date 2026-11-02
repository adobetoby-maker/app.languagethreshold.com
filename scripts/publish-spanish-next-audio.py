"""Verify and publish the completed recording batch into web and independent V4 resources.
Does not contact a provider, create recordings, or upload a native build.
"""
import argparse,concurrent.futures,hashlib,json,os,shutil,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
import importlib.util
spec=importlib.util.spec_from_file_location('audio_builder',ROOT/'scripts/generate-spanish-next-audio.py');audio=importlib.util.module_from_spec(spec);spec.loader.exec_module(audio)
def write(p,d):
 p.parent.mkdir(parents=True,exist_ok=True);temporary=p.with_suffix(p.suffix+'.part');temporary.write_text(json.dumps(d,ensure_ascii=False)+'\n');temporary.replace(p)
def link(src,dst):
 dst.parent.mkdir(parents=True,exist_ok=True)
 if dst.exists():
  if src.stat().st_size==dst.stat().st_size and hashlib.sha256(src.read_bytes()).digest()==hashlib.sha256(dst.read_bytes()).digest():return
  raise RuntimeError(f'Unexpected existing audio content: {dst.name}')
 try:os.link(src,dst)
 except OSError:shutil.copy2(src,dst)
def main():
 p=argparse.ArgumentParser();p.add_argument('--cache',type=Path,default=Path('/Users/drive/lt-audio/spanish-next'));p.add_argument('--native',type=Path,default=Path('/Users/drive/git-backups/LanguageThresholdV4'));a=p.parse_args()
 texts=audio.collect();manifest=json.loads((a.cache/'manifest.json').read_text());entries=manifest['entries'];files=[]
 for key in texts:
  if key not in entries:raise RuntimeError('Unrecorded text: '+key)
  for gender in ['female','male']:
   name=entries[key].get(gender)
   if not name or not (a.cache/(name+'.mp3')).is_file():raise RuntimeError(f'Missing {gender} recording: {key}')
   files.append(a.cache/(name+'.mp3'))
 def probe(path):
  p=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)],capture_output=True,text=True,check=True);duration=float(p.stdout.strip());assert 0.1<=duration<=90,(path.name,duration);return duration
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:durations=list(pool.map(probe,files))
 selected={key:entries[key] for key in texts};web=ROOT/'public/audio/spanish-next'
 for file in files:link(file,web/file.name)
 published=dict(version=1,entries=selected,voices=audio.VOICES)
 write(web/'manifest.json',published);write(ROOT/'src/data/spanish-next-recordings.json',published)
 for folder,manifest_path in [(a.native/'Resources/RecordedAudio',a.native/'Resources/recordings.json'),(a.native/'Resources/WatchAudio',a.native/'Resources/WatchAudio/recordings.json')]:
  old=json.loads(manifest_path.read_text());before=len(old['entries'])
  old['entries'].update(selected)
  for file in files:link(file,folder/file.name)
  write(manifest_path,old);print(folder.name,':',len(selected),'new text mappings;',before,'existing mappings preserved')
 report=dict(version=1,targetLanguage='Spanish',nativeLanguage='English',texts=len(texts),clips=len(files),requiredClips=len(texts)*2,missingClips=0,voices=audio.VOICES,provider='Google Cloud Chirp 3 HD',language='es-US',bytes=sum(f.stat().st_size for f in files),totalDurationSeconds=round(sum(durations),2),minimumDurationSeconds=min(durations),maximumDurationSeconds=max(durations),validation='Every required text has a female and male MP3 with ffprobe-validated nonzero duration. No human listening signoff.',web='Public audio files and compiled lookup index',native='Merged independent V4 iPhone and Watch recording catalogs; prior mappings retained',generatedHumanVoice=False)
 write(ROOT/'content/spanish-next/audio-coverage.json',report);write(a.native/'docs/spanish-next-audio.json',report);print(json.dumps(report))
if __name__=='__main__':main()
