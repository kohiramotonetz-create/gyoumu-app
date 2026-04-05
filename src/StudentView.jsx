export default function StudentView({ userName, grade, handleLogout }) {
  return (
    <div className="student-section">
      <h3>【生徒専用メニュー】</h3>
      <p>こんにちは、{userName} さん（{grade}）</p>
      <div className="button-grid">
        <button>テストを受ける</button>
        <button>自分の成績を見る</button>
      </div>
      <button className="logout-btn" onClick={handleLogout}>ログアウト</button>
    </div>
  );
}