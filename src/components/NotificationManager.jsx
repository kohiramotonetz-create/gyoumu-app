// src/components/NotificationManager.jsx

const NotificationManager = (props) => {
  // propsを安全に受け取る
  const { 
    notifications = [], 
    schools = [], 
    selectedSchool, 
    setSelectedSchool, 
    handleComplete, 
    styles 
  } = props;

  // notificationsが undefined でもエラーにならないように ?.filter を使う
  // かつ、filter の結果が undefined にならないよう || [] で受ける
  const filteredNotifications = (notifications ?? []).filter(
    n => selectedSchool === 'すべて' || n.school === selectedSchool
  );

  return (
    <div>
      <div style={styles.contentHeader}>
        <h2 style={styles.contentTitle}>🎯 個トレメニュー</h2>
        <div style={styles.filterArea}>
          <label style={styles.label}>校舎選択：</label>
          {/* schoolsが万が一空でもエラーにならないようガード */}
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
          {filteredNotifications.map((n, index) => (
            <div key={index} style={styles.card(n.status)}>
              <div style={styles.queueBadge}>{n.queueNumber}</div>
              {/* ...以下、既存の表示ロジック（ styles.cardTop などの部分） */}
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
              <button 
                onClick={() => handleComplete(n.userId, n.name)} 
                style={styles.doneBtn}
              >
                対応完了
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationManager;