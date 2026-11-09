import PropTypes from 'prop-types';
import styles from './SourceChips.module.css';

const DOC_LABELS = { JOB_POSTING: '공고', RESUME: '이력서' };

/** http(s)만 링크로 — javascript:·data: 같은 스킴과 잘못된 주소는 null (점검서 F-1) */
function safeHref(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

function WebChip({ source }) {
  const href = safeHref(source.url);
  const title = source.title || source.url || '웹 출처';
  return (
    <li className={styles.chip}>
      <span className={styles.kind}>웹</span>
      {href ? <a href={href} target="_blank" rel="noopener noreferrer">{title}</a> : <span>{title}</span>}
    </li>
  );
}
WebChip.propTypes = {
  source: PropTypes.shape({ url: PropTypes.string, title: PropTypes.string }).isRequired,
};

function DocChip({ source }) {
  return (
    <li className={styles.chip} title={source.chunk}>
      <span className={styles.kind}>문서</span>
      <span>{DOC_LABELS[source.docType] ?? source.docType}</span>
    </li>
  );
}
DocChip.propTypes = {
  source: PropTypes.shape({ docType: PropTypes.string, chunk: PropTypes.string }).isRequired,
};

/** 분석 출처 칩 (오너: 기술 리드) — 문서/웹을 구분한다. 출처가 없으면 그리지 않는다. */
export default function SourceChips({ sources = [] }) {
  if (!sources?.length) return null;
  return (
    <ul className={styles.chips}>
      {sources.map((source, i) => (source.type === 'web'
        ? <WebChip key={i} source={source} />
        : <DocChip key={i} source={source} />))}
    </ul>
  );
}
SourceChips.propTypes = { sources: PropTypes.arrayOf(PropTypes.object) };
