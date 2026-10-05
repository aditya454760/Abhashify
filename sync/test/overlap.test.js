const assert = require('assert');
const { mergeIntervals, unionMinutes, overlapSaved, effectiveMinutes, MIN } = require('../core/overlap');
const IST = 330;
const at = (day, h, m) => Date.parse(`2026-10-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`) - IST * MIN;
const S = (course, a, b, source = 'manual') => ({ course, s: a, e: b, source });
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('phone and laptop overlap in same course counts once', () => {
  const r = unionMinutes([S('gate', at(5, 7, 0), at(5, 7, 30), 'phone'), S('gate', at(5, 7, 0), at(5, 7, 30), 'laptop')], IST);
  assert.strictEqual(r.gate['2026-10-05'], 30);
});
t('partial overlap merges to the union', () => {
  const r = unionMinutes([S('gate', at(5, 7, 0), at(5, 7, 40)), S('gate', at(5, 7, 30), at(5, 8, 0))], IST);
  assert.strictEqual(r.gate['2026-10-05'], 60);
});
t('different courses are never merged', () => {
  const r = unionMinutes([S('gate', at(5, 7, 0), at(5, 8, 0)), S('dsa', at(5, 7, 0), at(5, 8, 0))], IST);
  assert.strictEqual(r.gate['2026-10-05'], 60);
  assert.strictEqual(r.dsa['2026-10-05'], 60);
});
t('containment counts the outer interval only', () => {
  const r = unionMinutes([S('gate', at(5, 7, 0), at(5, 9, 0)), S('gate', at(5, 7, 30), at(5, 8, 0))], IST);
  assert.strictEqual(r.gate['2026-10-05'], 120);
});
t('touching intervals add up with no gap or overlap', () => {
  assert.strictEqual(mergeIntervals([{ s: 0, e: 10 }, { s: 10, e: 20 }]).length, 1);
});
t('session across local midnight splits between days (IST)', () => {
  const r = unionMinutes([S('gate', at(5, 23, 40), at(6, 0, 20))], IST);
  assert.strictEqual(r.gate['2026-10-05'], 20);
  assert.strictEqual(r.gate['2026-10-06'], 20);
});
t('empty and zero-length sessions are ignored', () => {
  const r = unionMinutes([S('gate', at(5, 7, 0), at(5, 7, 0))], IST);
  assert.deepStrictEqual(r.gate, {});
});
t('three devices overlapping in a chain', () => {
  const r = unionMinutes([S('gate', at(5, 7, 0), at(5, 7, 20)), S('gate', at(5, 7, 15), at(5, 7, 45)), S('gate', at(5, 7, 40), at(5, 8, 0))], IST);
  assert.strictEqual(r.gate['2026-10-05'], 60);
});
t('overlapSaved reports minutes counted once', () => {
  const r = overlapSaved([S('gate', at(5, 7, 0), at(5, 7, 30)), S('gate', at(5, 7, 10), at(5, 7, 30)), S('dsa', at(5, 7, 0), at(5, 7, 30))]);
  assert.strictEqual(r.gate, 20);
  assert.strictEqual(r.dsa, 0);
});
t('input is not mutated', () => {
  const a = [S('gate', at(5, 7, 0), at(5, 7, 30)), S('gate', at(5, 7, 10), at(5, 7, 50))];
  const copy = JSON.stringify(a);
  unionMinutes(a, IST);
  assert.strictEqual(JSON.stringify(a), copy);
});
t('effectiveMinutes adds up to the union and keeps input order', () => {
  const l = [{ s: at(5, 7, 30), e: at(5, 8, 0) }, { s: at(5, 7, 0), e: at(5, 7, 40) }, { s: at(5, 9, 0), e: at(5, 9, 10) }];
  const eff = effectiveMinutes(l);
  assert.deepStrictEqual(eff, [20, 40, 10]);
  assert.strictEqual(eff.reduce((a, b) => a + b, 0), unionMinutes(l.map(x => ({ ...x, course: 'g' })), IST).g['2026-10-05']);
});
t('effectiveMinutes: identical sessions, one counts', () => {
  const eff = effectiveMinutes([{ s: 0, e: 600000 }, { s: 0, e: 600000 }]);
  assert.strictEqual(eff[0] + eff[1], 10);
});
console.log(n + ' tests passed');
