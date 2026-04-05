export default function Login({ userId, setUserId, password, setPassword, handleLogin }) {
  return (
    <div className="login-box">
      <h1>塾管理アプリ</h1>
      <div className="input-group">
        <input type="text" placeholder="ユーザーID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button onClick={handleLogin}>ログイン</button>
    </div>
  );
}