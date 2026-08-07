/**
 * 業務アプリ・生徒用アプリ 統合バックエンド (最終確定バグ修正版)
 */
function authTest() {
  UrlFetchApp.fetch("https://www.google.com");
  console.log("承認完了！");
}

function getRequiredScriptProperty(propertyName) {
  const value = PropertiesService.getScriptProperties().getProperty(propertyName);
  if (!value || value.trim() === "") {
    throw new Error(`Required Script Property is not configured: ${propertyName}`);
  }
  return value;
}

function openSpreadsheetByProperty(propertyName) {
  const spreadsheetId = getRequiredScriptProperty(propertyName);
  return SpreadsheetApp.openById(spreadsheetId);
}

const MANAGEMENT_SESSION_DURATION_MS = 15 * 60 * 1000;
const SUKIMAKUN_CONTENT_SHEET_NAME = "スキマ君コンテンツ";
const SUKIMAKUN_PERMISSION_SHEET_NAME = "スキマ君利用権限";
const MANAGEMENT_SESSION_SHEET_NAME = "管理セッション";
const SUKIMAKUN_CONTENT_HEADERS = ["contentId", "displayName", "category", "schoolType", "subject", "enabled", "sortOrder"];
const SUKIMAKUN_PERMISSION_HEADERS = ["userId", "contentId", "enabled", "updatedAt", "updatedBy"];
const MANAGEMENT_SESSION_HEADERS = ["sessionToken", "userId", "role", "expiresAt", "createdAt"];
const ACCOUNT_MASTER_SHEET_SPECS = [
  { name: "アカウントマスター", headers: ["userId", "password", "isInitial", "passwordUpdatedAt", "role", "enabled", "sukimakunToken", "sukimakunTokenExpire", "createdAt", "updatedAt", "deletedAt"], textColumns: [1, 2, 7], dateColumns: [4, 8, 9, 10, 11] },
  { name: "生徒マスター", headers: ["userId", "school", "name", "nameKana", "grade", "createdAt", "updatedAt"], textColumns: [1], dateColumns: [6, 7] },
  { name: "講師マスター", headers: ["userId", "name", "nameKana", "createdAt", "updatedAt"], textColumns: [1], dateColumns: [4, 5] },
  { name: "講師担当校舎", headers: ["userId", "school", "isPrimary", "enabled", "createdAt", "updatedAt", "updatedBy"], textColumns: [1, 7], dateColumns: [5, 6] }
];
const ACCOUNT_MIGRATION_ROLES = ["admin", "head-teacher", "teacher", "student"];
const LEGACY_ALLOWED_ADMIN_USER_IDS = ["admin"];
const ACCOUNT_MIGRATION_METADATA_PROPERTY = "ACCOUNT_MIGRATION_METADATA";
const ACCOUNT_MIGRATION_SOURCE_SHEET_NAME = "シート1";
const ACCOUNT_MIGRATION_SCHOOLS = [
  "みらいミッテ栗林", "早稲田", "上板橋駅前", "要町", "豊玉", "和光", "志木駅前", "鶴瀬", "薬院", "西新修猷館前",
  "大橋駅前", "長住", "六本松", "原", "橋本", "前原駅前", "西鉄久留米", "小郡", "都府楼前", "井尻",
  "香椎", "和白", "古賀駅前", "東郷", "赤間", "西小倉駅前", "荒生田", "戸畑", "八幡", "折尾駅前", "高須", "下曽根", "守恒駅前",
  "門司駅前", "安岡", "長府駅前", "小倉駅", "新宮中央", "箱崎", "志免南里", "佐賀駅前", "本庄大崎", "鳥栖",
  "長崎駅前", "城栄", "南長崎", "住吉", "葉山", "水前寺", "健軍", "武蔵ヶ丘", "長嶺",
  "大分駅前本高等部", "春日", "南大分", "光吉", "戸次", "明野", "宮崎駅前", "生目大塚", "花ヶ島", "赤江",
  "鹿児島中央", "紫原", "宇宿", "東谷山", "慈眼寺", "白島", "緑井", "上安", "中広",
  "広島駅前", "中筋", "古江", "皆実町", "安芸府中", "岡山駅前", "HS岡山駅前", "岡北", "伊島", "津高",
  "国富", "西古松", "高島駅南口", "栗林", "木太南", "水田", "番町"
];

const DEFAULT_SUKIMAKUN_CONTENTS = [
  ["paper_english_test", "英単語テスト作成（紙）", "general", "all", "english", true, 1],
  ["junior_english_quiz", "1問ずつテスト（自習）", "general", "all", "english", true, 2],
  ["kakitan", "書き単", "general", "all", "english", true, 3],
  ["irregular_verbs", "英単語（不規則変化）", "general", "all", "english", true, 4],
  ["junior_kobun", "古文単語（自習）", "general", "all", "japanese", true, 5],
  ["target_1900", "ターゲット1900", "general", "all", "english", true, 6],
  ["target_1200", "ターゲット1200", "general", "all", "english", true, 7],
  ["sokudoku_english", "速読英単語", "general", "all", "english", true, 8],
  ["dragon_english", "ドラゴンイングリッシュ", "general", "all", "english", true, 9],
  ["yumetan", "ユメタン", "general", "all", "english", true, 10],
  ["kikutan_pre2", "キクタン準2級", "general", "all", "english", true, 11],
  ["kakushin_kobun_351", "核心古文単語351", "general", "all", "japanese", true, 12],
  ["kobun_315", "古文単語315", "general", "all", "japanese", true, 13],
  ["iroha_nihoheto", "いろはにほへと", "general", "all", "japanese", true, 14],
  ["kobun_325", "古文325", "general", "all", "japanese", true, 15],
  ["formula_600", "FORMULA600", "general", "all", "english", true, 16],
  ["kougei_art", "高松工芸美術科", "general", "all", "other", true, 17],
  ["miki_bunri", "三木高校文理コース", "general", "all", "other", true, 18],
  ["takamatsu_higashi_humanities", "高松東高校2年人文コース", "general", "all", "other", true, 19],
  ["kanji_test", "定期テスト 漢字対策", "general", "all", "japanese", true, 20],
  ["chemistry_formulas", "化学式・イオン式", "general", "all", "science", true, 21]
];

function normalizeUserId(value) {
  const normalized = String(value || "").replace(/^'/, "").trim();
  if (/^\d{1,6}$/.test(normalized)) return normalized.padStart(6, "0");
  return normalized;
}

function formatUserIdForSheet(value) {
  const normalized = normalizeUserId(value);
  return normalized ? "'" + normalized : "";
}

function toSafeSheetText(value) {
  const text = String(value || "");
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function isEnabledValue(value) {
  return value === true || String(value).trim().toUpperCase() === "TRUE";
}

function getLegacyAccountSheet_() {
  // eslint-disable-next-line no-undef
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName("ログイン認証") || spreadsheet.getSheets()[0];
}

function validateLegacyMigrationUserId_(rawValue, role) {
  const userId = String(rawValue == null ? "" : rawValue).trim().replace(/^'/, "");
  const isNumeric = /^\d+$/.test(userId);
  const isAllowedAdminId = LEGACY_ALLOWED_ADMIN_USER_IDS.includes(userId) && role === "admin";
  return {
    userId,
    isNumeric,
    isAllowedAdminId,
    isValid: /^\d{6}$/.test(userId) || isAllowedAdminId,
    isInvalidNonNumeric: Boolean(userId) && !isNumeric && !isAllowedAdminId
  };
}

function diagnoseLegacyAccountData() {
  const sheet = getLegacyAccountSheet_();
  const rows = sheet.getDataRange().getValues();
  const dataRows = rows.slice(1).map((row, index) => ({ row, sheetRow: index + 2 }))
    .filter(item => item.row.slice(0, 13).some(value => String(value == null ? "" : value).trim() !== ""));
  const roleCounts = { admin: 0, "head-teacher": 0, teacher: 0, student: 0 };
  const counts = {
    unknownRole: 0, emptyUserId: 0, duplicateUserId: 0, normalizedDuplicateUserId: 0,
    shorterThanSixDigitId: 0, longerThanSixDigitId: 0, nonNumericUserId: 0, leadingZeroUserId: 0,
    allowedLegacyAdminId: 0, invalidNonNumericUserId: 0,
    normalizedUserIdChanged: 0, emptyName: 0, emptySchool: 0, studentEmptyGrade: 0, staffGradePresent: 0,
    columnCValuePresent: 0, columnDValuePresent: 0, columnGValuePresent: 0, columnHValuePresent: 0,
    organizationSchoolMismatch: 0
  };
  const exactIdCounts = Object.create(null);
  const normalizedIdCounts = Object.create(null);
  const validSchools = new Set(ACCOUNT_MIGRATION_SCHOOLS);
  const issueSamples = [];
  const maxIssueSamples = 100;
  const addIssueSample = (sheetRow, userId, type) => {
    if (issueSamples.length >= maxIssueSamples) return;
    issueSamples.push({ sheetRow, userId: userId || "", type });
  };

  dataRows.forEach(item => {
    const row = item.row;
    const rawUserId = String(row[1] == null ? "" : row[1]).trim();
    const comparableRawUserId = rawUserId.replace(/^'/, "");
    const normalizedUserId = normalizeUserId(row[1]);
    const role = String(row[10] || "").trim();
    const school = String(row[0] || "").trim();
    const name = String(row[4] || "").trim();
    const grade = String(row[5] || "").trim();
    const userIdValidation = validateLegacyMigrationUserId_(row[1], role);

    if (ACCOUNT_MIGRATION_ROLES.includes(role)) roleCounts[role]++;
    else {
      counts.unknownRole++;
      addIssueSample(item.sheetRow, normalizedUserId, "UNKNOWN_ROLE");
    }
    if (!comparableRawUserId) {
      counts.emptyUserId++;
      addIssueSample(item.sheetRow, "", "EMPTY_USER_ID");
    } else {
      exactIdCounts[rawUserId] = (exactIdCounts[rawUserId] || 0) + 1;
      normalizedIdCounts[normalizedUserId] = (normalizedIdCounts[normalizedUserId] || 0) + 1;
      if (!/^\d+$/.test(comparableRawUserId)) counts.nonNumericUserId++;
      else {
        if (comparableRawUserId.length < 6) counts.shorterThanSixDigitId++;
        if (comparableRawUserId.length > 6) counts.longerThanSixDigitId++;
        if (/^0/.test(comparableRawUserId)) counts.leadingZeroUserId++;
      }
      if (userIdValidation.isAllowedAdminId) counts.allowedLegacyAdminId++;
      if (userIdValidation.isInvalidNonNumeric) {
        counts.invalidNonNumericUserId++;
        addIssueSample(item.sheetRow, normalizedUserId, "INVALID_NON_NUMERIC_USER_ID");
      }
      if (comparableRawUserId !== normalizedUserId) {
        counts.normalizedUserIdChanged++;
        addIssueSample(item.sheetRow, normalizedUserId, "USER_ID_NORMALIZED_VALUE_DIFFERS");
      }
    }
    if (!name) counts.emptyName++;
    if (!school) counts.emptySchool++;
    if (role === "student" && !grade) counts.studentEmptyGrade++;
    if (role !== "student" && ACCOUNT_MIGRATION_ROLES.includes(role) && grade) counts.staffGradePresent++;
    if (String(row[2] == null ? "" : row[2]).trim()) counts.columnCValuePresent++;
    if (String(row[3] == null ? "" : row[3]).trim()) counts.columnDValuePresent++;
    if (String(row[6] == null ? "" : row[6]).trim()) counts.columnGValuePresent++;
    if (String(row[7] == null ? "" : row[7]).trim()) counts.columnHValuePresent++;
    if (school && !validSchools.has(school)) {
      counts.organizationSchoolMismatch++;
      addIssueSample(item.sheetRow, normalizedUserId, "ORGANIZATION_SCHOOL_MISMATCH");
    }
  });

  Object.keys(exactIdCounts).forEach(userId => {
    if (exactIdCounts[userId] > 1) counts.duplicateUserId += exactIdCounts[userId] - 1;
  });
  Object.keys(normalizedIdCounts).forEach(userId => {
    if (normalizedIdCounts[userId] > 1) counts.normalizedDuplicateUserId += normalizedIdCounts[userId] - 1;
  });

  const blockingErrors = [];
  if (counts.emptyUserId) blockingErrors.push({ type: "EMPTY_USER_ID", count: counts.emptyUserId });
  if (counts.unknownRole) blockingErrors.push({ type: "UNKNOWN_ROLE", count: counts.unknownRole });
  if (counts.duplicateUserId) blockingErrors.push({ type: "DUPLICATE_USER_ID", count: counts.duplicateUserId });
  if (counts.normalizedDuplicateUserId) blockingErrors.push({ type: "NORMALIZED_DUPLICATE_USER_ID", count: counts.normalizedDuplicateUserId });
  if (counts.invalidNonNumericUserId) blockingErrors.push({ type: "INVALID_NON_NUMERIC_USER_ID", count: counts.invalidNonNumericUserId });
  if (counts.shorterThanSixDigitId) blockingErrors.push({ type: "USER_ID_SHORTER_THAN_SIX_DIGITS", count: counts.shorterThanSixDigitId });
  if (counts.longerThanSixDigitId) blockingErrors.push({ type: "USER_ID_LONGER_THAN_SIX_DIGITS", count: counts.longerThanSixDigitId });
  const warnings = [];
  if (counts.normalizedUserIdChanged) warnings.push({ type: "USER_ID_NORMALIZED_VALUE_DIFFERS", count: counts.normalizedUserIdChanged });
  ["emptyName", "emptySchool", "studentEmptyGrade", "staffGradePresent", "columnCValuePresent", "columnDValuePresent", "columnGValuePresent", "columnHValuePresent", "organizationSchoolMismatch"]
    .forEach(key => { if (counts[key]) warnings.push({ type: key, count: counts[key] }); });

  return {
    targetSheetName: sheet.getName(),
    totalRowCount: rows.length,
    dataRowCount: dataRows.length,
    roleCounts,
    counts,
    allowedLegacyAdminIdCount: counts.allowedLegacyAdminId,
    invalidNonNumericUserIdCount: counts.invalidNonNumericUserId,
    allowedLegacyAdminIdsUsed: LEGACY_ALLOWED_ADMIN_USER_IDS.filter(userId =>
      dataRows.some(item => validateLegacyMigrationUserId_(item.row[1], String(item.row[10] || "").trim()).isAllowedAdminId &&
        String(item.row[1] == null ? "" : item.row[1]).trim().replace(/^'/, "") === userId)
    ),
    blockingErrorCount: blockingErrors.reduce((total, error) => total + error.count, 0),
    warningCount: warnings.reduce((total, warning) => total + warning.count, 0),
    blockingErrors,
    warnings,
    issueSamples,
    issueSamplesTruncated: issueSamples.length >= maxIssueSamples
  };
}

// eslint-disable-next-line no-unused-vars
function setupAccountMasterSheets() {
  // eslint-disable-next-line no-undef
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const existingSheets = {};
  ACCOUNT_MASTER_SHEET_SPECS.forEach(spec => {
    const sheet = spreadsheet.getSheetByName(spec.name);
    if (!sheet) return;
    if (sheet.getLastRow() < 1) throw new Error(`Header mismatch: ${spec.name}`);
    if (sheet.getLastColumn() !== spec.headers.length) throw new Error(`Header mismatch: ${spec.name}`);
    const actualHeaders = sheet.getRange(1, 1, 1, spec.headers.length).getValues()[0].map(String);
    if (actualHeaders.join("\t") !== spec.headers.join("\t")) throw new Error(`Header mismatch: ${spec.name}`);
    existingSheets[spec.name] = sheet;
  });

  const result = { createdSheets: [], existingSheets: [], warnings: [] };
  ACCOUNT_MASTER_SHEET_SPECS.forEach(spec => {
    if (existingSheets[spec.name]) {
      result.existingSheets.push(spec.name);
      return;
    }
    const sheet = spreadsheet.insertSheet(spec.name);
    sheet.getRange(1, 1, 1, spec.headers.length).setValues([spec.headers]);
    spec.textColumns.forEach(column => sheet.getRange(1, column, sheet.getMaxRows(), 1).setNumberFormat("@"));
    spec.dateColumns.forEach(column => sheet.getRange(2, column, sheet.getMaxRows() - 1, 1).setNumberFormat("yyyy/MM/dd HH:mm:ss"));
    result.createdSheets.push(spec.name);
  });
  result.createdCount = result.createdSheets.length;
  result.existingCount = result.existingSheets.length;
  result.warningCount = result.warnings.length;
  return result;
}

// eslint-disable-next-line no-unused-vars
function previewLegacyAccountMigration() {
  const diagnosis = diagnoseLegacyAccountData();
  if (diagnosis.blockingErrorCount > 0) {
    return {
      accountRows: 0, studentRows: 0, staffRows: 0, staffSchoolRows: 0,
      skippedRows: diagnosis.dataRowCount, warningCount: diagnosis.warningCount,
      blockingErrorCount: diagnosis.blockingErrorCount
    };
  }
  const accountRows = ACCOUNT_MIGRATION_ROLES.reduce((total, role) => total + diagnosis.roleCounts[role], 0);
  const studentRows = diagnosis.roleCounts.student;
  const staffRows = diagnosis.roleCounts.admin + diagnosis.roleCounts["head-teacher"] + diagnosis.roleCounts.teacher;
  const sheet = getLegacyAccountSheet_();
  const staffSchoolRows = sheet.getDataRange().getValues().slice(1).filter(row => {
    const role = String(row[10] || "").trim();
    return role !== "student" && ACCOUNT_MIGRATION_ROLES.includes(role) && String(row[0] || "").trim();
  }).length;
  return {
    accountRows,
    studentRows,
    staffRows,
    staffSchoolRows,
    skippedRows: diagnosis.dataRowCount - accountRows,
    warningCount: diagnosis.warningCount,
    blockingErrorCount: 0
  };
}

function assertAccountMigrationSheets_(requireEmpty) {
  // eslint-disable-next-line no-undef
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = Object.create(null);
  ACCOUNT_MASTER_SHEET_SPECS.forEach(spec => {
    const sheet = spreadsheet.getSheetByName(spec.name);
    if (!sheet) throw new Error(`Required migration sheet is missing: ${spec.name}`);
    if (sheet.getLastColumn() !== spec.headers.length || sheet.getLastRow() < 1) {
      throw new Error(`Migration sheet header mismatch: ${spec.name}`);
    }
    const actualHeaders = sheet.getRange(1, 1, 1, spec.headers.length).getValues()[0].map(String);
    if (actualHeaders.join("\t") !== spec.headers.join("\t")) {
      throw new Error(`Migration sheet header mismatch: ${spec.name}`);
    }
    if (requireEmpty && sheet.getLastRow() > 1) {
      throw new Error(`Migration sheet must be empty: ${spec.name}`);
    }
    sheets[spec.name] = sheet;
  });
  return sheets;
}

function normalizeLegacyMigrationBoolean_(value, fieldName) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null || String(value).trim() === "") return false;
  const text = String(value).trim().toUpperCase();
  if (text === "TRUE" || text === "1") return true;
  if (text === "FALSE" || text === "0") return false;
  throw new Error(`Invalid boolean value in ${fieldName}`);
}

function getLegacyMigrationUserId_(value, role) {
  const validation = validateLegacyMigrationUserId_(value, role);
  if (!validation.isValid) throw new Error("Invalid legacy userId detected");
  return validation.userId;
}

function createAccountMigrationId_(now) {
  // eslint-disable-next-line no-undef
  const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd'T'HHmmss");
  // eslint-disable-next-line no-undef
  return `account-migration-${timestamp}-${Utilities.getUuid().slice(0, 8)}`;
}

function getAccountMigrationDataRows_(sheet) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
}

function getAccountMigrationDigest_(rows) {
  const serializableRows = rows.map(row => row.map(value => value instanceof Date ? value.toISOString() : value));
  // eslint-disable-next-line no-undef
  const digest = Utilities.computeDigest(
    // eslint-disable-next-line no-undef
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(serializableRows),
    // eslint-disable-next-line no-undef
    Utilities.Charset.UTF_8
  );
  // eslint-disable-next-line no-undef
  return Utilities.base64EncodeWebSafe(digest);
}

function assertUniqueMigrationKeys_(rows, indexes, label) {
  const seen = new Set();
  rows.forEach(row => {
    const key = indexes.map(index => String(row[index] == null ? "" : row[index])).join("\u0000");
    if (seen.has(key)) throw new Error(`Duplicate key detected in ${label}`);
    seen.add(key);
  });
}

function buildLegacyAccountMigrationData_(legacySheet, migratedAt, migrationId) {
  const rawRows = legacySheet.getDataRange().getValues().slice(1)
    .filter(row => row.slice(0, 13).some(value => String(value == null ? "" : value).trim() !== ""));
  const accountRows = [];
  const studentRows = [];
  const staffRows = [];
  const staffSchoolRows = [];

  rawRows.forEach(row => {
    const role = String(row[10] || "").trim();
    if (!ACCOUNT_MIGRATION_ROLES.includes(role)) throw new Error("Invalid legacy role detected");
    const userId = getLegacyMigrationUserId_(row[1], role);
    const isStudent = role === "student";
    accountRows.push([
      userId,
      row[9],
      normalizeLegacyMigrationBoolean_(row[8], "isInitial"),
      isStudent ? "" : (row[7] || ""),
      role,
      true,
      row[11] || "",
      row[12] || "",
      migratedAt,
      migratedAt,
      ""
    ]);
    if (isStudent) {
      studentRows.push([userId, row[0] || "", row[4] || "", "", row[5] || "", migratedAt, migratedAt]);
      return;
    }
    staffRows.push([userId, row[4] || "", "", migratedAt, migratedAt]);
    const school = String(row[0] || "").trim();
    if (school) staffSchoolRows.push([userId, school, true, true, migratedAt, migratedAt, migrationId]);
  });

  assertUniqueMigrationKeys_(accountRows, [0], "account master");
  assertUniqueMigrationKeys_(studentRows, [0], "student master");
  assertUniqueMigrationKeys_(staffRows, [0], "staff master");
  assertUniqueMigrationKeys_(staffSchoolRows, [0, 1], "staff school master");
  if (accountRows.length !== rawRows.length) throw new Error("Account migration count mismatch");
  const studentCount = rawRows.filter(row => String(row[10] || "").trim() === "student").length;
  const staffCount = rawRows.length - studentCount;
  if (studentRows.length !== studentCount || staffRows.length !== staffCount) {
    throw new Error("Profile migration count mismatch");
  }
  const accountRoleById = Object.create(null);
  accountRows.forEach(row => { accountRoleById[row[0]] = row[4]; });
  studentRows.forEach(row => {
    if (accountRoleById[row[0]] !== "student") throw new Error("Student profile role mismatch");
    if (row[3] !== "") throw new Error("Student nameKana must be empty");
  });
  staffRows.forEach(row => {
    if (!["admin", "head-teacher", "teacher"].includes(accountRoleById[row[0]])) {
      throw new Error("Staff profile role mismatch");
    }
    if (row[2] !== "") throw new Error("Staff nameKana must be empty");
  });
  return { rawRows, accountRows, studentRows, staffRows, staffSchoolRows };
}

function getAccountMigrationMetadata_() {
  // eslint-disable-next-line no-undef
  const raw = PropertiesService.getScriptProperties().getProperty(ACCOUNT_MIGRATION_METADATA_PROPERTY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Account migration metadata is invalid");
  }
}

function setAccountMigrationMetadata_(metadata) {
  // eslint-disable-next-line no-undef
  PropertiesService.getScriptProperties().setProperty(ACCOUNT_MIGRATION_METADATA_PROPERTY, JSON.stringify(metadata));
}

function buildAccountMigrationSheetMetadata_(sheets, generatedData) {
  const rowsBySheet = {
    "アカウントマスター": generatedData.accountRows,
    "生徒マスター": generatedData.studentRows,
    "講師マスター": generatedData.staffRows,
    "講師担当校舎": generatedData.staffSchoolRows
  };
  const result = Object.create(null);
  ACCOUNT_MASTER_SHEET_SPECS.forEach(spec => {
    const rows = rowsBySheet[spec.name];
    result[spec.name] = {
      sheetId: sheets[spec.name].getSheetId(),
      rowCount: rows.length,
      digest: getAccountMigrationDigest_(rows)
    };
  });
  return result;
}

// eslint-disable-next-line no-unused-vars
function migrateLegacyAccounts() {
  // eslint-disable-next-line no-undef
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) throw new Error("Account migration is already running");
  try {
    const existingMetadata = getAccountMigrationMetadata_();
    if (existingMetadata && existingMetadata.status !== "rolledBack") {
      throw new Error("An account migration record already exists");
    }
    const diagnosis = diagnoseLegacyAccountData();
    if (diagnosis.blockingErrorCount > 0) throw new Error("Legacy account diagnosis contains blocking errors");
    if (diagnosis.targetSheetName !== ACCOUNT_MIGRATION_SOURCE_SHEET_NAME) {
      throw new Error("Unexpected legacy account source sheet");
    }
    const sheets = assertAccountMigrationSheets_(true);
    const migratedAt = new Date();
    const migrationId = createAccountMigrationId_(migratedAt);
    if (existingMetadata && existingMetadata.migrationId === migrationId) {
      throw new Error("Duplicate migrationId detected");
    }
    const legacySheet = getLegacyAccountSheet_();
    const generatedData = buildLegacyAccountMigrationData_(legacySheet, migratedAt, migrationId);
    if (generatedData.rawRows.length !== diagnosis.dataRowCount) {
      throw new Error("Legacy source row count changed after diagnosis");
    }
    ACCOUNT_MIGRATION_ROLES.forEach(role => {
      const generatedRoleCount = generatedData.rawRows.filter(row => String(row[10] || "").trim() === role).length;
      if (generatedRoleCount !== diagnosis.roleCounts[role]) throw new Error("Legacy role counts changed after diagnosis");
    });
    const sheetMetadata = buildAccountMigrationSheetMetadata_(sheets, generatedData);
    const metadata = {
      migrationId,
      status: "writing",
      migratedAt: migratedAt.toISOString(),
      sourceSheetName: legacySheet.getName(),
      sourceRowCount: generatedData.rawRows.length,
      sheets: sheetMetadata
    };
    setAccountMigrationMetadata_(metadata);

    const writePlan = [
      ["アカウントマスター", generatedData.accountRows],
      ["生徒マスター", generatedData.studentRows],
      ["講師マスター", generatedData.staffRows],
      ["講師担当校舎", generatedData.staffSchoolRows]
    ];
    try {
      writePlan.forEach(([sheetName, rows]) => {
        if (rows.length) sheets[sheetName].getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      });
      ACCOUNT_MASTER_SHEET_SPECS.forEach(spec => {
        const actualRows = getAccountMigrationDataRows_(sheets[spec.name]);
        const expected = sheetMetadata[spec.name];
        if (actualRows.length !== expected.rowCount || getAccountMigrationDigest_(actualRows) !== expected.digest) {
          throw new Error(`Post-write verification failed: ${spec.name}`);
        }
      });
    } catch {
      metadata.status = "failed";
      metadata.failedAt = new Date().toISOString();
      try {
        ACCOUNT_MASTER_SHEET_SPECS.forEach(spec => {
          const actualRows = getAccountMigrationDataRows_(sheets[spec.name]);
          metadata.sheets[spec.name] = {
            sheetId: sheets[spec.name].getSheetId(),
            rowCount: actualRows.length,
            digest: getAccountMigrationDigest_(actualRows)
          };
        });
      } catch {
        metadata.status = "failedUnverifiable";
      }
      setAccountMigrationMetadata_(metadata);
      throw new Error("Account migration failed during write or verification");
    }
    metadata.status = "completed";
    metadata.completedAt = new Date().toISOString();
    setAccountMigrationMetadata_(metadata);
    return {
      success: true,
      migrationId,
      accountRows: generatedData.accountRows.length,
      studentRows: generatedData.studentRows.length,
      staffRows: generatedData.staffRows.length,
      staffSchoolRows: generatedData.staffSchoolRows.length
    };
  } finally {
    lock.releaseLock();
  }
}

function getMigrationComparableValue_(value) {
  if (value instanceof Date) return value.toISOString();
  return String(value == null ? "" : value).trim();
}

function getDuplicateKeyCount_(rows, indexes) {
  const counts = Object.create(null);
  rows.forEach(row => {
    const key = indexes.map(index => String(row[index] == null ? "" : row[index])).join("\u0000");
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts).reduce((total, key) => total + Math.max(0, counts[key] - 1), 0);
}

// eslint-disable-next-line no-unused-vars
function compareLegacyMigration() {
  const legacySheet = getLegacyAccountSheet_();
  if (legacySheet.getName() !== ACCOUNT_MIGRATION_SOURCE_SHEET_NAME) {
    throw new Error("Unexpected legacy account source sheet");
  }
  const sheets = assertAccountMigrationSheets_(false);
  const legacyRows = legacySheet.getDataRange().getValues().slice(1)
    .filter(row => row.slice(0, 13).some(value => String(value == null ? "" : value).trim() !== ""));
  const accountRows = getAccountMigrationDataRows_(sheets["アカウントマスター"]);
  const studentRows = getAccountMigrationDataRows_(sheets["生徒マスター"]);
  const staffRows = getAccountMigrationDataRows_(sheets["講師マスター"]);
  const staffSchoolRows = getAccountMigrationDataRows_(sheets["講師担当校舎"]);
  const mismatchCounts = Object.create(null);
  const mismatchSamples = [];
  const addMismatch = (type, userId) => {
    mismatchCounts[type] = (mismatchCounts[type] || 0) + 1;
    if (mismatchSamples.length < 100) mismatchSamples.push({ userId: String(userId || ""), type });
  };
  const legacyById = Object.create(null);
  legacyRows.forEach(row => {
    const role = String(row[10] || "").trim();
    legacyById[getLegacyMigrationUserId_(row[1], role)] = row;
  });
  const accountById = Object.create(null);
  accountRows.forEach(row => { accountById[String(row[0] || "").trim()] = row; });
  const studentById = Object.create(null);
  studentRows.forEach(row => { studentById[String(row[0] || "").trim()] = row; });
  const staffById = Object.create(null);
  staffRows.forEach(row => { staffById[String(row[0] || "").trim()] = row; });
  const staffSchoolKeys = new Set(staffSchoolRows.map(row => `${String(row[0] || "").trim()}\u0000${String(row[1] || "").trim()}`));
  const legacyIds = new Set(Object.keys(legacyById));
  const accountIds = new Set(Object.keys(accountById));

  legacyIds.forEach(userId => {
    if (!accountIds.has(userId)) addMismatch("MISSING_ACCOUNT_USER_ID", userId);
  });
  accountIds.forEach(userId => {
    if (!legacyIds.has(userId)) addMismatch("EXTRA_ACCOUNT_USER_ID", userId);
  });
  legacyIds.forEach(userId => {
    const legacy = legacyById[userId];
    const account = accountById[userId];
    if (!account) return;
    const role = String(legacy[10] || "").trim();
    if (String(account[4] || "").trim() !== role) addMismatch("ROLE_MISMATCH", userId);
    if (normalizeLegacyMigrationBoolean_(account[2], "isInitial") !== normalizeLegacyMigrationBoolean_(legacy[8], "isInitial")) {
      addMismatch("IS_INITIAL_MISMATCH", userId);
    }
    const expectedPasswordUpdatedAt = role === "student" ? "" : legacy[7];
    if (getMigrationComparableValue_(account[3]) !== getMigrationComparableValue_(expectedPasswordUpdatedAt)) {
      addMismatch("PASSWORD_UPDATED_AT_MISMATCH", userId);
    }
    if (!isEnabledValue(account[5])) addMismatch("ACCOUNT_NOT_ENABLED", userId);
    if (getMigrationComparableValue_(account[10]) !== "") addMismatch("DELETED_AT_NOT_EMPTY", userId);
    if (role === "student") {
      const student = studentById[userId];
      if (!student) addMismatch("MISSING_STUDENT_PROFILE", userId);
      else {
        if (String(student[1] || "").trim() !== String(legacy[0] || "").trim()) addMismatch("STUDENT_SCHOOL_MISMATCH", userId);
        if (String(student[4] || "").trim() !== String(legacy[5] || "").trim()) addMismatch("STUDENT_GRADE_MISMATCH", userId);
        if (String(student[3] || "") !== "") addMismatch("STUDENT_NAME_KANA_NOT_EMPTY", userId);
      }
      if (staffById[userId]) addMismatch("STUDENT_HAS_STAFF_PROFILE", userId);
    } else {
      const staff = staffById[userId];
      if (!staff) addMismatch("MISSING_STAFF_PROFILE", userId);
      else if (String(staff[2] || "") !== "") addMismatch("STAFF_NAME_KANA_NOT_EMPTY", userId);
      if (studentById[userId]) addMismatch("STAFF_HAS_STUDENT_PROFILE", userId);
      const school = String(legacy[0] || "").trim();
      if (school && !staffSchoolKeys.has(`${userId}\u0000${school}`)) addMismatch("STAFF_SCHOOL_MISMATCH", userId);
    }
  });
  studentRows.forEach(row => {
    const userId = String(row[0] || "").trim();
    if (!legacyIds.has(userId)) addMismatch("EXTRA_STUDENT_PROFILE", userId);
  });
  staffRows.forEach(row => {
    const userId = String(row[0] || "").trim();
    if (!legacyIds.has(userId)) addMismatch("EXTRA_STAFF_PROFILE", userId);
  });
  staffSchoolRows.forEach(row => {
    const userId = String(row[0] || "").trim();
    if (!legacyIds.has(userId)) addMismatch("EXTRA_STAFF_SCHOOL", userId);
    if (!isEnabledValue(row[3])) addMismatch("STAFF_SCHOOL_NOT_ENABLED", userId);
  });

  const legacyRoleCounts = { admin: 0, "head-teacher": 0, teacher: 0, student: 0 };
  const accountRoleCounts = { admin: 0, "head-teacher": 0, teacher: 0, student: 0 };
  legacyRows.forEach(row => { legacyRoleCounts[String(row[10] || "").trim()]++; });
  accountRows.forEach(row => {
    const role = String(row[4] || "").trim();
    if (Object.prototype.hasOwnProperty.call(accountRoleCounts, role)) accountRoleCounts[role]++;
  });
  ACCOUNT_MIGRATION_ROLES.forEach(role => {
    if (legacyRoleCounts[role] !== accountRoleCounts[role]) addMismatch(`ROLE_COUNT_MISMATCH_${role}`, "");
  });
  const legacyStaffPasswordUpdatedCount = legacyRows.filter(row =>
    ["admin", "head-teacher", "teacher"].includes(String(row[10] || "").trim()) && getMigrationComparableValue_(row[7]) !== ""
  ).length;
  const migratedStaffPasswordUpdatedCount = accountRows.filter(row =>
    ["admin", "head-teacher", "teacher"].includes(String(row[4] || "").trim()) && getMigrationComparableValue_(row[3]) !== ""
  ).length;
  if (legacyStaffPasswordUpdatedCount !== migratedStaffPasswordUpdatedCount) {
    addMismatch("PASSWORD_UPDATED_AT_COUNT_MISMATCH", "");
  }
  const accountDuplicateCount = getDuplicateKeyCount_(accountRows, [0]);
  const studentDuplicateCount = getDuplicateKeyCount_(studentRows, [0]);
  const staffDuplicateCount = getDuplicateKeyCount_(staffRows, [0]);
  const staffSchoolDuplicateCount = getDuplicateKeyCount_(staffSchoolRows, [0, 1]);
  if (accountDuplicateCount) mismatchCounts.ACCOUNT_USER_ID_DUPLICATE = accountDuplicateCount;
  if (studentDuplicateCount) mismatchCounts.STUDENT_USER_ID_DUPLICATE = studentDuplicateCount;
  if (staffDuplicateCount) mismatchCounts.STAFF_USER_ID_DUPLICATE = staffDuplicateCount;
  if (staffSchoolDuplicateCount) mismatchCounts.STAFF_SCHOOL_DUPLICATE = staffSchoolDuplicateCount;
  const errorCount = Object.keys(mismatchCounts).reduce((total, key) => total + mismatchCounts[key], 0);
  return {
    success: errorCount === 0,
    errorCount,
    warningCount: 0,
    countSummary: {
      legacyRows: legacyRows.length,
      accountRows: accountRows.length,
      legacyStudentRows: legacyRoleCounts.student,
      studentRows: studentRows.length,
      legacyStaffRows: legacyRoleCounts.admin + legacyRoleCounts["head-teacher"] + legacyRoleCounts.teacher,
      staffRows: staffRows.length,
      staffSchoolRows: staffSchoolRows.length,
      legacyRoleCounts,
      accountRoleCounts,
      legacyUserIdCount: legacyIds.size,
      accountUserIdCount: accountIds.size,
      legacyStaffPasswordUpdatedCount,
      migratedStaffPasswordUpdatedCount,
      emptyStudentNameKanaCount: studentRows.filter(row => String(row[3] || "") === "").length,
      emptyStaffNameKanaCount: staffRows.filter(row => String(row[2] || "") === "").length,
      enabledAccountCount: accountRows.filter(row => isEnabledValue(row[5])).length,
      emptyDeletedAtCount: accountRows.filter(row => getMigrationComparableValue_(row[10]) === "").length,
      allowedAdminIdPresent: Boolean(accountById.admin && String(accountById.admin[4] || "").trim() === "admin"),
      excludedLegacyColumnsPresentInNewHeaders: false
    },
    mismatchSummary: mismatchCounts,
    mismatchSamples,
    mismatchSamplesTruncated: errorCount > mismatchSamples.length
  };
}

// eslint-disable-next-line no-unused-vars
function runCompareMigrationSummary() {
  const result = compareLegacyMigration();
  console.log(JSON.stringify(result, null, 2));
}

function assertRollbackMetadataMatches_(metadata, sheets) {
  if (!metadata || !["completed", "failed"].includes(metadata.status)) {
    throw new Error("Verifiable migration metadata is required");
  }
  ACCOUNT_MASTER_SHEET_SPECS.forEach(spec => {
    const saved = metadata.sheets && metadata.sheets[spec.name];
    const sheet = sheets[spec.name];
    if (!saved || saved.sheetId !== sheet.getSheetId()) throw new Error(`Migration sheet identity mismatch: ${spec.name}`);
    const rows = getAccountMigrationDataRows_(sheet);
    if (rows.length !== saved.rowCount) throw new Error(`Migration row count changed: ${spec.name}`);
    if (getAccountMigrationDigest_(rows) !== saved.digest) throw new Error(`Migration data changed: ${spec.name}`);
  });
}

// eslint-disable-next-line no-unused-vars
function rollbackAccountMigration(migrationId) {
  if (!migrationId || !String(migrationId).trim()) throw new Error("migrationId is required");
  // eslint-disable-next-line no-undef
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) throw new Error("Account migration operation is already running");
  try {
    const metadata = getAccountMigrationMetadata_();
    if (!metadata || metadata.migrationId !== String(migrationId).trim()) throw new Error("migrationId does not match");
    const legacySheet = getLegacyAccountSheet_();
    if (!legacySheet || legacySheet.getName() !== metadata.sourceSheetName) throw new Error("Legacy source sheet is missing");
    const sheets = assertAccountMigrationSheets_(false);
    assertRollbackMetadataMatches_(metadata, sheets);
    ["講師担当校舎", "講師マスター", "生徒マスター", "アカウントマスター"].forEach(sheetName => {
      const sheet = sheets[sheetName];
      if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    });
    metadata.status = "rolledBack";
    metadata.rolledBackAt = new Date().toISOString();
    setAccountMigrationMetadata_(metadata);
    return { success: true, migrationId: metadata.migrationId, status: metadata.status };
  } finally {
    lock.releaseLock();
  }
}

// eslint-disable-next-line no-unused-vars
function runAccountDiagnosisSummary() {
  const result = diagnoseLegacyAccountData();

  console.log(JSON.stringify({
    targetSheetName: result.targetSheetName,
    totalRows: result.totalRowCount,
    dataRows: result.dataRowCount,
    roleCounts: result.roleCounts,
    unknownRoleCount: result.counts.unknownRole,
    emptyUserIdCount: result.counts.emptyUserId,
    duplicateUserIdCount: result.counts.duplicateUserId,
    normalizedDuplicateUserIdCount:
      result.counts.normalizedDuplicateUserId,
    shorterThan6DigitIdCount:
      result.counts.shorterThanSixDigitId,
    longerThan6DigitIdCount:
      result.counts.longerThanSixDigitId,
    nonNumericUserIdCount:
      result.counts.nonNumericUserId,
    allowedLegacyAdminIdCount:
      result.allowedLegacyAdminIdCount,
    invalidNonNumericUserIdCount:
      result.invalidNonNumericUserIdCount,
    allowedLegacyAdminIdsUsed:
      result.allowedLegacyAdminIdsUsed,
    leadingZeroUserIdCount:
      result.counts.leadingZeroUserId,
    emptyNameCount: result.counts.emptyName,
    emptySchoolCount: result.counts.emptySchool,
    studentEmptyGradeCount:
      result.counts.studentEmptyGrade,
    staffWithGradeCount:
      result.counts.staffGradePresent,
    columnCValueCount:
      result.counts.columnCValuePresent,
    columnDValueCount:
      result.counts.columnDValuePresent,
    columnGValueCount:
      result.counts.columnGValuePresent,
    columnHValueCount:
      result.counts.columnHValuePresent,
    unknownSchoolCount:
      result.counts.organizationSchoolMismatch,
    blockingErrorCount:
      result.blockingErrorCount,
    warningCount:
      result.warningCount
  }, null, 2));
}

function getAccountDiagnosisValueType_(value) {
  if (value instanceof Date) return "date";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "other";
}

function getAccountDiagnosisFirstCharacterType_(value) {
  const firstCharacter = String(value == null ? "" : value).charAt(0);
  if (!firstCharacter) return "empty";
  if (/[0-9０-９]/.test(firstCharacter)) return "digit";
  if (/[ぁ-ん]/.test(firstCharacter)) return "hiragana";
  if (/[ァ-ヶー]/.test(firstCharacter)) return "katakana";
  if (/[一-龠々]/.test(firstCharacter)) return "kanji";
  if (/[A-Za-z]/.test(firstCharacter)) return "latin";
  return "other";
}

function getAccountDiagnosisValueKey_(value) {
  const type = getAccountDiagnosisValueType_(value);
  const comparableValue = type === "date" ? value.toISOString() : String(value);
  return `${type}\t${comparableValue}`;
}

function summarizeLegacyUnknownColumn_(dataRows, columnIndex) {
  const roleCounts = { admin: 0, "head-teacher": 0, teacher: 0, student: 0, unknown: 0 };
  const typeCounts = { string: 0, number: 0, boolean: 0, date: 0, other: 0 };
  const valueGroups = Object.create(null);
  const rowSamples = [];
  let valueCount = 0;

  dataRows.forEach(item => {
    const value = item.row[columnIndex];
    if (value == null || String(value).trim() === "") return;
    valueCount++;
    const role = String(item.row[10] || "").trim();
    roleCounts[Object.prototype.hasOwnProperty.call(roleCounts, role) ? role : "unknown"]++;
    const type = getAccountDiagnosisValueType_(value);
    typeCounts[type]++;
    const key = getAccountDiagnosisValueKey_(value);
    if (!valueGroups[key]) {
      valueGroups[key] = {
        occurrenceCount: 0,
        type,
        length: String(value).length,
        firstCharacterType: getAccountDiagnosisFirstCharacterType_(value),
        firstRow: item.sheetRow
      };
    }
    valueGroups[key].occurrenceCount++;
    if (rowSamples.length < 20) rowSamples.push({ sheetRow: item.sheetRow, role });
  });

  const frequentValues = Object.keys(valueGroups)
    .map(key => valueGroups[key])
    .sort((left, right) => right.occurrenceCount - left.occurrenceCount || left.firstRow - right.firstRow)
    .slice(0, 20)
    .map((summary, index) => ({
      valueLabel: `value-${index + 1}`,
      occurrenceCount: summary.occurrenceCount,
      type: summary.type,
      length: summary.length,
      firstCharacterType: summary.firstCharacterType
    }));

  return {
    valueCount,
    roleCounts,
    typeCounts,
    distinctValueCount: Object.keys(valueGroups).length,
    frequentValues,
    rowSamples
  };
}

// eslint-disable-next-line no-unused-vars
function runAccountDiagnosisDetails() {
  const sheet = getLegacyAccountSheet_();
  const rows = sheet.getDataRange().getValues();
  const dataRows = rows.slice(1).map((row, index) => ({ row, sheetRow: index + 2 }))
    .filter(item => item.row.slice(0, 13).some(value => String(value == null ? "" : value).trim() !== ""));
  const exactUserIdGroups = Object.create(null);
  const normalizedUserIdGroups = Object.create(null);
  const nonNumericUserIds = [];
  const staffColumnF = [];

  dataRows.forEach(item => {
    const role = String(item.row[10] || "").trim();
    const school = String(item.row[0] || "").trim();
    const rawUserId = String(item.row[1] == null ? "" : item.row[1]).trim();
    const comparableRawUserId = rawUserId.replace(/^'/, "");
    const normalizedUserId = normalizeUserId(item.row[1]);
    const detail = { sheetRow: item.sheetRow, role, school, userId: rawUserId };

    if (rawUserId) {
      if (!exactUserIdGroups[rawUserId]) exactUserIdGroups[rawUserId] = [];
      exactUserIdGroups[rawUserId].push(detail);
      if (!normalizedUserIdGroups[normalizedUserId]) normalizedUserIdGroups[normalizedUserId] = [];
      normalizedUserIdGroups[normalizedUserId].push(detail);
      if (!/^\d+$/.test(comparableRawUserId)) nonNumericUserIds.push(detail);
    }

    if (["teacher", "head-teacher", "admin"].includes(role)) {
      const columnFValue = item.row[5];
      if (columnFValue != null && String(columnFValue).trim() !== "") {
        staffColumnF.push({
          sheetRow: item.sheetRow,
          role,
          school,
          value: columnFValue instanceof Date ? columnFValue.toISOString() : columnFValue,
          valueType: getAccountDiagnosisValueType_(columnFValue)
        });
      }
    }
  });

  const duplicateUserIds = Object.keys(exactUserIdGroups)
    .filter(userId => exactUserIdGroups[userId].length > 1)
    .map(userId => ({ userId, rows: exactUserIdGroups[userId] }));
  const normalizedDuplicateUserIds = Object.keys(normalizedUserIdGroups)
    .filter(userId => normalizedUserIdGroups[userId].length > 1)
    .map(userId => ({ normalizedUserId: userId, rows: normalizedUserIdGroups[userId] }));

  console.log(JSON.stringify({
    targetSheetName: sheet.getName(),
    userIdProblems: {
      duplicateUserIds,
      normalizedDuplicateUserIds,
      nonNumericUserIds
    },
    unknownColumns: {
      columnC: summarizeLegacyUnknownColumn_(dataRows, 2),
      columnD: summarizeLegacyUnknownColumn_(dataRows, 3),
      columnG: summarizeLegacyUnknownColumn_(dataRows, 6),
      columnH: summarizeLegacyUnknownColumn_(dataRows, 7)
    },
    staffColumnF
  }, null, 2));
}

// eslint-disable-next-line no-unused-vars
function runAccountUnknownColumnsSummary() {
  const sheet = getLegacyAccountSheet_();
  const rows = sheet.getDataRange().getValues();
  const dataRows = rows.slice(1)
    .filter(row => row.slice(0, 13).some(value => String(value == null ? "" : value).trim() !== ""));
  const sensitiveValues = new Set();

  dataRows.forEach(row => {
    [row[1], normalizeUserId(row[1]), row[4], row[9], row[11]].forEach(value => {
      const text = String(value == null ? "" : value).trim();
      if (text) sensitiveValues.add(text);
    });
  });

  const summarizeColumn = columnIndex => {
    const roleCounts = { admin: 0, "head-teacher": 0, teacher: 0, student: 0, unknown: 0 };
    const typeCounts = { string: 0, number: 0, boolean: 0, date: 0, other: 0 };
    const valueGroups = Object.create(null);
    let valueCount = 0;

    dataRows.forEach((row, index) => {
      const value = row[columnIndex];
      const text = String(value == null ? "" : value).trim();
      if (!text) return;
      valueCount++;
      const role = String(row[10] || "").trim();
      roleCounts[Object.prototype.hasOwnProperty.call(roleCounts, role) ? role : "unknown"]++;
      typeCounts[getAccountDiagnosisValueType_(value)]++;
      const key = getAccountDiagnosisValueKey_(value);
      if (!valueGroups[key]) valueGroups[key] = { value, text, count: 0, firstIndex: index };
      valueGroups[key].count++;
    });

    const frequentValues = Object.keys(valueGroups)
      .map(key => valueGroups[key])
      .sort((left, right) => right.count - left.count || left.firstIndex - right.firstIndex)
      .slice(0, 10)
      .map(group => {
        const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(group.text);
        const looksLikePhone = /^\+?\d[\d\s()\-]{8,}\d$/.test(group.text);
        let displayValue = group.value instanceof Date ? group.value.toISOString() : group.text;
        if (group.text.length > 20) displayValue = "長文値";
        else if (sensitiveValues.has(group.text) || looksLikeEmail || looksLikePhone) displayValue = "非表示";
        return { value: displayValue, count: group.count };
      });

    return {
      valueCount,
      roleCounts,
      typeCounts,
      distinctValueCount: Object.keys(valueGroups).length,
      frequentValues
    };
  };

  console.log(JSON.stringify({
    columnC: summarizeColumn(2),
    columnD: summarizeColumn(3),
    columnG: summarizeColumn(6),
    columnH: summarizeColumn(7)
  }, null, 2));
}

function getRequiredSheet(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error(`Required sheet is not configured: ${sheetName}`);
  return sheet;
}

function ensureSheetWithHeaders(spreadsheet, sheetName, headers, result) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    result.createdSheets.push(sheetName);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    result.initializedHeaders.push(sheetName);
    return sheet;
  }

  const actualHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(String);
  if (actualHeaders.join("\t") !== headers.join("\t")) {
    result.warnings.push(`Header mismatch: ${sheetName}`);
  }
  return sheet;
}

function migrateLegacySukimakunContentSheet(spreadsheet, result) {
  const sheet = spreadsheet.getSheetByName(SUKIMAKUN_CONTENT_SHEET_NAME);
  if (!sheet || sheet.getLastRow() === 0) return;
  const legacyHeaders = ["contentId", "displayName", "enabled", "sortOrder"];
  const actualHeaders = sheet.getRange(1, 1, 1, legacyHeaders.length).getValues()[0].map(String);
  if (actualHeaders.join("\t") !== legacyHeaders.join("\t")) return;
  if (sheet.getLastColumn() > legacyHeaders.length) {
    result.warnings.push("Legacy content sheet has unexpected extra columns; migration was skipped");
    return;
  }

  const legacyRows = sheet.getRange(1, 1, sheet.getLastRow(), legacyHeaders.length).getValues();
  const migratedRows = [SUKIMAKUN_CONTENT_HEADERS].concat(legacyRows.slice(1).map(row => [
    row[0], row[1], "general", "all", "other", row[2], row[3]
  ]));
  sheet.getRange(1, 1, migratedRows.length, SUKIMAKUN_CONTENT_HEADERS.length).setValues(migratedRows);
  result.migratedLegacyContentSheet = true;
}

function setupSukimakunPermissionSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const result = { createdSheets: [], initializedHeaders: [], migratedLegacyContentSheet: false, addedContents: 0, skippedContents: 0, warnings: [] };
  migrateLegacySukimakunContentSheet(spreadsheet, result);
  const contentSheet = ensureSheetWithHeaders(spreadsheet, SUKIMAKUN_CONTENT_SHEET_NAME, SUKIMAKUN_CONTENT_HEADERS, result);
  ensureSheetWithHeaders(spreadsheet, SUKIMAKUN_PERMISSION_SHEET_NAME, SUKIMAKUN_PERMISSION_HEADERS, result);
  ensureSheetWithHeaders(spreadsheet, MANAGEMENT_SESSION_SHEET_NAME, MANAGEMENT_SESSION_HEADERS, result);

  const rows = contentSheet.getDataRange().getValues();
  const actualContentHeaders = rows.length > 0 ? rows[0].slice(0, SUKIMAKUN_CONTENT_HEADERS.length).map(String) : [];
  if (actualContentHeaders.join("\t") !== SUKIMAKUN_CONTENT_HEADERS.join("\t")) {
    result.warnings.push("Content initialization was skipped because the header could not be safely migrated");
    result.createdCount = result.createdSheets.length;
    result.warningCount = result.warnings.length;
    return result;
  }
  const counts = Object.create(null);
  for (let i = 1; i < rows.length; i++) {
    const contentId = String(rows[i][0] || "").trim();
    const hasAnyValue = rows[i].slice(0, SUKIMAKUN_CONTENT_HEADERS.length).some(value => String(value || "").trim() !== "");
    if (!contentId) {
      if (hasAnyValue) result.warnings.push(`Empty contentId detected at row ${i + 1}`);
      continue;
    }
    counts[contentId] = (counts[contentId] || 0) + 1;
    const sortOrder = rows[i][6];
    if (String(sortOrder || "").trim() === "" || !Number.isFinite(Number(sortOrder))) {
      result.warnings.push(`Invalid sortOrder detected at row ${i + 1}`);
    }
  }
  Object.keys(counts).forEach(contentId => {
    if (counts[contentId] > 1) result.warnings.push(`Duplicate contentId detected: ${contentId}`);
  });

  const additions = DEFAULT_SUKIMAKUN_CONTENTS.filter(row => {
    if (counts[row[0]]) {
      result.skippedContents++;
      return false;
    }
    return true;
  });
  if (additions.length > 0) {
    contentSheet.getRange(contentSheet.getLastRow() + 1, 1, additions.length, SUKIMAKUN_CONTENT_HEADERS.length).setValues(additions);
    result.addedContents = additions.length;
  }
  result.createdCount = result.createdSheets.length;
  result.warningCount = result.warnings.length;
  return result;
}

function getSukimakunContentMaster() {
  const sheet = getRequiredSheet(SUKIMAKUN_CONTENT_SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const headers = rows.length > 0 ? rows[0].slice(0, SUKIMAKUN_CONTENT_HEADERS.length).map(String) : [];
  if (headers.join("\t") !== SUKIMAKUN_CONTENT_HEADERS.join("\t")) {
    throw new Error("スキマ君コンテンツのヘッダーが不正です");
  }
  const contentMap = Object.create(null);
  const contents = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i].slice(0, SUKIMAKUN_CONTENT_HEADERS.length);
    if (values.every(value => String(value || "").trim() === "")) continue;
    const contentId = String(rows[i][0] || "").trim();
    if (!contentId) throw new Error(`Empty contentId detected at row ${i + 1}`);
    if (contentMap[contentId]) throw new Error(`Duplicate contentId detected: ${contentId}`);
    const rawSortOrder = rows[i][6];
    if (String(rawSortOrder || "").trim() === "" || !Number.isFinite(Number(rawSortOrder))) {
      throw new Error(`Invalid sortOrder detected at row ${i + 1}`);
    }
    const content = {
      contentId,
      displayName: String(rows[i][1] || "").trim(),
      category: String(rows[i][2] || "").trim(),
      schoolType: String(rows[i][3] || "").trim(),
      subject: String(rows[i][4] || "").trim(),
      enabled: isEnabledValue(rows[i][5]),
      sortOrder: Number(rawSortOrder),
      sourceRowIndex: i
    };
    contentMap[contentId] = content;
    contents.push(content);
  }
  contents.sort((a, b) => a.sortOrder - b.sortOrder || a.sourceRowIndex - b.sourceRowIndex || a.contentId.localeCompare(b.contentId));
  const publicContents = contents.map(content => ({
    contentId: content.contentId,
    displayName: content.displayName,
    category: content.category,
    schoolType: content.schoolType,
    subject: content.subject,
    enabled: content.enabled,
    sortOrder: content.sortOrder
  }));
  const publicContentMap = Object.create(null);
  publicContents.forEach(content => { publicContentMap[content.contentId] = content; });
  return {
    contents: publicContents,
    enabledContents: publicContents.filter(content => content.enabled),
    contentMap: publicContentMap
  };
}

function getSukimakunContents(includeDisabled) {
  const master = getSukimakunContentMaster();
  return includeDisabled ? master.contents : master.enabledContents;
}

function buildSukimakunPermissionStateMap(permissionRows, activeContents) {
  const activeIds = new Set(activeContents.map(content => content.contentId));
  const stateMap = Object.create(null);
  for (let i = 1; i < permissionRows.length; i++) {
    const normalizedUserId = normalizeUserId(permissionRows[i][0]);
    if (!stateMap[normalizedUserId]) {
      stateMap[normalizedUserId] = {
        permissionsInitialized: true,
        allowedContentIds: [],
        warnings: { unknownContentIdCount: 0, emptyContentIdCount: 0 },
        seenContentIds: Object.create(null)
      };
    }
    const state = stateMap[normalizedUserId];
    const contentId = String(permissionRows[i][1] || "").trim();
    if (!contentId) {
      state.warnings.emptyContentIdCount++;
      continue;
    }
    if (state.seenContentIds[contentId]) throw new Error(`Duplicate permission row detected for contentId: ${contentId}`);
    state.seenContentIds[contentId] = true;
    if (!activeIds.has(contentId)) {
      state.warnings.unknownContentIdCount++;
      continue;
    }
    if (isEnabledValue(permissionRows[i][2])) state.allowedContentIds.push(contentId);
  }
  Object.keys(stateMap).forEach(userId => { delete stateMap[userId].seenContentIds; });
  return stateMap;
}

function normalizeGrade(value) {
  return String(value == null ? "" : value).trim().normalize("NFKC");
}

function getSukimakunPermissionStateFromMap(userId, activeContents, permissionStateMap) {
  const state = permissionStateMap[normalizeUserId(userId)];
  if (state) return state;
  return {
    permissionsInitialized: false,
    allowedContentIds: activeContents.map(content => content.contentId),
    warnings: { unknownContentIdCount: 0, emptyContentIdCount: 0 }
  };
}

function getSukimakunPermissionState(userId, activeContents) {
  const normalizedUserId = normalizeUserId(userId);
  const allPermissionRows = getRequiredSheet(SUKIMAKUN_PERMISSION_SHEET_NAME).getDataRange().getValues();
  const permissionRows = allPermissionRows.slice(0, 1).concat(
    allPermissionRows.slice(1).filter(row => normalizeUserId(row[0]) === normalizedUserId)
  );
  const permissionStateMap = buildSukimakunPermissionStateMap(permissionRows, activeContents);
  return getSukimakunPermissionStateFromMap(normalizedUserId, activeContents, permissionStateMap);
}

function appendStudentPermissionInfo(result, userId, role) {
  if (String(role || "").trim() !== "student") return result;
  const activeContents = getSukimakunContents(false);
  const permissionState = getSukimakunPermissionState(normalizeUserId(userId), activeContents);
  result.allowedContentIds = permissionState.allowedContentIds;
  result.permissionsInitialized = permissionState.permissionsInitialized;
  return result;
}

function getNewAuthData_() {
  const sheets = assertAccountMigrationSheets_(false);
  const accounts = getAccountMigrationDataRows_(sheets["アカウントマスター"]);
  const students = getAccountMigrationDataRows_(sheets["生徒マスター"]);
  const staff = getAccountMigrationDataRows_(sheets["講師マスター"]);
  const assignments = getAccountMigrationDataRows_(sheets["講師担当校舎"]);
  const studentById = Object.create(null);
  const staffById = Object.create(null);
  students.forEach(row => { studentById[normalizeUserId(row[0])] = row; });
  staff.forEach(row => { staffById[normalizeUserId(row[0])] = row; });
  const schoolsById = Object.create(null);
  assignments.forEach(row => {
    if (!isEnabledValue(row[3])) return;
    const id = normalizeUserId(row[0]);
    if (!schoolsById[id]) schoolsById[id] = [];
    schoolsById[id].push({ school: String(row[1] || "").trim(), isPrimary: isEnabledValue(row[2]) });
  });
  const contexts = accounts.map((row, index) => {
    const userId = normalizeUserId(row[0]);
    const role = String(row[4] || "").trim();
    const enabled = isEnabledValue(row[5]);
    const deleted = getMigrationComparableValue_(row[10]) !== "";
    const profile = role === "student" ? studentById[userId] : staffById[userId];
    if (!profile) throw new Error("Account profile data is incomplete");
    const assigned = schoolsById[userId] || [];
    const primary = assigned.find(item => item.isPrimary) || assigned[0];
    return {
      rowIndex: index + 2, userId, password: row[1], isInitial: row[2], passwordUpdatedAt: row[3],
      role, enabled, deleted, token: row[6], tokenExpire: row[7], createdAt: row[8], updatedAt: row[9], deletedAt: row[10],
      school: role === "student" ? String(profile && profile[1] || "").trim() : String(primary && primary.school || ""),
      name: String(profile && (role === "student" ? profile[2] : profile[1]) || "").trim(),
      grade: role === "student" ? String(profile && profile[4] || "").trim() : "",
      nameKana: String(profile && (role === "student" ? profile[3] : profile[2]) || "").trim(),
      assignedSchools: assigned.map(item => item.school).filter(Boolean)
    };
  });
  return { sheets, contexts };
}

function canUseLegacyAuthFallback_() {
  const metadata = getAccountMigrationMetadata_();
  return !metadata || metadata.status !== "completed";
}

function getUserAuthContexts_() {
  try {
    return getNewAuthData_().contexts;
  } catch (error) {
    if (!canUseLegacyAuthFallback_()) throw error;
    const rows = getLegacyAccountSheet_().getDataRange().getValues();
    return rows.slice(1).map((row, index) => ({
      rowIndex: index + 2, userId: normalizeUserId(row[1]), password: row[9], isInitial: row[8],
      passwordUpdatedAt: row[7], role: String(row[10] || "").trim(), enabled: true, deleted: false,
      token: row[11], tokenExpire: row[12], school: row[0], name: row[4], grade: row[5], assignedSchools: row[0] ? [row[0]] : []
    }));
  }
}

function getLegacyCompatibleUserRows_() {
  return [Array(13).fill("")].concat(getUserAuthContexts_().filter(user => user.enabled && !user.deleted).map(user => {
    const row = Array(13).fill("");
    row[0] = user.school; row[1] = user.userId; row[4] = user.name; row[5] = user.grade;
    row[7] = user.passwordUpdatedAt; row[8] = user.isInitial; row[9] = user.password;
    row[10] = user.role; row[11] = user.token; row[12] = user.tokenExpire;
    return row;
  }));
}

function compareLegacyAndNewAuthData() {
  const legacyRows = getLegacyAccountSheet_().getDataRange().getValues().slice(1)
    .filter(row => row.slice(0, 13).some(value => String(value == null ? "" : value).trim() !== ""));
  const newUsers = getNewAuthData_().contexts;
  const newById = Object.create(null);
  newUsers.forEach(user => { newById[user.userId] = user; });
  const roleCounts = { legacy: { admin: 0, "head-teacher": 0, teacher: 0, student: 0 }, new: { admin: 0, "head-teacher": 0, teacher: 0, student: 0 } };
  const mismatchCounts = Object.create(null);
  const mismatchSamples = [];
  const addMismatch = (type, userId) => {
    mismatchCounts[type] = (mismatchCounts[type] || 0) + 1;
    if (mismatchSamples.length < 100) mismatchSamples.push({ userId, type });
  };
  legacyRows.forEach(row => {
    const userId = normalizeUserId(row[1]);
    const role = String(row[10] || "").trim();
    if (Object.prototype.hasOwnProperty.call(roleCounts.legacy, role)) roleCounts.legacy[role]++;
    const user = newById[userId];
    if (!user) return addMismatch("MISSING_NEW_USER", userId);
    if (user.role !== role) addMismatch("ROLE_MISMATCH", userId);
    if (String(user.school || "").trim() !== String(row[0] || "").trim()) addMismatch("SCHOOL_MISMATCH", userId);
    if (String(user.name || "").trim() !== String(row[4] || "").trim()) addMismatch("NAME_MISMATCH", userId);
    if (role === "student" && String(user.grade || "").trim() !== String(row[5] || "").trim()) addMismatch("GRADE_MISMATCH", userId);
    if (normalizeLegacyMigrationBoolean_(user.isInitial, "isInitial") !== normalizeLegacyMigrationBoolean_(row[8], "isInitial")) addMismatch("IS_INITIAL_MISMATCH", userId);
    if (!user.enabled) addMismatch("DISABLED_ACCOUNT", userId);
    if (user.deleted) addMismatch("DELETED_ACCOUNT", userId);
  });
  newUsers.forEach(user => {
    if (Object.prototype.hasOwnProperty.call(roleCounts.new, user.role)) roleCounts.new[user.role]++;
    if (!legacyRows.some(row => normalizeUserId(row[1]) === user.userId)) addMismatch("EXTRA_NEW_USER", user.userId);
  });
  const errorCount = Object.keys(mismatchCounts).reduce((sum, key) => sum + mismatchCounts[key], 0);
  return { success: errorCount === 0, errorCount, warningCount: 0, userIdCounts: { legacy: legacyRows.length, new: newUsers.length }, roleCounts, mismatchSummary: mismatchCounts, mismatchSamples, mismatchSamplesTruncated: errorCount > mismatchSamples.length };
}

// eslint-disable-next-line no-unused-vars
function runCompareLegacyAndNewAuthSummary() {
  const result = compareLegacyAndNewAuthData();
  console.log(JSON.stringify(result, null, 2));
}

function findUserRecord(userId) {
  const normalizedUserId = normalizeUserId(userId);
  const user = getUserAuthContexts_().find(item => item.userId === normalizedUserId);
  if (!user || !user.enabled || user.deleted) return null;
  return user;
}

function createManagementSession(userId, role) {
  const sheet = getRequiredSheet(MANAGEMENT_SESSION_SHEET_NAME);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + MANAGEMENT_SESSION_DURATION_MS);
  const sessionToken = Utilities.getUuid() + Utilities.getUuid();
  sheet.appendRow([sessionToken, toSafeSheetText(normalizeUserId(userId)), String(role || "").trim(), expiresAt, now]);
  return { sessionToken, sessionExpiresAt: expiresAt.toISOString() };
}

function validateManagementSession(sessionToken, extendExpiration) {
  if (!sessionToken || typeof sessionToken !== "string") throw new Error("管理セッションが必要です");
  const sheet = getRequiredSheet(MANAGEMENT_SESSION_SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const now = new Date();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || "") !== sessionToken) continue;
    const expiresAt = new Date(rows[i][3]);
    if (!(expiresAt instanceof Date) || isNaN(expiresAt.getTime()) || now >= expiresAt) {
      sheet.deleteRow(i + 1);
      throw new Error("管理セッションが無効または期限切れです");
    }
    const user = findUserRecord(rows[i][1]);
    if (!user) throw new Error("管理セッションの利用者が存在しません");
    if (extendExpiration) {
      const nextExpiresAt = new Date(now.getTime() + MANAGEMENT_SESSION_DURATION_MS);
      sheet.getRange(i + 1, 4).setValue(nextExpiresAt);
      return { userId: user.userId, role: user.role, sessionExpiresAt: nextExpiresAt.toISOString() };
    }
    return { userId: user.userId, role: user.role, sessionExpiresAt: expiresAt.toISOString() };
  }
  throw new Error("管理セッションが無効または期限切れです");
}

function requireAdminSession(sessionToken) {
  const session = validateManagementSession(sessionToken, true);
  if (session.role !== "admin") throw new Error("管理者権限が必要です");
  return session;
}

function isManagementAuthorizationError(error) {
  return /管理セッション|管理者権限/.test(String(error && error.message || ""));
}

function deleteManagementSession(sessionToken) {
  if (!sessionToken || typeof sessionToken !== "string") return false;
  const sheet = getRequiredSheet(MANAGEMENT_SESSION_SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0] || "") === sessionToken) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function replaceStudentSukimakunPermissions(targetUserId, allowedContentIds, updatedBy, lockAlreadyHeld) {
  const lock = LockService.getDocumentLock();
  if (!lockAlreadyHeld) lock.waitLock(10000);
  try {
    if (!Array.isArray(allowedContentIds)) throw new Error("利用権限の形式が不正です");
    const currentUser = findUserRecord(targetUserId);
    if (!currentUser || currentUser.role !== "student") throw new Error("対象の生徒が見つかりません");
    const activeContents = getSukimakunContents(false);
    const activeIds = new Set(activeContents.map(content => content.contentId));
    const uniqueAllowedIds = Array.from(new Set(allowedContentIds));
    uniqueAllowedIds.forEach(contentId => {
      if (typeof contentId !== "string" || !activeIds.has(contentId)) throw new Error("利用できないcontentIdが含まれています");
    });

    const sheet = getRequiredSheet(SUKIMAKUN_PERMISSION_SHEET_NAME);
    const rows = sheet.getDataRange().getValues();
    const normalizedTarget = normalizeUserId(targetUserId);
    const preservedRows = [];
    const targetSeen = {};
    for (let i = 1; i < rows.length; i++) {
      const rowUserId = normalizeUserId(rows[i][0]);
      const contentId = String(rows[i][1] || "").trim();
      if (rowUserId === normalizedTarget) {
        if (targetSeen[contentId]) throw new Error(`Duplicate permission row detected for contentId: ${contentId}`);
        targetSeen[contentId] = true;
        continue;
      }
      preservedRows.push(rows[i].slice(0, SUKIMAKUN_PERMISSION_HEADERS.length));
    }

    const now = new Date();
    const allowedSet = new Set(uniqueAllowedIds);
    const targetRows = activeContents.map(content => [formatUserIdForSheet(normalizedTarget), content.contentId, allowedSet.has(content.contentId), now, toSafeSheetText(normalizeUserId(updatedBy))]);
    const nextRows = preservedRows.concat(targetRows);
    const previousRowCount = Math.max(0, rows.length - 1);
    try {
      if (nextRows.length > 0) sheet.getRange(2, 1, nextRows.length, SUKIMAKUN_PERMISSION_HEADERS.length).setValues(nextRows);
      if (previousRowCount > nextRows.length) {
        sheet.getRange(nextRows.length + 2, 1, previousRowCount - nextRows.length, SUKIMAKUN_PERMISSION_HEADERS.length).clearContent();
      }
    } catch (writeError) {
      const rollbackRowCount = Math.max(previousRowCount, nextRows.length);
      try {
        if (rollbackRowCount > 0) sheet.getRange(2, 1, rollbackRowCount, SUKIMAKUN_PERMISSION_HEADERS.length).clearContent();
        if (previousRowCount > 0) {
          sheet.getRange(2, 1, previousRowCount, SUKIMAKUN_PERMISSION_HEADERS.length).setValues(rows.slice(1).map(row => row.slice(0, SUKIMAKUN_PERMISSION_HEADERS.length)));
        }
      } catch {
        throw new Error("利用権限の更新と復元に失敗しました");
      }
      throw writeError;
    }
    return { updatedAt: now, activeContents };
  } finally {
    if (!lockAlreadyHeld) lock.releaseLock();
  }
}

function initializeStudentPermissionsForUser(userId, updatedBy, lockAlreadyHeld) {
  const activeContents = getSukimakunContents(false);
  const state = getSukimakunPermissionState(userId, activeContents);
  if (state.permissionsInitialized) return { initialized: false, skipped: activeContents.length };
  replaceStudentSukimakunPermissions(userId, activeContents.map(content => content.contentId), updatedBy, lockAlreadyHeld);
  return { initialized: true, inserted: activeContents.length };
}

function initializeExistingStudentSukimakunPermissions() {
  const rows = getLegacyCompatibleUserRows_();
  const activeContents = getSukimakunContents(false);
  const result = { processedStudents: 0, insertedPermissions: 0, skippedPermissions: 0, errorCount: 0 };
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][10] || "").trim() !== "student") continue;
    result.processedStudents++;
    try {
      const userId = normalizeUserId(rows[i][1]);
      const state = getSukimakunPermissionState(userId, activeContents);
      if (state.permissionsInitialized) {
        result.skippedPermissions += activeContents.length;
      } else {
        replaceStudentSukimakunPermissions(userId, activeContents.map(content => content.contentId), "migration");
        result.insertedPermissions += activeContents.length;
      }
    } catch {
      result.errorCount++;
    }
  }
  return result;
}

function normalizeKana_(value) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ")
    .replace(/[ぁ-ゖ]/g, character => String.fromCharCode(character.charCodeAt(0) + 0x60));
}

function validateName_(value, label) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text || text.length > 100) throw new Error(`${label} is invalid`);
  return text;
}

function validateSchool_(value) {
  const school = String(value || "").trim();
  if (!ACCOUNT_MIGRATION_SCHOOLS.includes(school)) throw new Error("School is invalid");
  return school;
}

function validateGrade_(value) {
  const grade = normalizeGrade(value);
  const canonicalGrades = {
    "小1": "小１", "小2": "小２", "小3": "小３", "小4": "小４", "小5": "小５", "小6": "小６",
    "中1": "中１", "中2": "中２", "中3": "中３",
    "高1": "高１", "高2": "高２", "高3": "高３",
    "大学受験": "大学受験"
  };
  if (!Object.prototype.hasOwnProperty.call(canonicalGrades, grade)) throw new Error("Grade is invalid");
  return canonicalGrades[grade];
}

function validateRole_(value, allowedRoles) {
  const role = String(value || "").trim();
  if (!allowedRoles.includes(role)) throw new Error("Role is invalid");
  return role;
}

function validateKana_(value) {
  const kana = normalizeKana_(value);
  if (!kana || kana.length > 100 || !/^[ァ-ヶー・ ]+$/.test(kana)) throw new Error("Name kana is invalid");
  return kana;
}

function validateAssignedSchools_(value) {
  if (!Array.isArray(value) || value.length < 1) throw new Error("Assigned schools are required");
  const normalized = value.map((item, index) => typeof item === "string"
    ? { school: validateSchool_(item), isPrimary: index === 0 }
    : { school: validateSchool_(item && item.school), isPrimary: Boolean(item && item.isPrimary) });
  if (new Set(normalized.map(item => item.school)).size !== normalized.length) throw new Error("Assigned schools contain duplicates");
  if (normalized.filter(item => item.isPrimary).length !== 1) throw new Error("Exactly one primary school is required");
  return normalized;
}

function validateStudentInput_(data) {
  return { school: validateSchool_(data.school), grade: validateGrade_(data.grade), name: validateName_(data.name, "Name"), nameKana: validateKana_(data.nameKana) };
}

function validateStaffInput_(data) {
  return { name: validateName_(data.name, "Name"), nameKana: validateKana_(data.nameKana), role: validateRole_(data.role, ["teacher", "head-teacher", "admin"]), assignedSchools: validateAssignedSchools_(data.assignedSchools) };
}

function validateNewAccountUserId_(value, accountRows) {
  const userId = String(value == null ? "" : value).trim();
  if (!/^\d{6}$/.test(userId)) throw new Error("UserId must be six ASCII digits");
  const normalized = normalizeUserId(userId);
  if (accountRows.some(row => normalizeUserId(row[0]) === normalized)) throw new Error("UserId already exists");
  return userId;
}

function writeAccountMasterRows_(sheet, rows) {
  const existing = Math.max(0, sheet.getLastRow() - 1);
  const clearCount = Math.max(existing, rows.length);
  if (clearCount) sheet.getRange(2, 1, clearCount, sheet.getLastColumn()).clearContent();
  if (rows.length) sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function validateAccountMasterState_(state) {
  assertUniqueMigrationKeys_(state.accounts, [0], "account master");
  assertUniqueMigrationKeys_(state.students, [0], "student master");
  assertUniqueMigrationKeys_(state.staff, [0], "staff master");
  assertUniqueMigrationKeys_(state.assignments, [0, 1], "staff school master");
  const roleById = Object.create(null);
  state.accounts.forEach(row => { roleById[normalizeUserId(row[0])] = validateRole_(row[4], ACCOUNT_MIGRATION_ROLES); });
  state.students.forEach(row => { if (roleById[normalizeUserId(row[0])] !== "student") throw new Error("Student reference is invalid"); });
  state.staff.forEach(row => { if (!["teacher", "head-teacher", "admin"].includes(roleById[normalizeUserId(row[0])])) throw new Error("Staff reference is invalid"); });
  state.assignments.forEach(row => { if (!["teacher", "head-teacher", "admin"].includes(roleById[normalizeUserId(row[0])])) throw new Error("Staff school reference is invalid"); });
}

function executeAccountTransaction_(buildNextState) {
  // eslint-disable-next-line no-undef
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) throw new Error("Account operation is already running");
  try {
    const sheets = assertAccountMigrationSheets_(false);
    const current = {
      accounts: getAccountMigrationDataRows_(sheets["アカウントマスター"]), students: getAccountMigrationDataRows_(sheets["生徒マスター"]),
      staff: getAccountMigrationDataRows_(sheets["講師マスター"]), assignments: getAccountMigrationDataRows_(sheets["講師担当校舎"])
    };
    const snapshot = { accounts: current.accounts.map(row => row.slice()), students: current.students.map(row => row.slice()), staff: current.staff.map(row => row.slice()), assignments: current.assignments.map(row => row.slice()) };
    const result = buildNextState(current);
    validateAccountMasterState_(current);
    const plan = [["アカウントマスター", current.accounts], ["生徒マスター", current.students], ["講師マスター", current.staff], ["講師担当校舎", current.assignments]];
    try {
      plan.forEach(([name, rows]) => writeAccountMasterRows_(sheets[name], rows));
    } catch {
      try {
        [["アカウントマスター", snapshot.accounts], ["生徒マスター", snapshot.students], ["講師マスター", snapshot.staff], ["講師担当校舎", snapshot.assignments]].forEach(([name, rows]) => writeAccountMasterRows_(sheets[name], rows));
      } catch { throw new Error("Account operation and rollback failed"); }
      throw new Error("Account operation failed and was rolled back");
    }
    return result;
  } finally { lock.releaseLock(); }
}

const ACCOUNT_API_DEBUG_VALIDATION_MESSAGES = true;

function getSafeAccountValidationMessage_(error) {
  if (!ACCOUNT_API_DEBUG_VALIDATION_MESSAGES) return "アカウント処理に失敗しました";
  const message = String(error && error.message || "");
  const exactMessages = {
    "UserId must be six ASCII digits": "IDは半角数字6桁で入力してください",
    "UserId already exists": "IDが重複しています",
    "School is invalid": "校舎が存在しません",
    "Grade is invalid": "学年が不正です",
    "Name is invalid": "氏名が不正です",
    "Name kana is invalid": "フリガナが不正です",
    "Role is invalid": "roleが不正です",
    "Assigned schools are required": "担当校舎がありません",
    "Assigned schools contain duplicates": "担当校舎が重複しています",
    "Exactly one primary school is required": "主担当校舎を1件選択してください",
    "Enabled must be boolean": "enabledの値が不正です",
    "Deleted account cannot be re-enabled": "削除済みアカウントは再有効化できません",
    "Account was not found": "対象アカウントが見つかりません",
    "Account type does not match": "アカウント種別が一致しません",
    "Student profile was not found": "生徒情報が見つかりません",
    "Staff profile was not found": "講師情報が見つかりません"
  };
  return exactMessages[message] || "アカウント処理に失敗しました";
}

function handleNewAccountAdminAction_(data) {
  const admin = requireAdminSession(data.sessionToken);
  const action = data.action;
  if (action === "checkUserIdAvailable") {
    const userId = String(data.userId == null ? "" : data.userId).trim();
    if (!/^\d{6}$/.test(userId)) return { result: "success", available: false, message: "IDは半角数字6桁で入力してください" };
    const exists = getNewAuthData_().contexts.some(user => normalizeUserId(user.userId) === normalizeUserId(userId));
    return { result: "success", available: !exists, message: exists ? "既に登録されています" : "登録可能" };
  }
  if (action === "getStudentAccounts" || action === "getStaffAccounts") {
    const users = getNewAuthData_().contexts;
    if (action === "getStudentAccounts") return { result: "success", accounts: users.filter(user => user.role === "student").map(user => ({ userId: user.userId, school: user.school, grade: user.grade, name: user.name, nameKana: user.nameKana, enabled: user.enabled, createdAt: user.createdAt, updatedAt: user.updatedAt, deletedAt: user.deletedAt })) };
    return { result: "success", accounts: users.filter(user => user.role !== "student").map(user => ({ userId: user.userId, name: user.name, nameKana: user.nameKana, role: user.role, assignedSchools: user.assignedSchools, primarySchool: user.school, enabled: user.enabled, createdAt: user.createdAt, updatedAt: user.updatedAt, deletedAt: user.deletedAt })) };
  }
  return executeAccountTransaction_(state => {
    const now = new Date();
    const targetId = normalizeUserId(data.userId);
    const accountIndex = state.accounts.findIndex(row => normalizeUserId(row[0]) === targetId);
    if (action.startsWith("create")) {
      const userId = validateNewAccountUserId_(data.userId, state.accounts);
      const password = action === "createStudentAccount" ? "netzs" + userId : "1234";
      if (action === "createStudentAccount") {
        const input = validateStudentInput_(data);
        state.accounts.push([userId, password, true, "", "student", true, "", "", now, now, ""]);
        state.students.push([userId, input.school, input.name, input.nameKana, input.grade, now, now]);
      } else {
        const input = validateStaffInput_(data);
        state.accounts.push([userId, password, true, "", input.role, true, "", "", now, now, ""]);
        state.staff.push([userId, input.name, input.nameKana, now, now]);
        input.assignedSchools.forEach(item => state.assignments.push([userId, item.school, item.isPrimary, true, now, now, admin.userId]));
      }
      return { result: "success", userId, password };
    }
    if (accountIndex < 0) throw new Error("Account was not found");
    const account = state.accounts[accountIndex];
    const isStudent = account[4] === "student";
    if ((action.includes("Student")) !== isStudent) throw new Error("Account type does not match");
    if (action.startsWith("delete")) {
      account[5] = false; account[6] = ""; account[7] = ""; account[9] = now; account[10] = now;
      if (!isStudent) {
        state.assignments.forEach(row => {
          if (normalizeUserId(row[0]) === targetId && isEnabledValue(row[3])) {
            row[3] = false;
            row[5] = now;
          }
        });
      }
      return { result: "success", userId: targetId };
    }
    if (data.enabled !== undefined && typeof data.enabled !== "boolean") throw new Error("Enabled must be boolean");
    const isDeleted = getMigrationComparableValue_(account[10]) !== "";
    if (isDeleted && data.enabled === true) throw new Error("Deleted account cannot be re-enabled");
    account[5] = data.enabled === undefined ? account[5] : data.enabled; account[9] = now;
    if (isStudent) {
      const input = validateStudentInput_(data); const index = state.students.findIndex(row => normalizeUserId(row[0]) === targetId);
      if (index < 0) throw new Error("Student profile was not found");
      state.students[index] = [targetId, input.school, input.name, input.nameKana, input.grade, state.students[index][5], now];
    } else {
      const input = validateStaffInput_(data); account[4] = input.role;
      const index = state.staff.findIndex(row => normalizeUserId(row[0]) === targetId); if (index < 0) throw new Error("Staff profile was not found");
      state.staff[index] = [targetId, input.name, input.nameKana, state.staff[index][3], now];
      state.assignments = state.assignments.filter(row => normalizeUserId(row[0]) !== targetId);
      input.assignedSchools.forEach(item => state.assignments.push([targetId, item.school, item.isPrimary, true, now, now, admin.userId]));
    }
    return { result: "success", userId: targetId };
  });
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return responseJSON({ result: "error", message: "Invalid JSON" });
  }

  // 🚀 AI判定アクションを最優先で処理（認証チェックの前に実行）
  if (data.action === "checkWithGemini") {
    const isOkResult = checkWithGemini(data.word, data.correct, data.userAns, data.apiKey);
    return responseJSON({ result: String(isOkResult).toLowerCase().trim() });
  }

  // --- APIキーによる認証 ---
  const props = PropertiesService.getScriptProperties();
  const validApiKey = props.getProperty('MY_API_KEY'); 

  if (!data.apiKey || data.apiKey !== validApiKey) {
    return responseJSON({ result: "error", message: "認証エラー" });
  }

  const newAccountActions = ["checkUserIdAvailable", "createStudentAccount", "updateStudentAccount", "deleteStudentAccount", "getStudentAccounts", "createStaffAccount", "updateStaffAccount", "deleteStaffAccount", "getStaffAccounts"];
  if (newAccountActions.includes(data.action)) {
    try {
      return responseJSON(handleNewAccountAdminAction_(data));
    } catch (error) {
      const authorizationError = isManagementAuthorizationError(error);
      return responseJSON({ result: "error", code: authorizationError ? "AUTHORIZATION_ERROR" : "VALIDATION_ERROR", message: authorizationError ? "管理者権限が必要です" : getSafeAccountValidationMessage_(error) });
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rows = getLegacyCompatibleUserRows_();

  // 💡 ユニット名から所属校舎リストを導き出すマッピング定義
  const unitGroups = {
    "高松U": ["栗林", "木太南", "水田", "番町"],
    "福岡東U": ["香椎"]
  };

  const requestedSchool = String(data.school || "").trim();
  let allowedSchools = [];

  if (requestedSchool.endsWith("U")) {
    allowedSchools = unitGroups[requestedSchool] || [];
  } else if (requestedSchool !== "") {
    allowedSchools = [requestedSchool];
  }
  
  // --- 1. ログイン処理 ---
  if (data.action === "login") {
    const inputId = normalizeUserId(data.userId);
    for (let i = 1; i < rows.length; i++) {
      const sheetId = normalizeUserId(rows[i][1]);
      if (sheetId === inputId && rows[i][9].toString() === data.password.toString()) {
        const currentRole = String(rows[i][10] || "").trim();
        const loginResult = {
          result: "success",
          school: rows[i][0],
          name: rows[i][4],
          grade: rows[i][5],
          isInitial: rows[i][8],
          role: currentRole,
          assignedSchools: findUserRecord(inputId).assignedSchools
        };
        if (currentRole === "admin") {
          try {
            const managementSession = createManagementSession(inputId, currentRole);
            loginResult.sessionToken = managementSession.sessionToken;
            loginResult.sessionExpiresAt = managementSession.sessionExpiresAt;
          } catch {
            return responseJSON({
              result: "error",
              code: "MANAGEMENT_SESSION_SETUP_ERROR",
              message: "管理者ログインの設定が完了していません"
            });
          }
        }
        if (currentRole === "student") {
          try {
            appendStudentPermissionInfo(loginResult, inputId, currentRole);
          } catch {
            return responseJSON({
              result: "error",
              code: "STUDENT_PERMISSION_ERROR",
              message: "利用可能コンテンツの取得に失敗しました"
            });
          }
        }
        return responseJSON(loginResult);
      }
    }
    return responseJSON({ result: "fail", message: "IDまたはパスワードが違います。" });
  }

  if (data.action === "logout") {
    try {
      deleteManagementSession(data.sessionToken);
      return responseJSON({ result: "success" });
    } catch (e) {
      return responseJSON({ result: "error", message: "ログアウト処理に失敗しました" });
    }
  }

  if (data.action === "getSukimakunPermissionMatrix") {
    try {
      const adminSession = requireAdminSession(data.sessionToken);
      const school = typeof data.school === "string" ? data.school.trim() : "";
      const grade = normalizeGrade(data.grade);
      const isSupportedGrade = /^(小[1-6]|中[1-3]|高[1-3]|大学受験)$/.test(grade);
      if (!school || !grade || school.length > 100 || grade.length > 30 || !isSupportedGrade) {
        return responseJSON({ result: "error", code: "VALIDATION_ERROR", message: "校舎と学年を正しく指定してください" });
      }

      const allContents = getSukimakunContents(true);
      const activeContents = allContents.filter(content => content.enabled);
      const studentRows = rows.slice(1).filter(row => String(row[10] || "").trim() === "student");
      const validSchools = new Set(studentRows.map(row => String(row[0] || "").trim()).filter(Boolean));
      if (!validSchools.has(school)) {
        return responseJSON({ result: "error", code: "VALIDATION_ERROR", message: "指定された校舎または学年は利用できません" });
      }

      const targetStudentRows = studentRows
        .filter(row => String(row[0] || "").trim() === school && normalizeGrade(row[5]) === grade);
      let permissionStateMap = Object.create(null);
      if (targetStudentRows.length > 0) {
        const targetUserIds = new Set(targetStudentRows.map(row => normalizeUserId(row[1])));
        const allPermissionRows = getRequiredSheet(SUKIMAKUN_PERMISSION_SHEET_NAME).getDataRange().getValues();
        const permissionRows = allPermissionRows.slice(0, 1).concat(
          allPermissionRows.slice(1).filter(row => targetUserIds.has(normalizeUserId(row[0])))
        );
        permissionStateMap = buildSukimakunPermissionStateMap(permissionRows, activeContents);
      }
      const students = targetStudentRows
        .map(row => {
          const userId = normalizeUserId(row[1]);
          const permissionState = getSukimakunPermissionStateFromMap(userId, activeContents, permissionStateMap);
          return {
            userId,
            name: String(row[4] || "").trim(),
            school: String(row[0] || "").trim(),
            grade: String(row[5] || "").trim(),
            allowedContentIds: permissionState.allowedContentIds,
            permissionsInitialized: permissionState.permissionsInitialized,
            permissionWarnings: permissionState.warnings
          };
        });

      return responseJSON({
        result: "success",
        contents: allContents,
        students,
        sessionExpiresAt: adminSession.sessionExpiresAt
      });
    } catch (e) {
      const isAuthorizationError = isManagementAuthorizationError(e);
      return responseJSON({
        result: "error",
        code: isAuthorizationError ? "AUTHORIZATION_ERROR" : "DATA_ERROR",
        message: isAuthorizationError ? "管理セッションが無効か、権限がありません" : "スキマ君利用権限を取得できません"
      });
    }
  }

  if (data.action === "updateSukimakunPermissions") {
    try {
      const adminSession = requireAdminSession(data.sessionToken);
      const targetUserId = normalizeUserId(data.targetUserId);
      if (!targetUserId || !Array.isArray(data.allowedContentIds)) {
        return responseJSON({ result: "error", code: "VALIDATION_ERROR", message: "対象生徒と利用権限を正しく指定してください" });
      }
      const targetUser = findUserRecord(targetUserId);
      if (!targetUser || targetUser.role !== "student") {
        return responseJSON({ result: "error", code: "VALIDATION_ERROR", message: "対象の生徒が見つかりません" });
      }

      const updateResult = replaceStudentSukimakunPermissions(targetUserId, data.allowedContentIds, adminSession.userId);
      const permissionState = getSukimakunPermissionState(targetUserId, updateResult.activeContents);
      return responseJSON({
        result: "success",
        targetUserId,
        allowedContentIds: permissionState.allowedContentIds,
        permissionsInitialized: permissionState.permissionsInitialized,
        updatedAt: updateResult.updatedAt.toISOString(),
        sessionExpiresAt: adminSession.sessionExpiresAt
      });
    } catch (e) {
      const isAuthorizationError = isManagementAuthorizationError(e);
      return responseJSON({
        result: "error",
        code: isAuthorizationError ? "AUTHORIZATION_ERROR" : "VALIDATION_ERROR",
        message: isAuthorizationError ? "管理セッションが無効か、権限がありません" : "利用権限を更新できません"
      });
    }
  }

  // --- 2. パスワード変更処理 ---
  if (data.action === "changePassword") {
    const user = findUserRecord(data.userId);
    if (!user) return responseJSON({ result: "error", message: "User not found" });
    const sheet = getRequiredSheet("アカウントマスター");
    const now = new Date();
    sheet.getRange(user.rowIndex, 2).setValue(data.newPassword);
    sheet.getRange(user.rowIndex, 3).setValue(false);
    sheet.getRange(user.rowIndex, 4).setValue(now);
    sheet.getRange(user.rowIndex, 10).setValue(now);
    return responseJSON({ result: "success" });
  }

  // --- 3. 丸付け依頼の通知登録 ---
  if (data.action === "sendNotification") {
    const notifySheet = ss.getSheetByName("通知_" + data.unit);
    if (!notifySheet) return responseJSON({ result: "error", message: "Sheet not found" });

    const lastRow = notifySheet.getLastRow();
    let nextNumber = 1;
    if (lastRow >= 2) {
      const numbers = notifySheet.getRange(2, 7, lastRow - 1, 1).getValues();
      const maxNum = numbers.reduce((max, curr) => (Number(curr[0]) > max ? Number(curr[0]) : max), 0);
      nextNumber = maxNum + 1;
    }

    const formattedId = "'" + String(data.userId || "").replace(/^'/, "").trim();

    notifySheet.appendRow([
      new Date(), 
      data.school, 
      formattedId, 
      data.userName, 
      data.grade, 
      data.status, 
      nextNumber
    ]);

    return responseJSON({ result: "success", queueNumber: nextNumber });
  }

  // --- 4. 通知取得処理 ---
  if (data.action === "getNotifications") {
    const notifySheet = ss.getSheetByName("通知_" + data.unit);
    if (!notifySheet) return responseJSON({ result: "success", notifications: [] });
    const lastRow = notifySheet.getLastRow();
    if (lastRow <= 1) return responseJSON({ result: "success", notifications: [] });
    const nRows = notifySheet.getRange(2, 1, lastRow - 1, 7).getValues();
    const notifications = nRows.map(row => ({
      time: row[0] instanceof Date ? Utilities.formatDate(row[0], "JST", "HH:mm") : "",
      school: row[1], userId: row[2], name: row[3], grade: row[4], status: row[5], queueNumber: row[6]
    }));
    return responseJSON({ result: "success", notifications });
  }

  // --- 5. 通知対応開始処理 ---
  if (data.action === "startSupport") {
    const notifySheet = ss.getSheetByName("通知_" + data.unit);
    if (!notifySheet) return responseJSON({ result: "error", message: "Sheet not found" });

    const lastRow = notifySheet.getLastRow();
    const rows = notifySheet.getRange(1, 1, lastRow, 7).getValues();
    let targetRow = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][6].toString() === data.queueNumber.toString()) { 
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow !== -1) {
      const currentStatus = rows[targetRow-1][5];
      if (!currentStatus.includes("（対応中）")) {
        notifySheet.getRange(targetRow, 6).setValue(currentStatus + "（対応中）");
      }
      return responseJSON({ result: "success" });
    }
    return responseJSON({ result: "error", message: "対象が見つかりません" });
  }

  // --- 6. 通知削除処理 (対応完了) ---
  if (data.action === "deleteNotification") {
    const notifySheet = ss.getSheetByName("通知_" + data.unit);
    const notifyData = notifySheet.getDataRange().getValues();
    let targetRow = -1;
    for (let i = notifyData.length - 1; i >= 1; i--) {
      if (notifyData[i][6].toString() === data.queueNumber.toString()) {
        targetRow = i + 1; break;
      }
    }
    if (targetRow !== -1) {
      notifySheet.deleteRow(targetRow);
      const remLast = notifySheet.getLastRow();
      if (remLast >= 2) {
        for (let j = 2; j <= remLast; j++) notifySheet.getRange(j, 7).setValue(j - 1);
      }
    }
    return responseJSON({ result: "success" });
  }
  
  // --- 7. 学校進捗の登録済みデータを取得 ---
  if (data.action === "getStudentSchoolProgress") {
    try {
      const formattedId = "'" + String(data.userId).replace(/^'/, "").trim();
      let completedList = [];

      const ssC = openSpreadsheetByProperty("SCHOOL_PROGRESS_SPREADSHEET_ID");
      const sheetC = ssC.getSheetByName("progress") || ssC.getSheets()[0];
      const rowsC = sheetC.getDataRange().getValues();
      
      for (let i = 1; i < rowsC.length; i++) {
        const rowId = "'" + String(rowsC[i][2]).replace(/^'/, "").trim(); 
        if (rowId === formattedId) {
          const unitsStr = String(rowsC[i][7] || ""); 
          if (unitsStr) {
            const parts = unitsStr.split(",");
            parts.forEach(p => {
              if (p.trim() !== "") {
                completedList.push(p.trim().toLowerCase().replace(/[\.\s]/g, ""));
              }
            });
          }
        }
      }
      return responseJSON({ result: "success", completedPages: Array.from(new Set(completedList)) });
    } catch (e) {
      return responseJSON({ result: "error", message: e.toString() });
    }
  }

  // --- 8. 個トレ進捗の登録済みデータを取得 ---
  if (data.action === "getStudentKoToreProgress") {
    try {
      const formattedId = "'" + String(data.userId).replace(/^'/, "").trim();
      let completedList = [];

      const ssB = openSpreadsheetByProperty("KOTORE_PROGRESS_SPREADSHEET_ID");
      const sheetB = ssB.getSheetByName("progress") || ssB.getSheets()[0];
      const rowsB = sheetB.getDataRange().getValues();
      
      for (let i = 1; i < rowsB.length; i++) {
        const rowId = "'" + String(rowsB[i][2]).replace(/^'/, "").trim(); 
        if (rowId === formattedId) {
          const subject = String(rowsB[i][5] || "").trim(); 
          const unitsStr = String(rowsB[i][7] || ""); 
          
          if (subject && unitsStr) {
            const parts = unitsStr.split(",");
            parts.forEach(p => {
              if (p.trim() !== "") {
                const fullKey = `${subject}${p.trim()}`.toLowerCase().replace(/[\.\s]/g, "");
                completedList.push(fullKey);
              }
            });
          }
        }
      }
      return responseJSON({ result: "success", completedPages: Array.from(new Set(completedList)) });
    } catch (e) {
      return responseJSON({ result: "error", message: e.toString() });
    }
  }

  // --- 9. 個トレ進捗保存 ---
  if (data.action === "saveProgress") {
    const ssB = openSpreadsheetByProperty("KOTORE_PROGRESS_SPREADSHEET_ID");
    const sheetB = ssB.getSheetByName("progress");
    const formattedId = "'" + String(data.userId).replace(/^'/, "").trim();
    data.progressData.forEach(item => {
      if (item.units && item.units.length > 0) {
        const unitsText = Array.isArray(item.units) ? item.units.join(", ") : item.units;
        sheetB.appendRow([new Date(), data.school, formattedId, data.userName, data.grade, item.subject, item.text, unitsText]);
      }
    });
    return responseJSON({ result: "success" });
  }

  // --- 10. 学校進捗保存 ---
  if (data.action === "saveSchoolProgress") {
    const ssC = openSpreadsheetByProperty("SCHOOL_PROGRESS_SPREADSHEET_ID");
    const sheetC = ssC.getSheetByName("progress");
    const formattedId = "'" + String(data.userId).replace(/^'/, "").trim();
    data.progressData.forEach(item => {
      if (item.units && item.units.length > 0) {
        const unitsText = Array.isArray(item.units) ? item.units.join(", ") : item.units;
        sheetC.appendRow([new Date(), data.school, formattedId, data.userName, data.grade, item.subject, item.text, unitsText]);
      }
    });
    return responseJSON({ result: "success" });
  }

  // --- 11. 講師：テスト振り返り状況マトリックス取得 ---
  if (data.action === "getTestReviewMatrix") {
    try {
      const userRowsData = rows;

      const ssReview = openSpreadsheetByProperty("TEST_REVIEW_SPREADSHEET_ID");
      const reviewSheet = ssReview.getSheets()[0]; 
      const reviewRows = reviewSheet.getDataRange().getValues();
      const reviewHeaders = reviewRows[0];

      const targetSchool = String(data.school || "").trim();
      const targetGrades = data.grades || []; 
      const targetTest = String(data.testName || "").trim();
      const targetYear = String(data.year || "2026年度").replace("年度", "").trim();

      const studentList = userRowsData.slice(1).filter(row => {
        const sSchool = String(row[0] || "").trim();
        const sGrade  = String(row[5] || "").trim();
        const sRole   = String(row[10] || "").trim().toLowerCase();
        
        const isSchoolMatch = (targetSchool.includes("一括") || targetSchool.includes("ユニット")) ? true : (sSchool === targetSchool);
        return isSchoolMatch && (sRole === "student") && (targetGrades.includes(sGrade));
      }).map(row => ({
        school: String(row[0] || "").trim(),
        userId: String(row[1] || "").replace(/^'/, "").trim(), 
        name: String(row[4] || "").trim(),                     
        grade: String(row[5] || "").trim()                     
      }));

      const idxID = reviewHeaders.indexOf("生徒番号を入力してください");
      const idxTest = reviewHeaders.indexOf("テストを選んでください");
      const idxGood = reviewHeaders.indexOf("よかったこと");
      const idxBad = reviewHeaders.indexOf("改善点");
      const idxNext = reviewHeaders.indexOf("次回に向けて");

      const idxJaG = reviewHeaders.indexOf("国語の勉強方法で点につながったことは何ですか？？");
      const idxJaB = reviewHeaders.indexOf("国語の勉強方法で点につながらなかったことは何ですか？？");
      const idxJaN = reviewHeaders.indexOf("次回の定期テストに向けて国語はどんな勉強をしていきますか？？");

      const idxMaG = reviewHeaders.indexOf("数学の勉強方法で点につながったことは何ですか？？");
      const idxMaB = reviewHeaders.indexOf("数学の勉強方法で点につながらなかったことは何ですか？？");
      const idxMaN = reviewHeaders.indexOf("次回の定期テストに向けて数学はどんな勉強をしていきますか？？");

      const idxEnG = reviewHeaders.indexOf("英語の勉強方法で点につながったことは何ですか？？");
      const idxEnB = reviewHeaders.indexOf("英語の勉強方法で点につながらなかったことは何ですか？？");
      const idxEnN = reviewHeaders.indexOf("次回の定期テストに向けて英語はどんな勉強をしていきますか？？");

      const idxScG = reviewHeaders.indexOf("理科の勉強方法で点につながったことは何ですか？？");
      const idxScB = reviewHeaders.indexOf("理科の勉強方法で点につながらなかったことは何ですか？？");
      const idxScN = reviewHeaders.indexOf("次回の定期テストに向けて理科はどんな勉強をしていきますか？？");

      const idxSoG = reviewHeaders.indexOf("社会の勉強方法で点につながったことは何ですか？？");
      const idxSoB = reviewHeaders.indexOf("社会の勉強方法で点につながらなかったことは何ですか？？");
      const idxSoN = reviewHeaders.indexOf("次回の定期テストに向けて社会はどんな勉強をしていきますか？？");

      const filteredReviews = reviewRows.slice(1).filter(row => {
        const ts = row[0];
        if (!(ts instanceof Date)) return false;
        const fYear = (ts.getMonth() + 1 >= 1 && ts.getMonth() + 1 <= 3) ? ts.getFullYear() - 1 : ts.getFullYear();
        
        const rTest = String(row[idxTest] || "").trim();
        const rYear = String(fYear);
        return (rYear === targetYear) && (rTest === targetTest);
      });

      const matrix = studentList.map(student => {
        const studentReviews = filteredReviews.filter(r => 
          String(r[idxID] || "").replace(/^'/, "").trim() === student.userId
        );

        const resultData = {
          school: student.school,
          name: student.name,
          userId: student.userId,
          grade: student.grade,
          isSubmitted: studentReviews.length > 0, 
          details: { good: "", bad: "", next: "" },
          subjects: {
            japanese: { good: "", bad: "", next: "" },
            math:     { good: "", bad: "", next: "" },
            english:  { good: "", bad: "", next: "" },
            science:  { good: "", bad: "", next: "" },
            social:   { good: "", bad: "", next: "" }
          }
        };

        studentReviews.forEach(review => {
          const gText = String(review[idxGood] || "").trim();
          const bText = String(review[idxBad] || "").trim();
          const nText = String(review[idxNext] || "").trim();

          if (gText) resultData.details.good = gText;
          if (bText) resultData.details.bad = bText;
          if (nText) resultData.details.next = nText;

          const subMapping = {
            japanese: { g: idxJaG, b: idxJaB, n: idxJaN },
            math:     { g: idxMaG, b: idxMaB, n: idxMaN },
            english:  { g: idxEnG, b: idxEnB, n: idxEnN },
            science:  { g: idxScG, b: idxScB, n: idxScN },
            social:   { g: idxSoG, b: idxSoB, n: idxSoN }
          };

          Object.keys(subMapping).forEach(sub => {
            const idxs = subMapping[sub];
            const subG = idxs.g !== -1 ? String(review[idxs.g] || "").trim() : "";
            const subB = idxs.b !== -1 ? String(review[idxs.b] || "").trim() : "";
            const subN = idxs.n !== -1 ? String(review[idxs.n] || "").trim() : "";

            if (subG) resultData.subjects[sub].good = subG;
            if (subB) resultData.subjects[sub].bad  = subB;
            if (subN) resultData.subjects[sub].next = subN;
          });
        });

        return resultData;
      });

      return responseJSON({ result: "success", matrix: matrix });

    } catch (e) {
      return responseJSON({ result: "error", message: "GASエラー: " + e.toString() });
    }
  }

  // --- 12. スキマ君連携：トークン発行処理 ---
  if (data.action === "issueToken") {
    try {
      const user = findUserRecord(data.userId);
      if (!user || user.role !== "student") return responseJSON({ result: "error", message: "ユーザーが見つかりません" });

      const token = Math.floor(100000 + Math.random() * 900000).toString();
      const expireTime = new Date(new Date().getTime() + 5 * 60000); 

      const accountSheet = getRequiredSheet("アカウントマスター");
      accountSheet.getRange(user.rowIndex, 7).setValue(token);
      accountSheet.getRange(user.rowIndex, 8).setValue(expireTime);
      accountSheet.getRange(user.rowIndex, 10).setValue(new Date());

      return responseJSON({ result: "success", token: token });
    } catch (e) {
      return responseJSON({ result: "error", message: e.toString() });
    }
  }

  // --- 13. スキマ君連携：トークン検証処理 ---
  if (data.action === "validateToken") {
    try {
      const user = findUserRecord(data.userId);
      if (!user || user.role !== "student") return responseJSON({ result: "error", message: "ユーザーが見つかりません" });
      const savedToken = user.token;
      const expireTime = new Date(user.tokenExpire);
      const now = new Date();

      if (savedToken.toString() === data.token.toString() && now < expireTime) {
        const result = {
          result: "success",
          school: user.school,
          name: user.name,
          grade: user.grade,
          role: user.role
        };

        appendStudentPermissionInfo(result, data.userId, user.role);
        
        const accountSheet = getRequiredSheet("アカウントマスター");
        accountSheet.getRange(user.rowIndex, 7).clearContent();
        accountSheet.getRange(user.rowIndex, 8).clearContent();
        accountSheet.getRange(user.rowIndex, 10).setValue(new Date());

        return responseJSON(result);
      } else {
        return responseJSON({ result: "error", message: "トークンが無効または期限切れです" });
      }
    } catch (e) {
      return responseJSON({ result: "error", message: e.toString() });
    }
  }

  // --- 14. アカウント発行処理 ---
  if (data.action === "createAccount") {
    const userSheet = getLegacyAccountSheet_();
    const accountLock = LockService.getDocumentLock();
    try {
      accountLock.waitLock(10000);
      const lastRow = userSheet.getLastRow();
      const nextRow = lastRow + 1;
      const formattedUserId = formatUserIdForSheet(data.userId);
      const normalizedCreatedUserId = normalizeUserId(formattedUserId);
      const initialFlag = (data.role === "teacher");

      const newRow = [
        data.school,      
        formattedUserId,  
        "", "", 
        data.userName,    
        data.grade,       
        "", "", 
        initialFlag,      
        data.password,    
        data.role         
      ];

      userSheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
      try {
        if (data.role === "student") {
          initializeStudentPermissionsForUser(formattedUserId, "system:createAccount", true);
        }
      } catch {
        const insertedRowUserId = normalizeUserId(userSheet.getRange(nextRow, 2).getValue());
        const rollbackSucceeded = insertedRowUserId === normalizedCreatedUserId;
        if (rollbackSucceeded) userSheet.deleteRow(nextRow);
        return responseJSON({
          result: "error",
          code: rollbackSucceeded ? "PERMISSION_INITIALIZATION_ERROR" : "ACCOUNT_ROLLBACK_ERROR",
          message: rollbackSucceeded
            ? "アカウントを作成できませんでした。スキマ君利用権限の初期化を確認してください"
            : "アカウント作成の復元を完了できませんでした。管理者へ確認してください"
        });
      }
      return responseJSON({ result: "success", permissionsInitialized: data.role === "student" });
    } catch (e) {
      return responseJSON({ result: "error", message: e.toString() });
    } finally {
      if (accountLock.hasLock()) accountLock.releaseLock();
    }
  }

  // --- 15. 学校進捗マトリックスデータ取得 ---
  if (data.action === "getSchoolProgressMatrix") {
    try {
      const userRowsLocal = rows;

      const ssProgress = openSpreadsheetByProperty("SCHOOL_PROGRESS_SPREADSHEET_ID");
      const progressSheet = ssProgress.getSheetByName("progress");
      const progressRows = progressSheet.getDataRange().getValues();

      const unitHeaders = data.masterUnits || [];
      const targetGrade  = String(data.grade || "").trim();
      const targetSubject = String(data.subject || "").trim(); 

      const studentList = userRowsLocal.slice(1).filter(row => {
        const sSchool = String(row[0] || "").trim();      
        const sGrade  = String(row[5] || "").trim();      
        const sRole   = String(row[10] || "").trim().toLowerCase(); 

        return (allowedSchools.includes(sSchool)) && (sRole === "student") && (sGrade === targetGrade);
      }).map(row => ({
        school: String(row[0] || "").trim(), 
        userId: String(row[1] || "").trim(), 
        name: String(row[4] || "").trim()    
      }));

      const matrix = studentList.map(student => {
        const studentHistoryText = progressRows.slice(1)
          .filter(p => {
            const sheetId = String(p[2] || "").replace(/^'/, "").trim(); 
            const pSubject = String(p[5] || "").trim();                  
            const targetId = student.userId.replace(/^'/, "").trim();
            return sheetId === targetId && pSubject === targetSubject;
          })
          .map(p => String(p[7] || "")) 
          .join(" , "); 

        return {
          ...student,
          completions: unitHeaders.map(header => {
            const headerMatch = header.match(/p\.?\d+(?:-\d+)?/i);
            if (!headerMatch) return false;
            const targetPage = headerMatch[0].toLowerCase().replace(/[\.\s]/g, "");
            const normalizedProgress = studentHistoryText.toLowerCase().replace(/[\.\s]/g, "");
            return normalizedProgress.includes(targetPage);
          })
        };
      });

      return responseJSON({ result: "success", headers: unitHeaders, matrix: matrix });
    } catch (e) {
      return responseJSON({ result: "error", message: e.toString() });
    }
  }

  // --- 16. 個トレ進捗マトリックス取得 ---
  if (data.action === "getKoToreProgressMatrix") {
    try {
      const userRowsLocal = rows;

      const ssKoTore = openSpreadsheetByProperty("KOTORE_PROGRESS_SPREADSHEET_ID");
      const progressSheet = ssKoTore.getSheetByName("progress") || ssKoTore.getSheets()[0];
      const progressRows = progressSheet.getDataRange().getValues();

      const unitPages = data.masterUnits || []; 
      const targetSubject = String(data.subject || "").trim(); 
      const targetText = String(data.textName || "").trim();   
      const targetGrade = String(data.grade || "").trim();

      const studentList = userRowsLocal.slice(1).filter(row => {
        const sSchool = String(row[0] || "").trim();
        const sGrade  = String(row[5] || "").trim();
        const sRole   = String(row[10] || "").trim().toLowerCase();
        return (allowedSchools.includes(sSchool)) && (sRole === "student") && (sGrade === targetGrade);
      }).map(row => ({ 
        school: String(row[0] || "").trim(),
        userId: String(row[1] || "").replace(/^'/, "").trim(),
        name: String(row[4] || "").trim()
      }));

      const filteredProgress = progressRows.slice(1).filter(p => {
        const pSchool  = String(p[1] || "").trim(); 
        const pGrade   = String(p[4] || "").trim(); 
        const pSubject = String(p[5] || "").trim(); 
        const pText    = String(p[6] || "").trim(); 
        return allowedSchools.includes(pSchool) && pGrade === targetGrade && pSubject === targetSubject && pText === targetText;
      });

      const matrix = studentList.map(student => {
        const studentHistory = filteredProgress
          .filter(p => String(p[2] || "").replace(/^'/, "").trim() === student.userId)
          .map(p => String(p[7] || "")) 
          .join(" , ");

        const normalizedHistory = studentHistory.toLowerCase().replace(/[\.\s]/g, "");

        return {
          school: student.school,
          name: student.name,
          userId: student.userId,
          completions: unitPages.map(pageStr => {
            if (!pageStr) return false;
            const target = pageStr.toLowerCase().replace(/[\.\s]/g, "");
            return normalizedHistory.includes(target);
          })
        };
      });

      return responseJSON({ result: "success", headers: unitPages, matrix: matrix });
    } catch (e) {
      return responseJSON({ result: "error", message: "GASエラー: " + e.toString() });
    }
  }

  // --- 17. アプリ利用チェック ---
  if (data.action === "getAppUsageMatrix") {
    try {
      const appSS = openSpreadsheetByProperty("APP_USAGE_SPREADSHEET_ID");
      const appSheets = appSS.getSheets();
      const targetSchool = data.school; 
      const targetGradeStr = data.grade; 
      const targetGrades = targetGradeStr ? targetGradeStr.split(',') : []; 
      const appNames = [];
      const studentMap = {};

      rows.slice(1).forEach(row => {
        const sSchool = String(row[0]).trim();
        const sGrade = String(row[5]).trim();
        const sRole = String(row[10]).trim().toLowerCase();
        const sName = String(row[4]).trim();

        if (sSchool === targetSchool && targetGrades.includes(sGrade) && sRole === "student") {
          studentMap[sName] = {
            school: sSchool,
            name: sName,
            grade: sGrade,
            usageData: {} 
          };
        }
      });

      appSheets.forEach(sheet => {
        const appName = sheet.getName();
        if (appName.includes("シート")) return; 
        
        appNames.push(appName);
        const dataRows = sheet.getDataRange().getValues();
        if (dataRows.length <= 1) return; 
        
        for (let i = 1; i < dataRows.length; i++) {
          const date = dataRows[i][0];
          const name = String(dataRows[i][3]).trim();   
          const range = String(dataRows[i][2]).trim();  
          const mode = String(dataRows[i][5]).trim();   
          const score = dataRows[i][6] !== undefined && dataRows[i][6] !== "" ? String(dataRows[i][6]).trim() : "";
          const total = dataRows[i][7] !== undefined && dataRows[i][7] !== "" ? String(dataRows[i][7]).trim() : "";

          if (studentMap[name]) {
            if (!studentMap[name].usageData[appName]) {
              studentMap[name].usageData[appName] = [];
            }

            let dateStr = "-";
            if (date instanceof Date) {
              dateStr = Utilities.formatDate(date, "JST", "yyyy/MM/dd HH:mm");
            } else if (date) {
              dateStr = String(date);
            }
            
            studentMap[name].usageData[appName].push({
              date: dateStr,
              appName: appName,
              range: range || "-",
              mode: mode || "-", 
              score: score, 
              total: total,
              rawDate: date instanceof Date ? date.getTime() : 0
            });
          }
        }
      });

      return responseJSON({
        result: "success",
        apps: appNames,
        students: Object.values(studentMap)
      });
    } catch (e) {
      return responseJSON({ result: "error", message: "GASエラー: " + e.toString() });
    }
  }

  // --- 18. アカウント削除処理 ---
  if (data.action === "deleteAccount") {
    try {
      const userSheet = getLegacyAccountSheet_();
      const lastRow = userSheet.getLastRow();
      const targetId = String(data.userId || "").trim().replace(/^'/, ""); 

      let targetRow = -1;
      for (let i = 1; i < lastRow; i++) {
        const sheetId = String(rows[i][1]).replace(/^'/, "").trim();
        if (sheetId === targetId) {
          targetRow = i + 1; 
          break;
        }
      }

      if (targetRow !== -1) {
        userSheet.deleteRow(targetRow);
        return responseJSON({ result: "success" });
      } else {
        return responseJSON({ result: "error", message: "該当するIDのアカウントが見つかりませんでした" });
      }
    } catch (e) {
      return responseJSON({ result: "error", message: "GAS削除エラー: " + e.toString() });
    }
  }

  // --- 19. 削除画面用のアカウント一覧取得 ---
  if (data.action === "getAccountsForDelete") {
    try {
      const accounts = rows.slice(1).filter(row => {
        const sSchool = String(row[0] || "").trim();      
        const sGrade  = String(row[5] || "").trim();      
        const sRole   = String(row[10] || "").trim().toLowerCase(); 
        return (allowedSchools.includes(sSchool)) && (sRole === "student" || sRole === "teacher") && (targetGrades.includes(sGrade) || (sRole === "teacher" && targetGrades.includes("講師")));
      }).map(row => ({
        school: String(row[0] || "").trim(),
        userId: String(row[1] || "").replace(/^'/, "").trim(), 
        name: String(row[4] || "").trim(),                     
        grade: String(row[5] || "").trim()                     
      }));

      return responseJSON({ result: "success", accounts: accounts });
    } catch (e) {
      return responseJSON({ result: "error", message: "GAS一覧取得エラー: " + e.toString() });
    }
  }

  // --- 20. チェックボックスによる複数アカウント一括削除 ---
  if (data.action === "deleteAccountsBulk") {
    try {
      const userSheet = getLegacyAccountSheet_();
      const lastRow = userSheet.getLastRow();
      const targetIds = data.userIds || []; 

      if (targetIds.length === 0) {
        return responseJSON({ result: "error", message: "削除対象のIDが指定されていません" });
      }

      let deleteCount = 0;
      for (let i = lastRow - 1; i >= 1; i--) {
        const sheetId = String(rows[i][1]).replace(/^'/, "").trim(); 
        if (targetIds.includes(sheetId)) {
          userSheet.deleteRow(i + 1); 
          deleteCount++;
        }
      }
      return responseJSON({ result: "success", deletedCount: deleteCount });
    } catch (e) {
      return responseJSON({ result: "error", message: "GAS一括削除エラー: " + e.toString() });
    }
  }

  // ==========================================================
  // 💡 【修正確定版】過去の振り返り：タイムスタンプから「年度」を自動計算して一覧を返す
  // ==========================================================
  if (data.action === "getStudentTestReviewOptions") {
    try {
      const ssReview = openSpreadsheetByProperty("TEST_REVIEW_SPREADSHEET_ID");
      const reviewSheet = ssReview.getSheets()[0]; 
      const reviewRows = reviewSheet.getDataRange().getValues();
      const reviewHeaders = reviewRows[0];

      const targetUserId = String(data.userId || "").replace(/^'/, "").trim();

      let idxID = reviewHeaders.findIndex(function(h) { return String(h).includes("生徒番号"); });
      let idxTest = reviewHeaders.findIndex(function(h) { return String(h).includes("テストを選んで"); });

      if (idxID === -1) idxID = 2;   
      if (idxTest === -1) idxTest = 7; 

      const yearsSet = {};
      const testsSet = {};

      for (let i = 1; i < reviewRows.length; i++) {
        const row = reviewRows[i];
        if (row.length <= idxTest) continue;

        const rId = String(row[idxID] || "").replace(/^'/, "").trim();
        if (rId !== targetUserId) continue; 

        const rTest = String(row[idxTest] || "").trim();
        
        // 💡 A列のタイムスタンプから「〇〇年度」を100%自動算出（4月1日〜翌3月31日を同一年度とする）
        let rYear = "2026年度"; 
        if (row[0] instanceof Date) {
          let y = row[0].getFullYear();
          let m = row[0].getMonth() + 1;
          if (m < 4) y--; // 1月〜3月なら前年度にする
          rYear = y + "年度";
        }

        if (rTest) testsSet[rTest] = true;
        if (rYear) yearsSet[rYear] = true;
      }

      return responseJSON({ 
        result: "success", 
        years: Object.keys(yearsSet).sort().reverse(), // 最新の年度を一番上に
        tests: Object.keys(testsSet)
      });
    } catch (e) {
      return responseJSON({ result: "error", message: "GASエラー: " + e.toString() });
    }
  }

  // ==========================================================
  // 💡 【修正確定版】過去の振り返り：特定の「自動計算年度×テスト名」に合致する18項目を取得
  // ==========================================================
  if (data.action === "getStudentSpecificReview") {
    try {
      const ssReview = openSpreadsheetByProperty("TEST_REVIEW_SPREADSHEET_ID");
      const reviewSheet = ssReview.getSheets()[0];
      const reviewRows = reviewSheet.getDataRange().getValues();
      const reviewHeaders = reviewRows[0];

      const targetUserId = String(data.userId || "").replace(/^'/, "").trim();
      const targetYear   = String(data.year || "").trim(); // Reactから「2026年度」の形で届く
      const targetTest   = String(data.testName || "").trim();

      const idxID    = reviewHeaders.findIndex(function(h) { return String(h).includes("生徒番号"); });
      const idxTest  = reviewHeaders.findIndex(function(h) { return String(h).includes("テストを選んで"); });
      
      const idxGood  = reviewHeaders.findIndex(function(h) { return String(h).includes("全体") && String(h).includes("よかった"); });
      const idxBad   = reviewHeaders.findIndex(function(h) { return String(h).includes("全体") && String(h).includes("改善"); });
      const idxNext  = reviewHeaders.findIndex(function(h) { return String(h).includes("次回に向けて") && !String(h).includes("国語") && !String(h).includes("数学") && !String(h).includes("英語") && !String(h).includes("理科") && !String(h).includes("社会"); });

      const subjects = ['国語', '数学', '英語', '理科', '社会'];
      const subKeys = ['japanese', 'math', 'english', 'science', 'social'];
      const subIdxMap = {};

      for (let s = 0; s < subKeys.length; s++) {
        const key = subKeys[s];
        const subName = subjects[s];
        subIdxMap[key] = {
          g: reviewHeaders.findIndex(function(h) { return String(h).includes(subName) && String(h).includes("つながった"); }),
          b: reviewHeaders.findIndex(function(h) { return String(h).includes(subName) && String(h).includes("つながらなかった"); }),
          n: reviewHeaders.findIndex(function(h) { return String(h).includes(subName) && String(h).includes("次回の定期"); })
        };
      }

      const reviewData = {
        details: { good: "", bad: "", next: "" },
        subjects: {
          japanese: { good: "", bad: "", next: "" },
          math:     { good: "", bad: "", next: "" },
          english:  { good: "", bad: "", next: "" },
          science:  { good: "", bad: "", next: "" },
          social:   { good: "", bad: "", next: "" }
        }
      };

      for (let i = 1; i < reviewRows.length; i++) {
        const row = reviewRows[i];
        const rId = String(row[idxID !== -1 ? idxID : 2] || "").replace(/^'/, "").trim();
        const rTest = String(row[idxTest !== -1 ? idxTest : 7] || "").trim();
        
        // 💡 ここでも全く同じルールでタイムスタンプから年度を自動計算して突合
        let rYear = "2026年度";
        if (row[0] instanceof Date) {
          let y = row[0].getFullYear();
          let m = row[0].getMonth() + 1;
          if (m < 4) y--;
          rYear = y + "年度";
        }

        // 生徒ID、テスト名、そして自動計算された年度がすべてReactの選択と一致するか判定
        if (rId !== targetUserId || rTest !== targetTest || rYear !== targetYear) continue;

        if (idxGood !== -1 && row[idxGood]) reviewData.details.good = String(row[idxGood]).trim();
        if (idxBad !== -1 && row[idxBad])   reviewData.details.bad  = String(row[idxBad]).trim();
        if (idxNext !== -1 && row[idxNext]) reviewData.details.next = String(row[idxNext]).trim();

        for (let s = 0; s < subKeys.length; s++) {
          const key = subKeys[s];
          const idxs = subIdxMap[key];
          if (idxs.g !== -1 && row[idxs.g]) reviewData.subjects[key].good = String(row[idxs.g]).trim();
          if (idxs.b !== -1 && row[idxs.b]) reviewData.subjects[key].bad  = String(row[idxs.b]).trim();
          if (idxs.n !== -1 && row[idxs.n]) reviewData.subjects[key].next = String(row[idxs.n]).trim();
        }
      }

      return responseJSON({ result: "success", reviewData: reviewData });
    } catch (e) {
      return responseJSON({ result: "error", message: "GASエラー: " + e.toString() });
    }
  }

  // どのどのアクションにも該当しなかった場合の最終フォールバック
  return responseJSON({ result: "error", message: "Unknown action" });
}

// 💡 独立した関数群（doPostの完全外側に配置）
function checkWithGemini(word, correct, userAns, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const prompt = `
    【指示：英単語テストの柔軟かつ正確な採点】
    以下の問題に対する生徒の回答を判定し、true または false を返してください。
    問題（英）：${word}
    正解（日）：${correct}
    生徒の回答：${userAns}
    【合格（true）とする基準】
    1. 正解に「/」がある場合、その中のどれか1つでも意味が合っていれば正解です。
    2. 正解に「( )」の補足がある場合、その補足内容は無視して判定してください。
    3. ひらがな、カタカナ、漢字の表記ゆれ、送り仮名の僅かな違いはすべて正解にしてください。
    4. 「意味が本質的に同じ」である言い換えは救済してください。
    【不合格（false）とする厳罰基準】
    1. 日本語として明らかに不自然な表現は、意味が近くても一発で false にしてください。
    2. 明確に区別すべきニュアンスのズレは false にしてください。
    3. 反対の意味の単語は一発で false にしてください。
    余計な説明は一切不要。「true」か「false」の1単語のみを返却せよ。
  `;

  const payload = { "contents": [{ "parts": [{ "text": prompt }] }] };
  const options = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const resText = response.getContentText();
    if (resText.includes('"error"')) {
      return "Googleからのエラー詳細: " + resText;
    }
    const json = JSON.parse(resText);
    const resultText = json.candidates[0].content.parts[0].text.trim().toLowerCase();
    return resultText.includes("true") ? "true" : "false";
  } catch (e) {
    return "GAS通信エラー詳細: " + e.toString();
  }
}

function responseJSON(json) {
  return ContentService.createTextOutput(JSON.stringify(json)).setMimeType(ContentService.MimeType.JSON);
}
