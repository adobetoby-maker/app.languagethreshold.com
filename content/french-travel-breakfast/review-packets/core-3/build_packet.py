import json, hashlib
from pathlib import Path
p=Path(__file__).resolve().parent
source=json.loads((p/'source.json').read_text())
a=json.loads((p/'candidate-fable.json').read_text())
meta={k:next(iter(json.loads((p/(k+'-output.json')).read_text())['modelUsage'].values()))['canonicalModel'] for k in ('haiku','opus','fable')}
packet={'lessonKey':'core:3','moduleId':'travel-breakfast','targetLanguage':'French','nativeLanguage':'English','status':'private unreviewed owner-review candidate','reviewed':False,'registered':False,'audioRegistered':False,'listeningReviewed':False,'gates':{'learnerRegistration':False,'playback':False,'progress':False,'scoring':False,'qualifiedApproval':False},'sourceFidelity':{k:source[k] for k in ('sourcePath','sourceSha256','sourceRevision')},'modelMetadata':meta,**a}
(p/'private-packet.json').write_text(json.dumps(packet,ensure_ascii=False,indent=2)+'\n')
