import assert from 'node:assert/strict';import test from 'node:test';
import {assessmentCsv} from '../src/lib/assessments/export.ts';
test('CSV preserves text and neutralizes spreadsheet formulas including leading whitespace',()=>{
 const csv=assessmentCsv([['=cmd()', ' +SUM(A1)', '@bad', '-2', 'Spanish, English', 'say "hello"',null,0]]);
 assert.equal(csv,'\uFEFF"\'=cmd()","\' +SUM(A1)","\'@bad","\'-2","Spanish, English","say ""hello""","","0"');
});
