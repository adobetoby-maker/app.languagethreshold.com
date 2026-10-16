import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers/bundle.mjs';
import { attemptMatchesOrganization } from '../src/lib/assessments/scope.ts';
import { recoveryCopiesForScope } from '../src/lib/assessments/offline.ts';

const { readAttempt } = await loadModule('src/lib/assessments/server.ts', {
  stubs: [/^@tanstack\/react-start\/server-only$/],
});

test('an explicit team context excludes owned personal, legacy and other-team direct links', () => {
  const copies = [
    { id: 'personal', enrollment: { scope: 'personal', organizationId: null } },
    { id: 'team-a', enrollment: { scope: 'team', organizationId: 'a' } },
    { id: 'team-b', enrollment: { scope: 'team', organizationId: 'b' } },
    { id: 'legacy', enrollment: {} },
  ];
  for (const copy of copies) {
    assert.equal(attemptMatchesOrganization(copy, 'a'), copy.id === 'team-a');
    assert.equal(attemptMatchesOrganization(copy), true);
  }
  const teamRecovery = recoveryCopiesForScope(copies, 'a');
  assert.equal(teamRecovery.find(copy => copy.id === 'personal'), undefined);
  assert.equal(teamRecovery.find(copy => copy.id === 'team-b'), undefined);
  assert.equal(teamRecovery.find(copy => copy.id === 'team-a')?.id, 'team-a');
});

function fixture(scope, organizationId, owner = 'learner') {
  const queried = [];
  const responseRead = new Error('authorized response query reached');
  const rows = {
    assessment_attempts: { id: 'attempt', checkpoint_id: 'checkpoint', form_snapshot: { definition: {} } },
    assessment_checkpoints: { id: 'checkpoint', enrollment_id: 'enrollment' },
    assessment_enrollments: { id: 'enrollment', scope, organization_id: organizationId, user_id: owner },
    team_members: { role: 'member', status: 'active' },
  };
  const db = {
    from(table) {
      queried.push(table);
      if (table === 'assessment_responses') throw responseRead;
      const query = {
        select() { return query; }, eq() { return query; },
        maybeSingle: async () => ({ data: rows[table], error: null }),
        single: async () => ({ data: rows[table], error: null }),
      };
      return query;
    },
  };
  return { db, queried, responseRead };
}

for (const [scope, organizationId] of [['personal', null], ['team', 'other-team']]) {
  test(`server rejects owned ${scope} attempt outside selected team before reading responses`, async () => {
    const { db, queried } = fixture(scope, organizationId);
    await assert.rejects(readAttempt(db, 'learner', 'attempt', false, 'selected-team'),
      error => error.status === 403 && /selected team view/.test(error.message));
    assert.equal(queried.includes('assessment_responses'), false);
  });
}

test('matching team and unscoped personal requests still pass normal access checks', async () => {
  for (const [scope, organizationId, selected] of [
    ['team', 'selected-team', 'selected-team'], ['personal', null, undefined],
  ]) {
    const { db, responseRead } = fixture(scope, organizationId);
    await assert.rejects(readAttempt(db, 'learner', 'attempt', false, selected),
      error => error === responseRead);
  }
  const { db, queried } = fixture('personal', null, 'different-owner');
  await assert.rejects(readAttempt(db, 'learner', 'attempt'), error => error.status === 403);
  assert.equal(queried.includes('assessment_responses'), false);
});
