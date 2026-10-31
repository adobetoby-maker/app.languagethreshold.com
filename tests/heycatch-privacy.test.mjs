import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

test('HeyCatch keeps private pages out and removes auth/query/DOM text from public events', async () => {
  mkdirSync('node_modules/.cache', { recursive: true });
  const dir = mkdtempSync(resolve('node_modules/.cache/heycatch-'));
  try {
    const file = join(dir, 'privacy.mjs');
    await build({ entryPoints: ['src/lib/heycatch.ts'], bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent' });
    const { sanitizeHeyCatchEvent } = await import(file);
    globalThis.window = { location: { href: 'https://app.languagethreshold.com/?module=roofing&utm_source=instagram' } };
    globalThis.document = { querySelector: () => null };
    const event = { event: '$pageview', properties: { $current_url: window.location.href, $referrer: 'https://medicalspanish.app/?email=private@example.com', $elements: [{ text: 'private document' }], $el_text: 'private phrase', $search: '?code=secret', heycatch_project_key: 'public-test', utm_source: 'instagram' } };
    const clean = sanitizeHeyCatchEvent(event);
    assert.equal(clean.properties.$current_url, 'https://app.languagethreshold.com/');
    assert.equal(clean.properties.$referrer, 'https://medicalspanish.app/');
    assert.equal(clean.properties.utm_source, 'instagram');
    assert.equal(clean.properties.heycatch_project_key, 'public-test');
    for (const key of ['$elements', '$el_text', '$search']) assert.equal(key in clean.properties, false);
    for (const path of ['/team?org=123', '/OWNER', '/exams/attempt', '/?code=secret', '/documents', '/?tab=documents']) {
      window.location.href = 'https://app.languagethreshold.com' + path;
      assert.equal(sanitizeHeyCatchEvent(event), null, path);
    }
    window.location.href = 'https://app.languagethreshold.com/';
    window.__languageThresholdSpeakingPrivacy = true;
    assert.equal(sanitizeHeyCatchEvent(event), null);
  } finally {
    delete globalThis.window; delete globalThis.document;
    rmSync(dir, { recursive: true, force: true });
  }
});
