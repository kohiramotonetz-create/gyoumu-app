---
title: CURRENT_IMPLEMENTATION
version: 1.0.0
status: Draft
last_updated: 2026-08-05
source:
  - 現在のソースコード
---

# CURRENT_IMPLEMENTATION

## 1. ドキュメントの目的

現在のリポジトリに実装されている内容を、コードから確認できた事実として整理する。
業務上の理想、改善案、未実装の希望は記載しない。業務仕様は`PROJECT_OVERVIEW.md`、`BUSINESS_SPEC.md`、`EXTERNAL_APP_INTEGRATION.md`を参照する。

## 2. 調査対象

| 項目 | 確認結果 |
|---|---|
| 調査フォルダ | `C:\Users\netz\gyoumu-app` |
| Gitリポジトリ | Gitリポジトリとして認識されている |
| 現在のブランチ | `main` |
| origin | GitHub上の`kohiramotonetz-create/gyoumu-app`リポジトリ |
| デフォルトブランチ | `origin/main` |
| 調査開始時の作業ツリー | ソースコードに未コミット差分なし。`docs/`は新規作成中 |
| アプリ内バージョン | `3.5.3`（`src/TeacherView.jsx:17`） |

## 3. 技術構成

| 分類 | 現在の実装 |
|---|---|
| フレームワーク | React 19.2、Vite 8 |
| 言語 | JavaScript、JSX、CSS |
| 主要ライブラリ | `react`、`react-dom`、`axios`。`papaparse`は依存にあるが利用箇所なし |
| ビルド | `npm run build`（`vite build`） |
| パッケージ管理 | npm、`package-lock.json`あり |
| 静的解析 | ESLint 9、React Hooks、React Refresh |
| テスト環境 | テストスクリプト・テストライブラリなし |
| PWA関連 | `public/manifest.json`、アイコン、PWA用metaタグあり |
| Vercel関連 | `vercel.json`、`.vercel/`なし。Vercelへのデプロイ設定は未確認 |

根拠：`package.json`、`vite.config.js`、`eslint.config.js`、`index.html`、`public/manifest.json`。

## 4. ディレクトリ構成

| パス | 現在の役割 |
|---|---|
| `src/main.jsx` | React起動点 |
| `src/App.jsx` | ログイン、初回パスワード変更、ロール別画面分岐 |
| `src/Login.jsx` | ログイン入力UI |
| `src/StudentView.jsx` | 生徒画面の状態・通信・メニュー統括 |
| `src/TeacherView.jsx` | 講師・校舎責任者・管理者画面の統括 |
| `src/components/` | 業務機能別UIコンポーネント |
| `src/styles/` | 生徒・講師画面のスタイル定義 |
| `src/constants/data.js` | 模範解答一覧、外部サービス案内情報 |
| `public/*.csv` | 校舎・個トレ教材・学校教材マスター |
| `public/pdfs/`、`public/covers/` | 模範解答PDFと表紙画像 |

## 5. 画面構成

React Routerは使用されていない。すべて基本URL`/`上で、`App`の`step`、`role`、各Viewのstateにより表示を切り替える。

| 画面名 | 表示条件・ロール | 実装ファイル | 主な操作・遷移 | 外部遷移 |
|---|---|---|---|---|
| ログイン | 未ログイン | `src/Login.jsx`、`App.handleLogin` | ID・パスワード送信 | なし |
| 初回パスワード変更 | `isInitial`が真 | `src/App.jsx` | 新パスワード送信 | なし |
| 生徒メニュー | `student` | `src/StudentView.jsx` | 生徒機能切替 | Forms、スキマ君 |
| 個トレサポート | `student` | `SupportManager` | 質問・丸付け・SOS | なし |
| 個トレ進捗 | `student` | `JukuProgressManager` | 単元選択・保存 | なし |
| 学校進捗 | `student` | `SchoolProgressTracker` | 単元選択・保存 | なし |
| 過去の振り返り | `student` | `PastReviewView` | 年度・テスト別閲覧 | なし |
| 講師ダッシュボード | `teacher`、`head-teacher`、`admin` | `TeacherView` | 機能メニュー切替 | ロールによりあり |
| 対応キュー | 講師系全ロール | `NotificationManager` | 対応開始・完了 | なし |
| 進捗確認 | 講師系全ロール | `KoToreProgressTracker`、`SchoolProgressManager` | 条件別一覧 | なし |
| 利用状況確認 | 講師系全ロール | `AppUsageTracker`、`UsageDetailView` | 一覧・生徒詳細 | なし |
| アカウント管理 | `admin`、`head-teacher` | `AccountGenerator` | 作成・検索・一括削除 | なし |
| テスト振り返り確認 | `admin`、`head-teacher` | `TestReviewManager` | 集計・詳細 | なし |
| パスワード案内・模範解答 | `admin` | `PasswordManager`、`ModelAnswerShelf` | 外部案内・PDF表示 | あり |

## 6. ロール・権限

フロントコードに`student`、`teacher`、`head-teacher`、`admin`が存在する（`src/App.jsx:14,155-176`、`src/TeacherView.jsx:138-146`）。

- `student`：生徒向け入力・閲覧機能。
- `teacher`：対応キュー、利用状況、個トレ・学校進捗確認。
- `head-teacher`：講師機能に加え、アカウント管理とテスト振り返り確認。
- `admin`：講師機能と管理メニュー全般。

GAS側でロール・担当校舎が再検証されているかは未確認。

## 7. 認証・ログイン状態

- `App.handleLogin`が`login` actionへ`userId`と`password`を送信する（`src/App.jsx:50-90`）。
- 成功応答の`name`、`role`、`grade`、`school`をReact stateへ保存する。
- `isInitial`が真の場合、`changePassword` actionを使用する初回変更画面を表示する（`src/App.jsx:93-124`）。
- 新パスワードは8文字以上で英大文字・英小文字・数字を各1文字以上必要とする。
- ログイン状態はReact stateのみで保持する。LocalStorage、SessionStorage、Cookieは使用していない。
- ページ再読み込み後はstateが初期化され、ログイン画面になる構造である。
- `handleLogout`はstateを初期化し、サーバーへのログアウト要求は送らない（`src/App.jsx:127-137`）。
- 講師画面は15分無操作でフロント側ログアウトを行う（`src/TeacherView.jsx:29-47`）。
- `issueToken`のトークンはスキマ君起動にだけ使用され、アプリ自身のログイン保持には使用されない。

## 8. 生徒向け機能

- `SupportManager`：質問・丸付け・SOS依頼。`sendNotification`を呼ぶ。
- `JukuProgressManager`：`units.csv`を基に個トレ進捗を選択し、`saveProgress`を呼ぶ。
- `SchoolProgressTracker`：`school_units.csv`を基に学校進度を選択し、`saveSchoolProgress`を呼ぶ。
- `UnitSelectionModal`：教材の章・単元・ページ選択。
- `PastReviewView`：振り返りの年度・テスト選択と内容表示。
- `StudentView`：Microsoft Formsの点数報告、Google Formsのテスト振り返りをモーダル表示する。
- `openSukimaKun`：`issueToken`取得後、ユーザーIDとトークンを付けて別アプリを開く。

## 9. 講師・管理者向け機能

- `NotificationManager`：校舎別対応キュー、対応開始、対応完了。
- `KoToreProgressTracker`：校舎・学年・教科・教材別個トレ進捗。
- `SchoolProgressManager`：校舎・学年・教科別学校進度。
- `AppUsageTracker`：アプリ別利用状況と生徒詳細。
- `AccountGenerator`：講師・生徒アカウント作成、対象検索、一括削除。
- `TestReviewManager`：年度・テスト・校舎・学年別振り返り確認。
- `ModelAnswerShelf`：ローカルPDF表示。
- `PasswordManager`：外部学習サービスのログイン案内表示。
- `TeacherView`：NotionとSharePointへの外部リンク。

## 10. API通信

すべてのGAS actionはAxiosのPOSTで、JSON文字列を`text/plain`として送信する。静的CSVは`fetch`のGETで取得する。共通して`VITE_API_KEY`由来の`apiKey`を付与する。Axiosタイムアウトと自動再試行は設定されていない。

| action | 呼び出し元 | 送信項目（`apiKey`以外） | 利用レスポンス | エラー・周期 |
|---|---|---|---|---|
| `login` | `App.handleLogin` | `userId,password` | `result,school,name,role,grade,isInitial` | alert/console、単発 |
| `changePassword` | `App.handleChangePassword` | `userId,newPassword` | `result` | alert、単発 |
| `saveProgress` | `StudentView.sendToGAS` | ユーザー情報、`progressData` | `result` | alert、単発 |
| `saveSchoolProgress` | 同上 | 同上 | `result` | alert、単発 |
| `getStudentKoToreProgress` | `fetchCompletedUnits` | `userId` | `completedPages` | console、画面切替時 |
| `getStudentSchoolProgress` | 同上 | `userId` | `completedPages` | console、画面切替時 |
| `sendNotification` | `sendNotification` | ユーザー情報、`status,unit` | `queueNumber` | alert、単発 |
| `getNotifications` | 生徒・講師View | `unit` | `notifications` | 5秒ポーリング |
| `startSupport` | `TeacherView.handleStart` | `unit,queueNumber` | `result` | alert、単発 |
| `deleteNotification` | `TeacherView.handleComplete` | `userId,userName,unit,queueNumber` | 利用なし | alert、単発 |
| `issueToken` | `openSukimaKun` | `userId` | `token` | alert/console、単発 |
| `createAccount` | `AccountGenerator.handleCreate` | `school,userId,userName,grade,password,role` | `result` | alert、単発 |
| `getAccountsForDelete` | `fetchAccountsForDelete` | `school,grades` | `accounts` | alert、単発 |
| `deleteAccountsBulk` | `handleDeleteSelected` | `userIds` | `result,message` | alert、単発 |
| `getAppUsageMatrix` | `AppUsageTracker.fetchUsage` | `school,grade` | `apps,students` | alert/console、単発 |
| `getKoToreProgressMatrix` | `KoToreProgressTracker` | `school,grade,subject,textName,masterUnits` | 応答全体 | alert、単発 |
| `getSchoolProgressMatrix` | `SchoolProgressManager` | `school,grade,subject,masterUnits` | 応答全体 | alert、単発 |
| `getTestReviewMatrix` | `TestReviewManager` | `school,grades,testName,year` | `matrix` | alert、単発 |
| `getStudentTestReviewOptions` | `PastReviewView`等 | `userId` | `years,tests` | console、単発 |
| `getStudentSpecificReview` | `PastReviewView`等 | `userId,year,testName` | `reviewData` | alert、単発 |

## 11. データ構造

- ユーザー情報：`userId`、`userName/name`、`password/newPassword`、`school`、`grade`、`role`、`isInitial`、`unit`。
- 学校・個トレ進捗：`progressData[]`の要素は`subject`、`text`、`units`。完了取得は`completedPages[]`。
- 対応依頼：`userId`、`userName/name`、`grade`、`school`、`status`、`unit`、`queueNumber`、`time`。
- テスト・振り返り：`year`、`testName`、`details.good/bad/next`、5教科の`subjects.*.good/bad/next`。
- スキマ君連携：送信`userId`、応答`token`。
- CSV：`schools.csv`は`校舎名,ユニット`、`units.csv`は`学年,科目,テキスト名,章,単元,ページ`、`school_units.csv`はこれに`節`を含む。

Googleスプレッドシートの実カラム、型、制約、追記・更新方式は未確認。

## 12. 外部サービス連携

- GAS：`VITE_GAS_URL`へAPI通信。内部処理は未確認。
- Googleスプレッドシート：業務仕様上の保存先。フロントコードから直接接続する処理はない。
- スキマ君：`issueToken`応答をURLクエリに付けて起動。
- Microsoft Forms：点数等の入力フォームを表示。
- Google Forms：テスト振り返りフォームを表示。
- Notion、SharePoint：管理者向け外部リンク。
- 教材PDF：`public/pdfs`をiframeまたは別タブで表示。
- その他学習サービス：`PasswordManager`が案内情報を表示。

## 13. 環境変数

| 変数名 | 用途 |
|---|---|
| `VITE_GAS_URL` | GAS API接続先 |
| `VITE_API_KEY` | GAS要求に付与する共通キー |

`.env.local`は存在するが`.gitignore`の`*.local`によりGit追跡外。値は本書に記載しない。

## 14. ハードコード

外部URL、フォームID、フォーム項目ID、学年・教科一覧、15分の無操作時間、5秒のポーリング間隔、アカウント初期パスワード生成規則、アプリバージョンがコードに直接記載されている。`src/constants/data.js`には認証情報に該当する固定文字列が存在するため、値は記載しない。

## 15. 未使用・重複実装

- 未参照：`src/SchoolProgress.jsx`、`src/SukimaKun.jsx`、`src/components/NoticeManager.jsx`。
- `PastReviewModal`はimportされるが描画されない。
- `papaparse`は依存にあるが使用されない。
- `StudentView`に未使用stateが複数ある。
- `StudentView`の進捗取得effectが同条件で2回存在する（`77-81`、`135-139`）。
- `schools.csv`読込が`App`、`Login`、`TeacherView`に重複する。
- `PastReviewView`と`PastReviewModal`が類似する。
- API POST処理が各コンポーネントに重複する。

## 16. テスト状況

- テスト環境・テストファイル・CI設定なし。
- 2026-08-05に外部通信を伴わない`npm run lint`を実施し、46エラー・5警告を確認した。
- Git状態、import参照、API呼出、環境変数名、静的CSVヘッダーを読み取り確認した。
- ビルド、アプリ起動、本番API、GAS、スプレッドシート、Vercel、外部サービスへの接続は実施していない。

## 17. 未確認事項

- ローカルGASコードの本番デプロイ後の挙動、既存action全体の認証・権限・データ更新・エラー処理。
- Googleスプレッドシートの構造、データ、共有範囲。
- スキマ君側の認証、トークン期限・失効・利用ログ・小テスト結果。
- Vercelプロジェクト、環境変数、デプロイ設定、本番・検証環境。
- 講師・校舎責任者の担当範囲をAPI側で強制する仕組み。
- 同日重複登録、授業終了記録、通知表成績、テスト目標点の保存処理。

## 18. Issue-001 スキマ君利用コンテンツ制御

- GASに、初回セットアップ専用の21件の初期コンテンツ定義が1か所ある。通常のAPI応答・権限判定には使用しない。
- 「スキマ君コンテンツ」は`contentId`、`displayName`、`category`、`schoolType`、`subject`、`enabled`、`sortOrder`の7列を持ち、実行時の唯一のコンテンツ情報源である。
- 共通読取処理は空の`contentId`、重複`contentId`、数値化できない`sortOrder`をエラーとし、`enabled`をboolean化して`sortOrder`とシート行順で安定ソートする。
- 手動実行用の`setupSukimakunPermissionSheets`が、「スキマ君コンテンツ」「スキマ君利用権限」「管理セッション」の3シートを初期化し、初期定義にだけ存在するcontentIdを追加する。旧4列コンテンツシートは既存の有効状態と表示順を新しい列へ移して7列化する。自動実行はされない。
- 手動移行用の`initializeExistingStudentSukimakunPermissions`が、既存studentへ有効な全コンテンツを初期許可する。
- ユーザーマスター上の現在roleがadminの場合だけ、`login`成功応答に15分有効の`sessionToken`と`sessionExpiresAt`を追加し、管理action利用時に期限を延長する。admin以外は管理セッションシートへ依存しない。
- `getSukimakunPermissionMatrix`と`updateSukimakunPermissions`は、GAS側で現在のroleがadminであることを再確認する。
- 権限未設定の既存生徒は移行互換として全有効コンテンツ許可を返し、`permissionsInitialized`で未設定を識別する。
- `validateToken`はstudentに`allowedContentIds`と`permissionsInitialized`を追加して返す。既存の成功項目とトークン失効処理は維持する。
- 新規student作成時は全有効コンテンツを初期許可し、権限初期化に失敗した場合は作成したユーザー行を削除してエラーを返す。
- Reactは管理セッションをメモリstateだけに保持し、logout時にGASへ失効要求を送る。
- admin専用の「スキマ君利用設定」画面で、校舎・学年別の生徒取得と1名ずつの権限更新ができる。チェックボックスはAPIがマスターから返す`contents`を使って動的生成する。
- スキマ君本体側の権限強制は本リポジトリの実装対象外であり、未実装・未確認である。
