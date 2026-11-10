#!/usr/bin/env python3
"""Keep source clinical terms in private French Master learner fields."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / 'content/french-travel-breakfast'


def lesson(file, number):
    draft = json.loads((ROOT / file).read_text())
    item = next(row for row in draft['lessons'] if row['n'] == number)
    assert draft['reviewed'] is False and item['reviewed'] is False
    return item


def check(item, source_english, word_english, word_french, reader_english, reader_french):
    assert any(source_english in row['en'] for row in item['sourceWordsEnglish'])
    assert any(row['en'] == word_english and row['fr'] == word_french for row in item['words'])
    assert any(reader_english in row for row in item['passage']['english'])
    assert any(reader_french in row for row in item['passage']['french'])


def main():
    fourth = lesson('master-4-6-draft.json', 4)
    check(fourth, 'epinephrine auto-injector', 'the epinephrine auto-injector',
          'l’auto-injecteur d’épinéphrine', 'epinephrine auto-injector', 'auto-injecteur d’épinéphrine')
    eighth = lesson('master-7-9-draft.json', 8)
    check(eighth, 'anaphylaxis', 'the anaphylaxis', 'l’anaphylaxie', 'anaphylaxis', 'anaphylaxie')
    check(eighth, 'antihistamine', 'the antihistamine', 'l’antihistaminique', 'antihistamine', 'antihistaminique')
    assert any('auto-injector' in line for line in eighth['sourcePassageEnglish'])
    assert any('auto-injector' in line for line in eighth['passage']['english'])
    assert any('auto-injecteur d’adrénaline' in line for line in eighth['passage']['french'])
    assert any('symptoms' in line for line in eighth['passage']['english'])
    assert any('symptômes' in line for line in eighth['passage']['french'])
    fixture = json.loads((ROOT / 'private-runtime-candidate.json').read_text())
    assert all(value is False for value in fixture['releaseGate'].values())
    for key in ('master:4', 'master:8'):
        row = next(item for item in fixture['lessons'] if item['draftLessonKey'] == key)
        assert row['requiresQualifiedReview'] and not row['reviewed'] and not row['registered']
    print('French Breakfast Master 4/8 clinical source terms and private release gates pass')


if __name__ == '__main__':
    main()
