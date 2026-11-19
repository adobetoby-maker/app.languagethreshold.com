"""Audit the staged interest courses against the iPhone recording catalog.
Does not install courses, change catalog identities, or contact a voice provider.
"""
import argparse
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def normalized(text):
    return re.sub(r'[.!?¿¡,;:]+$', '', re.sub(r'\s+', ' ', unicodedata.normalize('NFC', text).strip().lower()))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--native', type=Path, required=True)
    args = parser.parse_args()
    pack = json.loads((ROOT / 'content/interests-spanish/v4-course-pack.json').read_text())
    recordings = json.loads((args.native / 'Resources/recordings.json').read_text())['entries']
    courses = []
    for module in pack['modules']:
        cards = {i['target'] for l in module['lessons'] for i in l['items']}
        readings = {i['target'] for l in module['lessons'] for i in l['passage']}
        verbs = set()
        for lesson in module['lessons']:
            for verb in lesson['verbs']:
                verbs.update([verb['infinitive'], verb['example']['target'], *verb['forms'].values()])
        missing = []
        for text in sorted(cards | readings | verbs):
            for voice in ['female', 'male']:
                name = recordings.get(normalized(text), {}).get(voice)
                file = args.native / 'Resources/RecordedAudio' / f'{name}.mp3'
                if not name or not file.is_file() or file.stat().st_size <= 500:
                    missing.append({'text': text, 'voice': voice})
        courses.append({'module': module['id'], 'lessons': len(module['lessons']), 'cardTexts': len(cards), 'readingTexts': len(readings), 'verbTexts': len(verbs), 'missingRecordings': len(missing), 'missing': missing})
    result = {'installed': False, 'audioReady': all(not c['missing'] for c in courses), 'courses': courses, 'scope': 'Staged V4 course pack; live course catalog is unchanged.'}
    (ROOT / 'content/interests-spanish/v4-audio-readiness.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k != 'courses'}))
    if not result['audioReady']:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
