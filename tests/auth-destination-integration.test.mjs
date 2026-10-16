import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const directory = resolve("node_modules/.cache/lle-tests");
mkdirSync(directory, {recursive:true});
const outfile = resolve(directory, "auth-destination-integration.mjs");
await build({
  stdin:{contents:`export {AuthProvider} from ${JSON.stringify(resolve("src/state/auth-state.tsx"))}; export {controls} from 'test-controls';`,resolveDir:process.cwd()},
  outfile,bundle:true,format:"esm",platform:"node",external:["react/jsx-runtime"],logLevel:"silent",
  plugins:[{name:"isolated-sdk-boundary",setup(b){
    b.onResolve({filter:/^(react|sonner|@\/integrations\/supabase\/client|test-controls)$/},()=>({path:"controls",namespace:"fixture"}));
    b.onLoad({filter:/.*/,namespace:"fixture"},()=>({contents:`
      export const controls={calls:[],errors:[],oauthError:null,throwOAuth:false};
      export const createContext=()=>({Provider:'auth-provider-fixture'});
      export const useContext=()=>null;
      export const useState=(value)=>[typeof value==='function'?value():value,()=>{}];
      export const useRef=(value)=>({current:value});
      export const useCallback=(value)=>value;
      export const useMemo=(fn)=>fn();
      export const useEffect=()=>{};
      export const useSyncExternalStore=()=>null;
      export const toast={error:(value)=>controls.errors.push(value),warning:()=>{}};
      export const supabase={auth:{
        signInWithOAuth:async(input)=>{controls.calls.push({type:'oauth',input});if(controls.throwOAuth)throw Error('fixture network failure');return {error:controls.oauthError};},
        signUp:async(input)=>{controls.calls.push({type:'signup',input});return {data:{session:null},error:null};},
        signInWithPassword:async(input)=>{controls.calls.push({type:'password',input});return {error:null};}
      }};
    `}));
  }}],
});
const {AuthProvider,controls}=await import(outfile);
function fixture(path) {
  const previous=Object.getOwnPropertyDescriptor(globalThis,"window"),values=new Map();
  const href="https://owned-preview.invalid"+path,url=new URL(href);
  const storage={getItem:(key)=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:(key)=>values.delete(key)};
  Object.defineProperty(globalThis,"window",{configurable:true,value:{location:{href,origin:url.origin,pathname:url.pathname,search:url.search},localStorage:storage}});
  controls.calls=[];controls.errors=[];controls.oauthError=null;controls.throwOAuth=false;
  const context=AuthProvider({children:null}).props.value;
  return {context,values,restore(){if(previous)Object.defineProperty(globalThis,"window",previous);else delete globalThis.window;}};
}

test("production Google callback sends the focused exam route and validated context to the SDK",async()=>{
  const org="10000000-0000-4000-8000-000000000001";
  const f=fixture(`/exams?org=${org}&module=roofing&target=Spanish&native=English&access_token=fixture-secret&returnTo=https://outside.invalid`);
  try{
    await f.context.signInWithGoogle();
    assert.equal(controls.calls.length,1);
    const {provider,options}=controls.calls[0].input;
    assert.equal(provider,"google");
    assert.equal(options.redirectTo,`https://owned-preview.invalid/exams?target=Spanish&native=English&module=roofing&org=${org}`);
    assert.ok(!f.values.get("lt_auth_return").includes("fixture-secret"));
  }finally{f.restore();}
});

test("production Google and email-confirmation callbacks retain private reviewer pages",async()=>{
  for(const page of ["/exam-content","/exam-reviewers"]){
    const f=fixture(page+"?form=private-reference&email=fixture@example.invalid");
    try{
      await f.context.signInWithGoogle();
      assert.equal(controls.calls[0].input.options.redirectTo,"https://owned-preview.invalid"+page);
      const result=await f.context.signUp("fictional@example.invalid","fixture-only");
      assert.equal(result.needsConfirmation,true);
      assert.equal(controls.calls[1].input.options.emailRedirectTo,"https://owned-preview.invalid"+page);
    }finally{f.restore();}
  }
});

test("production invitation confirmation keeps its token on the acceptance route without persisting a token marker",async()=>{
  const f=fixture("/team/accept?token=fictional-invite&access_token=fixture-secret#fragment");
  try{
    await f.context.signUp("fictional@example.invalid","fixture-only");
    assert.equal(controls.calls[0].input.options.emailRedirectTo,"https://owned-preview.invalid/team/accept?token=fictional-invite");
    assert.equal(f.values.has("lt_auth_return"),false);
  }finally{f.restore();}
});

test("SDK refusal or network failure clears the aborted return and reports a recoverable sign-in error",async()=>{
  for(const throws of [false,true]){
    const f=fixture("/exam-content");
    try{
      controls.throwOAuth=throws;controls.oauthError=throws?null:{message:"fixture provider error"};
      await f.context.signInWithGoogle();
      assert.equal(f.values.has("lt_auth_return"),false);
      assert.deepEqual(controls.errors,["Google sign-in could not start. Try again or use email sign-in."]);
    }finally{f.restore();}
  }
});

test("a new password sign-in discards an abandoned OAuth destination",async()=>{
  const f=fixture("/");
  try{
    f.values.set("lt_auth_return",JSON.stringify({pathname:"/exam-content",expiresAt:Date.now()+10000}));
    await f.context.signIn("fictional@example.invalid","fixture-only");
    assert.equal(controls.calls[0].type,"password");
    assert.equal(f.values.has("lt_auth_return"),false);
  }finally{f.restore();}
});
