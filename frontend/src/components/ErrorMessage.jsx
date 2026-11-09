import PropTypes from 'prop-types';
import styles from './Feedback.module.css';

/** 에러 상태 — 서버 메시지를 그대로 붙이지 않고 SPEC §4.4 표시 문구로 (점검서 F-7) */
const BY_CODE = {
  FORBIDDEN: '접근 권한이 없습니다',
  DOCUMENT_NOT_FOUND: '문서를 찾을 수 없습니다',
  ANALYSIS_NOT_FOUND: '분석을 찾을 수 없습니다',
  AI_UNAVAILABLE: '분석 서버가 응답하지 않습니다',
  FILE_TOO_LARGE: '200KB 이하 파일만 올릴 수 있습니다',
  UNSUPPORTED_FILE: '.md 또는 .txt(UTF-8) 파일만 올릴 수 있습니다',
  NETWORK_ERROR: '서버에 연결할 수 없습니다',
  VALIDATION_ERROR: '입력값을 확인해 주세요',
  DOCUMENT_TYPE_MISMATCH: '공고와 이력서를 각각 골라 주세요',
  DUPLICATE_TITLE: '같은 제목의 문서가 있습니다',
  DUPLICATE_EMAIL: '이미 가입된 이메일입니다',
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다',
  ACCOUNT_LOCKED: '로그인 5회 실패로 잠겼습니다. 잠시 후 다시 시도해 주세요',
  UNAUTHORIZED: '다시 로그인해 주세요',
  TOKEN_EXPIRED: '다시 로그인해 주세요',
  NOT_FOUND: '목록으로',
  INTERNAL_SERVER_ERROR: '잠시 후 다시 시도해 주세요',
  INVALID_REFRESH_TOKEN: '다시 로그인해 주세요',
  ABORTED: '요청을 취소했습니다',
};
// 423의 서버 message에서 해제 시각(HH:MM[:SS])만 뽑는다 — 문구 전체는 쓰지 않는다(F-7) · SPEC §4.4 "해제 시각 표시"
const UNLOCK_TIME = /(\d{1,2}:\d{2}(?::\d{2})?)/;
export function messageFor(error) {
  if (error?.code === 'ACCOUNT_LOCKED') {
    const t = typeof error.message === 'string' ? error.message.match(UNLOCK_TIME)?.[1] : null;
    if (t) return `로그인 5회 실패로 잠겼습니다. ${t}에 해제됩니다`;
  }
  return BY_CODE[error?.code] ?? '잠시 후 다시 시도해 주세요';
}

export default function ErrorMessage({ error, onRetry = null }) {
  return (
    <div className={styles.box} role="alert">
      <p className={styles.error}>{messageFor(error)}</p>
      {onRetry && <button type="button" onClick={onRetry}>다시 시도</button>}
    </div>
  );
}
ErrorMessage.propTypes = {
  error: PropTypes.shape({ code: PropTypes.string, message: PropTypes.string }),
  onRetry: PropTypes.func,
};
