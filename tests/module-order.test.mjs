import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modulesInLearningOrder } from '../src/lib/module-order.ts';

test('trades sort A–Z with Foundation, Core, Master together without mutating source', () => {
  const catalog = [
    {id:'master-roofing',name:'Roofing Master'}, {id:'roofing',name:'Roofing Supervisor'},
    {id:'foundation-roofing',name:'Roofing Foundation'}, {id:'plumber',name:'Plumber'},
    {id:'foundation-plumber',name:'Plumber Foundation'}, {id:'master-plumber',name:'Plumber Master'},
  ];
  const before = JSON.stringify(catalog);
  assert.deepEqual(modulesInLearningOrder(catalog).map(m=>m.id), [
    'foundation-plumber','plumber','master-plumber','foundation-roofing','roofing','master-roofing',
  ]);
  assert.equal(JSON.stringify(catalog),before);
  assert.deepEqual(modulesInLearningOrder(catalog.filter(m=>m.id.startsWith('foundation-')),catalog).map(m=>m.id),['foundation-plumber','foundation-roofing']);
});

import { moduleLearningPaths } from '../src/lib/module-order.ts';
test('one card contains exactly three ordered stage slots and never invents availability', () => {
 const catalog = [
  {id:'roofing',name:'Roofing Supervisor'}, {id:'foundation-roofing',name:'Roofing Foundation'},
  {id:'master-roofing',name:'Roofing Master'}, {id:'plumber',name:'Plumber'},
 ];
 const before=JSON.stringify(catalog);
 const paths=moduleLearningPaths(catalog);
 assert.deepEqual(paths.map(path=>path.module.id),['plumber','roofing']);
 assert.deepEqual(paths[1].stages.map(stage=>stage.module.id),['foundation-roofing','roofing','master-roofing']);
 assert.deepEqual(paths[0].stages.map(stage=>[stage.label,stage.module?.id]),[['Foundation',undefined],['Core','plumber'],['Master',undefined]]);
 assert.equal(JSON.stringify(catalog),before);
});
