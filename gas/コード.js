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

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheets()[0];
  const rows = userSheet.getDataRange().getValues();

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
    const inputId = String(data.userId).trim();
    for (let i = 1; i < rows.length; i++) {
      const sheetId = String(rows[i][1]).replace(/^'/, "").trim();
      if (sheetId === inputId && rows[i][9].toString() === data.password.toString()) {
        return responseJSON({
          result: "success",
          school: rows[i][0],
          name: rows[i][4],
          grade: rows[i][5],
          isInitial: rows[i][8],
          role: rows[i][10]
        });
      }
    }
    return responseJSON({ result: "fail", message: "IDまたはパスワードが違います。" });
  }

  // --- 2. パスワード変更処理 ---
  if (data.action === "changePassword") {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1].toString() === data.userId.toString()) {
        userSheet.getRange(i + 1, 10).setValue(data.newPassword);
        userSheet.getRange(i + 1, 9).setValue(false);
        return responseJSON({ result: "success" });
      }
    }
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
      const ssLogin = openSpreadsheetByProperty("USER_MASTER_SPREADSHEET_ID");
      const userSheetByName = ssLogin.getSheetByName("ログイン認証") || ssLogin.getSheets()[0];
      const userRowsData = userSheetByName.getDataRange().getValues();

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
      let targetRow = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1].toString() === data.userId.toString()) {
          targetRow = i + 1;
          break;
        }
      }

      if (targetRow === -1) return responseJSON({ result: "error", message: "ユーザーが見つかりません" });

      const token = Math.floor(100000 + Math.random() * 900000).toString();
      const expireTime = new Date(new Date().getTime() + 5 * 60000); 

      userSheet.getRange(targetRow, 12).setValue(token);
      userSheet.getRange(targetRow, 13).setValue(expireTime);

      return responseJSON({ result: "success", token: token });
    } catch (e) {
      return responseJSON({ result: "error", message: e.toString() });
    }
  }

  // --- 13. スキマ君連携：トークン検証処理 ---
  if (data.action === "validateToken") {
    try {
      let userRowData = null;
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1].toString() === data.userId.toString()) {
          userRowData = rows[i];
          rowIndex = i + 1;
          break;
        }
      }

      if (!userRowData) return responseJSON({ result: "error", message: "ユーザーが見つかりません" });

      const savedToken = userRowData[11]; 
      const expireTime = new Date(userRowData[12]); 
      const now = new Date();

      if (savedToken.toString() === data.token.toString() && now < expireTime) {
        const result = {
          result: "success",
          school: userRowData[0],
          name: userRowData[4],
          grade: userRowData[5],
          role: userRowData[10]
        };
        
        userSheet.getRange(rowIndex, 12).clearContent();
        userSheet.getRange(rowIndex, 13).clearContent();

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
    try {
      const lastRow = userSheet.getLastRow();
      const nextRow = lastRow + 1;
      const formattedUserId = "'" + String(data.userId || "").trim().replace(/^'/, "");
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
      return responseJSON({ result: "success" });
    } catch (e) {
      return responseJSON({ result: "error", message: e.toString() });
    }
  }

  // --- 15. 学校進捗マトリックスデータ取得 ---
  if (data.action === "getSchoolProgressMatrix") {
    try {
      const ssLogin = SpreadsheetApp.getActiveSpreadsheet();
      const userSheetLocal = ssLogin.getSheetByName("ログイン認証") || ssLogin.getSheets()[0];
      const userRowsLocal = userSheetLocal.getDataRange().getValues();

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
      const ssLogin = SpreadsheetApp.getActiveSpreadsheet();
      const userSheetLocal = ssLogin.getSheetByName("ログイン認証") || ssLogin.getSheets()[0];
      const userRowsLocal = userSheetLocal.getDataRange().getValues();

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
