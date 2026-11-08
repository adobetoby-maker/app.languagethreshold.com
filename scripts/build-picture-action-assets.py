"""Resize/compress shared image masters without cropping; coordinates remain valid."""
from pathlib import Path
import subprocess,json,argparse,zipfile,hashlib
p=argparse.ArgumentParser();p.add_argument('--masters',required=True);a=p.parse_args();masters=Path(a.masters);root=Path(__file__).resolve().parent.parent
out=root/'public/images/picture-action';out.mkdir(exist_ok=True,parents=True);(out/'app').mkdir(exist_ok=True)
manifest={'schema':1,'coordinates':'normalized, uncropped square, origin top-left','scenes':[]}
for key in ['workshop','clinic','or','truck','bedroom','fishing','soccer','farm','assembly-backpack','assembly-case','assembly-worktable']:
 src=masters/f'{key}.png'
 for size,q,suffix in [(1254,84,'hq'),(768,78,'mobile')]:subprocess.run(['cwebp','-quiet','-q',str(q),'-resize',str(size),str(size),str(src),'-o',str(out/f'{key}-{suffix}.webp')],check=True)
 app=out/'app'/f'{key}.jpg';subprocess.run(['sips','-Z','960','-s','format','jpeg','-s','formatOptions','80',str(src),'--out',str(app)],stdout=subprocess.DEVNULL,check=True)
 manifest['scenes'].append({'id':key,'hq':f'/images/picture-action/{key}-hq.webp','mobile':f'/images/picture-action/{key}-mobile.webp','app':f'{key}.jpg','appPixels':960,'appBytes':app.stat().st_size,'sha256':hashlib.sha256(app.read_bytes()).hexdigest()})
(out/'app/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
subprocess.run(['node','--input-type=module','-e',"import{writeFileSync}from'node:fs';import{PICTURE_SCENES,PICTURE_OBJECTS}from'./src/lib/picture-action.ts';import{ASSEMBLY_PUZZLES}from'./src/lib/picture-assembly.ts';writeFileSync('public/images/picture-action/app/scenes.json',JSON.stringify({schema:1,pairs:[{target:'Spanish',native:'English'},{target:'English',native:'Spanish'}],reviewed:false,objects:PICTURE_OBJECTS,scenes:PICTURE_SCENES,assembly:ASSEMBLY_PUZZLES},null,2));"],cwd=root,check=True)
with zipfile.ZipFile(root/'public/downloads/picture-action-app-assets.zip','w',zipfile.ZIP_DEFLATED)as z:
 for f in sorted((out/'app').iterdir()):z.write(f,f.name)
print(json.dumps({'appBytes':sum(x['appBytes']for x in manifest['scenes']),'webBytes':sum(f.stat().st_size for f in out.glob('*.webp')),'scenes':len(manifest['scenes'])}))
