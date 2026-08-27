# CHANGELOG

gyoumu-appにおける個トレFrontend、GAS、スプレッドシート／マスター、API、権限仕様、およびstudent-app連携の主な変更履歴を記録する。

確認できた事実のみを記載し、未確認のデプロイや本番動作は「未確認」または「未記録」と明記する。

## Version History

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

### Issue #021 個トレ ホーム画面UIリニューアル

- 状態: React・GAS実装、ローカル検証、既存GASプロジェクトへのclasp pushまで完了。GAS Webアプリの再デプロイ、実ログイン後の本番相当データ表示、本番確認は未実施。
- UI: 講師・管理者画面へ270px固定サイドバー、68px固定ヘッダー、挨拶、4枚のサマリー、対応項目／進捗の2パネル、お知らせパネルを持つホームダッシュボードを追加。PC・タブレット・モバイルの3段階で4列→2列→1列、2カラム→1カラム、サイドバー→drawerへ切り替える。サイドバー上部は「メニューボタン→既存ロゴ」だけの固定領域とし、その下のナビゲーションだけをスクロール可能かつスクロールバー非表示にした。メインヘッダーからメニューボタンを除き、サイドバー閉状態では画面左上の復帰ボタンを表示する。TeacherViewの縦スクロール要素である`teacher-main`もバーだけを非表示にし、ホイール・タッチ・キーボードによるスクロールと子要素の横スクロールは維持する。
- 業務画面レイアウト: 共通1000px幅を、一覧・表・進捗を扱う主要画面だけ最大1560pxのwide layoutへ変更。アプリ利用、個トレ進捗、学校進捗、学校成績、テスト振り返り、スキマ君利用設定、合宿の表は固定`max-height`を外し、縦方向をTeacherViewのページスクロールへ統一した。多列表・進捗軸の局所的な横スクロールと固定列、modalの内部スクロールは維持する。
- アプリ利用チェック: 既存`getAppUsageMatrix`の取得データを共用し、同一画面内で複数生徒×複数アプリの一覧表示と、選択した1アプリ×複数生徒のカード表示を切り替えるUIへ更新。rawDate最大値による最新ログ、30／60／90日・全期間、氏名／フリガナ検索、未利用filter、確定可能な並び替え、pagination、loading・error・emptyを追加し、既存の生徒詳細遷移と表内部だけの横スクロールを維持した。「十分／やや少ない／少ない」の業務閾値は未確定のため推測せず、該当サマリーを件数未表示・操作不可としている。「全担当校舎」はログインstaff本人の主校舎・副校舎を重複除去して展開し、`getAppUsageMatrix`は従来の単一校舎に加えてカンマ区切りの複数校舎を後方互換で受け付ける。認証・権限仕様は変更していない。
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
