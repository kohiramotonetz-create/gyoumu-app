export default function TeacherView({ userName, handleLogout }) {
  return (
    <div className="teacher-section">
      <h3>【先生専用メニュー】</h3>
      <p>こんにちは、{userName} 先生</p>
      <div className="button-grid">
        <button onClick={() => alert('生徒一覧を表示します')}>生徒一覧表示</button>
        <button>テスト作成</button>
        <button>成績入力</button>
      </div>
      <button className="logout-btn" onClick={handleLogout}>ログアウト</button>
    </div>
  );
}