import PropTypes from 'prop-types';
import styles from './Button.module.css';

/** 공용 버튼 (오너: 팀장) — 쓰는 화면: 로그인·가입·내 문서·분석 */
export default function Button({ children, variant = 'primary', type = 'button', disabled = false, onClick }) {
  return (
    <button type={type} className={`${styles.button} ${styles[variant]}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  type: PropTypes.oneOf(['button', 'submit']),
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};
