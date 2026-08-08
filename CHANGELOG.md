# CHANGELOG

gyoumu-appにおける個トレFrontend、GAS、スプレッドシート／マスター、API、権限仕様、およびstudent-app連携の主な変更履歴を記録する。

確認できた事実のみを記載し、未確認のデプロイや本番動作は「未確認」または「未記録」と明記する。

## Version History

### v4.2.1 - 2026-08-08

- テーマ: Version表示共通化
- 含まれるIssue:
  - Issue #007 Version表示共通化
- 主な変更: `version.js`をVersion番号の正本とし、共通`VersionLabel`からログイン画面、生徒画面、講師・管理者画面の右下へ`Version 4.2.1`を表示する構造へ統一。
- Frontend影響: Version表示のみ。既存画面、認証、権限、APIの仕様変更なし。
- GAS影響: なし。
- データ／シート影響: なし。
- student-app影響: なし。Version番号のみstudent-appと同じ`4.2.1`へ統一。

### v4.1.0 - 2026-08-08

- テーマ: アカウント管理・認証・スキマ君連携改善
- 含まれるIssue:
  - Issue #003 講師アカウント管理追加
  - Issue #004 初回パスワード変更対象をstaff限定へ変更
  - Issue #005 合宿コンテンツ権限追加
  - Issue #006 複数担当校舎を全担当校舎へ反映
- 主な変更: 新4シート構成を正本とした講師管理、staff限定の初回パスワード変更、合宿コンテンツ権限、複数担当校舎表示を整備した。
- Frontend影響: 講師管理画面、初回パスワード遷移、スキマ君権限画面、staff向け校舎選択に変更あり。
- GAS影響: アカウント管理API、loginの`isInitial`制御、新規student登録、スキマ君コンテンツ初期定義に変更あり。
- データ／シート影響: アカウントマスター、講師マスター、講師担当校舎を利用。Issue #005ではスキマ君コンテンツマスターを24件へ統一する変更を含む。本番データ更新状況はIssueごとの記録を参照。
- API影響: 既存形式を維持しつつ、loginの`isInitial`の意味をstaff限定へ変更。講師アカウント管理APIを追加。
- student-app影響: Issue #004で通常ログイン時の初回パスワード判定をstaff限定に防御。Issue #005でコンテンツマスターとの整合が必要。

### v4.0.0 - 2026-08-06

- テーマ: 権限管理・共通UI基盤整備
- 含まれるIssue:
  - Issue #001 スキマ君利用権限管理の改善
  - Issue #002 校舎・学年選択UIの共通化
- 主な変更: 生徒別スキマ君利用権限と、校舎・学年選択の共通基盤を導入した。
- Frontend影響: 権限管理画面、`SchoolSelect`、`GradeSelect`、`organization.js`を導入・適用。
- GAS影響: login／validateTokenの権限レスポンス、権限取得処理、再試行・エラー分類、学年正規化を改善。
- データ／シート影響: スキマ君コンテンツ、スキマ君利用権限を使用。実データ反映状況は未記録。
- API影響: studentのlogin／validateTokenで利用権限情報を返す仕様へ統一。
- student-app影響: 直接ログインとトークンログインで同じ利用権限を適用。

## Issue History

### Issue #007 Version表示共通化

- 日付: 2026-08-08
- 背景: ログイン画面と生徒画面にはVersion表示がなく、TeacherViewだけが`3.5.3`を直接保持していた。
- 原因: 共通Version定数と共通表示部品がなく、画面ごとにVersion表示仕様が分離していた。
- 変更内容: `src/constants/version.js`と共通`VersionLabel`を追加し、Login、StudentView、TeacherViewで共用。表示形式を`Version x.x.x`、位置を画面右下固定へ統一し、TeacherViewのベタ書きを削除。
- 影響範囲: gyoumu-app ReactのVersion表示のみ。GAS、API、CSV、権限、student-app変更なし。
- 確認結果: `npm run build`成功。`npm run lint`は既存76エラー・6警告で失敗したが、今回変更行の新規lintエラーなし。`git diff --check`成功。
- Git branch: `main`
- Commit: `5bee34c feat: unify version display`
- Vercelデプロイ状況: Vercel Production連携ブランチ`main`へpush済み。Vercel側の完了状態は未確認。
- GASデプロイ状況: clasp pushは差分なし。既存運用デプロイをVersion 155へ更新済み。

### Issue #006 複数担当校舎を全担当校舎へ反映

- 日付: 2026-08-08
- 背景: 講師詳細では複数担当校舎が登録されている一方、業務画面の「全担当校舎」には主担当校舎しか表示されなかった。
- 原因: `App.jsx`がloginレスポンスの`assignedSchools`を保持せず、`TeacherView.jsx`が`school ? [school] : []`で主担当校舎だけを再生成していた。
- 変更内容: `assignedSchools`をApp stateへ保存してTeacherViewへ渡し、logout時に初期化した。レスポンス配列が無効な場合のみ主担当校舎へフォールバックする。
- 影響範囲: admin、teacher、head-teacherのテスト確認、スキマ君利用設定、校舎別進捗、個トレ進捗、アプリ利用状況。GAS、SchoolSelect、student画面、API形式は変更なし。
- 確認結果: `npm run build`成功、`git diff --check`成功。対象ファイルlintは既存エラー8件・警告3件があり失敗したが、変更行への新規指摘はなし。本番確認は未実施。
- Git branch: `feature/issue-006-assigned-schools`
- Commit: `5f4eb73 fix: preserve assigned schools for staff`（main反映済み）
- GASデプロイ状況: GAS変更なし。
- Vercelデプロイ状況: 未確認。
- student-appへの影響: なし。

### Issue #005 合宿コンテンツ権限追加

- 日付: 2026-08-08
- 背景: 合宿用3コンテンツをスキマ君利用権限の対象へ追加する必要があった。
- 原因: 不具合修正ではなくコンテンツ追加。
- 変更内容: `camp_kagawa_kanji`、`camp_science_qa`、`camp_social_qa`を追加し、GAS初期定義とスキマ君コンテンツマスターを24件へ統一する変更を作成した。
- 影響範囲: GASのスキマ君コンテンツ初期定義、権限管理、student-app側コンテンツマスターとの整合。
- 確認結果: 詳細な検証結果と本番確認は未記録。
- Git branch: `feature/issue-005-camp-permissions`
- Commit: `a4d9b15 fix: add camp contents to Sukimakun permissions`（main未反映）
- GASデプロイ状況: 未記録。
- Vercelデプロイ状況: 未記録。
- student-appへの影響: コンテンツマスターを24件へ合わせる必要あり。反映状況は未記録。

### Issue #004 初回パスワード変更対象をstaff限定へ変更

- 日付: 2026-08-08
- 背景: studentのloginレスポンスで`isInitial=true`となり、初期パスワード変更画面へ遷移していた。
- 原因: 保存済み`isInitial`をroleに関係なくレスポンスと画面遷移へ使用していた。
- 変更内容: admin、teacher、head-teacherのみ保存済み`isInitial`を有効化し、studentはloginレスポンス上`false`とした。新規studentを`isInitial=false`とし、gyoumu-app／student-app Reactにもstaff role判定を追加した。
- 影響範囲: GAS login、新規student登録、gyoumu-app通常ログイン、student-app通常ログイン。レスポンス形式、SSO、権限項目は維持。
- 確認結果: 対象studentの本番loginで`result=success`、`role=student`、`isInitial=false`を確認。gyoumu-appで生徒メニューへ進むことを確認。
- Git branch: `feature/issue-004-staff-initial-password`
- Commit: `e98653e fix: limit initial password change to staff`（gyoumu-app）、student-app `8a035fa fix: skip initial password change for students`
- GASデプロイ状況: Version 150へデプロイ済み。
- Vercelデプロイ状況: student-appの対象commitがProductionへ配信済みであることを確認。gyoumu-appの詳細は未記録。
- student-appへの影響: 通常ログイン時、studentを初期パスワード変更画面へ送らない防御を追加。

### Issue #003 講師アカウント管理追加

- 日付: 2026-08-08
- 背景: 新4シート構成を正本としてstaffアカウントを管理する画面とAPIが必要だった。
- 原因: 不具合修正ではなく管理機能追加。
- 変更内容: 講師一覧、講師詳細、編集、複数担当校舎、主担当校舎、admin権限制御を追加した。
- 影響範囲: Reactのアカウント管理、GAS管理API、アカウントマスター、講師マスター、講師担当校舎、管理セッション。
- 確認結果: 詳細な検証結果と本番確認は未記録。
- Git branch: `feature/issue-003-account-data-migration`
- Commit: `3806391 feat: add staff account management`
- GASデプロイ状況: 未記録。
- Vercelデプロイ状況: 未記録。
- student-appへの影響: 直接変更なし。

### Issue #002 校舎・学年選択UIの共通化

- 日付: 2026-08-06
- 背景: 管理画面ごとに校舎・学年の選択肢と並び順が重複し、正式値との不整合が起こり得た。
- 原因: 共通定義・共通選択部品がなく、画面ごとに値を管理していた。
- 変更内容: `SchoolSelect`、`GradeSelect`、`organization.js`を導入し、管理画面の校舎順・ユニット順と学年正式値を統一した。
- 影響範囲: 校舎・学年を選択する各React管理画面。既存のスキマ君権限仕様を維持。
- 確認結果: 詳細な検証結果と本番確認は未記録。
- Git branch: `feature/issue-002-common-school-selector`
- Commit: `3bed869 feat: unify school and grade selection UI`、`77d474d fix: handle empty grades in Sukimakun permission loading`
- GASデプロイ状況: 未記録。
- Vercelデプロイ状況: 未記録。
- student-appへの影響: 直接変更の有無は未記録。

### Issue #001 スキマ君利用権限管理の改善

- 日付: 2026-08-05〜2026-08-06
- 背景: 生徒別コンテンツ権限を管理し、直接ログインとトークンログインで同じ権限を適用する必要があった。
- 原因: loginとvalidateTokenの権限取得経路が統一されておらず、権限シート読込や通信エラー処理にも改善余地があった。
- 変更内容: student loginにも権限情報を追加し、validateTokenと仕様を統一。権限読込をMap化してN+1を解消し、タイムアウト、ネットワークエラー、取得系自動再試行、エラー分類、学年正規化、小中高の一括取得を整備した。
- 影響範囲: GAS login／validateToken、スキマ君権限API・管理画面、student-appの直接ログイン／トークンログイン。
- 確認結果: Git履歴とリリースノートで実装を確認。詳細なテスト結果と本番確認は未記録。
- Git branch: `feature/issue-001-sukimakun-permissions`、`feature/issue-001-direct-login-permissions`
- Commit: `15c8ca5 feat: add per-student Sukimakun content permissions`、`3c5a916 fix: preserve leading-zero user IDs in Sukimakun permissions`、`a590b56 feat: apply Sukimakun permissions to direct login`、`3d4b5fb docs: add Issue-001 release notes`
- GASデプロイ状況: 未記録。
- Vercelデプロイ状況: 未記録。
- student-appへの影響: 直接ログインとトークンログインで権限レスポンスを適用。具体的なデプロイ状況は未記録。
