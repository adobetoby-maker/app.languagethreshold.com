import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

test("actual Account route renders after sign-in without a learning provider or data writes", async () => {
  const cacheRoot = resolve("node_modules/.cache");
  mkdirSync(cacheRoot, { recursive: true });
  const dir = mkdtempSync(join(cacheRoot, "account-settings-"));
  try {
    await build({
      stdin: {
        contents: `import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {Route} from './src/routes/account.tsx';import {AudioRoutingSettings} from './src/components/settings/AudioRoutingSettings.tsx';export {auth,calls} from 'fixture-auth';export const render=()=>renderToStaticMarkup(React.createElement(Route.component));export const audioKey=(learningContext)=>AudioRoutingSettings({learningContext}).props.children.find(child=>child?.key!=null).key;`,
        resolveDir: process.cwd(),
        loader: "tsx",
      },
      outfile: join(dir, "case.mjs"),
      bundle: true,
      jsx: "automatic",
      format: "esm",
      platform: "node",
      banner: {
        js: 'import {createRequire} from "node:module"; const require = createRequire(import.meta.url);',
      },
      external: ["react", "react/jsx-runtime", "react-dom", "react-dom/server"],
      define: {
        "import.meta.env": "{}",
        __LT_APP_BUILD__: JSON.stringify({
          commit: "1234567890123456789012345678901234567890",
          builtAt: "2026-10-24T14:00:00.000Z",
          environment: "preview",
        }),
      },
      logLevel: "silent",
      plugins: [
        {
          name: "account-boundaries",
          setup(b) {
            b.onResolve({ filter: /^(fixture-auth|@\/state\/auth-state)$/ }, () => ({
              path: "auth",
              namespace: "fixture",
            }));
            b.onResolve({ filter: /^@\/state\/app-state$/ }, () => ({
              path: "app",
              namespace: "fixture",
            }));
            b.onResolve({ filter: /^@\/state\/subscription-state$/ }, () => ({
              path: "subscription",
              namespace: "fixture",
            }));
            b.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({
              path: "router",
              namespace: "fixture",
            }));
            b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({
              path: "client",
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
              loader: "tsx",
              contents: {
                auth: `export const auth={user:null,loading:false,isCurrentUser:id=>auth.user?.id===id};export const calls=[];export const AuthProvider=({children})=>children;export const useAuth=()=>auth;`,
                app: `export const useApp=()=>{throw Error('No learning provider on account route');};`,
                subscription: `export const SubscriptionProvider=({children})=>children;export const useSubscription=()=>({isActive:false,teamActive:false,demoMode:false,status:'none',refresh:async()=>{}});`,
                router: `import React from 'react';export const createFileRoute=()=>options=>options;export const Link=({to,children,...props})=>React.createElement('a',{...props,href:to},children);export const useNavigate=()=>()=>{};`,
                client: `import{calls}from'fixture-auth';const unexpected=()=>{calls.push('write');throw Error('Account rendering must not contact Supabase');};export const supabase={rpc:unexpected,from:unexpected,auth:new Proxy({},{get:()=>unexpected})};`,
              }[path],
            }));
          },
        },
      ],
    });
    const m = await import(join(dir, "case.mjs"));
    const guest = m.render();
    assert.match(guest, /Sign in to manage your account/);
    assert.match(guest, /1234567/);
    assert.match(guest, /Preview/);
    m.auth.loading = true;
    assert.doesNotThrow(() => m.render());
    m.auth.loading = false;
    m.auth.user = { id: "synthetic-account-a", email: "qa@example.invalid" };
    const signedIn = m.render();
    assert.match(signedIn, /Account Settings/);
    assert.match(signedIn, /Check audio routing/);
    assert.match(signedIn, /Delete all progress and start over/);
    assert.match(signedIn, /App version/);
    assert.doesNotMatch(signedIn, /Sign in to manage your account/);
    const accountKey = m.audioKey();
    const learningKey = m.audioKey('["flashcards","roofing","Spanish"]');
    assert.notEqual(accountKey, learningKey);
    assert.notEqual(learningKey, m.audioKey('["speak","roofing","Spanish"]'));
    m.auth.user = { id: "synthetic-account-b", email: "qa-b@example.invalid" };
    assert.notEqual(accountKey, m.audioKey());
    assert.match(m.render(), /qa-b@example.invalid/);
    assert.deepEqual(m.calls, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
