import PropTypes from 'prop-types';
import styles from './Feedback.module.css';

/** 빈 상태 (SPEC §5 빈 상태 문구) */
export default function EmptyState({ message, action = null }) {
  return (
    <div className={styles.box}>
      <p>{message}</p>
      {action}
    </div>
  );
}
EmptyState.propTypes = { message: PropTypes.string.isRequired, action: PropTypes.node };
