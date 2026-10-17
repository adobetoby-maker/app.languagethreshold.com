import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
export async function loadPaidFunction(name, exportName) {
  const root = mkdtempSync(resolve("node_modules/.cache/paid-function-"));
  try {
    const outfile = join(root, "handler.mjs");
    await build({
      stdin: {
        contents: `export {${exportName} as handler} from ${JSON.stringify(resolve(`src/fns/${name}.functions.ts`))};export {controls} from 'test-controls';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      external: ["zod"],
      logLevel: "silent",
      plugins: [
        {
          name: "paid-function-boundaries",
          setup(b) {
            b.onResolve(
              { filter: /^(test-controls|@anthropic-ai\/sdk|@tanstack\/react-start(\/server)?)$/ },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
        export const controls={calls:0,constructed:0,origin:'https://owned-preview.invalid',status:200,headers:{},abort:new AbortController()};
        export const createServerFn=()=>({inputValidator:validate=>({handler:fn=>({data})=>fn({data:validate(data)})})});
        export const getRequest=()=>new Request('https://owned-preview.invalid/_serverFn/fixture',{method:'POST',signal:controls.abort.signal,headers:{...(controls.origin?{Origin:controls.origin}:{}),'x-vercel-forwarded-for':'192.0.2.40'}});
        export const setResponseHeader=(key,value)=>controls.headers[key]=value;
        export const setResponseStatus=status=>controls.status=status;
        export default class Model{constructor(options){controls.constructed++;controls.options=options;}messages={create:async(body,options)=>{controls.calls++;controls.body=body;controls.callOptions=options;if(controls.fail)throw Error('PRIVATE provider request and payload');return {model:'fixture',usage:{input_tokens:1,output_tokens:1},content:[{type:'tool_use',name:body.tool_choice.name,input:controls.output}]};}};}
      `,
            }));
          },
        },
      ],
    });
    const loaded = await import(outfile);
    return { ...loaded, close: () => rmSync(root, { recursive: true, force: true }) };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}
