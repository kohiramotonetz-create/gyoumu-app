// src/constants/data.js

// 個トレ2（模範解答）データ
export const modelAnswerBooks = [
  { id: 1, grade: '中1', title: '中1 英語 iワークプラス', cover: '/covers/1_eng_plus.png', pdf: '/pdfs/1_eng_plus.pdf' },
  { id: 3, grade: '中1', title: '中1 数学 iワークプラス', cover: '/covers/1_math_plus.png', pdf: '/pdfs/1_math_plus.pdf' },
  { id: 4, grade: '中1', title: '中1 数学 iワークドリル', cover: '/covers/1_math_drill.png', pdf: '/pdfs/1_math_drill.pdf' },
  { id: 5, grade: '中1', title: '中1 国語 iワークプラス', cover: '/covers/1_jp_plus.png', pdf: '/pdfs/1_jp_plus.pdf' },
  { id: 6, grade: '中1', title: '中1 国語 iワークドリル', cover: '/covers/1_jp_drill.png', pdf: '/pdfs/1_jp_drill.pdf' },
  { id: 7, grade: '中1', title: '中1 理科 iワークプラス', cover: '/covers/1_sci_plus.png', pdf: '/pdfs/1_sci_plus.pdf' },
  { id: 8, grade: '中1', title: '中1 理科 iワークノート', cover: '/covers/1_sci_note.png', pdf: '/pdfs/1_sci_note.pdf' },
  { id: 9, grade: '中1', title: '中1 社会 地理 iワークプラス', cover: '/covers/1_soc_geo_plus.png', pdf: '/pdfs/1_soc_geo_plus.pdf' },
  { id: 10, grade: '中1', title: '中1 社会 地理 iワークノート', cover: '/covers/1_soc_geo_note.png', pdf: '/pdfs/1_soc_geo_note.pdf' },
  { id: 11, grade: '中2', title: '中2 英語 iワークプラス', cover: '/covers/2_eng_plus.png', pdf: '/pdfs/2_eng_plus.pdf' },
  { id: 13, grade: '中2', title: '中2 数学 iワークプラス', cover: '/covers/2_math_plus.png', pdf: '/pdfs/2_math_plus.pdf' },
  { id: 14, grade: '中2', title: '中2 数学 iワークドリル', cover: '/covers/2_math_drill.png', pdf: '/pdfs/2_math_drill.pdf' },
  { id: 15, grade: '中2', title: '中2 国語 iワークプラス', cover: '/covers/2_jp_plus.png', pdf: '/pdfs/2_jp_plus.pdf' },
  { id: 16, grade: '中2', title: '中2 国語 iワークドリル', cover: '/covers/2_jp_drill.png', pdf: '/pdfs/2_jp_drill.pdf' },
  { id: 17, grade: '中2', title: '中2 理科 iワークプラス', cover: '/covers/2_sci_plus.png', pdf: '/pdfs/2_sci_plus.pdf' },
  { id: 18, grade: '中2', title: '中2 理科 iワークノート', cover: '/covers/2_sci_note.png', pdf: '/pdfs/2_sci_note.pdf' },
  { id: 19, grade: '中2', title: '中2 社会 歴史 iワークプラス', cover: '/covers/2_soc_his_plus.png', pdf: '/pdfs/2_soc_his_plus.pdf' },
  { id: 20, grade: '中2', title: '中2 社会 歴史 iワークノート', cover: '/covers/2_soc_his_note.png', pdf: '/pdfs/2_soc_his_note.pdf' },
  { id: 21, grade: '中3', title: '中3 英語 iワークプラス', cover: '/covers/3_eng_plus.png', pdf: '/pdfs/3_eng_plus.pdf' },
  { id: 23, grade: '中3', title: '中3 数学 iワークプラス', cover: '/covers/3_math_plus.png', pdf: '/pdfs/3_math_plus.pdf' },
  { id: 24, grade: '中3', title: '中3 数学 iワークドリル', cover: '/covers/3_math_drill.png', pdf: '/pdfs/3_math_drill.pdf' },
  { id: 25, grade: '中3', title: '中3 国語 iワークプラス', cover: '/covers/3_jp_plus.png', pdf: '/pdfs/3_jp_plus.pdf' },
  { id: 26, grade: '中3', title: '中3 国語 iワークドリル', cover: '/covers/3_jp_drill.png', pdf: '/pdfs/3_jp_drill.pdf' },
  { id: 27, grade: '中3', title: '中3 理科 iワークプラス', cover: '/covers/3_sci_plus.png', pdf: '/pdfs/3_sci_plus.pdf' },
  { id: 28, grade: '中3', title: '中3 理科 iワークノート', cover: '/covers/3_sci_note.png', pdf: '/pdfs/3_sci_note.pdf' },
  { id: 29, grade: '中3', title: '中3 社会 公民 iワークプラス', cover: '/covers/3_soc_plus.png', pdf: '/pdfs/3_soc_plus.pdf' },
  { id: 30, grade: '中3', title: '中3 社会 公民 iワークノート', cover: '/covers/3_soc_note.png', pdf: '/pdfs/3_soc_note.pdf' },
];

// アカウント管理データ
export const externalServiceAccounts = [
  { service: "atama＋ ポータル", url: "https://cloud.atama.plus/portal/login", userId: "netz校舎番号４桁_admin", pass: "1TO1netz", note: "管理者用" },
  { service: "atama＋ コーチ", url: "https://cloud.atama.plus/coach/login", userId: "netzt講師番号６桁", pass: "講師番号２回", note: "講師個人用" },
  { service: "aim@for school", url: "https://aim-at.com/school/login", userId: "netz教室番号", pass: "1TO1netz" },
  { service: "駿台Diverse (コーチ)", url: "https://coach.diverse.sundai.ac.jp/", userId: "受講校舎番号４ケタ@edu-netz.com", pass: "coach00!" },
  { service: "Lepton (教室用)", url: "https://www.lepton.co.jp/member/login/", userId: "T00007134", pass: "netznetz" },
  { school: "情報AIドリル(栗林)", userId: "KKS900148", pass: "u1UhZAHv" },
  { school: "情報AIドリル(木太南)", userId: "KKS900150", pass: "3MNq6h4F" },
  { school: "情報AIドリル(水田)", userId: "KKS900149", pass: "QZhUxf6M" },
  { school: "情報AIドリル(番町)", userId: "KKS900147", pass: "p9HWdTHb" },
  { school: "四谷大塚(栗林)", id: "T88790037" },
  { school: "四谷大塚(木太南)", id: "T88790093" },
  { school: "四谷大塚(水田)", id: "T88790063" },
  { school: "四谷大塚(番町)", id: "T88790131" }
];

export const studentAccountRules = [
  { service: "atama＋", url: "https://cloud.atama.plus/student/login", creator: "各教室", userId: "netzs生徒番号6ケタ", pass: "誕生月日4桁", condition: "サービス登録" },
  { service: "aim＠", url: "https://aim-at.com/student/login", creator: "自動（毎日）", userId: "netzs生徒番号6ケタ", pass: "netz生徒番号6ケタ", condition: "サービス登録" },
  { service: "駿台Diverse", url: "https://student.diverse.sundai.ac.jp/login", creator: "自動（毎日）", userId: "生徒番号@edu-netz.com", pass: "-", condition: "サービス登録" },
  { service: "PROC (中プロ)", url: "https://proc-code.com/login", creator: "教務ユニット", userId: "生徒番号6ケタ@netz-proc", pass: "1TO1netz", condition: "サービス登録" }
];