import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { extractImageBase64, filterModelAnswerBooks, inferModelAnswerSubject, insertMarkdownAtSelection } from '../src/utils/kotoreContent.js'
import { externalServiceAccounts, studentAccountRules } from '../src/constants/data.js'
import { buildLegacyPasswordEntries, isLegacyPasswordResponse } from '../src/utils/passwordEntries.js'
import { getKotoreManagementErrorMessage } from '../src/utils/managementApi.js'
import { markNotificationSupportStarted } from '../src/utils/notificationState.js'

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('個トレトップは正式な5カードを持ち既存機能を子画面として再利用する', () => {
  const source = read('../src/components/KoToreMenu.jsx')
  for (const title of ['丸付け・質問待ち', '個トレ進捗管理', '模範解答', 'お知らせ', '個トレの仕方']) assert.match(source, new RegExp(title))
  assert.match(source, /<NotificationManager/)
  assert.match(source, /<KoToreProgressTracker/)
  assert.match(source, /profileSource="notifications"/)
  assert.match(source, /<ModelAnswerShelf/)
  assert.match(source, /getPublishedKotoreContents/)
  assert.match(source, /publishedMarkdown/)
  assert.doesNotMatch(source, /draftMarkdown/)
})

test('サイドバーは個トレ進捗と模範解答の独立入口を除き既存主要項目を維持する', () => {
  const source = read('../src/TeacherView.jsx')
  assert.doesNotMatch(source, /label: '個トレ進捗チェック'/)
  assert.doesNotMatch(source, /label: '個トレ２（模範解答）'/)
  for (const label of ['合宿メニュー', 'テスト振り返り確認', '学校成績管理', '学校進捗チェック', 'アプリ利用チェック', '1対1進捗チェック', 'アカウント管理', 'スキマ君利用設定', '各種パスワード', 'お知らせ', 'スタッフマニュアル', '高松スタッフ(SharePoint)']) assert.equal(source.includes(label), true, `${label}を維持する`)
  assert.match(source, /activeContent === 'kotore-admin' && role === 'admin'/)
})

test('ヘッダー通知ベルは個トレ遷移へ変更せず既存の通知更新を実行する', () => {
  const source = read('../src/TeacherView.jsx')
  const menu = read('../src/components/KoToreMenu.jsx')
  const manager = read('../src/components/NotificationManager.jsx')
  assert.match(source, /onClick=\{fetchNotifications\} aria-label="通知を更新"/)
  assert.match(source, /setNotificationRefresh/)
  assert.match(source, /notificationRefresh=\{notificationRefresh\}/)
  assert.match(menu, /refreshResult=\{notificationRefresh\}/)
  assert.match(manager, /setNotifications\(refreshResult\.notifications\)/)
  assert.doesNotMatch(source, /aria-label="個トレメニューを開く"/)
  assert.doesNotMatch(source, /onClick=\{\(\) => setActiveContent\('notifications'\)\}/)
})

test('待ちリストは既存3actionと5秒polling・破棄時解除・重複防止を維持する', () => {
  const source = read('../src/components/NotificationManager.jsx')
  for (const action of ['getNotifications', 'startSupport', 'deleteNotification']) assert.match(source, new RegExp(action))
  assert.match(source, /POLL_INTERVAL_MS = 5000/)
  assert.match(source, /clearInterval/)
  assert.match(source, /inFlightRef/)
  assert.match(source, /if \(pendingKey\) return/)
  assert.match(source, /disabled=\{Boolean\(pendingKey\)\}/)
  for (const label of ['待ち順', '受付時刻', '生徒名', '学年', '校舎', 'ステータス', '対応開始', '対応完了']) assert.match(source, new RegExp(label))
})

test('対応開始成功後は対象行だけを既存正式表示の対応中へ更新する', () => {
  const notifications = [
    { queueNumber: 1, userId: '000001', status: '丸付け待ち' },
    { queueNumber: 2, userId: '000002', status: '質問待ち' },
    { queueNumber: 3, userId: '000003', status: 'SOS(ギブアップ)' },
  ]
  const updated = markNotificationSupportStarted(notifications, notifications[1])
  assert.equal(updated[0], notifications[0])
  assert.deepEqual(updated[1], { ...notifications[1], status: '質問待ち（対応中）' })
  assert.equal(updated[2], notifications[2])
  assert.deepEqual(markNotificationSupportStarted(notifications, notifications[0])[0], { ...notifications[0], status: '丸付け待ち（対応中）' })
  assert.deepEqual(markNotificationSupportStarted(notifications, notifications[2])[2], { ...notifications[2], status: 'SOS(ギブアップ)（対応中）' })
})

test('対応開始はAPI成功後だけ局所更新し、古いpolling応答を無効化する', () => {
  const source = read('../src/components/NotificationManager.jsx')
  const actionSource = source.slice(source.indexOf('const runAction'), source.indexOf('const availableSchools'))
  const successCheck = actionSource.indexOf("response.data?.result !== 'success'")
  const invalidatePolling = actionSource.indexOf('requestVersionRef.current += 1', successCheck)
  const localUpdate = actionSource.indexOf('setNotifications(current => markNotificationSupportStarted(current, notification))', invalidatePolling)
  assert.ok(successCheck >= 0 && invalidatePolling > successCheck && localUpdate > invalidatePolling)
  assert.match(actionSource, /catch \(requestError\)[\s\S]*setError\(/)
  assert.doesNotMatch(actionSource.slice(0, successCheck), /markNotificationSupportStarted/)
})

test('模範解答は既存titleだけから学年・科目・教材を絞り込む', () => {
  const books = [
    { id: 1, grade: '中1', title: '中1 数学 iワークプラス' },
    { id: 2, grade: '中2', title: '中2 英語 iワークプラス' },
  ]
  assert.equal(inferModelAnswerSubject(books[0].title), '数学')
  assert.deepEqual(filterModelAnswerBooks(books, { grade: '中1', subject: '数学', query: 'プラス' }), [books[0]])
  const source = read('../src/components/ModelAnswerShelf.jsx')
  assert.match(source, /modelAnswerBooks/)
  assert.match(source, /<iframe/)
  assert.match(source, /別ウィンドウで開く/)
  assert.match(source, /onError=/)
  assert.match(source, /PDFを読み込めませんでした/)
  assert.doesNotMatch(source, /placeholder\.com/)
})

test('Markdown toolbarは選択範囲を維持して記法を挿入する', () => {
  assert.deepEqual(insertMarkdownAtSelection('abc', 1, 2, '**', '**', '太字'), { value: 'a**b**c', selectionStart: 3, selectionEnd: 4 })
  const source = read('../src/components/common/KotoreMarkdown.jsx')
  assert.match(source, /react-markdown/)
  assert.match(source, /rehype-sanitize/)
  assert.match(source, /remark-gfm/)
  assert.match(source, /defaultUrlTransform/)
  assert.doesNotMatch(source, /rehypeRaw/)
  assert.match(source, /rel="noopener noreferrer"/)
  assert.match(source, />画像<\/button>/)
})

test('管理者トップは4実動カードと5つのdisabled張りぼてを分離する', () => {
  const source = read('../src/components/KotoreAdminWorkspace.jsx')
  for (const label of ['お知らせを編集する', '個トレの仕方を編集する', 'メニューの使い方を編集する', '各種パスワード管理']) assert.match(source, new RegExp(label))
  for (const label of ['アカウント管理', 'スキマ君利用設定', '合宿メニュー管理', 'テスト振り返り確認', '学校成績確認']) assert.match(source, new RegExp(label))
  assert.match(source, /type="button" disabled/)
  assert.match(source, /role !== 'admin'/)
})

test('画像は内部参照・認証取得・object URL解放を使用する', () => {
  const source = read('../src/components/common/KotoreMarkdown.jsx')
  const manager = read('../src/components/KotoreImageManager.jsx')
  assert.match(source, /kotore-image:\/\//)
  assert.match(source, /getKotoreContentImage/)
  assert.match(source, /URL\.revokeObjectURL/)
  assert.match(manager, /uploadKotoreContentImage/)
  assert.match(manager, /deleteKotoreContentImage/)
  assert.match(manager, /MAX_IMAGE_BYTES = 10 \* 1024 \* 1024/)
  assert.match(manager, /AuthenticatedKotoreImage/)
  assert.match(manager, /data\.image\.imageId/)
})

test('画像FileReaderのData URLは接頭辞を除いたBase64本体だけをGAS payloadへ渡す', () => {
  assert.equal(extractImageBase64('data:image/png;base64,iVBORw0KGgo='), 'iVBORw0KGgo=')
  assert.equal(extractImageBase64('data:image/jpeg;base64,/9j/AA=='), '/9j/AA==')
  assert.throws(() => extractImageBase64('iVBORw0KGgo='), /画像データ/)
  assert.throws(() => extractImageBase64('data:image/png;base64,'), /画像データ/)
})

test('旧GASのUnknown actionはコンテンツ管理者向け更新案内へ変換する', () => {
  assert.equal(getKotoreManagementErrorMessage({ result: 'error', message: 'Unknown action' }, '失敗'), 'コンテンツ管理APIがまだ利用できません。GASの更新が必要です。')
  assert.equal(getKotoreManagementErrorMessage({ result: 'error', code: 'CONFLICT' }, '失敗'), '別の更新が反映されています。再読み込みしてから編集してください。')
  const publicMenu = read('../src/components/KoToreMenu.jsx')
  assert.match(publicMenu, /管理者へお問い合わせください/)
  assert.doesNotMatch(publicMenu, /throw new Error\(response\.data\?\.message/)
})

test('パスワード画面は未移行時の既存定数を残しadmin編集と講師閲覧を分離する', () => {
  const source = read('../src/components/PasswordManager.jsx')
  assert.match(source, /externalServiceAccounts/)
  assert.match(source, /studentAccountRules/)
  assert.match(source, /getPasswordEntries/)
  for (const action of ['createPasswordEntry', 'updatePasswordEntry', 'deletePasswordEntry', 'reorderPasswordEntries']) assert.match(source, new RegExp(action))
  assert.match(source, /isAdmin && !legacyMode/)
  assert.match(source, /現在：既存データを使用中 \/ 移行前のため閲覧のみ可能/)
  assert.match(source, /現在：各種パスワードシートを使用中/)
  assert.doesNotMatch(source, /localStorage|sessionStorage|console\./)
})

test('migration前fallbackは従来定数の全件を安定ID・順序・主要項目付きで返す', () => {
  const entries = buildLegacyPasswordEntries(externalServiceAccounts, studentAccountRules)
  assert.equal(entries.length, externalServiceAccounts.length + studentAccountRules.length)
  assert.equal(entries.length, 17)
  assert.deepEqual(entries.map(entry => entry.sortOrder), Array.from({ length: entries.length }, (_, index) => index))
  assert.equal(new Set(entries.map(entry => entry.passwordEntryId)).size, entries.length)
  externalServiceAccounts.forEach((source, index) => {
    const entry = entries[index]
    assert.deepEqual([entry.serviceName, entry.loginId, entry.password, entry.url, entry.note], [source.service || source.school || '', source.userId || source.id || '', source.pass || source.password || '', source.url || '', source.note || ''])
  })
  studentAccountRules.forEach((source, index) => {
    const entry = entries[externalServiceAccounts.length + index]
    assert.deepEqual([entry.serviceName, entry.loginId, entry.password, entry.url, entry.note, entry.creatorRule], [source.service || '', source.userId || '', source.pass || '', source.url || '', source.condition || '', source.creator || ''])
  })
})

test('password responseは未移行・setup前・旧GAS actionをlegacy read-onlyとして扱いMIGRATEDだけをSheetへ切り替える', () => {
  for (const response of [
    { result: 'success', source: 'legacy', migrationStatus: 'NOT_MIGRATED', readOnly: true },
    { result: 'error', code: 'SETUP_REQUIRED' },
    { result: 'error', code: 'MIGRATION_REQUIRED' },
    { result: 'error', message: 'Unknown action' },
  ]) assert.equal(isLegacyPasswordResponse(response), true)
  assert.equal(isLegacyPasswordResponse({ result: 'success', source: 'spreadsheet', migrationStatus: 'MIGRATED', readOnly: false }), false)
  assert.equal(isLegacyPasswordResponse({ result: 'error', code: 'DATA_ERROR' }), false)
  assert.equal(isLegacyPasswordResponse({ result: 'error', code: 'AUTHORIZATION_ERROR' }), false)
})
