import PropTypes from 'prop-types';
import { NavLink, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes.js';
import { useAuthStore } from '../stores/authStore.js';
import { useChatStore } from '../stores/chatStore.js';
import { api } from '../api/client.js';
import styles from './Layout.module.css';

/** 공통 레이아웃 (오너: FE-화면) — 상단 내비 + 본문 */
export default function Layout({ children }) {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const logout = async () => {
    try { await api.post('/api/auth/logout'); } catch { /* 이미 만료여도 로컬은 비운다 */ }
    clear();
    useChatStore.getState().reset();   // 같은 탭에서 다른 계정으로 로그인해도 이전 분석이 남지 않게
    navigate(ROUTES.LOGIN);
  };
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <strong>JobGap</strong>
        <nav className={styles.nav}>
          <NavLink to={ROUTES.DOCUMENTS}>내 문서</NavLink>
          <NavLink to={ROUTES.ANALYSIS_NEW}>새 분석</NavLink>
          <NavLink to={ROUTES.ANALYSES}>분석 기록</NavLink>
        </nav>
        <span className={styles.user}>{user?.name}</span>
        <button type="button" onClick={logout}>로그아웃</button>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
Layout.propTypes = { children: PropTypes.node.isRequired };
