"""Generate resumable command recordings with the app's existing Chirp HD voices.
Credentials stay in Google ADC; only verified MP3s enter the public manifest.
"""
import argparse, base64, concurrent.futures, hashlib, json, subprocess, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', required=True)
    args = parser.parse_args()
    commands = json.loads((ROOT/'content/picture-action/audio-script.json').read_text())
    output = ROOT/'public/audio/picture-action'
    output.mkdir(parents=True, exist_ok=True)
    token = subprocess.check_output(['gcloud','auth','application-default','print-access-token'], text=True).strip()
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
            result = json.load(urllib.request.urlopen(request,timeout=75))
            clip = base64.b64decode(result['audioContent'])
            if len(clip)<500: raise ValueError('Empty recording')
            temp=path.with_suffix('.part'); temp.write_bytes(clip);temp.replace(path)
        duration = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)],text=True))
        if not .2 < duration < 60: raise ValueError('Invalid recording duration')
        return {'id':command['id'],'language':lang,'gender':gender,'text':text,'voice':voice,'url':'/audio/picture-action/'+filename,'durationSeconds':round(duration,3),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    jobs=[(c,l,g) for c in commands for l in ['es','en'] for g in ['female','male']]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        clips=list(pool.map(generate,jobs))
    manifest={'version':1,'provider':'Google Cloud Chirp 3 HD','humanReviewed':False,'clips':clips}
    (ROOT/'src/data/picture-action-audio.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'commands':len(commands),'recordings':len(clips),'bytes':sum(p.stat().st_size for p in output.glob('*.mp3'))}))
if __name__=='__main__': main()
