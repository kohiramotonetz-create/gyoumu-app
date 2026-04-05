export default function Login({ userId, setUserId, password, setPassword, handleLogin }) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>個別ミッショントレーニング</h1>
        
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

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',        // 画面の横幅いっぱい
    backgroundColor: '#eef2f5',
    position: 'fixed',     // 他の要素の影響を受けないように固定
    top: 0,                // 画面の一番上から
    left: 0,               // 画面の一番左から
    zIndex: 9999,          // 一番手前に表示
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
    width: '90%',          // iPadなどで少し余裕を持たせる
    maxWidth: '450px',
    textAlign: 'center',
  },
  title: {
    fontSize: '2rem',       // 3rem から 2rem に縮小（これで1行に収まるはずです）
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#000',
    letterSpacing: '1px',   // 文字間隔も少し詰めるとより収まりが良くなります
    whiteSpace: 'nowrap',   // 念のため「絶対に改行しない」という指示を追加
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
    backgroundColor: '#3d3d3d',
    color: '#ffffff',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '15px',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#1d72e8',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
};