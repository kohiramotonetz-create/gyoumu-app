export function readSukimakunMissionResponse(data) {
  if (data?.result !== 'success') {
    const error = new Error(data?.message || '学校情報を取得できませんでした。');
    error.requiresReauthentication = ['AUTHORIZATION_ERROR', 'AUTHENTICATION_ERROR'].includes(data?.code);
    throw error;
  }
  const strings = values => Array.isArray(values) && values.every(value => typeof value === 'string' && value.trim());
  const validGroup = group => group && typeof group.attendingSchoolName === 'string' && group.attendingSchoolName.trim()
    && typeof group.grade === 'string' && group.grade.trim() && strings(group.schools)
    && Number.isInteger(group.studentCount) && group.studentCount >= 0 && group.lastRegisteredAt === null;
  if (!Array.isArray(data.groups) || !data.groups.every(validGroup) || !strings(data.schools)
    || !Number.isInteger(data.unsetSchoolCount) || data.unsetSchoolCount < 0
    || typeof data.sessionExpiresAt !== 'string' || !Number.isFinite(Date.parse(data.sessionExpiresAt))) {
    throw new Error('学校情報の応答が正しくありません。再度表示してください。');
  }
  return data;
}

export const formatSukimakunMissionGrade = grade => grade.replace(/[0-9]/g, digit => String.fromCharCode(digit.charCodeAt(0) + 0xfee0));
