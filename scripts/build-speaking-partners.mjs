import { build } from "esbuild";
import { writeFile } from "node:fs/promises";
const result = await build({
  stdin: {
    contents:
      'export {SPEAKING_PARTNERS, suggestedPartnerIds} from "./src/data/speaking-partners.ts";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { SPEAKING_PARTNERS, suggestedPartnerIds } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);
await writeFile(
  "public/speaking-partners.v1.json",
  JSON.stringify(
    {
      version: 1,
      roles: SPEAKING_PARTNERS.map(([id, label, group, partnerRole, learnerRole]) => ({
        id,
        label,
        group,
        partnerRole,
        learnerRole,
      })),
      orCleaningSuggestions: suggestedPartnerIds("or-evs", "English for Work"),
    },
    null,
    2,
  ) + "\n",
);
