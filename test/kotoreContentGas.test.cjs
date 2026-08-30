const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const source = fs.readFileSync(path.join(__dirname, '..', 'gas', 'コード.js'), 'utf8')

function makeSheet(initialRows = [], options = {}) {
  const rows = initialRows.map(row => [...row])
  const textCells = new Set()
  let dataWriteCount = 0
  let partialWriteFailed = false
  const lastRow = () => {
    for (let index = rows.length - 1; index >= 0; index -= 1) if ((rows[index] || []).some(value => value !== '' && value !== null && value !== undefined)) return index + 1
    return 0
  }
  return {
    rows,
    textCells,
    getLastRow: lastRow,
    getMaxRows: () => Math.max(100, rows.length),
    getRange: (row, column = 1, rowCount = 1, columnCount = 1) => ({
      getValues: () => Array.from({ length: rowCount }, (_, r) => Array.from({ length: columnCount }, (_, c) => {
        const value = rows[row - 1 + r]?.[column - 1 + c] ?? ''
        if (options.corruptReadBack && dataWriteCount > 0 && row > 1 && r === 0 && c === 2) return `${value}-corrupt`
        return value
      })),
      setValues: values => {
        if (row > 1) dataWriteCount += 1
        const valuesToWrite = options.partialWriteFailure && row > 1 && !partialWriteFailed ? values.slice(0, 1) : values
        valuesToWrite.forEach((valueRow, r) => {
          if (!rows[row - 1 + r]) rows[row - 1 + r] = []
          valueRow.forEach((value, c) => {
            const key = `${row + r}:${column + c}`
            rows[row - 1 + r][column - 1 + c] = typeof value === 'string' && /^[=+\-@]/.test(value) && !textCells.has(key) ? `FORMULA:${value}` : value
          })
        })
        if (options.partialWriteFailure && row > 1 && !partialWriteFailed) {
          partialWriteFailed = true
          throw new Error('injected partial write failure')
        }
      },
      setNumberFormat: format => {
        if (format === '@') for (let r = 0; r < rowCount; r += 1) for (let c = 0; c < columnCount; c += 1) textCells.add(`${row + r}:${column + c}`)
      },
      clearContent: () => {
        if (options.failRollback && partialWriteFailed) throw new Error('injected rollback failure')
        for (let r = 0; r < rowCount; r += 1) for (let c = 0; c < columnCount; c += 1) if (rows[row - 1 + r]) rows[row - 1 + r][column - 1 + c] = ''
      },
    }),
    appendRow: row => rows.push([...row]),
    setFrozenRows: () => {},
  }
}

function makeEnvironment({ sheets = {}, properties = {} } = {}) {
  const propertyMap = new Map(Object.entries(properties))
  let passwordMigrationSource = null
  if (typeof properties.PASSWORD_MIGRATION_JSON === 'string') {
    try { passwordMigrationSource = JSON.parse(properties.PASSWORD_MIGRATION_JSON) } catch { /* invalid source tests keep the raw value */ }
  }
  const spreadsheet = {
    getSheetByName: name => sheets[name] || null,
    insertSheet: name => { sheets[name] = makeSheet(); return sheets[name] },
  }
  let lockHeld = false
  const lock = { waitLock: () => { if (lockHeld) throw new Error('nested lock'); lockHeld = true }, hasLock: () => lockHeld, releaseLock: () => { lockHeld = false } }
  const context = vm.createContext({
    console, Date, Set, Map, Object, Array, String, Number, Boolean, Math, JSON, RegExp, Error, URL,
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => propertyMap.has(key) ? propertyMap.get(key) : null, setProperty: (key, value) => propertyMap.set(key, String(value)), deleteProperty: key => propertyMap.delete(key) }) },
    LockService: { getDocumentLock: () => lock },
    Utilities: { getUuid: () => 'uuid', base64Decode: value => [...Buffer.from(value, 'base64')], base64Encode: value => Buffer.from(value).toString('base64'), newBlob: (bytes, mimeType, name) => ({ bytes, mimeType, name, getBytes: () => bytes }) },
  })
  vm.runInContext(source, context)
  if (Array.isArray(passwordMigrationSource)) {
    context.__passwordMigrationSource = passwordMigrationSource
    vm.runInContext('LEGACY_PASSWORD_MIGRATION_SOURCE.splice(0, LEGACY_PASSWORD_MIGRATION_SOURCE.length, ...__passwordMigrationSource.map(item => Object.assign({}, item)))', context)
  }
  context.requireAdminSession = () => ({ userId: 'admin', role: 'admin', sessionExpiresAt: 'later' })
  context.validateManagementSession = () => ({ userId: 'teacher', role: 'teacher', sessionExpiresAt: 'later' })
  return { context, sheets, propertyMap, isLockHeld: () => lockHeld }
}

const contentHeaders = context => Array.from(vm.runInContext('KOTORE_CONTENT_HEADERS', context))
const passwordHeaders = context => Array.from(vm.runInContext('PASSWORD_ENTRY_HEADERS', context))

test('個トレstaff sessionはadmin・head-teacher・teacherだけを許可する', () => {
  const { context } = makeEnvironment()
  assert.equal(vm.runInContext('requireKotoreStaffSession_("token").role', context), 'teacher')
  context.validateManagementSession = () => ({ role: 'student', sessionExpiresAt: 'later' })
  assert.throws(() => vm.runInContext('requireKotoreStaffSession_("token")', context), error => error.code === 'AUTHORIZATION_ERROR')
})

test('コンテンツ・画像の書込みactionはteacherをGAS側で拒否する', () => {
  const { context } = makeEnvironment()
  context.requireAdminSession = () => { const error = new Error('forbidden'); error.code = 'AUTHORIZATION_ERROR'; throw error }
  context.__draft = { action: 'saveKotoreContentDraft', sessionToken: 'token', contentType: 'guide', title: 'title', draftMarkdown: 'body', importance: 'normal' }
  context.__imageList = { action: 'listKotoreContentImagesAdmin', sessionToken: 'token' }
  assert.throws(() => vm.runInContext('handleKotoreContentAction_(__draft)', context), error => error.code === 'AUTHORIZATION_ERROR')
  assert.throws(() => vm.runInContext('handleKotoreImageAction_(__imageList)', context), error => error.code === 'AUTHORIZATION_ERROR')
})

test('コンテンツSheet未作成でも一覧は空で開き、固定ページは初回保存・公開できる', () => {
  const { context, sheets } = makeEnvironment()
  context.__list = { sessionToken: 'token', contentType: 'guide' }
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(listKotoreContentsAdmin_(__list).contents)', context)), [])
  context.__guide = { sessionToken: 'token', contentType: 'guide', title: '個トレの仕方', draftMarkdown: '# 手順', importance: 'normal' }
  const draft = vm.runInContext('mutateKotoreContent_(__guide, false)', context)
  assert.equal(draft.content.contentId, 'kotore-guide')
  assert.equal(draft.content.status, 'draft')
  assert.ok(sheets['個トレコンテンツ'])
  context.__guidePublish = { ...context.__guide, contentId: draft.content.contentId, expectedUpdatedAt: draft.content.updatedAt }
  const published = vm.runInContext('mutateKotoreContent_(__guidePublish, true)', context)
  assert.equal(published.content.publishedMarkdown, '# 手順')
})

test('お知らせは0件から作成・下書き・公開・再取得・削除できる', () => {
  const { context } = makeEnvironment()
  context.__notice = { sessionToken: 'token', contentType: 'notice', title: 'お知らせ', draftMarkdown: '# 本文', importance: 'important' }
  const draft = vm.runInContext('mutateKotoreContent_(__notice, false)', context)
  assert.match(draft.content.contentId, /^kotore-notice-/)
  context.__noticePublish = { ...context.__notice, contentId: draft.content.contentId, expectedUpdatedAt: draft.content.updatedAt }
  const published = vm.runInContext('mutateKotoreContent_(__noticePublish, true)', context)
  context.__public = { sessionToken: 'token', contentTypes: ['notice'] }
  assert.equal(vm.runInContext('getPublishedKotoreContents_(__public).notices.length', context), 1)
  context.__delete = { sessionToken: 'token', contentId: draft.content.contentId, expectedUpdatedAt: published.content.updatedAt }
  assert.equal(vm.runInContext('deleteKotoreNotice_(__delete).result', context), 'success')
  assert.equal(vm.runInContext('getPublishedKotoreContents_(__public).notices.length', context), 0)
})

test('メニューの使い方は未作成から公開し講師向けresponseへ反映できる', () => {
  const { context } = makeEnvironment()
  context.__menuGuide = { sessionToken: 'token', contentType: 'menu-guide', title: 'メニューの使い方', draftMarkdown: '# 使い方', importance: 'normal' }
  const published = vm.runInContext('mutateKotoreContent_(__menuGuide, true)', context)
  assert.equal(published.content.contentId, 'kotore-menu-guide')
  context.__public = { sessionToken: 'token', contentTypes: ['menu-guide'] }
  const result = vm.runInContext('getPublishedKotoreContents_(__public)', context)
  assert.equal(result.menuGuide.publishedMarkdown, '# 使い方')
})

test('画像Sheet未作成のadmin一覧は空状態を返す', () => {
  const { context } = makeEnvironment()
  context.__images = { action: 'listKotoreContentImagesAdmin', sessionToken: 'token' }
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(handleKotoreImageAction_(__images).images)', context)), [])
})

test('下書きメタデータは公開版を変えずpublish時だけ本文とメタデータを反映する', () => {
  const { context, sheets } = makeEnvironment()
  sheets['個トレコンテンツ'] = makeSheet([contentHeaders(context)])
  context.__first = { sessionToken: 'token', contentType: 'guide', title: '公開1', draftMarkdown: '# 公開1', importance: 'normal', publishStart: '2026-01-01T00:00:00.000Z' }
  const first = vm.runInContext('mutateKotoreContent_(__first, true)', context)
  context.__draft = { ...context.__first, contentId: first.content.contentId, expectedUpdatedAt: first.content.updatedAt, title: '下書き2', draftMarkdown: '# 下書き2', importance: 'important', publishStart: '' }
  const draft = vm.runInContext('mutateKotoreContent_(__draft, false)', context)
  assert.equal(draft.content.title, '下書き2')
  assert.equal(draft.content.publishedTitle, '公開1')
  assert.equal(draft.content.publishedMarkdown, '# 公開1')
  assert.equal(draft.content.publishedImportance, 'normal')
  assert.equal(draft.content.publishedPublishStart, '2026-01-01T00:00:00.000Z')
  assert.equal(draft.content.publishStart, '')
  context.__publish = { ...context.__draft, expectedUpdatedAt: draft.content.updatedAt }
  const published = vm.runInContext('mutateKotoreContent_(__publish, true)', context)
  assert.equal(published.content.publishedTitle, '下書き2')
  assert.equal(published.content.publishedMarkdown, '# 下書き2')
  assert.equal(published.content.publishedImportance, 'important')
  assert.equal(published.content.publishedPublishStart, '')
})

test('コンテンツのtitleとMarkdownは数式開始文字を完全一致で往復する', () => {
  const { context, sheets } = makeEnvironment()
  sheets['個トレコンテンツ'] = makeSheet([contentHeaders(context)])
  let saved = null
  for (const prefix of ['=', '+', '-', '@']) {
    context.__input = { sessionToken: 'token', contentId: saved?.contentId || '', expectedUpdatedAt: saved?.updatedAt || '', contentType: 'guide', title: `${prefix}title`, draftMarkdown: `${prefix}markdown`, importance: 'normal' }
    saved = vm.runInContext('mutateKotoreContent_(__input, false).content', context)
    assert.equal(saved.title, `${prefix}title`)
    assert.equal(saved.draftMarkdown, `${prefix}markdown`)
    assert.equal(sheets['個トレコンテンツ'].rows[1][16], `${prefix}title`)
    assert.equal(sheets['個トレコンテンツ'].rows[1][3], `${prefix}markdown`)
  }
})

test('contentId重複はread・update・publishをDATA_ERRORで停止する', () => {
  const { context, sheets } = makeEnvironment()
  const row = ['duplicate', 'notice', '公開', '# draft', '# public', 'normal', 'published', '', '', new Date(), 'admin', new Date(), 'admin', new Date(), 'admin', '', '下書き', 'normal', '', '']
  sheets['個トレコンテンツ'] = makeSheet([contentHeaders(context), row, [...row]])
  assert.throws(() => vm.runInContext('readKotoreContents_(true)', context), error => error.code === 'DATA_ERROR')
  context.__input = { sessionToken: 'token', contentId: 'duplicate', contentType: 'notice', title: 'x', draftMarkdown: 'x', importance: 'normal', expectedUpdatedAt: new Date().toISOString() }
  assert.throws(() => vm.runInContext('mutateKotoreContent_(__input, false)', context), error => error.code === 'DATA_ERROR')
  assert.throws(() => vm.runInContext('mutateKotoreContent_(__input, true)', context), error => error.code === 'DATA_ERROR')
})

test('password migration未完了の全状態はlegacy read-onlyを返しCRUDを拒否する', () => {
  for (const status of ['NOT_MIGRATED', 'MIGRATING', 'FAILED']) {
    const { context, sheets } = makeEnvironment({ properties: { PASSWORD_MIGRATION_STATUS: status } })
    sheets['各種パスワード'] = makeSheet([passwordHeaders(context)])
    context.__read = { action: 'getPasswordEntries', sessionToken: 'token' }
    const result = vm.runInContext('handlePasswordEntryAction_(__read)', context)
    assert.equal(result.source, 'legacy')
    assert.equal(result.readOnly, true)
    assert.equal(result.migrationStatus, status)
    context.__write = { action: 'createPasswordEntry', sessionToken: 'token', entry: { serviceName: 'test' } }
    assert.throws(() => vm.runInContext('handlePasswordEntryAction_(__write)', context), error => error.code === 'MIGRATION_REQUIRED')
  }
})

test('組み込み移行元は従来定数の全件・全主要項目・順序と一致する', async () => {
  const { externalServiceAccounts, studentAccountRules } = await import('../src/constants/data.js')
  const { buildLegacyPasswordEntries } = await import('../src/utils/passwordEntries.js')
  const expected = buildLegacyPasswordEntries(externalServiceAccounts, studentAccountRules).map(({ legacy, enabled, deletedAt, ...entry }) => entry)
  const { context, sheets, propertyMap } = makeEnvironment()
  const actual = JSON.parse(vm.runInContext('JSON.stringify(getLegacyPasswordMigrationSource_())', context))
  assert.deepEqual(actual, expected)
  assert.equal(actual.length, externalServiceAccounts.length + studentAccountRules.length)

  sheets['各種パスワード'] = makeSheet([passwordHeaders(context)])
  const result = vm.runInContext('migratePasswordConstants()', context)
  assert.equal(result.sourceCount, expected.length)
  assert.equal(result.readBackCount, expected.length)
  assert.equal(propertyMap.get('PASSWORD_MIGRATION_STATUS'), 'MIGRATED')
  assert.deepEqual(JSON.parse(propertyMap.get('PASSWORD_MIGRATION_JSON')), expected)
  context.__read = { action: 'getPasswordEntries', sessionToken: 'token' }
  const migrated = JSON.parse(vm.runInContext('JSON.stringify(handlePasswordEntryAction_(__read).entries)', context))
  assert.deepEqual(migrated.map(entry => [entry.passwordEntryId, entry.sortOrder, entry.serviceName, entry.loginId, entry.password, entry.url, entry.note, entry.creatorRule]), expected.map(entry => [entry.passwordEntryId, entry.sortOrder, entry.serviceName, entry.loginId, entry.password, entry.url, entry.note, entry.creatorRule]))
})

test('sheet不存在・header-only・partialでもmigration前はlegacyを維持する', () => {
  const { context, sheets } = makeEnvironment()
  context.__read = { action: 'getPasswordEntries', sessionToken: 'token' }
  assert.equal(vm.runInContext('handlePasswordEntryAction_(__read).source', context), 'legacy')
  sheets['各種パスワード'] = makeSheet([passwordHeaders(context)])
  assert.equal(vm.runInContext('handlePasswordEntryAction_(__read).source', context), 'legacy')
  sheets['各種パスワード'].rows.push(['password-partial', 'service', 'partial'])
  assert.equal(vm.runInContext('handlePasswordEntryAction_(__read).source', context), 'legacy')
})

test('setup後もNOT_MIGRATEDでlegacy fallbackを継続する', () => {
  const { context } = makeEnvironment()
  const setup = vm.runInContext('setupPasswordManagementSheets()', context)
  assert.equal(setup.migrationStatus, 'NOT_MIGRATED')
  context.__read = { action: 'getPasswordEntries', sessionToken: 'token' }
  assert.equal(vm.runInContext('handlePasswordEntryAction_(__read).source', context), 'legacy')
})

test('password migrationは安定ID・順序・安全文字列を検証してMIGRATEDへ進む', () => {
  const migrationSource = ['=', '+', '-', '@'].map(prefix => ({ category: 'service', serviceName: `${prefix}service`, loginId: `${prefix}login`, password: `${prefix}password`, note: `${prefix}memo`, creatorRule: `${prefix}rule` }))
  const { context, sheets, propertyMap } = makeEnvironment({ properties: { PASSWORD_MIGRATION_JSON: JSON.stringify(migrationSource) } })
  sheets['各種パスワード'] = makeSheet([passwordHeaders(context)])
  const result = vm.runInContext('migratePasswordConstants()', context)
  assert.deepEqual({ ...result }, { migrationStatus: 'MIGRATED', sourceCount: 4, plannedCount: 4, writtenCount: 4, readBackCount: 4 })
  assert.equal(propertyMap.get('PASSWORD_MIGRATION_STATUS'), 'MIGRATED')
  assert.equal(propertyMap.has('PASSWORD_MIGRATION_JSON'), true)
  const manifestText = propertyMap.get('PASSWORD_INTEGRITY_MANIFEST')
  const manifest = JSON.parse(manifestText)
  assert.deepEqual(Object.keys(manifest).sort(), ['entries', 'expectedCount', 'integrityUpdatedAt', 'migrationCompletedAt', 'schemaVersion'])
  for (const secret of ['=login', '=password', '=memo', '=rule']) assert.equal(manifestText.includes(secret), false)
  context.__read = { action: 'getPasswordEntries', sessionToken: 'token' }
  const read = vm.runInContext('handlePasswordEntryAction_(__read)', context)
  assert.equal(read.source, 'spreadsheet')
  read.entries.forEach((entry, index) => {
    const prefix = ['=', '+', '-', '@'][index]
    assert.deepEqual([entry.passwordEntryId, entry.sortOrder, entry.serviceName, entry.loginId, entry.password, entry.note, entry.creatorRule], [`password-migration-${String(index + 1).padStart(4, '0')}`, index, `${prefix}service`, `${prefix}login`, `${prefix}password`, `${prefix}memo`, `${prefix}rule`])
  })
  context.__create = { action: 'createPasswordEntry', sessionToken: 'token', entry: { category: 'service', serviceName: '=new', loginId: '+new', password: '-new', note: '@new', sortOrder: 4 } }
  const created = vm.runInContext('handlePasswordEntryAction_(__create)', context)
  assert.equal(created.result, 'success')
  assert.deepEqual([created.entry.serviceName, created.entry.loginId, created.entry.password, created.entry.note], ['=new', '+new', '-new', '@new'])
  assert.throws(() => vm.runInContext('migratePasswordConstants()', context), error => error.code === 'CONFLICT')
  assert.equal(propertyMap.get('PASSWORD_MIGRATION_STATUS'), 'MIGRATED')
})

test('migration read-back不一致はFAILEDにして書込み前snapshotへrollbackする', () => {
  const { context, sheets, propertyMap } = makeEnvironment({ properties: { PASSWORD_MIGRATION_JSON: JSON.stringify([{ serviceName: 'service' }]) } })
  sheets['各種パスワード'] = makeSheet([passwordHeaders(context)], { corruptReadBack: true })
  assert.throws(() => vm.runInContext('migratePasswordConstants()', context), error => error.code === 'DATA_ERROR')
  assert.equal(propertyMap.get('PASSWORD_MIGRATION_STATUS'), 'FAILED')
  assert.equal(sheets['各種パスワード'].getLastRow(), 1)
  assert.equal(propertyMap.has('PASSWORD_MIGRATION_JSON'), true)
})

test('MIGRATINGで停止した正しい部分書込みは再実行で安全に完了できる', () => {
  const sourceData = [{ serviceName: 'one' }, { serviceName: 'two' }]
  const { context, sheets, propertyMap } = makeEnvironment({ properties: { PASSWORD_MIGRATION_JSON: JSON.stringify(sourceData), PASSWORD_MIGRATION_STATUS: 'MIGRATING' } })
  sheets['各種パスワード'] = makeSheet([passwordHeaders(context)])
  context.__source = sourceData
  const partialRow = vm.runInContext('passwordEntryToRow_(buildPasswordMigrationEntries_(__source, new Date())[0])', context)
  sheets['各種パスワード'].rows.push(Array.from(partialRow))
  const result = vm.runInContext('migratePasswordConstants()', context)
  assert.equal(result.migrationStatus, 'MIGRATED')
  assert.equal(result.readBackCount, 2)
  assert.equal(propertyMap.get('PASSWORD_MIGRATION_STATUS'), 'MIGRATED')
  assert.equal(sheets['各種パスワード'].getLastRow(), 3)
})

test('migrationはduplicate ID・partial targetを変更前に拒否する', () => {
  const duplicate = [{ passwordEntryId: 'password-a', serviceName: 'a', sortOrder: 1 }, { passwordEntryId: 'password-a', serviceName: 'b', sortOrder: 2 }]
  const duplicateEnvironment = makeEnvironment({ properties: { PASSWORD_MIGRATION_JSON: JSON.stringify(duplicate) } })
  duplicateEnvironment.sheets['各種パスワード'] = makeSheet([passwordHeaders(duplicateEnvironment.context)])
  assert.throws(() => vm.runInContext('migratePasswordConstants()', duplicateEnvironment.context), error => error.code === 'VALIDATION_ERROR')
  assert.equal(duplicateEnvironment.propertyMap.get('PASSWORD_MIGRATION_STATUS'), 'FAILED')

  const partialEnvironment = makeEnvironment({ properties: { PASSWORD_MIGRATION_JSON: JSON.stringify([{ serviceName: 'new' }]), PASSWORD_MIGRATION_STATUS: 'FAILED' } })
  partialEnvironment.sheets['各種パスワード'] = makeSheet([passwordHeaders(partialEnvironment.context), ['password-partial', 'service', 'existing', '', '', '', 'secret', '', '', 0, true, new Date(), 'system', new Date(), 'system', '']])
  assert.throws(() => vm.runInContext('migratePasswordConstants()', partialEnvironment.context), error => error.code === 'CONFLICT')
  assert.equal(partialEnvironment.sheets['各種パスワード'].rows[1][2], 'existing')
})

test('MIGRATED後はheader-only・行欠損・duplicate ID・manifest不一致をDATA_ERRORにする', () => {
  const sourceData = [{ serviceName: 'one' }, { serviceName: 'two' }]
  const makeMigrated = () => {
    const environment = makeEnvironment({ properties: { PASSWORD_MIGRATION_JSON: JSON.stringify(sourceData) } })
    environment.sheets['各種パスワード'] = makeSheet([passwordHeaders(environment.context)])
    vm.runInContext('migratePasswordConstants()', environment.context)
    environment.context.__read = { action: 'getPasswordEntries', sessionToken: 'token' }
    return environment
  }

  const headerOnly = makeMigrated()
  headerOnly.sheets['各種パスワード'].rows.splice(1)
  assert.throws(() => vm.runInContext('handlePasswordEntryAction_(__read)', headerOnly.context), error => error.code === 'DATA_ERROR')

  const missing = makeMigrated()
  missing.sheets['各種パスワード'].rows.pop()
  assert.throws(() => vm.runInContext('handlePasswordEntryAction_(__read)', missing.context), error => error.code === 'DATA_ERROR')

  const duplicate = makeMigrated()
  duplicate.sheets['各種パスワード'].rows[2][0] = duplicate.sheets['各種パスワード'].rows[1][0]
  assert.throws(() => vm.runInContext('handlePasswordEntryAction_(__read)', duplicate.context), error => error.code === 'DATA_ERROR')

  const manifestMismatch = makeMigrated()
  const manifest = JSON.parse(manifestMismatch.propertyMap.get('PASSWORD_INTEGRITY_MANIFEST'))
  manifest.entries[0].sortOrder += 100
  manifestMismatch.propertyMap.set('PASSWORD_INTEGRITY_MANIFEST', JSON.stringify(manifest))
  assert.throws(() => vm.runInContext('handlePasswordEntryAction_(__read)', manifestMismatch.context), error => error.code === 'DATA_ERROR')
})

test('MIGRATED後はraw必須値とsortOrderを補正せずDATA_ERRORにする', () => {
  const makeMigrated = () => {
    const environment = makeEnvironment({ properties: { PASSWORD_MIGRATION_JSON: JSON.stringify([{ serviceName: 'one' }, { serviceName: 'two' }, { serviceName: 'three' }]) } })
    environment.sheets['各種パスワード'] = makeSheet([passwordHeaders(environment.context)])
    vm.runInContext('migratePasswordConstants()', environment.context)
    environment.context.__read = { action: 'getPasswordEntries', sessionToken: 'token' }
    return environment
  }

  for (const [column, invalidValue] of [[1, ''], [9, ''], [9, 'abc'], [9, -1], [9, 1.5]]) {
    const environment = makeMigrated()
    environment.sheets['各種パスワード'].rows[1][column] = invalidValue
    assert.throws(() => vm.runInContext('handlePasswordEntryAction_(__read)', environment.context), error => error.code === 'DATA_ERROR')
  }

  const normal = makeMigrated()
  const entries = vm.runInContext('handlePasswordEntryAction_(__read).entries', normal.context)
  assert.deepEqual(Array.from(entries, entry => entry.sortOrder), [0, 1, 2])
})

test('MIGRATED後のdeletedAtは明示的な空欄と有効日時だけを許可する', () => {
  const makeMigrated = () => {
    const environment = makeEnvironment({ properties: { PASSWORD_MIGRATION_JSON: JSON.stringify([{ serviceName: 'one' }]) } })
    environment.sheets['各種パスワード'] = makeSheet([passwordHeaders(environment.context)])
    vm.runInContext('migratePasswordConstants()', environment.context)
    environment.context.__read = { action: 'getPasswordEntries', sessionToken: 'token' }
    return environment
  }

  for (const invalidValue of [0, false, true, 'abc', NaN, Infinity, {}, []]) {
    const environment = makeMigrated()
    environment.sheets['各種パスワード'].rows[1][15] = invalidValue
    assert.throws(() => vm.runInContext('handlePasswordEntryAction_(__read)', environment.context), error => error.code === 'DATA_ERROR')
  }

  const empty = makeMigrated()
  assert.equal(vm.runInContext('handlePasswordEntryAction_(__read).entries.length', empty.context), 1)
  empty.context.__row = empty.sheets['各種パスワード'].rows[1].slice()
  for (const emptyValue of ['', null, undefined]) {
    empty.context.__row[15] = emptyValue
    assert.doesNotThrow(() => vm.runInContext('validateRawPasswordEntryRow_(__row)', empty.context))
  }

  const validDate = makeMigrated()
  validDate.context.__row = validDate.sheets['各種パスワード'].rows[1].slice()
  validDate.context.__row[15] = new Date('2026-08-30T12:00:00.000Z')
  assert.doesNotThrow(() => vm.runInContext('validateRawPasswordEntryRow_(__row)', validDate.context))
})

test('MIGRATED後にintegrity manifestが存在しない場合はfallbackせずDATA_ERRORにする', () => {
  const { context, sheets, propertyMap } = makeEnvironment({ properties: { PASSWORD_MIGRATION_JSON: JSON.stringify([{ serviceName: 'one' }]) } })
  sheets['各種パスワード'] = makeSheet([passwordHeaders(context)])
  vm.runInContext('migratePasswordConstants()', context)
  propertyMap.delete('PASSWORD_INTEGRITY_MANIFEST')
  context.__read = { action: 'getPasswordEntries', sessionToken: 'token' }
  assert.throws(() => vm.runInContext('handlePasswordEntryAction_(__read)', context), error => error.code === 'DATA_ERROR')
})

test('パスワードCRUDはraw値が壊れたMIGRATED Sheetへの追記を拒否する', () => {
  for (const action of ['createPasswordEntry', 'updatePasswordEntry', 'deletePasswordEntry', 'reorderPasswordEntries']) {
    const { context, sheets } = makeEnvironment({ properties: { PASSWORD_MIGRATION_JSON: JSON.stringify([{ serviceName: 'one' }]) } })
    sheets['各種パスワード'] = makeSheet([passwordHeaders(context)])
    vm.runInContext('migratePasswordConstants()', context)
    sheets['各種パスワード'].rows[1][15] = false
    context.__mutation = { action, sessionToken: 'token', entry: { category: 'service', serviceName: 'new', sortOrder: 1 }, passwordEntryId: 'password-migration-0001', passwordEntryIds: ['password-migration-0001'] }
    assert.throws(() => vm.runInContext('handlePasswordEntryAction_(__mutation)', context), error => error.code === 'DATA_ERROR')
  }
})

test('MIGRATED後のcreate・delete・reorderはmanifestを更新して次回readも成功する', () => {
  const sourceData = [{ serviceName: 'one' }, { serviceName: 'two' }]
  const { context, sheets, propertyMap } = makeEnvironment({ properties: { PASSWORD_MIGRATION_JSON: JSON.stringify(sourceData) } })
  sheets['各種パスワード'] = makeSheet([passwordHeaders(context)])
  vm.runInContext('migratePasswordConstants()', context)
  const manifestAfterMigration = propertyMap.get('PASSWORD_INTEGRITY_MANIFEST')

  context.__create = { action: 'createPasswordEntry', sessionToken: 'token', entry: { category: 'service', serviceName: 'three', sortOrder: 2 } }
  const created = vm.runInContext('handlePasswordEntryAction_(__create).entry', context)
  assert.notEqual(propertyMap.get('PASSWORD_INTEGRITY_MANIFEST'), manifestAfterMigration)
  context.__read = { action: 'getPasswordEntries', sessionToken: 'token' }
  assert.equal(vm.runInContext('handlePasswordEntryAction_(__read).entries.length', context), 3)

  context.__update = { action: 'updatePasswordEntry', sessionToken: 'token', entry: { ...created, serviceName: 'three-updated' }, expectedUpdatedAt: created.updatedAt }
  const updated = vm.runInContext('handlePasswordEntryAction_(__update).entry', context)
  assert.equal(updated.serviceName, 'three-updated')
  assert.equal(vm.runInContext('handlePasswordEntryAction_(__read).entries.length', context), 3)

  context.__delete = { action: 'deletePasswordEntry', sessionToken: 'token', passwordEntryId: updated.passwordEntryId, expectedUpdatedAt: updated.updatedAt }
  vm.runInContext('handlePasswordEntryAction_(__delete)', context)
  assert.equal(vm.runInContext('handlePasswordEntryAction_(__read).entries.length', context), 2)

  const active = vm.runInContext('handlePasswordEntryAction_(__read).entries', context)
  context.__reorder = { action: 'reorderPasswordEntries', sessionToken: 'token', passwordEntryIds: [active[1].passwordEntryId, active[0].passwordEntryId], expectedUpdatedAtById: Object.fromEntries(active.map(entry => [entry.passwordEntryId, entry.updatedAt])) }
  vm.runInContext('handlePasswordEntryAction_(__reorder)', context)
  const reordered = vm.runInContext('handlePasswordEntryAction_(__read).entries', context)
  assert.deepEqual(Array.from(reordered, entry => entry.passwordEntryId), [active[1].passwordEntryId, active[0].passwordEntryId])
  assert.equal(JSON.parse(propertyMap.get('PASSWORD_INTEGRITY_MANIFEST')).expectedCount, 3)
})

test('migration部分書込み失敗はFAILEDにしてsnapshotを復元しsourceを保持する', () => {
  const sourceData = [{ serviceName: 'one' }, { serviceName: 'two' }]
  const { context, sheets, propertyMap } = makeEnvironment({ properties: { PASSWORD_MIGRATION_JSON: JSON.stringify(sourceData) } })
  sheets['各種パスワード'] = makeSheet([passwordHeaders(context)], { partialWriteFailure: true })
  assert.throws(() => vm.runInContext('migratePasswordConstants()', context), /injected partial write failure/)
  assert.equal(propertyMap.get('PASSWORD_MIGRATION_STATUS'), 'FAILED')
  assert.equal(propertyMap.has('PASSWORD_INTEGRITY_MANIFEST'), false)
  assert.equal(propertyMap.has('PASSWORD_MIGRATION_JSON'), true)
  assert.equal(sheets['各種パスワード'].getLastRow(), 1)
})

test('migration rollback失敗はDATA_ERRORを返してFAILEDのまま停止する', () => {
  const sourceData = [{ serviceName: 'one' }, { serviceName: 'two' }]
  const { context, sheets, propertyMap } = makeEnvironment({ properties: { PASSWORD_MIGRATION_JSON: JSON.stringify(sourceData) } })
  sheets['各種パスワード'] = makeSheet([passwordHeaders(context)], { partialWriteFailure: true, failRollback: true })
  assert.throws(() => vm.runInContext('migratePasswordConstants()', context), error => error.code === 'DATA_ERROR' && /復元にも失敗/.test(error.message))
  assert.equal(propertyMap.get('PASSWORD_MIGRATION_STATUS'), 'FAILED')
  assert.equal(propertyMap.has('PASSWORD_INTEGRITY_MANIFEST'), false)
  assert.equal(propertyMap.has('PASSWORD_MIGRATION_JSON'), true)
})

test('画像magic bytesはPNG・JPEG・GIF・WebPだけを判定しSVGを拒否する', () => {
  const { context } = makeEnvironment()
  const cases = [['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]], ['image/jpeg', [0xff, 0xd8, 0xff, 0x00]], ['image/gif', [...Buffer.from('GIF87a')]], ['image/gif', [...Buffer.from('GIF89a')]], ['image/webp', [...Buffer.from('RIFF0000WEBP')]]]
  for (const [mime, bytes] of cases) { context.__bytes = bytes; assert.equal(vm.runInContext('detectKotoreImageMimeType_(__bytes)', context), mime) }
  for (const disguised of ['<svg><script>', '<html>not a png</html>', 'plain text pretending to be jpeg']) {
    context.__bytes = [...Buffer.from(disguised)]
    assert.equal(vm.runInContext('detectKotoreImageMimeType_(__bytes)', context), '')
  }
})

test('画像uploadはDrive作成をlock外で行いMIME不一致を拒否する', () => {
  const { context, sheets, isLockHeld } = makeEnvironment({ properties: { KOTORE_CONTENT_IMAGE_FOLDER_ID: 'folder-id' } })
  let driveCreatedWhileLocked = null
  context.DriveApp = { getFolderById: () => ({ createFile: blob => { driveCreatedWhileLocked = isLockHeld(); return { getId: () => 'file-id', setTrashed: () => {}, getBlob: () => blob } } }) }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  context.__upload = { action: 'uploadKotoreContentImage', sessionToken: 'token', mimeType: 'image/png', base64: Buffer.from(png).toString('base64'), sizeBytes: png.length, originalName: '=image.png' }
  assert.equal(vm.runInContext('handleKotoreImageAction_(__upload).result', context), 'success')
  assert.equal(driveCreatedWhileLocked, false)
  assert.deepEqual(sheets['個トレコンテンツ画像'].rows[0], Array.from(vm.runInContext('KOTORE_CONTENT_IMAGE_HEADERS', context)))
  assert.equal(sheets['個トレコンテンツ画像'].rows[1][2], '=image.png')
  context.__upload = { ...context.__upload, mimeType: 'image/jpeg' }
  assert.throws(() => vm.runInContext('handleKotoreImageAction_(__upload)', context), error => error.code === 'VALIDATION_ERROR')
})

test('画像uploadは保存先未設定・Drive取得失敗・Drive作成失敗を安全な分類で返す', () => {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const upload = { action: 'uploadKotoreContentImage', sessionToken: 'token', mimeType: 'image/png', base64: Buffer.from(png).toString('base64'), sizeBytes: png.length, originalName: 'image.png' }

  const missing = makeEnvironment()
  missing.context.__upload = upload
  assert.throws(() => vm.runInContext('handleKotoreImageAction_(__upload)', missing.context), error => error.code === 'IMAGE_STORAGE_NOT_CONFIGURED')

  const inaccessible = makeEnvironment({ properties: { KOTORE_CONTENT_IMAGE_FOLDER_ID: ' folder-id ' } })
  inaccessible.context.DriveApp = { getFolderById: () => { throw new Error('sensitive Drive detail') } }
  inaccessible.context.__upload = upload
  assert.throws(() => vm.runInContext('handleKotoreImageAction_(__upload)', inaccessible.context), error => error.code === 'IMAGE_STORAGE_ACCESS_ERROR' && !/sensitive/.test(error.message))

  const createFailure = makeEnvironment({ properties: { KOTORE_CONTENT_IMAGE_FOLDER_ID: ' folder-id ' } })
  let receivedFolderId = ''
  createFailure.context.DriveApp = { getFolderById: id => { receivedFolderId = id; return { createFile: () => { throw new Error('sensitive Drive detail') } } } }
  createFailure.context.__upload = upload
  assert.throws(() => vm.runInContext('handleKotoreImageAction_(__upload)', createFailure.context), error => error.code === 'IMAGE_UPLOAD_ERROR' && !/sensitive/.test(error.message))
  assert.equal(receivedFolderId, 'folder-id')
})

test('画像metadata保存失敗時は作成済みDriveファイルをcleanupして安全なエラーを返す', () => {
  const { context, sheets } = makeEnvironment({ properties: { KOTORE_CONTENT_IMAGE_FOLDER_ID: 'folder-id' } })
  const imageSheet = makeSheet([Array.from(vm.runInContext('KOTORE_CONTENT_IMAGE_HEADERS', context))])
  const getRange = imageSheet.getRange
  imageSheet.getRange = (row, ...args) => {
    const range = getRange(row, ...args)
    if (row > 1) range.setValues = () => { throw new Error('sensitive Sheet detail') }
    return range
  }
  sheets['個トレコンテンツ画像'] = imageSheet
  let trashed = false
  context.DriveApp = { getFolderById: () => ({ createFile: () => ({ getId: () => 'file-id', setTrashed: value => { trashed = value } }) }) }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  context.__upload = { action: 'uploadKotoreContentImage', sessionToken: 'token', mimeType: 'image/png', base64: Buffer.from(png).toString('base64'), sizeBytes: png.length, originalName: 'image.png' }
  assert.throws(() => vm.runInContext('handleKotoreImageAction_(__upload)', context), error => error.code === 'IMAGE_METADATA_ERROR' && !/sensitive/.test(error.message))
  assert.equal(trashed, true)
})

test('setupは既存contentId重複を検出して固定ページを書き足さない', () => {
  const { context, sheets } = makeEnvironment()
  sheets['個トレコンテンツ'] = makeSheet([contentHeaders(context), ['duplicate'], ['duplicate']])
  sheets['個トレコンテンツ画像'] = makeSheet([Array.from(vm.runInContext('KOTORE_CONTENT_IMAGE_HEADERS', context))])
  assert.throws(() => vm.runInContext('setupKotoreContentSheets()', context), error => error.code === 'DATA_ERROR')
  assert.equal(sheets['個トレコンテンツ'].getLastRow(), 3)
})

test('公開APIはdraftMarkdownを返さずpublished期間を使う', () => {
  const fnSource = source.slice(source.indexOf('function getPublishedKotoreContents_'), source.indexOf('function listKotoreContentsAdmin_'))
  assert.doesNotMatch(fnSource, /draftMarkdown:/)
  assert.match(fnSource, /publishedPublishStart/)
  assert.match(fnSource, /publishedPublishEnd/)
})

test('summary wrapperを維持しmigration sourceを自動削除しない', () => {
  for (const name of ['runPreviewKotoreContentSetupSummary', 'runSetupKotoreContentSheetsSummary', 'runPreviewPasswordMigrationSummary', 'runSetupPasswordManagementSheetsSummary', 'runMigratePasswordConstantsSummary']) assert.match(source, new RegExp(`function ${name}`))
  const migration = source.slice(source.indexOf('function migratePasswordConstants'), source.indexOf('function runMigratePasswordConstantsSummary'))
  assert.doesNotMatch(migration, /deleteProperty\("PASSWORD_MIGRATION_JSON"\)/)
})
