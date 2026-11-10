import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { ROUTES } from '../routes.js';
import { messageFor } from '../components/ErrorMessage.jsx';
import Button from '../components/Button.jsx';
import styles from './Auth.module.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fieldErrors = Object.fromEntries(error?.fields?.map((f) => [f.field, f.message]) ?? []);
  const emailError = fieldErrors.email || (error?.code === 'DUPLICATE_EMAIL' ? messageFor(error) : null);
  const generalError = error && !error.fields?.length && error.code !== 'DUPLICATE_EMAIL' ? messageFor(error) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/api/auth/register', { email, password, name });
      navigate(ROUTES.LOGIN, { state: { message: '가입되었습니다. 로그인하세요' } });
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
        <h2 className={styles.title}>회원가입</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="reg-email">이메일</label>
            <input
              id="reg-email"
              type="email"
              placeholder="이메일 (example@email.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {emailError && <p className={styles.fieldError}>{emailError}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="reg-password">비밀번호</label>
            <input
              id="reg-password"
              type="password"
              placeholder="비밀번호 8~64자"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={64}
              autoComplete="new-password"
            />
            {fieldErrors.password && <p className={styles.fieldError}>{fieldErrors.password}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="reg-name">이름</label>
            <input
              id="reg-name"
              type="text"
              placeholder="이름 최대 20자"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={20}
              autoComplete="name"
            />
            {fieldErrors.name && <p className={styles.fieldError}>{fieldErrors.name}</p>}
          </div>

          {generalError && <p className={styles.fieldError} role="alert">{generalError}</p>}

          {/* 비밀번호 8~64자 · 이름 최대 20자 안내 문구 */}
          <p className={styles.helperText}>
            <span>비밀번호 8~64자</span> · <span>이름 최대 20자</span>
          </p>

          <Button type="submit" disabled={loading}>{loading ? '가입 중…' : '회원가입'}</Button>
        </form>
        <div className={styles.footer}>
          <span>이미 계정이 있으신가요?</span>
          <Link to={ROUTES.LOGIN}>로그인</Link>
        </div>
      </div>
    </div>
  );
}