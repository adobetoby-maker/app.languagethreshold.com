import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("actual Swift locale selection preserves exact accents and bounds on-device region fallback", { skip: process.platform !== "darwin" }, () => {
  const source = readFileSync(new URL("../ios/App/App/PhoneDictationPlugin.swift", import.meta.url), "utf8");
  const helper = source.split("// BEGIN phone dictation locale order\n")[1].split("// END phone dictation locale order")[0];
  const result = spawnSync("swift", ["-e", `import Foundation\n${helper}\n
precondition(phoneDictationLocales(requested:"es-CR", supported:["en-US","es-ES","es-MX"]) == ["es-MX","es-ES"])
precondition(phoneDictationLocales(requested:"es_CR", supported:["es-ES","es-MX","es-CR"]) == ["es-CR","es-MX","es-ES"])
precondition(phoneDictationLocales(requested:"en-GB", supported:["en-GB","en-US","es-MX"]) == ["en-GB","en-US"])
precondition(phoneDictationLocales(requested:"zh-HK", supported:["zh-CN","zh-TW"]).isEmpty)
precondition(phoneDictationLocales(requested:"zh-TW", supported:["zh-CN","zh-TW"]) == ["zh-TW"])
precondition(phoneDictationLocales(requested:"ps-AF", supported:["es-MX","en-US"]).isEmpty)
print("Locale selection passed")`], { encoding: "utf8", timeout: 60000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Locale selection passed/);
});
