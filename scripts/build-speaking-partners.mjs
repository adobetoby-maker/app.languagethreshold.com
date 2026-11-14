import { build } from "esbuild";
import { writeFile } from "node:fs/promises";
const result = await build({
  stdin: {
    contents:
      'export {SPEAKING_PARTNERS, suggestedPartnerIds, TEACHING_TOPICS} from "./src/data/speaking-partners.ts";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { SPEAKING_PARTNERS, suggestedPartnerIds, TEACHING_TOPICS } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);
await writeFile(
  "public/speaking-partners.v1.json",
  JSON.stringify(
    {
      version: 1,
      teachingTopics: TEACHING_TOPICS,
      teachingStyles: ["gentle", "standard"],
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
