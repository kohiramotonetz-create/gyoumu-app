export function buildLegacyPasswordEntries(externalServiceAccounts, studentAccountRules) {
  const serviceEntries = externalServiceAccounts.map((entry, index) => ({
    passwordEntryId: `password-legacy-service-${String(index + 1).padStart(4, '0')}`,
    category: 'service',
    serviceName: entry.service || entry.school || '',
    school: entry.school || '',
    url: entry.url || '',
    loginId: entry.userId || entry.id || '',
    password: entry.pass || entry.password || '',
    note: entry.note || '',
    creatorRule: '',
    sortOrder: index,
    enabled: true,
    deletedAt: '',
    legacy: true,
  }))
  const ruleEntries = studentAccountRules.map((entry, index) => ({
    passwordEntryId: `password-legacy-student-rule-${String(index + 1).padStart(4, '0')}`,
    category: 'student-rule',
    serviceName: entry.service || '',
    school: '',
    url: entry.url || '',
    loginId: entry.userId || '',
    password: entry.pass || '',
    note: entry.condition || '',
    creatorRule: entry.creator || '',
    sortOrder: externalServiceAccounts.length + index,
    enabled: true,
    deletedAt: '',
    legacy: true,
  }))
  return [...serviceEntries, ...ruleEntries]
}

export function isLegacyPasswordResponse(data) {
  if (data?.result === 'success') return data.source === 'legacy' || data.migrationStatus !== 'MIGRATED' || data.readOnly === true
  return data?.code === 'SETUP_REQUIRED'
    || data?.code === 'MIGRATION_REQUIRED'
    || (!data?.code && /unknown action/i.test(String(data?.message || '')))
}
