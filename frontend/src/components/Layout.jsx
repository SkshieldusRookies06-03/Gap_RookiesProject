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
  const navClass = ({ isActive }) => `${styles.navLink}${isActive ? ` ${styles.navActive}` : ''}`;
  const logout = async () => {
    try { await api.post('/api/auth/logout'); } catch { /* 이미 만료여도 로컬은 비운다 */ }
    clear();
    useChatStore.getState().reset();   // 같은 탭에서 다른 계정으로 로그인해도 이전 분석이 남지 않게
    navigate(ROUTES.LOGIN);
  };
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <strong className={styles.brand}>
          <svg className={styles.brandMark} viewBox="0 0 16 24" fill="none" aria-hidden="true">
            <rect className={styles.brandPrimary} x="0" y="2" width="5" height="20" rx="2.5" />
            <rect className={styles.brandAccent} x="9" y="9" width="5" height="13" rx="2.5" />
          </svg>
          GAP
        </strong>
        <nav className={styles.nav} aria-label="주 메뉴">
          <NavLink to={ROUTES.DOCUMENTS} className={navClass}>내 문서</NavLink>
          <NavLink to={ROUTES.ANALYSIS_NEW} className={navClass}>새 분석</NavLink>
          <NavLink to={ROUTES.ANALYSES} end className={navClass}>분석 기록</NavLink>
        </nav>
        <span className={styles.user}>{user?.name}</span>
        <button type="button" className={styles.logout} onClick={logout}>로그아웃</button>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
Layout.propTypes = { children: PropTypes.node.isRequired };
