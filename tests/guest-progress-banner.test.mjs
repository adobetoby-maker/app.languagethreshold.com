import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

test('actual guest banner ignores legacy activity, unmounts across auth boundaries, and preserves device dismissal', async () => {
  const dir = mkdtempSync(resolve('node_modules/.cache/guest-banner-'));
  const oldWindow = globalThis.window, oldStorage = globalThis.localStorage;
  const values = new Map([['lt.save-progress-earned', '1'], ['lt.emailCaptured', 'legacy@example.test'], ['lt.aiCallCount', '77']]);
  const original = new Map(values), reads = [], writes = [];
  globalThis.window = new EventTarget();
  globalThis.localStorage = {
    getItem(key) { reads.push(key); return values.get(key) ?? null; },
    setItem(key, value) { writes.push(key); values.set(key, value); },
  };
  try {
    const outfile = join(dir, 'banner.mjs');
    await build({
      stdin: { contents: `export {SaveProgressBanner} from './src/components/SaveProgressBanner';export {checkGate} from './src/lib/ai-gate';export {controls} from 'fixture';`, resolveDir: process.cwd() },
      outfile, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', logLevel: 'silent',
      plugins: [{ name: 'controlled-banner-host', setup(b) {
        b.onResolve({ filter: /^(react|react\/jsx-runtime|fixture|lucide-react|@\/state\/auth-state|\.\/auth\/AuthModal)$/ }, () => ({ path: 'host', namespace: 'fixture' }));
        b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
          export const controls={user:null,loading:false,slots:[],cursor:0,effects:[],render(fn){this.cursor=0;return fn();},commit(){for(const f of this.effects.splice(0))f();},unmount(){for(const s of this.slots)s?.cleanup?.();this.slots=[];this.effects=[];}};
          export const useAuth=()=>({user:controls.user,loading:controls.loading});
          export function useState(initial){const i=controls.cursor++;if(!(i in controls.slots))controls.slots[i]=typeof initial==='function'?initial():initial;return [controls.slots[i],v=>controls.slots[i]=v];}
          export function useEffect(fn){const i=controls.cursor++;if(!(i in controls.slots))controls.effects.push(()=>{controls.slots[i]={cleanup:fn()};});}
          export const jsx=(type,props)=>({type,props}),jsxs=jsx,Fragment='fragment';
          export const Bookmark='bookmark',X='x',AuthModal='auth-modal';
        ` }));
      } }],
    });
    const { SaveProgressBanner, controls, checkGate } = await import(outfile);
    const render = () => {
      const outer = SaveProgressBanner();
      if (!outer) { controls.unmount(); return null; }
      const result = controls.render(outer.type); controls.commit(); return result;
    };
    assert.equal(render(), null, 'old earned flag cannot establish current guest activity');
    window.dispatchEvent(new Event('lt:meaningful-learning-action'));
    assert.ok(render());
    controls.user = { id: 'learner-a' };
    assert.equal(render(), null);
    window.dispatchEvent(new Event('lt:meaningful-learning-action'));
    controls.user = null;
    assert.equal(render(), null, 'signed-in activity does not carry to guest');
    window.dispatchEvent(new Event('lt:meaningful-learning-action'));
    assert.ok(render());
    controls.loading = true;
    assert.equal(render(), null);
    controls.loading = false;
    assert.equal(render(), null, 'auth loading also ends guest eligibility');
    window.dispatchEvent(new Event('lt:meaningful-learning-action'));
    const visible = render();
    const find = (node, predicate) => {
      if (!node || typeof node !== 'object') return null;
      if (predicate(node)) return node;
      for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found; }
      return null;
    };
    find(visible, n => n.props?.['aria-label'] === 'Dismiss').props.onClick();
    assert.equal(render(), null);
    controls.unmount();
    assert.equal(render(), null, 'device presentation dismissal survives remount');
    assert.equal(checkGate(false), 'open');
    assert.equal(checkGate(true), 'open');
    assert.deepEqual(writes, ['lt.save-progress-dismissed']);
    assert.ok(reads.every(key => key === 'lt.save-progress-dismissed'));
    for (const [key, value] of original) assert.equal(values.get(key), value, 'legacy bytes retained');
    controls.unmount();
  } finally {
    globalThis.window = oldWindow; globalThis.localStorage = oldStorage;
    rmSync(dir, { recursive: true, force: true });
  }
});
