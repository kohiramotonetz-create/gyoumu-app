import test from 'node:test';
import assert from 'node:assert/strict';
import { assignCompetitionRanks, calculateCampTotal, formatRankChange, normalizeCampCount } from '../src/utils/campTraining.js';

test('空欄は0として扱い、0以上の整数だけを許可する', () => {
  assert.equal(normalizeCampCount(''), 0);
  assert.equal(normalizeCampCount('0'), 0);
  assert.equal(normalizeCampCount('12'), 12);
  assert.throws(() => normalizeCampCount('-1'));
  assert.throws(() => normalizeCampCount('1.5'));
  assert.throws(() => normalizeCampCount('abc'));
  assert.throws(() => normalizeCampCount(Number.NaN));
  assert.throws(() => normalizeCampCount(Number.POSITIVE_INFINITY));
});

test('5教科の問題数を合計する', () => {
  assert.equal(calculateCampTotal({ japanese: 1, math: 2, english: 3, social: 4, science: 5 }), 15);
});

test('標準競技順位で同点後の順位を飛ばす', () => {
  const ranked = assignCompetitionRanks([
    { studentId: '000003', total: 5 },
    { studentId: '000001', total: 10 },
    { studentId: '000002', total: 10 }
  ]);
  assert.deepEqual(ranked.map(row => row.rank), [1, 1, 3]);
});

test('前日比を上昇・下降・比較なしで表示する', () => {
  assert.equal(formatRankChange(1, 3), '↑2');
  assert.equal(formatRankChange(4, 3), '↓1');
  assert.equal(formatRankChange(2, 2), '―');
  assert.equal(formatRankChange(1, null), '―');
  assert.equal(formatRankChange(1, 2, false), '―');
});
