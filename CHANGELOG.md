# CHANGELOG

gyoumu-appにおける個トレFrontend、GAS、スプレッドシート／マスター、API、権限仕様、およびstudent-app連携の主な変更履歴を記録する。

確認できた事実のみを記載し、未確認のデプロイや本番動作は「未確認」または「未記録」と明記する。

## Version History

### v4.3.2 - 2026-09-01

- テーマ: 既存機能の操作応答・Detail性能・ホーム再表示の安定化
- 含まれるIssue:
  - 1対1ネッツ進捗の単元選択保持修正（Issue番号未割当）
  - 丸付け・質問待ちの対応開始表示ラグ修正（Issue番号未割当）
  - 1対1進捗入力のDetail読込表示改善（Issue番号未割当）
  - 1対1進捗Detailのrequest内context再利用（Issue番号未割当）
  - 1対1進捗Detailの実GAS区間診断（Issue番号未割当）
  - 1対1認証contextのmaster別区間診断（Issue番号未割当）
  - 1対1進捗Detail diagnostics配送修正（Issue番号未割当）
  - 1対1認証contextのSpreadsheet多重I/O削減（Issue番号未割当）
  - 講師ホーム進捗summaryのセッション内キャッシュ（Issue番号未割当）
  - アカウント種別・権限整理とgeneral role追加（Issue番号未割当）
  - teacher向け講師ホームの確認・対応優先UI（Issue番号未割当）
- 操作応答: 丸付け・質問待ちは対応開始API成功後に対象行だけを即時更新し、処理中表示、二重操作防止、5秒pollingと他ユーザー更新の同期、古いpolling responseによる巻き戻り防止を両立した。1対1ネッツ進捗は選択単元を制御stateで保持し、教材の正式単元名を範囲選択へ表示する。
- Detail UX／性能: 学校進捗・ネッツ進捗・履歴はdialogを直ちに開いて対象生徒だけをlazy loadする。Detail request内で認証contextを再利用し、認証4マスターのvaluesをrequest-scoped snapshotとして共有して、重複した`getUserAuthContexts_()`、`getLastRow()`、`getLastColumn()`、`getValues()`を削減した。既存認証・権限・API・Spreadsheet構造は維持する。
- 講師ホーム: 進捗summaryをログイン時に1回取得して`TeacherView`のReactメモリstateへ保持し、Home復帰時の自動再取得を廃止した。「データ更新」時だけ旧データを維持したまま再取得し、成功時刻を表示する。logout／session変更時はcacheを破棄し、localStorage等は使用しない。
- アカウント・権限: 正式roleへ`general`を追加し、staff共通機能、特定staff機能、admin専用機能を明示的に分離した。head-teacher／generalは生徒情報・講師情報・新規アカウントを利用できるが、管理対象はstudent／teacherだけに限定し、上位staffの一覧・作成・編集・role変更・削除をGASでも拒否する。非admin UIには内部roleを表示せず、実セッション失効と権限不足を別のAPIエラーとして扱う。模範解答はgeneral／adminだけを許可する。
- teacherホーム: 中央を「お知らせ（既存公開APIの最新3件）→対応が必要な生徒（遅れ／要注意を各5件）→進捗状況」の順へ変更し、teacherだけ未設定4サマリーカードと抽象的な対応項目を非表示にした。`指導データ貼り付け`の講師名・生徒名を空白正規化して今月の担当生徒へsummaryを限定し、既存summaryキャッシュ、手動更新、状態別一覧、生徒プロフィール導線を再利用する。安全なシート作成helperは追加したが未実行で、他staff roleのassignedSchools集計は維持する。
- Version表示: 共通`VersionLabel`の正本は`Version 4.3.2`を維持。今回のアカウント権限整理にはGAS認可変更を含むが、Spreadsheet構造・本番データ・student-appは変更しない。

### v4.3.1 - 2026-08-31

- テーマ: 個トレ運営機能と講師ホーム進捗可視化の刷新
- 含まれるIssue:
  - 個トレメニュー／コンテンツ管理刷新（Issue番号未割当）
  - 講師ホーム進捗状況実データ化（Issue番号未割当）
- 個トレメニュー: 「丸付け・質問待ち／個トレ進捗管理／模範解答／お知らせ／個トレの仕方」の5アイコン型へ刷新し、旧個トレ進捗管理と個トレ2の入口を個トレメニューへ統合。模範解答を検索・教材一覧・PDF表示の3ペインへ再構成した。
- コンテンツ管理: admin向けに、お知らせ、個トレの仕方、メニューの使い方のMarkdown編集、下書き／公開分離、Google Drive画像アップロード・公開、各種パスワード管理を追加した。
- 講師ホーム: 既存1対1進捗データから順調／要注意／遅れを「生徒×科目」単位で集計し、全`assignedSchools`を対象とする動的ドーナツ、進捗遅れ生徒対応、状態別進捗一覧を追加。社会は地理・歴史・公民の比較可能分野から最も悪い状態を1科目の代表判定とする。
- Version表示: 共通`VersionLabel`の正本を`Version 4.3.1`へ更新。既存API、認証・role・校舎権限、シート構造、student-appは変更しない。

### v4.3.0 - 2026-08-27

- テーマ: 生徒プロフィール連携に向けた学習状況データ基盤
- 含まれるIssue:
  - Issue #021 個トレ ホーム画面UIリニューアル
  - Issue #016 1対1受講科目管理
  - Issue #017 1対1進捗チェック
  - Issue #018 生徒プロフィール
  - Issue #019 スキマ君ログ contentId正式保存対応
  - Issue #020 学校成績管理
- 主な変更: 生徒ごとの1対1受講科目、学校／ネッツの1対1進捗比較、`userId + contentId`でスキマ君ログを安全に識別する基盤、学校成績の正本管理を整備し、これらを閲覧専用の生徒プロフィールへ統合した。
- Frontend影響: 1対1受講科目・進捗チェック・学校成績管理・生徒プロフィールの各画面を追加。共通`VersionLabel`の表示は`Version 4.3.0`を維持した。
- GAS／データ影響: 1対1受講科目・進捗・学校成績の専用シートとAPIを追加。Issue #019はstudent-app-log-gas側で今後のログへ`contentId`を保存する関連基盤であり、gyoumu-appのGAS変更は含まない。

### v4.2.1 - 2026-08-08

- テーマ: Version表示共通化
- 含まれるIssue:
  - Issue #007 Version表示共通化
  - Issue #010 合宿参加者設定・合宿特訓データ入力・ランキング
  - Issue #011 前置詞テストのコンテンツ権限追加
  - Issue #012 スキマ君利用設定 中学生・高校生モード一括変更
  - Issue #014 nameKana姓名間スペースの全角統一
  - Issue #015 生徒表示順をカナ五十音順へ統一
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

### アカウント種別・権限整理とgeneral role追加（Issue番号未割当）

- 状態: Frontend／GAS修正と自動検証まで実施。Git commit／push、clasp push、GAS／Vercel deploy、本番Spreadsheet変更、本番確認は未実施。
- role: `student`、`teacher`、`head-teacher`、`general`、`admin`の5種類を正式値とし、`general`を社員・スタッフ標準roleとしてlogin、管理session、認証context、staff向け機能へ追加した。
- 権限制御: head-teacher／general／adminへアカウント管理、テスト振り返り、合宿、学校成績、スキマ君利用設定、スタッフ資料を許可する。模範解答はFrontend入口・直接描画とGAS session認可の両方でgeneral／adminだけに限定する。コンテンツ編集、パスワード編集、システム管理はadmin専用を維持する。
- アカウント管理: 非admin管理者へ返すstaff一覧をteacherだけに絞り、作成・編集・削除対象もstudent／teacherだけに限定する。非admin UIには上位staff roleを表示せずrole変更を提供しない。adminは全staff roleの一覧・作成・編集・role変更・削除を継続する。
- データ／deploy: Spreadsheet構造と既存アカウントデータは変更しない。既存adminからgeneralへのrole変更は別工程で、対象確認後にadmin権限のアカウント管理または管理されたデータ移行として実施する。
- Version: Version 4.3.2に収録。

### 講師ホーム進捗summaryのセッション内キャッシュ（Issue番号未割当）

- 状態: フロント修正と自動検証まで実施。Git commit／push、Vercel deploy、本番確認は未実施。
- 原因: `HomeDashboard`が画面切替のたびにmountされ、その内部`useEffect`が毎回`getTeacherHomeProgressSummary`を実行していた。
- 修正: summaryのdata／初回loading／手動更新中／error／成功時刻をログイン中維持される`TeacherView`へ移し、初回に1回だけ取得する。Home再表示は保持済みdataを利用し、「データ更新」操作時だけ同じAPIを1回再実行する。
- UX／互換: 手動更新中・更新失敗時も既存dataを維持し、成功時だけsummary全体とブラウザ取得成功時刻を差し替える。状態別一覧と進捗遅れ生徒対応は同じsummaryを共有する。Reactメモリstateのみを使い、GAS・API・Spreadsheet・集計仕様は変更しない。
- Version: Version 4.3.2に収録。

### 1対1認証contextのSpreadsheet多重I/O削減（Issue番号未割当）

- 状態: GAS修正と自動検証まで実施。Git commit／push、clasp push、GAS再デプロイ、本番性能確認は未実施。
- 原因: 移行済みアカウント4マスターの通常認証経路で、各sheetのヘッダー検証とデータ取得が分離され、合計でsheet lookup 4回、`getLastRow()` 12回、`getLastColumn()` 8回、`getValues()` 8回のSpreadsheet I/Oが発生していた。
- 修正: 通常認証専用のrequest-scoped snapshotを導入し、各masterをsheet lookup、last row、last column、範囲read各1回で取得する。同じvaluesをヘッダー検証、data rows抽出、profile／assignedSchools結合へ再利用する。移行・setup用helperとlegacy fallbackは変更しない。
- 診断／互換: 既存`authContextDiagnostics`を維持し、統合read用の`valuesRangeMs`、`valuesReadMs`、`valuesReadCount`を追加する。認証・role・削除判定・担当校舎制限・API・Spreadsheet構造は変更しない。
- Version: Version 4.3.2に収録。

### 1対1進捗Detail diagnostics配送修正（Issue番号未割当）

- 状態: 原因調査、最小修正、自動検証まで実施。Git commit／push、clasp push、GAS再デプロイ、本番確認は未実施。
- 原因: Detail diagnosticsはhandler内でのみ成功responseへ付与され、`doPost`の最終HTTP response境界では保持を保証していなかった。認証内部診断追加後もhandler単体テストは通過したが、最終response経路を検証する回帰テストがなく、本番で`diagnostics`欠落を検知できなかった。
- 修正: Detail専用response helperで既存Detail本体を維持したままrequest traceとhandler diagnosticsを最終responseへ明示的に付与し、`authContextDiagnostics`を通常のJSON objectとして生成する。フロントは従来どおり`result.diagnostics`を参照する。
- 影響: Detailの業務処理、認証・権限、Matrix、Spreadsheet構造、request形式、既存response項目は変更しない。性能最適化は含まない。
- Version: Version 4.3.2に収録。

### 1対1認証contextのmaster別区間診断（Issue番号未割当）

- 状態: 診断コードと自動検証まで完了。GAS再デプロイ、実GAS計測は未実施。
- 診断: Detailの`authContextLoadMs`内部について、アカウント・生徒・講師・講師担当校舎の各master別にsheet lookup、last row／column、header range／read、data range／read、取得行数とread回数を計測し、contextのmap／index／merge加工時間と未分類時間も`authContextDiagnostics`へ追加する。
- セキュリティ／互換: 認証・role・assignedSchools・legacy fallback・既存response項目は変更せず、診断値は時間・行数・read回数のみとする。userId、氏名、校舎、password、token、Spreadsheet IDは含めない。
- Version: Version 4.3.2に収録。

### 1対1進捗Detailの実GAS区間診断（Issue番号未割当）

- 状態: 診断コードと自動検証まで完了。GAS再デプロイ、実GAS計測は未実施。
- 診断: `getOneToOneProgressDetail`成功responseへ、API key取得、管理セッション、対象生徒／受講確認、単元軸、進捗イベント／単元のSpreadsheet readと行数、JavaScript加工、response生成、GAS内合計時間を含む小さな`diagnostics`を追加する。フロントはAPI往復時間とdiagnosticsだけをbrowser consoleへ出力する。
- セキュリティ／互換: action・request・既存response項目・Detail処理は変更せず、診断値は時間・行数・read回数・action名だけとする。token、API key、個人情報、Spreadsheet IDは含めない。
- Version: Version 4.3.2に収録。

### 1対1進捗Detailのrequest内context再利用（Issue番号未割当）

- 状態: GASの局所修正と自動検証まで完了。実機性能確認、GAS再デプロイは未実施。
- 原因／修正: `getOneToOneProgressDetail`の1 request内で、管理セッション認証、対象生徒確認、Detail state生成、受講確認がそれぞれ`getUserAuthContexts_()`へ到達し、アカウント4マスターを4回読み直していた。認証済み`session.userContexts`と確認済み対象生徒をoptional引数で下位helperへ渡し、Detail経路では同じcontextを再利用する。optional引数がない既存呼出しは従来どおり内部取得する。
- 性能／互換: Detail通常経路の`getUserAuthContexts_()`を4回から1回、アカウント系`getValues()`を32回から8回へ削減。管理セッション検証、role・対象生徒・受講科目検証、進捗イベント／単元の全件read、action・request・response、Spreadsheet構造は変更しない。
- Version: Version 4.3.2に収録。

### 1対1進捗入力のDetail読込表示改善（Issue番号未割当）

- 状態: Reactの局所修正と自動検証まで完了。実機確認、Vercel手動デプロイは未実施。
- 原因／修正: 学校進捗・ネッツ進捗・履歴の各ボタン自体は無効化されていなかったが、クリック後の`getOneToOneProgressDetail`完了までdialogを描画しないため無反応に見えていた。さらに前回Detailを次回取得開始時に消しておらず、履歴取得後だけ入力dialogが即表示されるように見えていた。各操作時に対象生徒のDetailだけをlazy loadし、クリック直後からdialog内へ読込状態を表示して、取得完了後に指定モードを描画するよう分離した。
- 既存互換: Matrix／Detail action・payload・response、学校／ネッツ登録payload、履歴内容、単元軸、GAS、Spreadsheet、権限は変更しない。全生徒Detailの初期一括取得は追加しない。
- Version: Version 4.3.2に収録。

### 丸付け・質問待ちの対応開始表示ラグ修正（Issue番号未割当）

- 状態: Reactの局所修正と自動検証まで完了。実機確認、Git commit／push、Vercelデプロイは未実施。
- 原因／修正: `startSupport`成功後に一覧stateを直接更新せず再取得だけを行い、5秒polling取得中は重複取得防止によりその再取得も開始されないため、次回pollingまで表示が残っていた。対象行をAPI成功後だけ既存status＋`（対応中）`へ局所更新し、処理中表示と二重操作防止を維持した。開始APIより前に開始したpolling応答はversionを進めて破棄し、未対応表示への巻き戻りを防ぐ。
- 既存互換: 5秒polling、`getNotifications`／`startSupport`／`deleteNotification`のaction・payload・response、生徒SOS送信、GAS、Spreadsheet、他講師同期方式は変更しない。
- Version: Version 4.3.2に収録。

### 1対1ネッツ進捗の単元選択保持修正（Issue番号未割当）

- 状態: Reactの局所修正と自動検証まで完了。実機確認、Git commit／push、Vercelデプロイは未実施。
- 原因／修正: 「単元を追加」のselectが非制御で、選択直後にDOMの値を空文字へ戻していたため、選択表示が「選択」へ戻っていた。unitIdを保持する制御stateへ変更し、個別単元・範囲追加・登録payloadの既存仕様を維持した。
- 既存互換: 学校進捗、既存GAS action、1対1進捗データ形式、Spreadsheet、単元マスター、講師ホーム集計は変更しない。
- Version: Version 4.3.2に収録。

### 講師ホーム進捗状況実データ化（Issue番号未割当）

- 状態: React・GAS実装、ローカル自動検証・UI確認、main／origin/main反映、正式GASプロジェクトへのソース同期まで完了。同期後ソースを読み戻して新actionの実在を確認済み。同期後の新VersionによるGAS Webアプリ再デプロイと本番データ確認は未実施。
- 集計: 管理セッション本人のroleにかかわらず全`assignedSchools`だけを対象とし、有効な中学生かつ1対1受講科目が有効な「生徒×科目」を1件として集計する。学校・ネッツ共通の`school_units.csv`軸で`netzUnitOrder - schoolUnitOrder`を算出し、2以上=順調、0～1=要注意、-1以下=遅れとする。社会は地理・歴史・公民の比較可能分野のうち最も悪い状態を1科目1件の代表状態にする。
- API／性能: 管理セッション必須の`getTeacherHomeProgressSummary`を追加。担当校舎範囲をGAS側で決定し、受講科目・進捗イベント・進捗単元を各1回だけ読み、学年×科目×社会分野の単元軸をメモリで共有する。履歴・Detailは返さず、現在位置、比較結果、比較不能理由、件数と合計100%になる割合だけを返す。既存Matrix action、進捗保存形式、シート構造は変更しない。
- UI: ホームの固定ドーナツと3状態を実データへ置換し、局所loading／error／retry／emptyを追加。順調・要注意・遅れと「進捗遅れ生徒対応」から同じ状態別一覧へ遷移し、20／50／100件pagination、社会3分野の根拠、既存生徒プロフィールリンクとホームへの戻る導線を提供する。対応項目2・3とサマリー4カードは未設定のまま維持する。
- Version: Version 4.3.1に収録。student-app、単元CSV、新規シート、本番データへの変更なし。

### 個トレメニュー／コンテンツ管理刷新（Issue番号未割当）

- 状態: React・GAS実装、ローカル自動検証・UI確認、main／origin/main反映、正式GASプロジェクトへのソース同期まで完了。コンテンツの作成・下書き保存・公開・講師側反映は実機確認済み。画像機能の最終実機確認、手動setup／migration、本番データ確認は未実施。
- 個トレメニュー: 待ちリスト直結画面を「丸付け・質問待ち／個トレ進捗管理／模範解答／お知らせ／個トレの仕方」の5カード型トップへ変更。待ちリストは既存`getNotifications`／`startSupport`／`deleteNotification`を維持し、5秒pollingを子画面表示中だけ実行してunmount時に解除する。個トレ進捗と模範解答は既存コンポーネント・データを内部入口から再利用し、独立サイドバー項目だけを除く。
- 模範解答: `modelAnswerBooks`と既存`public/pdfs`／`public/covers`を正本として、学年・titleから確定できる科目・教材名による絞り込み、教材一覧、ブラウザPDF viewerの3ペインへ再構成。単元・PDFページ対応は新設せず、外部placeholder画像も使用しない。
- コンテンツ／Markdown: `個トレコンテンツ`シートを正本とするstaff公開取得とadmin管理actionを追加。`notice`は複数、`guide`と`menu-guide`は固定IDとし、本文・タイトル・重要度・公開期間をdraft／publishedへ分離して、公開操作だけが講師表示値を更新する。公開期間はGASサーバー時刻で判定し、講師レスポンスへ下書きを含めない。同一`contentId`は読取・更新・公開・setupで`DATA_ERROR`として停止する。シート・データ0件でも編集画面を開き、最初のadmin保存時に正式headerを安全に初期化して各コンテンツを作成できる。旧GASが`Unknown action`を返した場合は成功扱いせず、adminへGAS更新が必要な旨を表示する。Reactは`react-markdown`＋GFM＋sanitizerを使用し、生HTMLを有効化せず、リンク・画像URLを制限する。
- 画像: Script Property `KOTORE_CONTENT_IMAGE_FOLDER_ID`で指定するDriveフォルダと`個トレコンテンツ画像`シートを使用。PNG／JPEG／GIF／WebP、10MB以下に加えてmagic bytesと申告MIMEの一致をGASで検証し、SVG・偽装画像を拒否する。Drive作成はDocumentLock外で行い、シート更新失敗時は作成ファイルをゴミ箱へ移す。Markdownには`kotore-image://imageId`だけを保存し、staff session付き取得結果をobject URLへ変換して破棄する。アップロード成功後は内部参照をカーソル位置へ挿入し、画像一覧では認証取得したthumbnailを表示する。参照中画像の削除を拒否し、Drive IDは一覧・公開レスポンスへ返さない。手動診断`testKotoreContentImageFolderAccess()`はfolder取得、一時テキストファイル作成、即時Trash移動だけを行い、ID等を出さず各段階の成功結果を記録する。GAS manifestには既存のSpreadsheet読書き・外部HTTP通信に必要なscopeを維持したうえで、フォルダ取得・ファイル作成・Trash移動に必要な書込み可能なDrive scopeを明示する。
- 管理者メニュー: adminだけに入口と描画を許可し、3種コンテンツ編集と各種パスワード管理を実動カードとして追加。アカウント管理等の指定5カードはdisabledの未実装表示とし、遷移・API呼出を行わない。編集は共通Markdown toolbar、ライブプレビュー、画像管理、公開設定、下書き／公開分離、競合検出、未保存離脱警告を備える。
- パスワード: `各種パスワード`シート向けstaff閲覧とadmin CRUD／並べ替えactionを追加。Script Propertyの`PASSWORD_MIGRATION_STATUS`を`NOT_MIGRATED／MIGRATING／MIGRATED／FAILED`で管理し、`MIGRATED`以外（新action未反映の旧GAS応答を含む）は既存`data.js`定数17件を講師・adminの双方へ読み取り専用で表示して、GAS側でも全mutationを拒否する。admin画面は移行前の既存データ利用中／移行後のシート利用中を明示する。移行は従来定数と一致する組み込み移行元を使用し、DocumentLock、安定ID・順序検証、一括書込み、全主要項目のread-back完全比較、失敗時snapshot復元を行い、確認用`PASSWORD_MIGRATION_JSON`は本番確認後まで自動削除しない。移行成功時と各CRUD後は、秘密情報を含まないID・sortOrder・有効／削除状態のintegrity manifestを更新し、MIGRATED後の空行・欠損・重複・不明IDをread／mutation前に`DATA_ERROR`として拒否する。コンテンツ、画像metadata、パスワードの自由入力セルは書込み前にプレーンテキスト書式へ設定し、`=+-@`開始値を変更せず往復する。
- セットアップ: 読み取り専用previewとsummary wrapper、シート作成、固定ページ初期化、パスワード移行用の手動関数を追加。setupはシート・header作成だけで移行完了にはせず、contentId重複時は書込み前に停止する。これらはCodex未実行。Google Sheets／Driveの複数更新に完全な原子性はなく、復元処理自体が失敗した場合は`FAILED`と明確なエラーを残し手動確認が必要。
- 既存互換: TeacherViewのheader／sidebar shell、季節業務3機能、学校進捗、アプリ利用、1対1進捗、アカウント管理、スキマ君利用設定、スタッフマニュアル、SharePoint、Version表示を維持。既存action名・既存成功レスポンス項目、認証・role・校舎権限、student-app、既存PDF、個トレ進捗保存形式は変更しない。
- Version: Version 4.3.1に収録。

### Issue #021 個トレ ホーム画面UIリニューアル

- 状態: React・GAS実装、ローカル検証、既存GASプロジェクトへのclasp push、Issue #021 feature branchからmainへの反映まで完了。GAS Webアプリの再デプロイ、実ログイン後の本番相当データ表示、本番確認は未実施。
- UI: 講師・管理者画面へ270px固定サイドバー、68px固定ヘッダー、挨拶、4枚のサマリー、対応項目／進捗の2パネル、お知らせパネルを持つホームダッシュボードを追加。PC・タブレット・モバイルの3段階で4列→2列→1列、2カラム→1カラム、サイドバー→drawerへ切り替える。サイドバー上部は「メニューボタン→既存ロゴ」だけの固定領域とし、その下のナビゲーションだけをスクロール可能かつスクロールバー非表示にした。メインヘッダーからメニューボタンを除き、サイドバー閉状態では画面左上の復帰ボタンを表示する。TeacherViewの縦スクロール要素である`teacher-main`もバーだけを非表示にし、ホイール・タッチ・キーボードによるスクロールと子要素の横スクロールは維持する。
- 業務画面レイアウト: 共通1000px幅を、一覧・表・進捗を扱う主要画面だけ最大1560pxのwide layoutへ変更。アプリ利用、個トレ進捗、学校進捗、学校成績、テスト振り返り、スキマ君利用設定、合宿の表は固定`max-height`を外し、縦方向をTeacherViewのページスクロールへ統一した。多列表・進捗軸の局所的な横スクロールと固定列、modalの内部スクロールは維持する。
- アプリ利用チェック: 既存`getAppUsageMatrix`の取得データを共用し、同一画面内で複数生徒×複数アプリの一覧表示と、選択した1アプリ×複数生徒のカード表示を切り替えるUIへ更新。rawDate最大値による最新ログ、30／60／90日・全期間、氏名／フリガナ検索、未利用filter、確定可能な並び替え、pagination、loading・error・emptyを追加し、既存の生徒詳細遷移と表内部だけの横スクロールを維持した。「十分／やや少ない／少ない」の業務閾値は未確定のため推測せず、該当サマリーを件数未表示・操作不可としている。「全担当校舎」はログインstaff本人の主校舎・副校舎を重複除去して展開し、`getAppUsageMatrix`は従来の単一校舎に加えてカンマ区切りの複数校舎を後方互換で受け付ける。認証・権限仕様は変更していない。
- アカウント管理: 旧大ボタンとlegacy画面を新UIから外し、「生徒情報／講師情報／新規アカウント」のタブ構成へ刷新。生徒・講師は氏名／フリガナ／ID検索、正式な有効／無効／削除済みfilter、20／50／100件pagination、一覧を維持した右詳細パネル、初期閲覧モードからの既存更新APIによる編集を追加した。登録は生徒／講師の種別カードと2カラムフォームへ再配置し、6桁ID、共通校舎・学年、担当校舎・主担当、GAS返却初期パスワードを維持した。最終ログイン、未定義役職名・アクセス範囲、管理者パスワード再設定、論理削除の新導線は追加していない。GAS・API・認証・権限の変更なし。
- 1対1進捗チェック: 条件選択を共通`SchoolSelect`・`GradeSelect`と正式科目定義を用いた白基調のカードUIへ刷新し、科目を複数選択可能にした。選択科目ごとに既存`getOneToOneProgressMatrix`へ単一`subjectId`でリクエストし、成功結果と科目別エラーを分離して表示する。結果は生徒情報／横タイムライン／操作の3カラムへ分離し、APIの全単元を固定42px間隔のpointとして学校=緑・ネッツ=青の上下2段で表示する。guideと生徒行は科目または社会分野ごとに横scrollを同期し、厳密な`unitOrder`差、現在単元の章・節・単元名・ページ、科目別20／50／100件paginationを追加した。詳細・入力・履歴・社会分野はクリック元科目IDを明示的に引き継ぎ、保存後は対象科目だけを再取得する。GAS・既存action・レスポンス形式・認証・校舎権限の変更なし。
- 既存機能: 既存メニュー項目、外部リンク、各管理画面への遷移、通知更新、ログアウトを新しいApp Shell内へ移した。既存APIのaction・成功レスポンスは維持し、`getAppUsageMatrix.school`だけ従来の単一校舎に加えて複数校舎を非破壊的に受け付ける。
- 未決定データ: サマリー、対応項目、全体進捗、お知らせへの業務情報割り当ては別工程のため、数値や日時を捏造せず未設定表示とした。新しいAPIや業務ルールは追加していない。
- Version: 変更なし（Version 4.3.0）。`getAppUsageMatrix`の複数校舎対応以外のGAS、スプレッドシート、student-appへの変更なし。

### Issue #018 生徒プロフィール

- 状態: React・GAS実装、clasp push、GAS Webアプリ再デプロイ、実動作確認、UI最終確認まで完了。
- 変更内容: `#/student/:userId`のHash navigationで、講師・管理者が生徒の基本情報、1対1受講科目、個トレ進捗、スキマ君進捗、1対1進捗、学校成績を1ページから閲覧できる生徒プロフィールを追加。初期Versionは閲覧専用とし、既存管理画面の編集操作は変更しない。
- 認証・権限: admin・teacher・head-teacherは全校舎の有効studentを閲覧可能。担当校舎は優先表示・複数校舎操作の補助情報であり閲覧権限には使用しない。student、無効・削除済み生徒はGAS側で拒否し、プロフィールactionごとに管理セッションと対象生徒を再検証する。
- データ再利用: Issue #016の受講科目、Issue #017の学校／ネッツ進捗状態と共通進捗UI、Issue #019の`userId + contentId`ログ、Issue #020の生徒別学校成績内部取得を正本として利用。プロフィール専用シートや重複保存は追加しない。
- スキマ君: gyoumu-app GASがログSpreadsheetを読み、正式`contentId`がある行だけをuserIdと組み合わせて集計する。contentId空欄の旧ログは推測統合せず、プロフィールには現在の`allowedContentIds`に含まれるコンテンツだけをマスター順で表示する。利用可能で正式ログ未登録のコンテンツも「利用履歴はありません」と表示する。
- UI: 各セクションを独立loading・error・再試行にし、1対1進捗は既存一覧と共通コンポーネントを使用。個トレも`units.csv`の教材別単元軸・章境界・最大到達位置を同系統の進捗ラインで表示し、細分化された章は主要区切りだけを常時表示して単元詳細をpoint操作で確認できる。PCは1対1 45%＋個トレ55%、スキマ君の履歴ありsummary／未利用compact表示、学校成績表約62%＋選択テスト棒グラフ約38%へ情報密度を調整し、狭い画面では1カラムへ切り替える。1対1進捗、個トレ、学校進捗、スキマ君利用設定、アカウント管理の生徒名を共通プロフィールリンクへ変更した。
- 実動作不具合修正: contentId正式保存前のスキマ君ログは、student-appの正式なcontentId↔ログシート1:1対応が保証されるシートだけ読取時に互換集計し、ログ行自体は変更しない。個トレは既存一覧と共通のページ照合helperを使用し、NFKC表記差・教材名付き保存値・個別ページとCSVページ範囲を照合して、復習後も最大到達位置を維持する。
- デプロイ: Issue #018のGASはclasp push済みで、ユーザー側のGAS Webアプリ再デプロイと本番実動作確認も完了。Versionは`4.3.0`を維持。

### Issue #020 学校成績管理

- 変更内容: admin限定の学校成績管理画面を追加し、年度内で全学年共通のテスト設定と、校舎・学年・テストを指定した9科目成績入力に対応した。Excel／Googleスプレッドシートから国語・数学・英語・理科・社会・音楽・保健・美術・技家の順で9列を複数生徒へ貼り付け、React stateで確認後に変更生徒だけを一括保存する。
- UI: 年度候補は2024年度から現在年度+1までを自動生成し、2024年度以降の保存済み年度も含める。年度・学年・テスト・校舎は既存の`styles.select`を共通利用し、PC・モバイルで自然に折り返すレスポンシブ幅へ統一した。
- 学年選択: 成績入力の学年候補は「アプリ利用チェック」と同じ共通`GradeSelect`をデフォルト設定で再利用し、小1～大学受験および小学生・中学生・高校生グループを同じ表示名・内部値・順序で扱う。GASは既存の正式学年検証を各選択値へ適用する。
- データ: `学校成績テスト`と`学校成績`を正本とし、`testId × userId`を一意キーにする。合計は保存せず、9科目すべて入力済みの場合だけ自動計算する。空欄と0点を区別する。
- API・権限: adminセッションを必須とするテスト取得・作成・更新、成績マトリックス取得、一括保存actionを追加。テスト名は年度内で一意とし、学年はテストマスターへ保存せず、成績入力時にGASが指定学年と生徒マスターを照合する。点数範囲、重複を検証し、DocumentLockと失敗時復元を使用する。Issue #018向け生徒別内部取得処理は進級後もuserIdの過年度成績を返す。
- セットアップ・本番確認: `setupAcademicResultSheets()`を追加し、ユーザーが本番で実行済み。`学校成績テスト`はgradeを持たない正式10列、`学校成績`は正式14列で作成済み。GAS Webアプリの新Version再デプロイ後、年度共通テスト、テスト設定・成績入力、2024年度以降の年度候補、共通学年候補・グループ選択、PCレイアウトをユーザーが実画面で確認済み。
- Version: 変更なし（Version 4.2.1）。student-appおよびstudent-app-log-gasへの変更なし。

### Issue #017 1対1進捗チェック

- 日付: 2026-08-27
- 状態: React・GAS実装、ローカル自動検証、対象GASプロジェクトへのclasp push、専用シートの本番セットアップ、GAS Webアプリ再デプロイ、実動作確認、UI最終確認を完了。
- 単元軸: 講師が業務で使用する`public/school_units.csv`を学校・ネッツ共通軸の正本とする。既存7列・単元表記・行順を維持し、末尾へ内容ハッシュ由来の固定`unitId`を追加。GAS検証用データは同CSVから自動生成し、独立した単元マスターは作らない。
- 社会: `中学生の歴史【帝国書籍】`、`中学生の地理【帝国書籍】`、`中学生の公民【帝国書籍】`のテキスト名完全一致から`history / geography / civics`を判定し、業務順の歴史→地理→公民で表示する。3分野は学校・ネッツの現在位置と履歴を独立計算し、一覧では初期状態を閉じたグループとして概要を表示する。
- 実画面改善: `lessonDate`を日本時間の暦日文字列としてAPI返却しUTC変換による前日ずれを防止。進捗ラインは章境界を補助表示へ抑え、現在位置を`現在：単元N 単元名`の1行へ集約。履歴は日本語日付、学校の連続区間、ネッツの実施単元、VOID監査表示を講師向けに整理する。
- データ／シート: `1対1進捗イベント`と`1対1進捗単元`を追加。イベントは授業日・登録者・ACTIVE/VOID・訂正理由・置換先を保持し、単元明細は`unitId`、`unitOrder`と表示スナップショットを保持する。現在位置専用シートは作らず、有効履歴の最大`unitOrder`を算出する。
- 学校進捗: 講師が最終到達位置を指定し、現在位置からの未登録区間を自動保存する。通常講師による後退・訂正・削除は許可しない。
- ネッツ進捗: 当日実施した任意の単元を保存し、復習・飛び飛び選択・同日複数入力を許可。表示位置は有効履歴の最大到達単元とする。
- UI: 校舎・学年・科目で絞り込み、Issue #016で受講中の生徒だけをカナ順で表示。1生徒ブロック内に学校・ネッツ2本の閲覧用進捗ラインを配置し、入力・履歴を分離する。モバイルでは生徒情報を維持して進捗軸を横スクロールする。
- 認証・権限: teacherにも期限付き管理セッションを発行するが、既存admin専用actionは引き続き`requireAdminSession()`で保護する。Issue #017はteacher・head-teacher・adminが担当外を含む単一校舎を閲覧・登録できる。担当校舎はアクセス権ではなく、teacher・head-teacherが複数校舎を同時選択する場合の範囲と初期選択・優先表示にだけ使用する。adminは全校舎の単一・複数選択が可能。履歴のVOID化・訂正はadminだけに限定し、受講科目・対象生徒・単元整合性はGAS側で引き続き検証する。担当外校舎や入力不正はセッション失効へ分類せず、無効・期限切れ管理セッション等の認証失敗だけをログアウト対象とする。
- 校舎アクセス修正確認: 担当外校舎の単一閲覧・学校／ネッツ進捗登録、担当校舎内の複数選択、担当外を含む複数選択の業務エラー化、担当外生徒プロフィール閲覧を、GAS Webアプリ再デプロイ後の実画面で確認済み。
- 一覧性能改善: `getOneToOneProgressMatrix`が対象生徒・社会分野ごとに進捗イベントと進捗単元の全行を再読込していたN+1を解消。Matrix request内で各シートを1回ずつ読み、`userId × subjectId × fieldId`と`eventId`のメモリ索引を全生徒で共有する。20人の場合の進捗データreadは通常科目で40→2回、社会3分野で120→2回となる。一覧は現在位置summaryのみを返し、履歴・入力詳細は従来どおり操作時にlazy loadする。clasp push、GAS Webアプリ再デプロイ、ローカル実動作確認を完了し、一覧操作待ち時間の改善を確認済み。
- timeout診断: 最新mainを正本として、Matrixリクエスト単位の診断ID、ReactのSTART／RESPONSE／ERRORと`clientElapsedMs`、GASのAUTH／MATRIX／RESPONSE段階trace、認証区間・`matrixElapsedMs`・`responseElapsedMs`・`serverTotalMs`を後方互換なdiagnosticsとして追加し、統合済みのGAS 3ファイルを対象プロジェクトへclasp pushした。読み取り専用`runInspectOneToOneProgressPerformance()`の本番手動実行では、生徒148人、受講科目92行、イベント66行、進捗単元387行、`authContextLoadMs=1,736`、`subjectLoadMs=323`、`eventLoadMs=199`、`progressUnitLoadMs=195`、`indexBuildMs=2`、`axisBuildMs=19`、`stateBuildMs=40`、`responseBuildMs=11`、合計2,913ms、推定レスポンス431,274bytesを確認しており、通常Matrix本体だけで30秒を超える可能性は低い。Axios timeoutは30秒のまま維持し、原因修正は行っていない。ユーザーがGAS Webアプリを新Versionとして再デプロイし、診断branchのReactから複数回実画面確認した範囲では30秒timeoutは再現せず正常動作を確認済み。将来再発時は画面の診断IDから同一requestIdのAUTH／MATRIX／RESPONSE段階を追跡する。
- API: 一覧、詳細、学校登録、ネッツ登録、admin訂正・無効化の専用actionを追加。`requestId`で同一イベントの二重登録を防止し、Issue #018から再利用できる`getOneToOneProgressState_()`を追加する。既存学校進捗・個トレ進捗APIとデータは変更しない。
- 本番確認: `setupOneToOneProgressSheets()`実行とGAS再デプロイ済み。木太南 太郎（`037071`）の中1数学で学校最大単元5、ネッツ最大単元3、単元1の復習後も最大位置3を維持すること、授業日・履歴・admin操作・最終進捗ラインUIを利用者が確認済み。
- Version: 変更なし（Version 4.2.1）。

### Issue #016 1対1受講科目管理

- 日付: 2026-08-27
- 状態: React・GAS実装、ローカル検証、対象GASへのclasp push、専用シートの本番セットアップ、GAS Webアプリ再デプロイ、実動作確認を完了。
- 変更内容: 生徒ごとの1対1受講科目を`userId × subjectId`で管理する専用マスターを追加。生徒詳細で英語・数学・国語・理科・社会を複数選択し、基本情報とは独立して取得・保存できる。
- データ／シート: `1対1受講科目`シートを`userId / subjectId / enabled / createdAt / updatedAt / updatedBy`の6列で使用。userId列は文字列形式、解除は行削除せず`enabled=FALSE`とする。初回一括登録では先頭3列だけの直接入力を許容する。
- API: adminセッション必須の`getOneToOneSubjects`、`updateOneToOneSubjects`を追加。内部共通取得処理は将来のIssue #017「1対1進捗チェック」とIssue #018「生徒プロフィール」から再利用できる構造とする。既存アカウントAPI、4マスター、認証・権限仕様は変更しない。
- 安全性: 有効subjectIdのみを返し、`userId × subjectId`重複はエラーにする。更新はDocumentLock、全件検証、一括書込み、失敗時復元を行う。未登録生徒と不正subjectIdを拒否する。
- GAS・データ: 既存`gas/.clasp.json`の対象プロジェクトへclasp push済み。利用者が`setupOneToOneSubjectSheet()`を実行して本番シートを作成し、A列の文字列形式を確認した。検査用1行で重複・不正subjectId・未登録生徒が各0件であることを確認後、GAS Webアプリを新Versionとして再デプロイ済み。
- 実動作確認: ローカルgyoumu-appから、スプレッドシート登録済み科目の取得・チェック表示、科目追加・解除・保存・再取得、他生徒へ影響しないことを利用者が確認済み。
- 診断helper: 読み取り専用の`runInspectOneToOneSubjectDataSummary()`、`runInspectOneToOneSubjectDuplicateSummary()`、`runInspectOneToOneSubjectUnknownStudents()`を整備。完全空行を集計対象から除外し、`enabled=FALSE`を正常データとして扱いながら、正規化後の`userId × subjectId`重複、不完全行、不正subjectId、未登録userIdを個別に確認できる。
- 本番データ確認: 利用者による重複行・未登録userId行の手動整理後、92行について重複・不完全行・不正subjectId・未登録userIdがすべて0件であることを確認済み。診断helperは本番データを書き換えない。
- 影響範囲: gyoumu-appのadmin向け生徒詳細とGAS。student-app、ログイン、SSO、スキマ君権限、進捗履歴は変更しない。
- Version: 変更なし（Version 4.2.1）。

### Issue #015 生徒表示順をカナ五十音順へ統一

- 日付: 2026-08-27
- 状態: React・GAS実装、ローカル検証、対象GASへのclasp push、GAS Webアプリ再デプロイ、実動作確認を完了。
- 変更内容: 生徒一覧・選択画面を、業務上意味のある校舎・学年グループを維持しながら`nameKana`の五十音順へ統一。スキマ君利用設定は表示対象全体、個トレ進捗・学校進捗・テスト振り返り・アプリ利用状況は既存グループ内で整列する。
- 共通仕様: 新旧の姓名間スペースを正規化して比較し、`nameKana`未登録は後方へ配置。同一カナは氏名、最終的に`userId`／`studentId`で安定順とする。
- API: 対象マトリックスの既存レスポンスへ`nameKana`を非破壊的に追加。既存action、リクエスト項目、保存処理、認証・権限仕様は変更しない。
- GAS: 既存`gas/.clasp.json`の対象プロジェクトへclasp push済み。利用者がGAS Webアプリを新Versionとして再デプロイ済み。本番スプレッドシート・本番データ変更は未実施。
- 実動作確認: 再デプロイ後のスキマ君利用設定と個トレ進捗チェックで、氏名表示を維持したまま内部`nameKana`に従う五十音順になることを利用者が確認済み。
- 対象外: 合宿ランキングなど得点・日時・対応優先度に意味がある並びは変更しない。student-appは変更しない。
- Version: 変更なし（Version 4.2.1）。

### Issue #014 nameKana姓名間スペースの全角統一

- 日付: 2026-08-26
- 状態: React・GAS実装、検証、対象GASへのclasp push、GAS Webアプリ再デプロイ、実動作確認、mainへのfast-forward反映を完了。
- 変更内容: 今後の生徒・staff新規登録と編集保存で、`nameKana`を「全角カタカナ＋姓名間は全角スペース1個」へ統一する。NFKC正規化後に前後空白を除去し、半角・全角・連続・混在空白を全角スペース1個へ変換する。
- React: 登録・生徒編集・staff編集の重複正規化を共通化し、プレースホルダーも正式形式へ変更。
- GAS: サーバー側を最終的な正本として同じ正規化・検証を適用。アカウントAPI、シート構造、認証・権限仕様は変更しない。
- 表示・ソート: 保存値はそのまま表示し、比較時だけ新旧スペース形式を正規化するため、既存半角スペースデータと新形式が混在してもフリガナ順を維持する。
- データ影響: 既存`nameKana`を自動変換する処理は追加しない。スプレッドシートへ直接一括登録するデータは、事前に全角スペース1個へ統一する。
- テスト: 半角・全角・連続・混在・前後空白・ひらがな入力についてReactとGASの保存結果一致、旧新形式のソート同値性を含む`npm test` 52件、`npm run build`、変更対象lint、GAS構文、`git diff --check`が成功。
- GAS: 既存`gas/.clasp.json`の対象プロジェクトへclasp push済み。利用者がGAS Webアプリを新Versionとして再デプロイし、半角スペース入力が全角スペース1個として扱われることを実動作確認済み。本番スプレッドシートの既存データ変更は未実施。
- Git・Vercel: 実装`24f3f78`を競合なしのfast-forwardでmainへ反映・通常pushした。接続中のVercelアカウントでは`gyoumu-app`プロジェクトを参照できないため、本番デプロイ状態は未確認。
- Version: 変更なし（Version 4.2.1）。

### Issue #012 スキマ君利用設定 中学生・高校生モード一括変更

- 日付: 2026-08-26
- 状態: React・GAS実装、対象GASへのclasp push、セットアップ関数による本番シート9列化、GAS Webアプリ再デプロイ、実動作確認、mainへのfast-forward反映を完了。
- 変更内容: 「スキマ君コンテンツ」を既存7列の末尾へ`中学生モード`、`高校生モード`を加えた9列構成へ拡張し、管理画面の各生徒行へ2つの未保存プリセットボタンを追加。プリセット適用後も個別チェックを変更でき、既存`updateSukimakunPermissions`へ`allowedContentIds`として保存する。
- 移行・同期: 正常7列は既存値と行順を維持して末尾ヘッダーだけを追加し、旧4列は既存値を維持して9列化する。正常9列は変更せず、既存モード値を保持する。想定外ヘッダーや余分な列は警告してコンテンツ同期を停止する。新規コンテンツの両モード初期値はFALSE。
- API: `getSukimakunPermissionMatrix`の既存`contents`要素へ`juniorHighMode`、`highSchoolMode`を非破壊的に追加。既存action、リクエスト、権限保存レスポンス、`permissionsInitialized`は変更なし。
- 影響範囲: gyoumu-appのスキマ君利用設定、GASのコンテンツマスターセットアップ・読込、student-app-dbの「スキマ君コンテンツ」列構成。student-appコード、login、SSO、権限保存シートは変更なし。
- テスト: feature branchとmainの両方で`npm test` 48件、`npm run build`、変更対象lint、GAS構文、GAS関連テスト12件、`git diff --check`が成功。再デプロイ済みGAS、student-app-db、本番権限データとの結合をローカル画面から確認した。student-appの通常ログインとSSOは実アカウント未確認（関連コード変更なし）。
- GAS: `gas/.clasp.json`で指定された既存プロジェクトへclasp push済み。利用者が`setupSukimakunPermissionSheets()`を実行して9列化とモード値設定を行い、GAS Webアプリを再デプロイ済み。実動作確認後の追加修正はReact表示のみのため追加再デプロイ不要。
- 2026-08-26実動作確認: ローカルfeature branchから再デプロイ済みGASへ接続し、中学生3学年41名・25コンテンツの取得、各生徒行のモードボタン、シート設定に一致する中学生／高校生プリセット、未保存表示、個別ON/OFF、生徒間非干渉を確認。動作確認用アカウントで中学生モードを保存し、初回レスポンスは15秒でタイムアウトしたが再取得で保存済みと確認した。その後、取得済みの元設定へ復元保存し、再取得一致、初期化済み状態、保存ボタン無効を確認した。ブラウザ確認でモード列が横スクロール時に固定列の下へ隠れやすい表示を検出し、列幅固定とボタン幅上書きで同一行に安定表示するよう修正した。
- Git・デプロイ: 実装`89eecd2`、表示修正`b1ebc4e`をIssue branchへ通常pushし、競合なしのfast-forwardでmainへ反映・通常pushした。接続中のVercelアカウントでは`gyoumu-app`プロジェクトを参照できないため、Vercel本番デプロイ状態は未確認。
- Version: 変更なし（Version 4.2.1）。

### Issue #011 前置詞テストのコンテンツ権限追加

- 日付: 2026-08-26
- 状態: GASコード修正、ローカル静的検証、ログイン・権限GASへのclasp pushを実施。セットアップ関数実行、Webアプリ再デプロイ、本番確認は未実施。
- 原因: `student-app`には`preposition_test`が追加済みだが、gyoumu-app GASの初期登録・不足コンテンツ同期用`DEFAULT_SUKIMAKUN_CONTENTS`が既存24件のままで、`setupSukimakunPermissionSheets`を再実行しても追加対象にならなかった。
- 変更内容: `preposition_test`（表示名`前置詞テスト`、category=`general`、schoolType=`all`、subject=`english`、enabled=`true`、sortOrder=`25`）をGAS初期定義へ非破壊的に追加。既存API、権限保存形式、既存コンテンツ行は変更しない。
- データ／シート影響: 対象GASをclasp pushした後、`student-app-db`に紐づくGASエディタで`setupSukimakunPermissionSheets`を手動実行すると、「スキマ君コンテンツ」へ不足行だけが追記される。既存生徒の初期化済み権限へは自動追加されず、管理画面から生徒ごとに許可を保存する必要がある。
- student-app影響: Version 4.3.0で実装・main反映・本番デプロイ済みとの利用者報告。student-appコード自体は今回未変更。
- GAS: 2026-08-26に`gas/.clasp.json`で指定された既存プロジェクトへclasp push成功。Webアプリ再デプロイは未実施（手動セットアップ関数の実行には不要）。
- Version: gyoumu-appのVersion表示は変更なし（Version 4.2.1）。

### Issue #010 合宿参加者設定・合宿特訓データ入力・ランキング

- 日付: 2026-08-10
- 状態: React・GAS実装、ローカル静的検証、必要シートのセットアップ、GAS Webアプリ反映を実施。本番アカウントでの結合確認は未完了。
- 変更内容: admin・head-teacher向け合宿メニュー、年度・夏冬別のランキング、admin限定の参加者設定と1～4日目の5教科問題数入力を追加。標準競技順位と前日比を実装。年度選択は合宿参加者・合宿特訓入力の履歴に存在する年度と、4月始まりで算出した現在年度を重複排除して降順表示する。年度・季節選択欄は閉じた値、選択肢、フォーカス時、無効時にも判別できる配色へ修正。参加者設定は既存の`SchoolSelect`・`GradeSelect`を使用し、校舎必須・学年任意の条件を指定して「表示」を押した時だけ取得する方式へ変更。全担当校舎はログイン中adminの`assignedSchools`を正本とし、氏名検索は取得後のクライアント絞り込みとした。アカウント管理と同じ校舎順・フリガナ順・学年順を共通ロジックで使用し、条件変更で一覧をクリアしても選択済み参加者ID全体を保持する。
- 参加者設定改善: 表示ボタン方式、校舎必須・学年任意、全担当校舎対応へ変更。フィルタ欄を「校舎・学年・氏名・表示」の順に統一し、表示ボタンの高さと横幅を入力欄に合わせてレスポンシブ対応した。
- データ入力改善: データ入力タブを開いた時や年度・季節・日を変更した時の参加者・入力済みデータの自動取得を停止。年度・季節を選択して「表示」を押した時だけ既存`getCampTrainingInput`を呼び、条件変更時は旧条件の一覧をクリアする方式へ変更。
- 権限: head-teacherへroleを維持した管理セッションを発行。ランキングはadmin・head-teacher、参加者と入力の取得・更新はadminだけをGAS側で許可。
- データ／シート影響: `合宿参加者`と`合宿特訓入力`の手動セットアップ関数を追加。生徒コードだけを保存し、氏名・フリガナ・教室は生徒マスターを参照。2026-08-10にセットアップ関数を実行し、再実行時に作成・ヘッダー初期化・警告が0件であることを確認。
- API: `getCampAvailableYears`、`getCampParticipants`、`updateCampParticipants`、`getCampTrainingInput`、`saveCampTrainingInput`、`getCampTrainingRanking`を非破壊的に追加。既存actionと既存レスポンスは変更なし。
- 対象外: スキマ君問題数集計、student-app、LOG GAS、無効回答判定。
- テスト: 参加者一覧の既存ソート順、単一校舎・全担当校舎・任意学年・氏名の絞り込み、履歴年度と現在年度の重複排除・降順化、4月始まりの年度算出、不正年度の拒否、入力画面の自動取得停止と入力取得APIへの条件引き渡しを含む`npm test`（25件）、`npm run build`、GAS構文、変更対象lint、`git diff --check`が成功。年度・季節選択欄はadmin・head-teacher相当の構造で、通常・選択肢・フォーカス・無効状態をPC幅／390px幅でローカル再確認済み。入力画面はローカルモックで表示前・取得成功・0件・条件変更・再取得・APIエラーを確認済み。実GAS・実データと実アカウントでの画面確認は未実施。
- 2026-08-20再開確認: 年度候補取得に限り、合宿参加者・合宿特訓入力シートが未作成の場合を履歴なしとして現在年度を返すよう改善。片方のみ存在、両方空、重複・異なる履歴、不正年度、admin・head-teacherの許可とteacher・不正セッションの拒否を追加検証し、`npm test`は27件成功。存在するシートの不正ヘッダーと不正年度は引き続きエラー停止する。
- 2026-08-20データ入力UI改善: adminがデータ入力タブを開いた時と年度・季節・日を変更した時に、選択条件の入力データを自動取得する方式へ変更。最後に取得・保存した値と現在値を比較し、未保存入力中は条件・画面切替を無効化。確認付きの「変更を破棄」で保存済みデータを再取得できる。保存API成功後の再取得だけが失敗した場合は、保存済みであることと再試行が必要なことを明示する。参加者0人時の操作案内と参加者設定への移動も追加。GASは合宿管理用シート未作成・不正ヘッダーを`CAMP_SETUP_REQUIRED`で判別可能にし、既存action・成功レスポンス・保存形式は維持。
- 2026-08-20入力取得性能改善: `getCampTrainingInput`で管理セッション検証時に読み取った新4マスターのユーザー情報を、参加者検証と入力ランキング生成でも同一リクエスト内に限って再利用するよう変更。新4マスターの全件読取を3回から1回へ削減し、永続キャッシュ、API形式、保存形式、ランキング仕様、DocumentLockは変更していない。ローカル検証済み。GAS反映後の実環境性能は未確認。
- Git branch: `codex/issue-010-camp-training`
- Commit / Push: `663f9a1 feat: add camp training management and ranking`を作業ブランチへcommit・push済み。今回の参加者フィルタ改善は未commit・未push。
- GAS: clasp push済み。既存WebアプリURLをVersion 158（`Issue #010 camp training management and ranking`）へ更新済み。今回の表示ボタン方式と参加者フィルタ改善はGAS API・保存形式の変更なし。
- Vercelデプロイ: 未実施。
- Version: 変更なし（Version 4.2.1）

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
