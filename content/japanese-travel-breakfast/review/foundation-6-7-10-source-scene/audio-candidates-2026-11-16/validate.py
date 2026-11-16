#!/usr/bin/env python3
"""Portable read-only exact-source, placement, file and decoded-signal check."""
import array
import hashlib
import json
import math
import subprocess
from pathlib import Path

HERE=Path(__file__).resolve().parent
SOURCE=HERE.parent/'source-setting-candidates.json'
VOICES={'female':'ja-JP-Chirp3-HD-Aoede','male':'ja-JP-Chirp3-HD-Charon'}
def sha(data):return hashlib.sha256(data).hexdigest()
def duration(path):
 result=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)],capture_output=True,text=True,check=True)
 value=round(float(result.stdout.strip()),3);assert .1<value<120;return value
def signal(path):
 raw=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar','16000','-f','f32le','pipe:1'],capture_output=True,check=True).stdout
 samples=array.array('f');samples.frombytes(raw);assert len(samples)>=1600
 peak=max(abs(x) for x in samples);rms=math.sqrt(sum(x*x for x in samples)/len(samples))
 assert math.isfinite(rms) and rms>=.001 and peak>=.01
 threshold=.003
 lead=next((i for i,x in enumerate(samples) if abs(x)>=threshold),len(samples))/16000
 tail=next((i for i,x in enumerate(reversed(samples)) if abs(x)>=threshold),len(samples))/16000
 assert lead<=.75 and tail<=.75
 return (len(samples),round(rms,5),round(peak,5),round(lead,3),round(tail,3))
def main():
 source_bytes=SOURCE.read_bytes();source=json.loads(source_bytes);scope_bytes=(HERE/'scope.json').read_bytes();scope=json.loads(scope_bytes);manifest=json.loads((HERE/'manifest.json').read_text());report=json.loads((HERE/'verification.json').read_text())
 assert source['pairKey']==scope['pairKey']==manifest['pairKey']==report['pairKey']=='Japanese:English'
 assert source['reviewed'] is False and all(x is False for x in source['gates'].values())
 assert scope['sourceSha256']==manifest['sourceSha256']==report['sourceSha256']==sha(source_bytes)
 assert scope['locale']==manifest['locale']==report['locale']=='ja-JP'
 assert scope['quotaProject']==manifest['quotaProject']==report['quotaProject']=='project-91661021-fb2d-4524-b9f'
 assert scope['voices']==manifest['voices']==VOICES
 assert manifest['scopeSha256']==report['scopeSha256']==sha(scope_bytes)
 for data in (scope,manifest,report):
  assert data['listeningReviewed'] is False and data['registered'] is False and data['recordingsBundled'] is False
 rows=[]
 for lesson in source['lessons']:
  if lesson['lessonKey'] not in ('foundation:6','foundation:7'):continue
  assert lesson['reviewed'] is False and all(x is False for x in lesson['gates'].values())
  for kind,field in [('card','sourceCards'),('reader','sourceSettingReader')]:
   for item in lesson[field]:
    text=item['targetJapaneseDraft'];placement=item['id']
    rows.append({'lessonKey':lesson['lessonKey'],'kind':kind,'placementId':placement,'placementSha256':sha(placement.encode()),'text':text,'textSha256':sha(text.encode())})
 assert rows==scope['texts'] and len(rows)==scope['placementTexts']==report['placementTexts']==50
 assert len({x['placementId'] for x in rows})==50 and len({x['textSha256'] for x in rows})==50
 assert sum(len(x['text']) for x in rows)*2==scope['submittedCharacters']==report['submittedCharacters']==1448
 assert scope['proposedClips']==len(manifest['clips'])==report['clipsVerified']==100
 assert report['signalFlags']==[] and len(list(HERE.glob('*.mp3')))==100
 checks={row['key']:row for row in report['clips']};assert len(checks)==100
 seen=set()
 for row in rows:
  for gender,voice in VOICES.items():
   key=f"{row['placementSha256']}:{gender}";clip=manifest['clips'][key];check=checks[key];path=HERE/clip['name']
   assert path.name==f"ja-breakfast-f{row['lessonKey'].split(':')[1]}-{row['placementSha256'][:10]}-{row['textSha256'][:10]}-{gender}.mp3"
   assert path.name not in seen;seen.add(path.name)
   assert clip['text']==row['text'] and clip['textSha256']==row['textSha256'] and clip['placementId']==row['placementId'] and clip['placementSha256']==row['placementSha256']
   assert clip['lessonKey']==row['lessonKey'] and clip['kind']==row['kind'] and clip['voice']==voice and clip['locale']=='ja-JP' and clip['listeningReviewed'] is False
   data=path.read_bytes();assert (sha(data),len(data),duration(path))==(clip['sha256'],clip['bytes'],clip['durationSeconds'])
   assert (check['fileSha256'],check['bytes'],check['durationSeconds'])==(clip['sha256'],clip['bytes'],clip['durationSeconds'])
   assert signal(path)==(check['decodedSamples'],check['rms'],check['peak'],check['leadingSilenceSeconds'],check['trailingSilenceSeconds']) and check['signalFlags']==[]
 page=(HERE/'listening-review.html').read_text();assert page.count('<select>')==100 and page.count('<audio ')==100
 assert 'listeningReviewed:false' in page and 'Foundation 10 was intentionally excluded' in (HERE/'README.md').read_text()
 print('PASS: 50 source-pinned placements, 100 separate ja-JP clips, zero signal flags, all gates closed')
if __name__=='__main__':main()
