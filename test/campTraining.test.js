import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assignCompetitionRanks, calculateCampTotal, formatRankChange, getCampErrorMessage, getCampInputSignature, getCurrentFiscalYear, normalizeCampCount, shouldAutoLoadCampView } from '../src/utils/campTraining.js';
import { compareStudentAccounts, filterCampParticipants } from '../src/utils/studentAccountOrdering.js';

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

test('現在年度は4月始まりで算出する', () => {
  assert.equal(getCurrentFiscalYear(new Date(2026, 2, 31)), 2025);
  assert.equal(getCurrentFiscalYear(new Date(2026, 3, 1)), 2026);
});

test('年度候補取得後はランキングとデータ入力を自動取得する', () => {
  assert.equal(shouldAutoLoadCampView('ranking', true), true);
  assert.equal(shouldAutoLoadCampView('input', true), true);
  assert.equal(shouldAutoLoadCampView('participants', true), false);
  assert.equal(shouldAutoLoadCampView('ranking', false), false);
});

test('シート未セットアップを判別可能な案内に変換する', () => {
  assert.match(getCampErrorMessage('CAMP_SETUP_REQUIRED', '元のメッセージ'), /合宿管理用シート/);
  assert.equal(getCampErrorMessage('VALIDATION_ERROR', '元のメッセージ'), '元のメッセージ');
});

test('入力値を取得時の値へ戻すと未保存判定も元に戻る', () => {
  const original = [{ studentId: '000001', japanese: 10, math: 0, english: 0, social: 0, science: 0 }];
  const changed = [{ ...original[0], japanese: 20 }];
  const restored = [{ ...changed[0], japanese: '10' }];
  assert.notEqual(getCampInputSignature(changed), getCampInputSignature(original));
  assert.equal(getCampInputSignature(restored), getCampInputSignature(original));
  assert.equal(getCampInputSignature([{ ...original[0], math: '' }]), getCampInputSignature(original));
});

test('データ入力UIは自動取得・再試行・未保存保護・参加者案内を持つ', () => {
  const source = fs.readFileSync(new URL('../src/components/CampTrainingManager.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, />表示<\/button>/);
  assert.match(source, /postAction\('getCampTrainingInput', condition, controller\.signal\)/);
  assert.match(source, /setInputDay\(1\)/);
  assert.match(source, /再試行/);
  assert.match(source, /参加者設定へ移動/);
  assert.match(source, /未保存の入力があります/);
  assert.match(source, /変更を破棄/);
  assert.match(source, /window\.confirm\('未保存の入力内容を破棄して/);
  assert.match(source, /loadCurrentView\(\{ preserveInput: true \}\)/);
  assert.match(source, /保存は完了しましたが/);
  assert.match(source, /saveInFlight\.current/);
  assert.match(source, /disabled=\{saving \|\| inputDirty\}/);
  assert.match(source, /sequence !== requestSequence\.current/);
  assert.match(source, /activeRequest\.current\?\.abort\(\)/);
  assert.match(source, /aria-pressed=\{view === 'input'\}/);
  assert.match(source, /if \(nextView === view \|\| inputDirty \|\| saving\) return/);
});

test('データ入力タブは取得中や未保存保護中も選択状態をDOMと配色で示す', () => {
  const componentSource = fs.readFileSync(new URL('../src/components/CampTrainingManager.jsx', import.meta.url), 'utf8');
  const cssSource = fs.readFileSync(new URL('../src/App.css', import.meta.url), 'utf8');

  assert.match(componentSource, /className=\{view === 'input' \? 'active' : ''\}/);
  assert.match(componentSource, /aria-pressed=\{view === 'input'\}/);
  assert.match(cssSource, /button\[aria-pressed="true"\]/);
  assert.match(cssSource, /button\.active:disabled/);
  assert.match(cssSource, /box-shadow: inset 0 -3px 0 #facc15/);
});

test('参加者を単一校舎・全担当校舎・任意学年・氏名で絞り込む', () => {
  const students = [
    { studentId: '1', school: '栗林', grade: '中３', name: '田中一郎', nameKana: 'タナカイチロウ' },
    { studentId: '2', school: '栗林', grade: '中２', name: '山田花子', nameKana: 'ヤマダハナコ' },
    { studentId: '3', school: '番町', grade: '中３', name: '佐藤次郎', nameKana: 'サトウジロウ' },
    { studentId: '4', school: '高松', grade: '中３', name: '田中三郎', nameKana: 'タナカサブロウ' },
  ];
  assert.deepEqual(filterCampParticipants(students, { school: '栗林' }).map(row => row.studentId), ['1', '2']);
  assert.deepEqual(filterCampParticipants(students, { school: '栗林', grades: ['中３'] }).map(row => row.studentId), ['1']);
  assert.deepEqual(filterCampParticipants(students, { school: '全担当校舎', assignedSchools: ['栗林', '番町'] }).map(row => row.studentId), ['1', '2', '3']);
  assert.deepEqual(filterCampParticipants(students, { school: '全担当校舎', assignedSchools: ['栗林', '番町'], nameQuery: '田中' }).map(row => row.studentId), ['1']);
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

test('参加者一覧をアカウント管理と同じ校舎順・フリガナ順で並べる', () => {
  const rows = [
    { studentId: '000003', school: '番町', name: '三郎', nameKana: 'サブロウ', grade: '中１' },
    { studentId: '000002', school: '栗林', name: '次郎', nameKana: 'ジロウ', grade: '中２' },
    { studentId: '000001', school: '栗林', name: '一郎', nameKana: 'イチロウ', grade: '中１' },
    { studentId: '000005', school: '栗林', name: 'A', nameKana: 'ジロウ', grade: '中１' },
    { studentId: '000004', school: '栗林', name: 'B', nameKana: 'ジロウ', grade: '中１' },
  ];
  assert.deepEqual(rows.sort(compareStudentAccounts).map(row => row.studentId), ['000001', '000005', '000004', '000002', '000003']);
});
