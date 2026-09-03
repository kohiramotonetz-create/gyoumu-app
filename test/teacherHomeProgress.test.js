import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildTeacherHomeProgressDonut,
  formatTeacherHomeProgressDifference,
  formatTeacherHomeProgressUnit,
  paginateTeacherHomeProgressItems,
} from '../src/utils/teacherHomeProgress.js';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('ホーム進捗ドーナツは実割合から3状態のstopを構築する', () => {
  assert.equal(buildTeacherHomeProgressDonut({ good: 61, warning: 26, behind: 13 }), 'conic-gradient(#26ad72 0 61%, #ffd000 61% 87%, #f23838 87% 100%)');
  assert.equal(buildTeacherHomeProgressDonut({ good: 0, warning: 0, behind: 0 }), 'conic-gradient(#26ad72 0 0%, #ffd000 0% 0%, #f23838 0% 100%)');
});

test('状態一覧paginationは20・50・100件を許可しpageを補正する', () => {
  const items = Array.from({ length: 57 }, (_, index) => ({ id: index + 1 }));
  assert.deepEqual(paginateTeacherHomeProgressItems(items, 2, 20).items.map(item => item.id), Array.from({ length: 20 }, (_, index) => index + 21));
  assert.equal(paginateTeacherHomeProgressItems(items, 9, 20).page, 3);
  assert.equal(paginateTeacherHomeProgressItems(items, 1, 50).items.length, 50);
  assert.equal(paginateTeacherHomeProgressItems(items, 1, 100).items.length, 57);
  assert.equal(paginateTeacherHomeProgressItems([], 1, 20).start, 0);
});

test('状態一覧は符号付き差と現在単元を講師向けに表示する', () => {
  assert.equal(formatTeacherHomeProgressDifference(2), '+2単元');
  assert.equal(formatTeacherHomeProgressDifference(0), '0単元');
  assert.equal(formatTeacherHomeProgressDifference(-3), '-3単元');
  assert.equal(formatTeacherHomeProgressUnit({ textName: '教材', chapter: '第1章', section: '第1節', unitName: '式', page: '12' }), '教材 / 第1章 / 第1節 / 式 / p.12');
});

test('summary取得はTeacherViewが所有しHomeDashboard mountから分離する', () => {
  const teacher = read('../src/TeacherView.jsx');
  const home = read('../src/components/HomeDashboard.jsx');
  assert.equal((teacher.match(/action: 'getTeacherHomeProgressSummary'/g) || []).length, 1);
  assert.match(teacher, /apiKey: API_KEY, sessionToken/);
  assert.doesNotMatch(teacher, /action: 'getTeacherHomeProgressSummary'[\s\S]{0,120}(?:schools|assignedSchools|role)\s*:/);
  assert.doesNotMatch(home, /getTeacherHomeProgressSummary|axios|useEffect/);
  assert.match(teacher, /AUTHORIZATION_ERROR/);
  assert.match(home, /進捗状況を取得できませんでした/);
  assert.match(home, /対象となる1対1進捗がありません/);
  assert.match(home, /比較可能な進捗がありません/);
});

test('TeacherViewは初回1回取得・session cache・手動更新を管理する', () => {
  const teacher = read('../src/TeacherView.jsx');
  const home = read('../src/components/HomeDashboard.jsx');
  assert.match(teacher, /homeProgressState[\s\S]*loaded: false[\s\S]*refreshing: false[\s\S]*updatedAt: null/);
  assert.match(teacher, /homeProgressRequestRef\.current/);
  assert.match(teacher, /if \(homeProgressRequestRef\.current\) return/);
  assert.match(teacher, /!homeProgressState\.loaded && !homeProgressState\.loading && !homeProgressState\.error/);
  assert.match(teacher, /loading: !current\.data, refreshing: Boolean\(current\.data\)/);
  assert.match(teacher, /loaded: Boolean\(current\.data\)[\s\S]*error: '進捗状況を取得できませんでした'/);
  assert.match(teacher, /const updatedAt = new Date\(\)/);
  assert.match(teacher, /homeProgressOwnerRef\.current !== requestOwner/);
  assert.match(teacher, /setHomeProgressData\(null\)/);
  assert.match(home, /onRefreshProgress/);
  assert.match(home, /更新中…/);
  assert.match(home, /disabled=\{progressState\.loading \|\| progressState\.refreshing\}/);
  assert.match(home, /表示中のデータを維持しています/);
  assert.doesNotMatch(`${teacher}\n${home}`, /localStorage|sessionStorage|indexedDB/i);
});

test('ホームは3状態button・動的ドーナツ・遅れ対応・未設定disabledを持つ', () => {
  const source = read('../src/components/HomeDashboard.jsx');
  assert.match(source, /buildTeacherHomeProgressDonut/);
  assert.match(source, /Object\.entries\(TEACHER_HOME_PROGRESS_STATUSES\).*<button/s);
  assert.match(source, /進捗遅れ生徒対応/);
  assert.match(source, /onOpenProgressStatus\('behind'/);
  assert.match(source, /home-action-row--disabled[\s\S]*disabled/);
  assert.match(source, /複数科目を受講している生徒は、科目ごとに集計/);
  assert.equal((source.match(/<SummaryCard/g) || []).length, 1);
});

test('TeacherViewはsidebarを増やさず共通状態一覧とプロフィール往復を接続する', () => {
  const teacher = read('../src/TeacherView.jsx');
  const list = read('../src/components/TeacherHomeProgressStudentList.jsx');
  assert.match(teacher, /home-progress-list/);
  assert.match(teacher, /<TeacherHomeProgressStudentList/);
  assert.match(teacher, /data=\{homeProgressData\}/);
  assert.match(teacher, /setHomeProgressData\(response\.data\)/);
  assert.doesNotMatch(teacher, /label:\s*'進捗.*一覧'/);
  assert.match(list, /statusFilter/);
  assert.match(list, /source="home-progress-list"/);
  assert.match(list, /講師ホームへ戻る/);
  assert.match(list, /\[20, 50, 100\]/);
  assert.match(list, /社会3分野の判定根拠/);
});

test('ホームCSSは固定gradientを廃止し操作可能状態とmobile表示を維持する', () => {
  const css = read('../src/TeacherView.css');
  const listCss = read('../src/components/TeacherHomeProgressStudentList.css');
  assert.doesNotMatch(css, /\.home-donut[^}]*background:conic-gradient/);
  assert.match(css, /\.home-legend>button/);
  assert.match(css, /\.home-action-row--disabled/);
  assert.match(listCss, /overflow-x:auto/);
  assert.match(listCss, /@media \(max-width:767px\)/);
});

test('teacherホームだけ今日の確認順に再構成し担当summaryを遅れ・要注意各5件へ再利用する', () => {
  const teacher = read('../src/TeacherView.jsx');
  const home = read('../src/components/HomeDashboard.jsx');
  assert.match(home, /if \(role === 'teacher'\)/);
  assert.match(home, /TeacherAnnouncements[\s\S]*TeacherAttentionStudents[\s\S]*ProgressSection/);
  assert.match(home, /filter\(item => item\.status === status\)/);
  assert.match(home, /previewItems = items\.slice\(0, 5\)/);
  assert.match(home, /status="behind"/);
  assert.match(home, /status="warning"/);
  assert.match(home, /対応が必要な生徒/);
  assert.match(home, /StudentProfileLink/);
  assert.match(home, /onOpenProgressStatus\(status, progressState\.data\)/);
  assert.match(home, /Object\.keys\(variants\)/);
  assert.equal((teacher.match(/action: 'getTeacherHomeProgressSummary'/g) || []).length, 1);
  assert.doesNotMatch(home, /getOneToOneProgressDetail/);
});

test('teacherホーム専用Markdownは既存noticeと分離し公開APIを1回だけ利用する', () => {
  const teacher = read('../src/TeacherView.jsx');
  const home = read('../src/components/HomeDashboard.jsx');
  assert.equal((teacher.match(/action: 'getPublishedKotoreContents'/g) || []).length, 1);
  assert.match(teacher, /role !== 'teacher'/);
  assert.match(teacher, /contentTypes: \['notice', 'home-notice'\]/);
  assert.match(teacher, /homeNotice: contents\.homeNotice/);
  assert.match(home, /<MarkdownRenderer markdown=\{markdown\}/);
  assert.match(home, /現在お知らせはありません/);
  assert.match(home, /もっと見る/);
  assert.match(home, /閉じる/);
  assert.doesNotMatch(home, /notices\.slice\(0, 3\)/);
});
