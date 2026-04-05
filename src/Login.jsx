export default function Login({ userId, setUserId, password, setPassword, handleLogin }) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>スキマくん</h1>
        
        <div style={styles.inputGroup}>
          <input 
            type="text" 
            placeholder="生徒番号" 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)} 
            style={styles.input}
          />
          <input 
            type="password" 
            placeholder="パスワード(初期:1234)" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={styles.input}
          />
        </div>

        <button 
          onClick={handleLogin} 
          style={styles.button}
          onMouseOver={(e) => e.target.style.opacity = '0.9'}
          onMouseOut={(e) => e.target.style.opacity = '1'}
        >
          ログイン
        </button>
      </div>
    </div>
  );
}

// デザインの設定
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#eef2f5', // 背景の薄いグレー
    width: '100vw',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
    width: '100%',
    maxWidth: '450px',
    textAlign: 'center',
  },
  title: {
    fontSize: '3rem',
    fontWeight: 'bold',
    marginBottom: '30px',
    color: '#000',
    letterSpacing: '2px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '30px',
  },
  input: {
    padding: '15px 20px',
    fontSize: '1rem',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#3d3d3d', // 入力欄のダークグレー
    color: '#ffffff',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '15px',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#1d72e8', // ログインボタンの鮮やかな青
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
};