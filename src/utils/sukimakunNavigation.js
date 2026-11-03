export const isSukimakunHash = hash => /^#\/sukimakun(?:\/|\?|$)/.test(String(hash));

export function parseSukimakunHash(hash = '') {
  if (!isSukimakunHash(hash)) return { view: 'home' };
  const [path, query = ''] = hash.slice(1).split('?');
  if (path === '/sukimakun') return { view: 'home' };
  if (path === '/sukimakun/permissions') return { view: 'permissions' };
  if (path === '/sukimakun/missions') return { view: 'missions' };
  if (path !== '/sukimakun/missions/register') return { view: 'invalid' };
  const params = new URLSearchParams(query);
  const school = params.get('school') || '';
  const grade = params.get('grade') || '';
  const attendingSchoolName = params.get('name') || '';
  return school && grade && attendingSchoolName ? { view: 'register', school, grade, attendingSchoolName } : { view: 'invalid' };
}

export function buildSukimakunRegistrationHash(group, school) {
  const params = new URLSearchParams({ school, grade: group.grade, name: group.attendingSchoolName });
  return `#/sukimakun/missions/register?${params}`;
}
