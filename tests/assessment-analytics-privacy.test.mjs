import assert from 'node:assert/strict';import test from 'node:test';import {isPrivateAssessmentUrl,anonymousPageUrl} from '../src/lib/assessment-privacy.ts';
test('private assessment, account and team pages and links are excluded from page-view telemetry',()=>{
 for(const value of ['/exams','/exams?attempt=private','/exam-content?form=private','/team/accept?token=private','/owner','/account','/?module=roofing&plan=private','/?org=private','/?attempt=private','/#access_token=private'])assert.equal(isPrivateAssessmentUrl(value),true,value);
 for(const value of ['/','/pricing','/?module=roofing&target=Spanish','/exams-faq'])assert.equal(isPrivateAssessmentUrl(value),false,value);
 assert.equal(anonymousPageUrl('https://app.languagethreshold.com/?module=roofing&plan=private#token=private'),'https://app.languagethreshold.com/');
});
