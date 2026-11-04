"""Build the exact Japanese→English 101 draft from its authored stage sources.

No network calls. Run with --check to verify committed outputs without writing them.
The generic verb-conjugation trainer supports Spanish/English only; Japanese verbs are
taught in the lesson grammar and readings until a Japanese-form trainer is authored.
"""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "content/japanese-basics"
STAGES = {"foundation": 10, "core": 30, "master": 20}


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def encoded(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def compact(value):
    return re.sub(r"\s+", "", value)


def split_pair(value):
    target, native = value.split("|", 1)
    assert target.strip() and native.strip(), value
    return target.strip(), native.strip()


_EDGE = r"[\s、。！？「」『』]"
_PARTICLE_SUFFIX = "|".join(("から", "まで", "より", "だけ", "など", "でした", "です", "なので", "なら", "には", "では", "にも", "は", "が", "を", "に", "へ", "と", "も", "で", "の", "か", "だ"))


def term_matches(term, line):
    """Find a written term, never a substring of a name or another word.

    The authored beginner text separates word starts with spaces. Attached particles
    are allowed, but a term cannot be taken from inside たなかさん or つかいます.
    """
    pattern = (rf"(?:^|{_EDGE})(?P<term>"
               + re.escape(term).replace(r"\ ", r"\s*")
               + rf")(?=$|{_EDGE}|(?:{_PARTICLE_SUFFIX})(?=$|{_EDGE}))")
    return list(re.finditer(pattern, line))


def term_match(term, line):
    return next(iter(term_matches(term, line)), None)


def unshadowed_term_match(term, line, authored_terms):
    """Prefer an authored phrase over a shorter term found inside that phrase."""
    for match in term_matches(term, line):
        start, end = match.span("term")
        shadowed = any(
            longer != term and len(longer) > len(term)
            and any(outer.start("term") <= start and end <= outer.end("term")
                    for outer in term_matches(longer, line))
            for longer, _ in authored_terms
        )
        if not shadowed:
            return match
    return None


def build():
    sources = {stage: read(SOURCE / f"{stage}.json") for stage in STAGES}
    master_extensions = read(SOURCE / "master-extensions.json")
    for stage, count in STAGES.items():
        source = sources[stage]
        assert source["target"] == "Japanese" and source["native"] == "English"
        assert source["reviewed"] is False and source["stage"] == stage
        assert len(source["lessons"]) == count, (stage, len(source["lessons"]))
    lexicon = {}
    for stage in ("foundation", "core"):
        for lesson in sources[stage]["lessons"]:
            for raw in lesson["terms"]:
                target, native = split_pair(raw)
                lexicon.setdefault(target, native)
    output = {}
    practice = {}
    for stage, source in sources.items():
        module = "japanese-basics" if stage == "core" else f"{stage}-japanese-basics"
        lessons, content, practice[module] = [], {}, {}
        for n, authored in enumerate(source["lessons"], 1):
            dialogue = authored["dialogue"] + (master_extensions[str(n)] if stage == "master" else [])
            pairs = [split_pair(pair) for pair in dialogue]
            assert len(pairs) >= (8 if stage == "master" else 5), (stage, n)
            target_lines = [target for target, _ in pairs]
            native_lines = [native for _, native in pairs]
            if stage == "master":
                authored_terms = [split_pair(raw) for raw in authored.get("terms", [])]
                inherited = []
                for index in authored["inherit"]:
                    assert 1 <= index <= 30, (stage, n, index)
                    inherited.extend(split_pair(word) for word in sources["core"]["lessons"][index - 1]["terms"])
                local_meanings = dict(lexicon)
                local_meanings.update(inherited)
                local_meanings.update(authored_terms)
                authored_words = {word for word, _ in authored_terms}
                matched = [(word, meaning) for word, meaning in local_meanings.items()
                           if (len(compact(word)) > 1 or word in authored_words)
                           and any(unshadowed_term_match(word, line, authored_terms) for line in target_lines)]
                priority = list(dict.fromkeys(word for word, _ in authored_terms + inherited))
                matched.sort(key=lambda entry: (entry[0] not in priority, -len(entry[0])))
                terms = []
                used_meanings = set()
                for word, meaning in matched:
                    if meaning.lower() in used_meanings:
                        continue
                    terms.append((word, meaning))
                    used_meanings.add(meaning.lower())
                    if len(terms) == 12:
                        break
                for word, meaning in authored_terms + inherited:
                    if len(terms) >= 12:
                        break
                    if len(compact(word)) < 2 and word not in authored_words:
                        continue
                    if word not in {item[0] for item in terms} and meaning.lower() not in used_meanings:
                        terms.append((word, meaning))
                        used_meanings.add(meaning.lower())
                assert len(terms) == 12, (stage, n, "terms", len(terms))
                used_count = sum(any(term_match(word, line) for line in target_lines) for word, _ in terms)
                assert used_count >= 8, (stage, n, "used terms", used_count)
            else:
                terms = [split_pair(word) for word in authored["terms"]]
                assert 8 <= len(terms) <= 12, (stage, n, "terms", len(terms))
            phrase_count = 6 if stage == "master" else min(6, len(pairs))
            words = ([{"es": word, "en": meaning, "kind": "term"} for word, meaning in terms]
                     + [{"es": word, "en": meaning, "kind": "phrase"} for word, meaning in pairs[:phrase_count]])
            assert len({word["es"] for word in words}) == len(words), (stage, n, "duplicate target word")
            speaking = (f"Role-play {authored['scene'].lower()} with a patient Japanese-speaking partner. "
                        f"Use the lesson's polite forms, ask and answer a related question, clarify one "
                        f"misunderstanding, and close naturally. Give brief English help when requested.")
            record = {"n": n, "title": authored["title"],
                      "objective": f"{authored['title']}: {authored['focus']}",
                      "focus": authored["focus"], "words": words, "speaking": speaking}
            if stage == "master":
                record.update(grammar={"focus": authored["focus"], "examples": [
                    {"es": es, "en": en} for es, en in pairs[:2]]},
                    lessonType=["Teach-back", "Case", "People", "Document", "Capstone"][(n - 1) // 4],
                    block="ABCDE"[(n - 1) // 4])
            checks = []
            for line, native in pairs:
                for word, meaning in sorted(terms, key=lambda pair: -len(pair[0])):
                    match = term_match(word, line) if stage == "master" else None
                    start = match.start("term") if match else line.find(word) if stage != "master" else -1
                    if len(compact(word)) < 2 or start < 0 or any(item["answer"] == word for item in checks):
                        continue
                    end = match.end("term") if match else start + len(word)
                    checks.append({"prompt": line[:start] + "____" + line[end:], "hint": native,
                                   "answer": word, "explanation": authored["focus"]})
                    if len(checks) == 3:
                        break
                if len(checks) == 3:
                    break
            assert len(checks) == 3, (stage, n, "checks", len(checks))
            reading = {"title": authored["scene"], "target": target_lines, "native": native_lines}
            practice[module][str(n)] = {"stage": stage, "reading": reading,
                "grammar": {"focus": authored["focus"], "examples": [{"es": es, "en": en} for es, en in pairs[:2]]},
                "speaking": speaking, "openingLine": target_lines[0],
                "partnerRole": "A patient Japanese-speaking classmate", "checks": checks}
            # Japanese form paradigms differ from the app's Spanish/English trainer.
            content[str(n)] = {"passage": reading, "words": words, "verbs": []}
            lessons.append(record)
        stage_file = {"version": 1, "module": module, "language": "Japanese", "nativeLanguage": "English",
                      "headline": f"Japanese 101 {stage.title()} {STAGES[stage]}",
                      "threshold": "Practice everyday Japanese with English support; lesson completion is not a proficiency credential.",
                      "reviewed": False, "lessons": lessons}
        if stage != "core":
            stage_file.update(baseModule="japanese-basics", stage=stage)
        curriculum_path = (ROOT / "src/data/japanese-basics-core.json" if stage == "core"
                           else ROOT / f"src/data/core60/ja/{module}.json")
        output[curriculum_path] = encoded(stage_file)
        output[ROOT / f"public/lesson-content/ja/{module}.json"] = encoded({
            "version": 1, "module": module, "language": "Japanese", "nativeLanguage": "English",
            "reviewed": False, "lessons": content})
    output[ROOT / "src/data/japanese-basics-practice.json"] = encoded(practice)
    index_path = ROOT / "public/lesson-content/index.json"
    index = read(index_path)
    index["files"] = [entry for entry in index["files"] if entry["module"] not in practice]
    for module, lessons in practice.items():
        path = ROOT / f"public/lesson-content/ja/{module}.json"
        index["files"].append({"language": "ja", "module": module, "lessons": len(lessons),
                               "bytes": len(output[path].encode("utf-8")), "reviewed": False})
    index["files"].sort(key=lambda entry: (entry["language"], entry["module"]))
    output[index_path] = json.dumps(index, ensure_ascii=False) + "\n"
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    arguments = parser.parse_args()
    generated = build()
    stale = [str(path.relative_to(ROOT)) for path, text in generated.items()
             if not path.exists() or path.read_text(encoding="utf-8") != text]
    if arguments.check:
        if stale:
            raise SystemExit("Out-of-date Japanese 101 assets: " + ", ".join(stale))
    else:
        for path, text in generated.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
        print("Built Japanese→English 101 draft: Foundation 10 / Core 30 / Master 20; human review pending.")
