import assert from "node:assert/strict";
import test from "node:test";
import {assessmentDateKey,nextCheckpointGuidance} from "../src/lib/assessments/checkpoint-guidance.ts";
const now=Date.parse("2026-10-17T02:00:00Z");
const cp=(checkpoint,due_date,extra={})=>({id:checkpoint,checkpoint,due_date,status:"scheduled",ready:true,attempts:[],...extra});
const plan=(checkpoints,extra={})=>({status:"active",timezone:"America/Denver",checkpoints,...extra});

test("checkpoint labels follow the enrollment's calendar day across timezones and DST",()=>{
  assert.equal(assessmentDateKey(now,"America/Denver"),"2026-10-16");
  assert.equal(assessmentDateKey(now,"Asia/Tokyo"),"2026-10-17");
  assert.equal(nextCheckpointGuidance(plan([cp("entrance","2026-10-16")]),now).status,"Due today");
  assert.equal(nextCheckpointGuidance(plan([cp("entrance","2026-10-16")],{timezone:"Asia/Tokyo"}),now).status,"Recommended date passed");
  assert.equal(assessmentDateKey(Date.parse("2026-11-01T07:30:00Z"),"America/Denver"),"2026-11-01");
  assert.equal(assessmentDateKey(Date.parse("2026-11-01T08:30:00Z"),"America/Denver"),"2026-11-01");
});

test("next means earliest remaining scheduled date, without rewriting the checkpoint array",()=>{
  const checkpoints=[cp("day90","2026-12-01"),cp("entrance","2026-10-01"),cp("day45","2026-10-30")];
  const original=structuredClone(checkpoints);
  assert.equal(nextCheckpointGuidance(plan(checkpoints),now).checkpoint.id,"entrance");
  checkpoints[1].status="exempt";
  const result=nextCheckpointGuidance(plan(checkpoints),now);
  assert.equal(result.checkpoint.id,"day45"); assert.equal(result.status,"Upcoming");
  assert.deepEqual(checkpoints.map(c=>c.id),original.map(c=>c.id));
});

test("content gaps never become learner lateness and QA availability does not imply official readiness",()=>{
  const result=nextCheckpointGuidance(plan([cp("entrance","2026-01-01",{ready:false,pilotReady:true})]),now);
  assert.equal(result.status,"Content not yet available");
  assert.match(result.detail,/content gap, not learner lateness/);
});

test("submitted originals count as submitted despite an unfinished retake or pending scoring",()=>{
  const entrance=cp("entrance","2026-10-01",{attempts:[{status:"in_progress",submitted_at:null},{status:"needs_review",submitted_at:"2026-10-02T10:00:00Z"}]});
  const next=cp("day45","2026-11-01");
  assert.equal(nextCheckpointGuidance(plan([entrance,next]),now).checkpoint.id,"day45");
  const all=nextCheckpointGuidance(plan([entrance]),now);
  assert.equal(all.checkpoint,null); assert.equal(all.status,"Scheduled checkpoints submitted or exempt");
  assert.match(all.detail,/may still need scoring or review/);
});

test("paused, archived, empty and invalid schedules do not acquire due-now or passing labels",()=>{
  const checkpoints=[cp("entrance","2026-01-01")];
  assert.equal(nextCheckpointGuidance(plan(checkpoints,{status:"paused"}),now).status,"Plan paused");
  assert.equal(nextCheckpointGuidance(plan(checkpoints,{status:"archived"}),now).status,"Plan archived");
  assert.equal(nextCheckpointGuidance(plan([]),now).status,"No checkpoints scheduled");
  assert.equal(nextCheckpointGuidance(plan([cp("entrance","2026-02-30")]),now).status,"Schedule needs checking");
  assert.equal(nextCheckpointGuidance(plan(checkpoints,{timezone:"not/a-zone"}),now).status,"Schedule needs checking");
  assert.equal(assessmentDateKey(NaN,"UTC"),null);
});

test("a saved unsubmitted attempt remains visible without claiming an official result",()=>{
  const result=nextCheckpointGuidance(plan([cp("entrance","2026-01-01",{ready:false,attempts:[{status:"in_progress",submitted_at:null}]})]),now);
  assert.equal(result.status,"Saved attempt in progress");
  assert.equal(result.checkpoint.id,"entrance");
});
