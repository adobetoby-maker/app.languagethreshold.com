import assert from "node:assert/strict";
import test from "node:test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {loadModule} from "./helpers/bundle.mjs";
const {CheckpointScheduleSummary}=await loadModule("src/components/exams/CheckpointScheduleSummary.tsx");
const now=Date.parse("2026-10-17T02:00:00Z");
const plan={status:"active",timezone:"America/Denver",checkpoints:[{id:"day45",checkpoint:"day45",due_date:"2026-11-15",status:"scheduled",ready:false,attempts:[]}]};
test("the actual summary exposes a named, textual next-checkpoint and honest content-gap state",()=>{
 const html=renderToStaticMarkup(createElement(CheckpointScheduleSummary,{plan,now}));
 assert.match(html,/aria-label="Checkpoint schedule summary"/);
 assert.match(html,/Next scheduled checkpoint · Day 45/);
 assert.match(html,/Content not yet available/);
 assert.match(html,/<time dateTime="2026-11-15">2026-11-15<\/time>/);
 assert.match(html,/America\/Denver/);
 assert.doesNotMatch(html,/Due today|Recommended date passed|Score|passed exam/i);
});
test("targeted support uses before/after checks rather than promising another90-day course",()=>{
 const html=renderToStaticMarkup(createElement(CheckpointScheduleSummary,{plan:{...plan,program_scope:"support_units",checkpoints:[{...plan.checkpoints[0],checkpoint:"day90"}]},now}));
 assert.match(html,/After supporting practice/);
 assert.doesNotMatch(html,/Day 90/);
});
