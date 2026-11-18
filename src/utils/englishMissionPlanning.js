import { englishMissionCatalog } from '../data/englishMissionCatalog.js';
import { formatSukimakunMissionGrade } from './sukimakunMissionResponse.js';

export const ENGLISH_MISSION_DUPLICATE_NOTICE = '同一単元を実施しています。登録しますか？';
export const catalog = englishMissionCatalog;
const dayMs = 86400000;

function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('開始日を正しく入力してください。');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0); date.setUTCFullYear(year, month - 1, day);
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw Error('存在する日付を入力してください。');
  return date;
}

export function addMissionDays(value, days) {
  if (!Number.isSafeInteger(days)) throw Error('日数が正しくありません。');
  const date = new Date(calendarDate(value).getTime() + days * dayMs);
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) throw Error('設定できる日付の範囲を超えています。');
  return date.toISOString().slice(0, 10);
}

export function todayInTokyo(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function missionPeriod(startDate, weekIndex = 0) {
  if (!Number.isSafeInteger(weekIndex) || weekIndex < 0) throw Error('週番号が正しくありません。');
  const start = addMissionDays(startDate, weekIndex * 7);
  return { startDate: start, endDate: addMissionDays(start, 6) };
}

export function formatMissionPeriod(startDate, endDate) {
  const format = value => { const date = calendarDate(value); return `${date.getUTCMonth() + 1}/${date.getUTCDate()}（${new Intl.DateTimeFormat('ja-JP', { timeZone: 'UTC', weekday: 'short' }).format(date)}）`; };
  return `${format(startDate)}～${format(endDate)}`;
}

export function expandEnglishMissionRange(startKey, endKey, materialGrade, source = catalog) {
  const first = source.units.findIndex(unit => unit.key === startKey);
  const last = source.units.findIndex(unit => unit.key === endKey);
  if (first < 0 || last < 0) throw Error('開始・終了単元を選択してください。');
  const selected = source.units.slice(first, last + 1);
  if (first > last) throw Error('終了単元は開始単元以降を選択してください。');
  if (!materialGrade || selected.some(unit => unit.grade !== materialGrade)) throw Error('開始・終了は同じ教材学年から選択してください。');
  return selected;
}

export function newEnglishMissionWeek(draftId = crypto.randomUUID()) {
  return { draftId, materialGrade: '', startUnit: '', startKey: '', endUnit: '', endKey: '' };
}

export function resizeEnglishMissionWeeks(weeks, nextCount, confirmRemoval) {
  if (!Number.isSafeInteger(nextCount) || nextCount < 1) throw Error('週数は1以上で指定してください。');
  if (nextCount < weeks.length && weeks.slice(nextCount).some(week => week.materialGrade || week.startKey || week.endKey || week.startUnit || week.endUnit) && !confirmRemoval()) return weeks;
  return nextCount < weeks.length ? weeks.slice(0, nextCount) : [...weeks, ...Array.from({ length: nextCount - weeks.length }, () => newEnglishMissionWeek())];
}

export function buildEnglishMissionWeeks(startDate, drafts) {
  if (!Array.isArray(drafts) || !drafts.length) throw Error('1週以上設定してください。');
  return drafts.map((draft, index) => {
    const selected = expandEnglishMissionRange(draft.startKey, draft.endKey, draft.materialGrade);
    return {
      weekNumber: index + 1, ...missionPeriod(startDate, index), catalogVersion: catalog.version,
      materials: [{ materialGrade: draft.materialGrade, startUnitKey: draft.startKey, endUnitKey: draft.endKey, unitKeys: selected.map(unit => unit.key) }],
      wordCount: selected.reduce((sum, unit) => sum + unit.wordCount, 0),
    };
  });
}

export function normalizeEnglishMissionTarget(target) {
  if (!Array.isArray(target?.scopeSchools)) throw Error('対象校舎範囲を確認してください。');
  const scopeSchools = [...new Set(target.scopeSchools)].sort();
  const attendingSchoolName = typeof target?.attendingSchoolName === 'string' ? target.attendingSchoolName.trim() : '';
  const targetGrade = typeof target?.targetGrade === 'string' ? formatSukimakunMissionGrade(target.targetGrade) : '';
  if (!scopeSchools.length || scopeSchools.some(s => typeof s !== 'string' || !s) || !attendingSchoolName || !/^(小[１-６]|中[１-３]|高[１-３]|大学受験)$/.test(targetGrade) || (target.subject && target.subject !== 'english')) throw Error('対象グループを確認してください。');
  return { scopeSchools, attendingSchoolName, targetGrade, subject: 'english' };
}

export function englishMissionTargetKey(target) {
  const t = normalizeEnglishMissionTarget(target);
  return JSON.stringify([1, t.scopeSchools, t.attendingSchoolName, t.targetGrade, t.subject]);
}

export function findEnglishMissionDuplicates(weeks, registered, target) {
  const targetKey = englishMissionTargetKey(target);
  const editingIds = new Set(weeks.map(week => week.missionId).filter(Boolean));
  const existing = registered.filter(week => week.target?.subject === 'english' && !editingIds.has(week.missionId) && englishMissionTargetKey(week.target) === targetKey);
  const seen = new Map(), incomingKeys = new Set(), duplicates = new Set();
  for (const [index, week] of weeks.entries()) {
    const identity = week.missionId || `new:${index}`;
    for (const key of week.materials.flatMap(material => material.unitKeys)) {
      incomingKeys.add(key);
      if (seen.has(key) && seen.get(key) !== identity) duplicates.add(key);
      seen.set(key, identity);
    }
  }
  for (const week of existing) for (const key of week.materials.flatMap(material => material.unitKeys)) if (incomingKeys.has(key)) duplicates.add(key);
  return [...duplicates];
}

export function findEnglishMissionPeriodConflicts(weeks, registered, target) {
  const normalized = normalizeEnglishMissionTarget(target);
  const editingIds = new Set(weeks.map(week => week.missionId).filter(Boolean));
  const relevant = registered.filter(week => {
    if (week.target?.subject !== 'english') return false;
    const t = normalizeEnglishMissionTarget(week.target);
    return !editingIds.has(week.missionId) && englishMissionTargetKey(t) === englishMissionTargetKey(normalized);
  });
  const conflicts = [];
  weeks.forEach((week, index) => {
    for (const other of [...weeks.slice(0, index), ...relevant]) if (week.startDate <= other.endDate && other.startDate <= week.endDate) conflicts.push({ weekNumber: week.weekNumber, missionId: other.missionId || null, startDate: other.startDate, endDate: other.endDate });
  });
  return conflicts;
}