import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { ROUTES } from '../routes.js';
import { useAuthStore } from '../stores/authStore.js';
import { messageFor } from '../components/ErrorMessage.jsx';
import Button from '../components/Button.jsx';
import styles from './Auth.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = useAuthStore((s) => Boolean(s.refreshToken));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (loggedIn) return <Navigate to={ROUTES.DOCUMENTS} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      useAuthStore.getState().setSession(data);
      navigate(ROUTES.DOCUMENTS);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* GAP 로고 및 설명 문구 */}
        <div className={styles.brand}>
          <h1 className={styles.logo}>GAP</h1>
          <p className={styles.tagline}>채용공고와 이력서의 역량 차이를 근거와 함께 분석합니다</p>
        </div>

        <h2 className={styles.title}>로그인</h2>
        {location.state?.message && <p className={styles.success}>{location.state.message}</p>}
        
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="login-email">이메일</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="login-password">비밀번호</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={64}
              autoComplete="current-password"
            />
          </div>
          {error && <p className={styles.fieldError} role="alert">{messageFor(error)}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? '로그인 중…' : '로그인'}
          </Button>
        </form>
        <div className={styles.footer}>
          <span>계정이 없으신가요?</span>
          <Link to={ROUTES.REGISTER}>회원가입</Link>
        </div>
      </div>
    </div>
  );
}