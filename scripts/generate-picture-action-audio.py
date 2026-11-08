"""Generate resumable command recordings with the app's existing Chirp HD voices.
Credentials stay in Google ADC; only verified MP3s enter the public manifest.
"""
import argparse, base64, concurrent.futures, hashlib, json, subprocess, urllib.request, urllib.error, time, threading
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', required=True)
    args = parser.parse_args()
    source = subprocess.check_output(['node','--experimental-strip-types','--input-type=module','-e', 'import {PICTURE_SCENES} from "./src/lib/picture-action.ts"; import {ASSEMBLY_PUZZLES} from "./src/lib/picture-assembly.ts"; console.log(JSON.stringify([...PICTURE_SCENES.flatMap(s=>s.challenges.map(({id,es,en})=>({id,es,en}))),...ASSEMBLY_PUZZLES.flatMap(p=>p.items.map(({id,es,en})=>({id,es,en})))]));'],cwd=ROOT,text=True)
    commands = json.loads(source)
    (ROOT/'content/picture-action/audio-script.json').write_text(json.dumps(commands,ensure_ascii=False,indent=2)+'\n')
    output = ROOT/'public/audio/picture-action'
    output.mkdir(parents=True, exist_ok=True)
    token = subprocess.check_output(['gcloud','auth','application-default','print-access-token'], text=True).strip()
    limiter_lock = threading.Lock()
    next_request = [0.0]
    def throttle():
        with limiter_lock:
            delay = max(0, next_request[0] - time.monotonic())
            next_request[0] = max(next_request[0], time.monotonic()) + .6
        if delay: time.sleep(delay)
    def generate(job):
        command, lang, gender = job
        text = command[lang]
        locale = 'es-US' if lang == 'es' else 'en-US'
        voice = locale+'-Chirp3-HD-'+('Aoede' if gender == 'female' else 'Charon')
        filename = hashlib.sha256((voice+'\n'+text).encode()).hexdigest()[:24]+'.mp3'
        path = output/filename
        if not path.exists():
            data = {'input':{'text':text},'voice':{'languageCode':locale,'name':voice},'audioConfig':{'audioEncoding':'MP3'}}
            request = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize',data=json.dumps(data).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json','x-goog-user-project':args.project})
            for attempt in range(6):
                try:
                    throttle()
                    result = json.load(urllib.request.urlopen(request,timeout=75))
                    break
                except urllib.error.HTTPError as error:
                    if error.code not in (429,500,502,503,504) or attempt == 5: raise
                    time.sleep(min(60, 15*(attempt+1)))
            clip = base64.b64decode(result['audioContent'])
            if len(clip)<500: raise ValueError('Empty recording')
            temp=path.with_suffix('.part'); temp.write_bytes(clip);temp.replace(path)
        duration = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)],text=True))
        if not .2 < duration < 60: raise ValueError('Invalid recording duration')
        return {'id':command['id'],'language':lang,'gender':gender,'text':text,'voice':voice,'url':'/audio/picture-action/'+filename,'durationSeconds':round(duration,3),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    jobs=[(c,l,g) for c in commands for l in ['es','en'] for g in ['female','male']]
    # Share identical text/voice assets across modules without concurrent writes to one file.
    unique = {}
    for job in jobs: unique.setdefault((job[0][job[1]],job[1],job[2]),job)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        generated = []
        for result in pool.map(generate,unique.values()):
            generated.append(result)
            if len(generated) % 100 == 0: print(f"Verified {len(generated)}/{len(unique)} unique recordings",flush=True)
    lookup={(r['text'],r['language'],r['gender']):r for r in generated}
    clips=[{**lookup[(c[lang],lang,gender)],'id':c['id']} for c,lang,gender in jobs]
    manifest={'version':1,'provider':'Google Cloud Chirp 3 HD','humanReviewed':False,'clips':clips}
    (ROOT/'src/data/picture-action-audio.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'commands':len(commands),'recordings':len(clips),'bytes':sum(p.stat().st_size for p in output.glob('*.mp3'))}))
if __name__=='__main__': main()
