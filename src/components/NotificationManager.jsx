// これは講師側の個トレ管理コンポーネントです。講師が生徒からの個トレ依頼を確認し、対応開始・完了を管理するための画面で使用します。

const NotificationManager = (props) => {
  const { 
    notifications = [], 
    schools = [], 
    selectedSchool, 
    setSelectedSchool, 
    handleStart,   // ← 追加：対応開始用
    handleComplete, 
    styles 
  } = props;

  const filteredNotifications = (notifications ?? []).filter(
    n => selectedSchool === 'すべて' || n.school === selectedSchool
  );

  return (
    <div>
      <div style={styles.contentHeader}>
        <h2 style={styles.contentTitle}>🎯 個トレメニュー</h2>
        <div style={styles.filterArea}>
          <label style={styles.label}>校舎選択：</label>
          <select 
            style={styles.select} 
            value={selectedSchool} 
            onChange={(e) => setSelectedSchool(e.target.value)}
          >
            {(schools ?? []).map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div style={styles.emptyState}>
          {selectedSchool === 'すべて' 
            ? "現在、依頼はありません。" 
            : `${selectedSchool}校の依頼はありません。`}
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredNotifications.map((n, index) => {
            // ステータスに「対応中」が含まれているか判定
            const isProcessing = n.status.includes('（対応中）');

            return (
              <div key={index} style={styles.card(n.status)}>
                <div style={styles.queueBadge}>{n.queueNumber}</div>
                <div style={styles.cardTop}>
                  <span>{n.time}</span>
                  <span style={styles.gradeBadge}>{n.grade}</span>
                </div>
                <div style={styles.cardBody}>
                  <span style={styles.studentName}>
                    {n.name} <small>さん</small>
                  </span>
                  <div style={styles.statusLabel(n.status)}>{n.status}</div>
                </div>

                {/* --- ボタンの切り替えロジック --- */}
                {!isProcessing ? (
                  // 「対応中」でないなら「対応開始」を表示
                  <button 
                    onClick={() => handleStart(n.queueNumber)} 
                    style={{
                      ...styles.doneBtn,
                      backgroundColor: '#3498db' // 開始ボタンは青系にすると分かりやすい
                    }}
                  >
                    🏃 対応開始
                  </button>
                ) : (
                  // 「対応中」なら「対応完了」を表示
                  <button 
                    onClick={() => handleComplete(n.userId, n.name, n.queueNumber)} 
                    style={styles.doneBtn}
                  >
                    ✅ 対応完了
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationManager;