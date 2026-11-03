// Synthetic frontend contract only. No production GAS source or network client is loaded.
function createSukimakunPreviewMock(allSchools) {
  const roles = { '990001': 'admin', '990002': 'general', '990003': 'head-teacher', '990004': 'teacher', '990005': 'admin' };
  const students = [
    ['000001', '栗林', '合成生徒A', '中１', 'A中学校'], ['000002', '番町', '合成生徒B', '中１', 'A中学校'],
    ['000003', '栗林', '合成生徒C', '中２', 'A中学校'], ['000004', '番町', '合成生徒D', '中３', 'A中学校'],
    ['000005', '栗林', '合成生徒E', '中１', 'B中学校'], ['000006', '栗林', '合成生徒F', '中１', ''],
    ['000007', '木太南', '合成生徒G', '中１', 'A中学校'],
  ].map(([userId, school, name, grade, attendingSchoolName]) => ({ userId, school, name, nameKana: 'ゴウセイ　セイト', grade, attendingSchoolName, enabled: true, allowedContentIds: [] }));
  const sessions = new Map(), requests = [];
  let mode = 'normal';
  const expiry = () => new Date(Date.now() + 3600000).toISOString();
  const deny = () => ({ result: 'error', code: 'AUTHORIZATION_ERROR', message: '管理セッションが無効か、権限がありません' });
  const success = extra => ({ result: 'success', sessionExpiresAt: expiry(), ...extra });
  const norm = grade => String(grade).normalize('NFKC');
  function handle(payload) {
    requests.push({ action: payload.action, school: payload.school, grades: payload.grades, clientRolePresent: Object.hasOwn(payload, 'role') });
    if (payload.apiKey !== 'mock-only') return { result: 'error', message: '合成APIのキーが違います' };
    if (payload.action === 'login') {
      if (payload.password !== 'mock-only' || !roles[payload.userId]) return { result: 'fail', message: '合成アカウントでログインしてください' };
      const role = roles[payload.userId], assignedSchools = payload.userId === '990005' ? [] : ['栗林', '番町'];
      const sessionToken = 'synthetic-' + payload.userId;
      sessions.set(sessionToken, { role, assignedSchools });
      return success({ role, school: assignedSchools[0] || '', assignedSchools, sessionToken, name: '合成職員', isInitial: false });
    }
    if (payload.action === 'getPublishedKotoreContents') return success({ notices: [], homeNotice: null });
    if (payload.action === 'getTeacherHomeProgressSummary') return success({ scope: { label: '担当校舎' }, summary: { targetEntryCount: 0 }, items: [] });
    if (payload.action === 'getNotifications') return success({ notifications: [] });
    if (payload.action === 'getSukimakunMissionGroups') {
      if (mode === 'expired') return deny();
      if (mode === 'error') return { result: 'error', code: 'VALIDATION_ERROR', message: '合成API：学校情報の取得に失敗しました' };
      if (mode === 'malformed') return { result: 'success', groups: [] };
      const session = sessions.get(payload.sessionToken);
      if (!session || !['admin', 'general', 'head-teacher'].includes(session.role)) return deny();
      const schools = payload.school === '全校舎' ? session.role === 'admin' ? allSchools : []
        : payload.school === '全担当校舎' ? session.assignedSchools : [payload.school];
      const allowed = session.role === 'admin' ? allSchools : session.assignedSchools;
      if (typeof payload.school !== 'string' || !schools.length || schools.some(s => !allowed.includes(s))) return deny();
      if (!Array.isArray(payload.grades) || !payload.grades.length || payload.grades.length > 13 || payload.grades.some(g => typeof g !== 'string' || !/^(小[1-6]|中[1-3]|高[1-3]|大学受験)$/.test(norm(g)))) return { result: 'error', code: 'VALIDATION_ERROR', message: '学校情報を取得できませんでした' };
      const groups = new Map(); let unsetSchoolCount = 0;
      for (const student of students.filter(s => schools.includes(s.school) && payload.grades.map(norm).includes(norm(s.grade)))) {
        if (!student.attendingSchoolName) { unsetSchoolCount++; continue; }
        const grade = norm(student.grade), key = JSON.stringify([student.attendingSchoolName, grade]);
        if (!groups.has(key)) groups.set(key, { attendingSchoolName: student.attendingSchoolName, grade, schools: [], studentCount: 0, lastRegisteredAt: null });
        const group = groups.get(key); group.studentCount++; if (!group.schools.includes(student.school)) group.schools.push(student.school);
      }
      return success({ groups: [...groups.values()], schools, unsetSchoolCount });
    }
    if (payload.action === 'getSukimakunPermissionMatrix') return success({ contents: [{ contentId: 'synthetic-english', displayName: '合成教材', category: 'general', schoolType: 'all', subject: 'english', enabled: true, sortOrder: 1 }], students: students.filter(s => (payload.school === '全担当校舎' ? ['栗林', '番町'].includes(s.school) : s.school === payload.school) && norm(s.grade) === norm(payload.grade)) });
    if (payload.action === 'getStudentProfileSummary') return success({ student: students.find(s => s.userId === payload.userId), oneToOneSubjectIds: [] });
    if (payload.action.startsWith('getStudentProfile')) return success({ subjects: [], items: [], currentContents: [], schoolYears: [] });
    return { result: 'error', code: 'SYNTHETIC_ACTION_NOT_IMPLEMENTED', message: 'この合成検証では対象外の操作です' };
  }
  return { handle, setMode: value => { if (!['normal', 'error', 'expired', 'malformed'].includes(value)) throw Error('Unknown synthetic mode'); mode = value; }, stats: () => ({ mode, requests: requests.slice() }) };
}
module.exports = { createSukimakunPreviewMock };