import PropTypes from 'prop-types';
import styles from './LoadingSpinner.module.css';

/** 로딩 표시 (R-FE04) — 화면 상태 "로딩"과 스트리밍 "생성 중" 공용 */
export default function LoadingSpinner({ label = '불러오는 중…' }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
LoadingSpinner.propTypes = { label: PropTypes.string };
