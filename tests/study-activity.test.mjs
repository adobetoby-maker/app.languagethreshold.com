import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeStudyActivity, studyStreak, lessonDates } from '../src/lib/study-activity.ts';
test('separate device minutes add, lessons deduplicate across devices by earliest day',()=>{
 const rows=[{device_id:'a',seconds:{'2026-11-04':300},lessons:{lesson:'2026-11-03'}},{device_id:'b',seconds:{'2026-11-04':400},lessons:{lesson:'2026-11-04',second:'2026-11-04'}}];
 const result=summarizeStudyActivity(rows);
 assert.equal(result.seconds['2026-11-04'],700);assert.equal(Object.keys(result.lessons).length,2);assert.equal(result.lessons.lesson,'2026-11-03');
 assert.equal(studyStreak(result.seconds,result.lessons,'2026-11-04'),2);
});
test('seconds below goal and an empty lesson map do not earn a day; missed days break streak',()=>{
 assert.equal(studyStreak({'2026-11-04':599},{},'2026-11-04'),0);
 assert.equal(studyStreak({'2026-11-04':600},{},'2026-11-04'),1);
 assert.equal(studyStreak({'2026-11-04':600},{},'2026-11-05'),1);
 assert.equal(studyStreak({'2026-11-04':600},{},'2026-11-06'),0);
});

test('matching native and scoped website lessons count once, including legacy copies',()=>{
 const scope=JSON.stringify(["core30",1,"foundation-spanish-basics","Spanish","English","default"]);
 const lessons=lessonDates({[scope]:{lessons:{1:{visits:{},masteredAt:"2026-11-04T12:00:00Z"}}},"foundation-spanish-basics":{lessons:{1:{visits:{},masteredAt:"2026-11-04T12:00:00Z"}}}});
 assert.deepEqual(Object.keys(lessons),["core60:Spanish:English:foundation-spanish-basics:1"]);
 const merged=summarizeStudyActivity([{seconds:{},lessons},{seconds:{},lessons:{"core60:Spanish:English:foundation-spanish-basics:1":"2026-11-04"}}]);
 assert.equal(Object.keys(merged.lessons).length,1);
});
