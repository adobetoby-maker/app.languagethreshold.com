#!/usr/bin/env python3
"""Compare actual V4 Python pack keys with actual Swift playback keys."""

import argparse
import hashlib
import importlib.util
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "content/french-basics/private-watch-starter-plan.json"


def module_from(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def check(v4_root):
    v4_root = Path(v4_root).resolve()
    builder = module_from(v4_root / "scripts/build_watch_audio.py", "v4_watch_audio")
    catalog = v4_root / "Shared/RecordedAudioCatalog.swift"
    assert catalog.is_file()
    plan = json.loads(PLAN.read_text())
    assert plan["registered"] is False and plan["recordingsGenerated"] is False
    chosen = plan["selected"]
    values = [item["displayText"] for item in chosen]
    # Add explicit French typography, plain punctuation, NFC and exact-key probes.
    probes = values + ["Bonjour !", "Bonjour!", "bonjour", "Ça va ?", "Ça va?", "Ça va ? ",
                       "Enchantée !", "Enchantée!", "école", "e\u0301cole"]
    swift = '''import Foundation
@main struct Check {
  static func main() throws {
    let data = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
    let texts = try JSONDecoder().decode([String].self, from: data)
    let keys = texts.map { RecordedAudioCatalog.normalized($0) }
    let out = try JSONEncoder().encode(keys)
    print(String(decoding: out, as: UTF8.self))
  }
}
'''
    with tempfile.TemporaryDirectory(prefix="french-watch-parity-") as folder:
        folder = Path(folder)
        (folder / "Check.swift").write_text(swift)
        (folder / "texts.json").write_text(json.dumps(probes, ensure_ascii=False))
        binary = folder / "check"
        subprocess.run(["swiftc", "-parse-as-library", str(catalog), str(folder / "Check.swift"),
                        "-o", str(binary)], check=True, capture_output=True, text=True)
        result = subprocess.run([str(binary), str(folder / "texts.json")],
                                check=True, capture_output=True, text=True)
        swift_keys = json.loads(result.stdout)
    python_keys = [builder.normalize(value) for value in probes]
    assert swift_keys == python_keys, [(t, a, b) for t, a, b in zip(probes, swift_keys, python_keys) if a != b]
    assert swift_keys[0:len(chosen)] == [item["v4LookupKey"] for item in chosen]
    # Current V4 distinguishes spaced from unspaced terminal punctuation.
    assert builder.normalize("Bonjour !") == "bonjour "
    assert builder.normalize("Bonjour!") == builder.normalize("bonjour") == "bonjour"
    assert builder.normalize("Ça va ?") == "ça va "
    assert builder.normalize("Ça va?") == "ça va"
    assert builder.normalize("école") == builder.normalize("e\u0301cole")
    assert len(set(swift_keys[:len(chosen)])) == len(chosen)
    assert all(item["textSha256"] == hashlib.sha256(item["displayText"].encode("utf-8")).hexdigest()
               for item in chosen)
    print(json.dumps({"selectedTexts": len(chosen), "probes": len(probes),
                      "swiftPythonKeysMatch": True,
                      "spacedTerminalPunctuationKeys": sum(k.endswith(" ") for k in swift_keys[:len(chosen)]),
                      "catalogSourceSHA256": hashlib.sha256(catalog.read_bytes()).hexdigest(),
                      "builderSourceSHA256": hashlib.sha256((v4_root / "scripts/build_watch_audio.py").read_bytes()).hexdigest()}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--v4-root", type=Path, required=True)
    args = parser.parse_args()
    check(args.v4_root)
