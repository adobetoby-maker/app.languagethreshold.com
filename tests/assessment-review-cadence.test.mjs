import assert from 'node:assert/strict';import test from 'node:test';
import {planToday,planCalendar,reviewDates} from '../src/lib/core30-plan.ts';
test('an explicitly approved review cadence changes review dates without changing lesson deadlines or mastery',()=>{
 const log={startDate:'2026-10-15',lessons:{1:{masteredAt:'2026-10-15T12:00:00Z'}}};
 const standard=planToday(log,30,'2026-10-17'),personal=planToday(log,30,'2026-10-17',2);
 assert.equal(standard.reviewDue,false);assert.equal(personal.reviewDue,true);assert.equal(standard.masteredCount,personal.masteredCount);assert.deepEqual(standard.nextLesson,personal.nextLesson);
 const calendar=planCalendar('2026-10-15',30,2);assert.equal(calendar.find(day=>day.date==='2026-10-17').review,true);assert.equal(reviewDates('2026-10-15',2).length,44);assert.deepEqual(reviewDates('2026-10-15',0),reviewDates('2026-10-15',4));
});
import {studyPlanStart,planLocalDay} from '../src/lib/assessments/plan-timing.ts';
test('selected plan pacing accounts for cumulative pauses using its timezone, without treating reschedules as pauses',()=>{
 assert.equal(studyPlanStart('2026-10-01','America/Denver',[
  {created_at:'2026-10-10T01:00:00Z',detail:{before:{pausedOn:'2026-10-07'}}},
  {created_at:'2026-10-14T16:00:00Z',detail:{before:{pausedOn:'2026-10-11'}}},
 ]),'2026-10-06');
 assert.equal(planLocalDay('America/Denver',new Date('2026-10-10T01:00:00Z')),'2026-10-09');
 assert.equal(studyPlanStart('2026-10-01','UTC',[]),'2026-10-01');
});
