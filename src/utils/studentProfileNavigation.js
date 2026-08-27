export const buildStudentProfileHash = (userId, source = '') => {
  const normalized = String(userId || '').trim();
  if (!/^\d{6}$/.test(normalized)) return '';
  const query = source ? `?source=${encodeURIComponent(source)}` : '';
  return `#/student/${encodeURIComponent(normalized)}${query}`;
};

export const parseStudentProfileHash = (hash = '') => {
  const match = String(hash).match(/^#\/student\/(\d{6})(?:\?(.+))?$/);
  if (!match) return null;
  const params = new URLSearchParams(match[2] || '');
  return { userId: match[1], source: params.get('source') || '' };
};
